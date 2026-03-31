import { useState, useRef, useCallback, useEffect } from "react";
import { Play, Pause, StopCircle, Volume2 } from "lucide-react";
import { generateSpeech, isElevenLabsConfigured } from "../lib/elevenlabs";

type Props = { textToRead: string };

const TTSPanel = ({ textToRead }: Props) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlsRef = useRef<string[]>([]);
  const currentIndexRef = useRef(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const urlsLengthRef = useRef(0);

  const stopProgressTimer = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const revokeUrls = useCallback(() => {
    blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrlsRef.current = [];
  }, []);

  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
    }
    stopProgressTimer();
    revokeUrls();
    currentIndexRef.current = 0;
    setProgress(0);
    setIsPlaying(false);
    setIsPaused(false);
  }, [stopProgressTimer, revokeUrls]);

  useEffect(() => {
    return () => {
      stopProgressTimer();
      revokeUrls();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [stopProgressTimer, revokeUrls]);

  const playNext = useCallback(
    (urls: string[], index: number) => {
      if (index >= urls.length) {
        setProgress(100);
        stopProgressTimer();
        setIsPlaying(false);
        setIsPaused(false);
        return;
      }
      currentIndexRef.current = index;
      const audio = audioRef.current;
      if (!audio) return;
      audio.src = urls[index]!;
      audio.play().catch((e) => {
        console.error("Audio play failed:", e);
        setError(e instanceof Error ? e.message : "Audio playback was blocked by the browser.");
        setProgress(100);
        setIsPlaying(false);
      });
    },
    [stopProgressTimer]
  );

  const handlePlayPause = async () => {
    if (!isElevenLabsConfigured()) {
      setError("Add VITE_ELEVENLABS_API_KEY to .env for text-to-speech.");
      return;
    }

    const trimmed = textToRead.trim();
    if (!trimmed) return;

    if (isPlaying && !isPaused) {
      audioRef.current?.pause();
      stopProgressTimer();
      setIsPaused(true);
      return;
    }

    if (isPaused) {
      try {
        await audioRef.current?.play();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to resume audio.");
        setIsPlaying(false);
        setIsPaused(false);
        return;
      }
      const urls = blobUrlsRef.current;
      const idx = currentIndexRef.current;
      if (urls.length > 0 && audioRef.current) {
        const startProgress = (idx / urls.length) * 100;
        progressIntervalRef.current = setInterval(() => {
          const a = audioRef.current;
          if (!a || a.duration === 0 || !isFinite(a.duration)) return;
          const chunkProgress = (a.currentTime / a.duration) * (100 / urls.length);
          setProgress(Math.min(100, startProgress + chunkProgress));
        }, 100);
      }
      setIsPaused(false);
      return;
    }

    setError(null);
    setIsLoading(true);
    handleStop();

    try {
      const blobs = await generateSpeech(trimmed);
      if (blobs.length === 0) {
        setError("No audio generated.");
        setIsLoading(false);
        return;
      }

      revokeUrls();
      const urls = blobs.map((b) => URL.createObjectURL(b));
      blobUrlsRef.current = urls;
      currentIndexRef.current = 0;

      const audio = audioRef.current;
      if (!audio) {
        setError("Audio player failed to initialize.");
        setIsLoading(false);
        return;
      }

      audio.onended = () => {
        stopProgressTimer();
        const nextIdx = currentIndexRef.current + 1;
        if (nextIdx < urls.length) {
          playNext(urls, nextIdx);
        } else {
          setProgress(100);
          setIsPlaying(false);
          setIsPaused(false);
        }
      };

      audio.onerror = () => {
        stopProgressTimer();
        setError("Audio playback failed.");
        setIsPlaying(false);
        setIsPaused(false);
      };

      urlsLengthRef.current = urls.length;
      audio.onplay = () => {
        const total = urlsLengthRef.current;
        if (total === 0) return;
        progressIntervalRef.current = setInterval(() => {
          const a = audioRef.current;
          if (!a || a.duration === 0 || !isFinite(a.duration)) return;
          const idx = currentIndexRef.current;
          const chunkProgress = (a.currentTime / a.duration) * (100 / total);
          setProgress(Math.min(100, (idx / total) * 100 + chunkProgress));
        }, 100);
      };

      setIsLoading(false);
      setIsPlaying(true);
      setIsPaused(false);
      setProgress(0);
      playNext(urls, 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "TTS failed.");
      setIsLoading(false);
    }
  };

  const btnBase =
    "flex h-9 w-9 items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-sage-surface";

  if (!isElevenLabsConfigured()) {
    return (
      <div className="flex items-center gap-4 rounded-xl bg-pale-sage/80 px-4 py-3 dark:bg-dark-sage-elevated/90">
        <Volume2 className="h-5 w-5 shrink-0 text-deep-moss/50 dark:text-dark-moss/50" />
        <p className="text-caption text-deep-moss/60 dark:text-dark-moss/60">
          Add <code className="rounded bg-deep-moss/10 px-1 dark:bg-dark-moss/20">VITE_ELEVENLABS_API_KEY</code> to .env for text-to-speech.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-xl bg-pale-sage/80 px-4 py-3 dark:bg-dark-sage-elevated/90">
      <audio ref={audioRef} />
      <button
        type="button"
        onClick={handlePlayPause}
        disabled={isLoading}
        className={`${btnBase} bg-soft-clay text-deep-moss hover:bg-soft-clay-hover focus:ring-soft-clay dark:bg-dark-clay dark:text-dark-sage dark:hover:opacity-90 dark:focus:ring-dark-clay disabled:opacity-50`}
        aria-label={isPlaying && !isPaused ? "Pause" : "Play"}
      >
        {isLoading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-deep-moss border-t-transparent dark:border-dark-sage dark:border-t-transparent" />
        ) : isPlaying && !isPaused ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5" />
        )}
      </button>
      <button
        type="button"
        onClick={handleStop}
        disabled={!isPlaying && !isPaused}
        className={`${btnBase} bg-deep-moss/15 text-deep-moss hover:bg-deep-moss/25 focus:ring-deep-moss/30 dark:bg-dark-moss/20 dark:text-dark-moss dark:hover:bg-dark-moss/30 dark:focus:ring-dark-moss/40 disabled:opacity-40`}
        aria-label="Stop"
      >
        <StopCircle className="h-5 w-5" />
      </button>
      <div className="flex flex-1 min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 shrink-0 text-deep-moss/50 dark:text-dark-moss/50" />
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-deep-moss/20 dark:bg-dark-moss/30">
            <div
              className="h-full rounded-full bg-soft-clay dark:bg-dark-clay transition-[width] duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        {error && (
          <p className="text-caption text-red-600 dark:text-red-400 truncate" title={error}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default TTSPanel;
