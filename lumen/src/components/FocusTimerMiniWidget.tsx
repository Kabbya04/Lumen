import { Play, Pause, Timer } from "lucide-react";
import { useTimer } from "../contexts/TimerContext";

type Props = {
  onOpenFocusTimer: () => void;
};

export default function FocusTimerMiniWidget({ onOpenFocusTimer }: Props) {
  const { state, formattedRemaining, phaseLabel, startOrResume, pause } = useTimer();
  const running = state.status === "running";

  return (
    <div className="flex max-w-[min(100%,11rem)] shrink-0 items-center gap-1 sm:max-w-none sm:gap-2">
      <button
        type="button"
        onClick={onOpenFocusTimer}
        className="flex max-w-[11rem] items-center gap-2 rounded-xl border border-deep-moss/15 bg-white/80 px-2.5 py-1.5 text-left shadow-sm transition-colors hover:bg-deep-moss/5 dark:border-dark-moss/25 dark:bg-dark-sage-elevated/90 dark:hover:bg-dark-moss/10"
        title="Open Focus Timer"
      >
        <Timer className="h-4 w-4 shrink-0 text-soft-clay dark:text-dark-clay" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-caption font-medium text-deep-moss dark:text-dark-moss">{phaseLabel}</p>
          <p className="font-mono text-caption tabular-nums text-deep-moss/90 dark:text-dark-moss/90">
            {formattedRemaining}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (running) pause();
          else startOrResume();
        }}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-deep-moss/10 text-deep-moss transition-colors hover:bg-deep-moss/15 dark:bg-dark-moss/20 dark:text-dark-moss dark:hover:bg-dark-moss/30"
        aria-label={running ? "Pause timer" : "Start timer"}
      >
        {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
    </div>
  );
}
