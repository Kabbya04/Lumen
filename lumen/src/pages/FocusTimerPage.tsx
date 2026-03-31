import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import { useTimer } from "../contexts/TimerContext";

export default function FocusTimerPage() {
  const {
    state,
    formattedRemaining,
    phaseLabel,
    startOrResume,
    pause,
    reset,
    skipPhase,
    setSettings,
  } = useTimer();

  const running = state.status === "running";
  const { focusMin, shortBreakMin, longBreakMin } = state.settings;

  return (
    <div className="min-h-[calc(100vh-4rem)] py-6">
      <div className="mx-auto max-w-lg">
        <h1 className="text-display-sm font-semibold text-deep-moss dark:text-dark-moss">Focus Timer</h1>
        <p className="mt-2 text-body text-deep-moss/70 dark:text-dark-moss/70">
          Focus and break sessions run in the background. After every fourth focus session, you get a long break.
        </p>

        <div className="mt-8 rounded-2xl border border-deep-moss/12 bg-white p-8 shadow-soft-md dark:border-dark-moss/20 dark:bg-dark-sage-surface">
          <p className="text-center text-caption font-medium uppercase tracking-wider text-deep-moss/60 dark:text-dark-moss/60">
            {phaseLabel}
          </p>
          <p className="mt-2 text-center font-mono text-[3rem] leading-none tabular-nums text-deep-moss dark:text-dark-moss sm:text-[3.5rem]">
            {formattedRemaining}
          </p>
          <p className="mt-2 text-center text-caption text-deep-moss/50 dark:text-dark-moss/50">
            {state.status === "idle" && "Ready"}
            {state.status === "running" && "Running"}
            {state.status === "paused" && "Paused"}
            {" · "}
            Focus cycle: {state.completedFocusSinceLong}/4 before long break
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={running ? pause : startOrResume}
              className="inline-flex items-center gap-2 rounded-xl bg-soft-clay px-6 py-3 text-body font-semibold text-deep-moss shadow-soft transition-colors hover:bg-soft-clay-hover dark:bg-dark-clay dark:text-deep-moss dark:hover:opacity-90"
            >
              {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {running ? "Pause" : state.status === "paused" ? "Resume" : "Start"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-xl border border-deep-moss/20 px-5 py-3 text-caption font-semibold text-deep-moss transition-colors hover:bg-deep-moss/5 dark:border-dark-moss/30 dark:text-dark-moss dark:hover:bg-dark-moss/10"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              type="button"
              onClick={skipPhase}
              disabled={state.status === "idle"}
              className="inline-flex items-center gap-2 rounded-xl border border-deep-moss/20 px-5 py-3 text-caption font-semibold text-deep-moss transition-colors hover:bg-deep-moss/5 disabled:opacity-40 dark:border-dark-moss/30 dark:text-dark-moss dark:hover:bg-dark-moss/10"
            >
              <SkipForward className="h-4 w-4" />
              Skip phase
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-deep-moss/12 bg-white p-6 dark:border-dark-moss/20 dark:bg-dark-sage-surface">
          <h2 className="text-title font-semibold text-deep-moss dark:text-dark-moss">Durations (minutes)</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-caption text-deep-moss/70 dark:text-dark-moss/70">Focus</span>
              <input
                type="number"
                min={1}
                max={120}
                value={focusMin}
                onChange={(e) => setSettings({ focusMin: Number(e.target.value) || 1 })}
                className="rounded-lg border border-deep-moss/20 bg-pale-sage/50 px-3 py-2 text-body text-deep-moss dark:border-dark-moss/30 dark:bg-dark-sage dark:text-dark-moss"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-caption text-deep-moss/70 dark:text-dark-moss/70">Short break</span>
              <input
                type="number"
                min={1}
                max={60}
                value={shortBreakMin}
                onChange={(e) => setSettings({ shortBreakMin: Number(e.target.value) || 1 })}
                className="rounded-lg border border-deep-moss/20 bg-pale-sage/50 px-3 py-2 text-body text-deep-moss dark:border-dark-moss/30 dark:bg-dark-sage dark:text-dark-moss"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-caption text-deep-moss/70 dark:text-dark-moss/70">Long break</span>
              <input
                type="number"
                min={1}
                max={60}
                value={longBreakMin}
                onChange={(e) => setSettings({ longBreakMin: Number(e.target.value) || 1 })}
                className="rounded-lg border border-deep-moss/20 bg-pale-sage/50 px-3 py-2 text-body text-deep-moss dark:border-dark-moss/30 dark:bg-dark-sage dark:text-dark-moss"
              />
            </label>
          </div>
          <p className="mt-4 text-caption text-deep-moss/60 dark:text-dark-moss/60">
            Remaining time is derived from the clock, so switching sections or refreshing the page keeps the timer
            aligned (within a few seconds of load).
          </p>
        </div>
      </div>
    </div>
  );
}
