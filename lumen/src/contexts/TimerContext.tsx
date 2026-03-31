import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "lumen-focus-timer-v1";
const LEGACY_STORAGE_KEY = "lumen-pomodoro-v1";

export type FocusTimerPhase = "focus" | "shortBreak" | "longBreak";
export type FocusTimerStatus = "idle" | "running" | "paused";

export type FocusTimerSettings = {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
};

export type FocusTimerPersisted = {
  status: FocusTimerStatus;
  phase: FocusTimerPhase;
  /** When running, phase ends at this Unix ms */
  phaseEndAt: number | null;
  /** When paused, remaining ms in current phase */
  pausedRemainingMs: number | null;
  /** Completed focus sessions (used for 4th → long break) */
  completedFocusSinceLong: number;
  settings: FocusTimerSettings;
};

const DEFAULT_SETTINGS: FocusTimerSettings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
};

function defaultState(): FocusTimerPersisted {
  return {
    status: "idle",
    phase: "focus",
    phaseEndAt: null,
    pausedRemainingMs: null,
    completedFocusSinceLong: 0,
    settings: { ...DEFAULT_SETTINGS },
  };
}

function loadPersisted(): FocusTimerPersisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return defaultState();
    const p = JSON.parse(raw) as Partial<FocusTimerPersisted>;
    const settings = {
      ...DEFAULT_SETTINGS,
      ...p.settings,
    };
    return {
      status: p.status === "running" || p.status === "paused" || p.status === "idle" ? p.status : "idle",
      phase: p.phase === "shortBreak" || p.phase === "longBreak" || p.phase === "focus" ? p.phase : "focus",
      phaseEndAt: typeof p.phaseEndAt === "number" ? p.phaseEndAt : null,
      pausedRemainingMs: typeof p.pausedRemainingMs === "number" ? p.pausedRemainingMs : null,
      completedFocusSinceLong:
        typeof p.completedFocusSinceLong === "number" && p.completedFocusSinceLong >= 0
          ? p.completedFocusSinceLong
          : 0,
      settings,
    };
  } catch {
    return defaultState();
  }
}

function savePersisted(s: FocusTimerPersisted) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function phaseDurationMs(phase: FocusTimerPhase, settings: FocusTimerSettings): number {
  const m =
    phase === "focus"
      ? settings.focusMin
      : phase === "shortBreak"
        ? settings.shortBreakMin
        : settings.longBreakMin;
  return Math.max(1, m) * 60 * 1000;
}

function remainingMsFromState(s: FocusTimerPersisted, now: number): number {
  if (s.status === "paused" && s.pausedRemainingMs != null) {
    return Math.max(0, s.pausedRemainingMs);
  }
  if (s.status === "running" && s.phaseEndAt != null) {
    return Math.max(0, s.phaseEndAt - now);
  }
  return phaseDurationMs(s.phase, s.settings);
}

type TimerContextValue = {
  state: FocusTimerPersisted;
  remainingMs: number;
  formattedRemaining: string;
  phaseLabel: string;
  startOrResume: () => void;
  pause: () => void;
  reset: () => void;
  skipPhase: () => void;
  setSettings: (next: Partial<FocusTimerSettings>) => void;
};

const TimerContext = createContext<TimerContextValue | null>(null);

function formatMs(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function nextPhaseAfterComplete(s: FocusTimerPersisted): { phase: FocusTimerPhase; completedFocusSinceLong: number } {
  if (s.phase === "focus") {
    const nextCount = s.completedFocusSinceLong + 1;
    if (nextCount % 4 === 0) {
      return { phase: "longBreak", completedFocusSinceLong: 0 };
    }
    return { phase: "shortBreak", completedFocusSinceLong: nextCount };
  }
  return { phase: "focus", completedFocusSinceLong: s.completedFocusSinceLong };
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FocusTimerPersisted>(() => loadPersisted());
  const [tick, setTick] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    savePersisted(state);
  }, [state]);

  /** Catch up phases if deadline passed while tab was closed or machine slept. */
  useEffect(() => {
    setState((prev) => {
      let next = prev;
      let guard = 0;
      while (
        next.status === "running" &&
        next.phaseEndAt != null &&
        Date.now() >= next.phaseEndAt &&
        guard < 24
      ) {
        guard += 1;
        const { phase, completedFocusSinceLong } = nextPhaseAfterComplete(next);
        const dur = phaseDurationMs(phase, next.settings);
        next = {
          ...next,
          phase,
          completedFocusSinceLong,
          phaseEndAt: Date.now() + dur,
          pausedRemainingMs: null,
        };
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remainingMs = useMemo(() => {
    void tick;
    return remainingMsFromState(state, Date.now());
  }, [state, tick]);

  useEffect(() => {
    void tick;
    const s = stateRef.current;
    if (s.status !== "running" || s.phaseEndAt == null) return;
    if (Date.now() < s.phaseEndAt) return;

    setState((prev) => {
      if (prev.status !== "running" || prev.phaseEndAt == null) return prev;
      if (Date.now() < prev.phaseEndAt) return prev;

      const { phase: nextPhase, completedFocusSinceLong } = nextPhaseAfterComplete(prev);
      const dur = phaseDurationMs(nextPhase, prev.settings);
      const next: FocusTimerPersisted = {
        ...prev,
        phase: nextPhase,
        completedFocusSinceLong,
        status: "running",
        pausedRemainingMs: null,
        phaseEndAt: Date.now() + dur,
      };
      return next;
    });
  }, [tick]);

  const startOrResume = useCallback(() => {
    setState((prev) => {
      if (prev.status === "running") return prev;
      if (prev.status === "paused" && prev.pausedRemainingMs != null) {
        return {
          ...prev,
          status: "running",
          phaseEndAt: Date.now() + prev.pausedRemainingMs,
          pausedRemainingMs: null,
        };
      }
      const dur = phaseDurationMs(prev.phase, prev.settings);
      return {
        ...prev,
        status: "running",
        phaseEndAt: Date.now() + dur,
        pausedRemainingMs: null,
      };
    });
  }, []);

  const pause = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "running" || prev.phaseEndAt == null) return prev;
      const left = Math.max(0, prev.phaseEndAt - Date.now());
      return {
        ...prev,
        status: "paused",
        phaseEndAt: null,
        pausedRemainingMs: left,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState(defaultState());
  }, []);

  const skipPhase = useCallback(() => {
    setState((prev) => {
      const { phase: nextPhase, completedFocusSinceLong } = nextPhaseAfterComplete(prev);
      const dur = phaseDurationMs(nextPhase, prev.settings);
      if (prev.status === "idle") {
        return { ...prev, phase: nextPhase, completedFocusSinceLong };
      }
      if (prev.status === "running") {
        return {
          ...prev,
          phase: nextPhase,
          completedFocusSinceLong,
          phaseEndAt: Date.now() + dur,
          pausedRemainingMs: null,
        };
      }
      return {
        ...prev,
        phase: nextPhase,
        completedFocusSinceLong,
        phaseEndAt: null,
        pausedRemainingMs: dur,
      };
    });
  }, []);

  const setSettings = useCallback((next: Partial<FocusTimerSettings>) => {
    setState((prev) => {
      const settings = { ...prev.settings, ...next };
      if (prev.status === "paused" && prev.pausedRemainingMs != null) {
        const cap = phaseDurationMs(prev.phase, settings);
        return {
          ...prev,
          settings,
          pausedRemainingMs: Math.min(prev.pausedRemainingMs, cap),
        };
      }
      if (prev.status === "running" && prev.phaseEndAt != null) {
        const left = Math.max(0, prev.phaseEndAt - Date.now());
        const cap = phaseDurationMs(prev.phase, settings);
        return {
          ...prev,
          settings,
          phaseEndAt: Date.now() + Math.min(left, cap),
        };
      }
      return { ...prev, settings };
    });
  }, []);

  const phaseLabel =
    state.phase === "focus"
      ? "Focus"
      : state.phase === "shortBreak"
        ? "Short break"
        : "Long break";

  const value: TimerContextValue = {
    state,
    remainingMs,
    formattedRemaining: formatMs(remainingMs),
    phaseLabel,
    startOrResume,
    pause,
    reset,
    skipPhase,
    setSettings,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within TimerProvider");
  return ctx;
}
