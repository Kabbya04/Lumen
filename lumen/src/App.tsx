import { Suspense, lazy, useState } from "react";
import FocusTimerMiniWidget from "./components/FocusTimerMiniWidget";
import { useTheme } from "./contexts/ThemeContext";
import { SessionProvider, useSession } from "./contexts/SessionContext";
import { TimerProvider } from "./contexts/TimerContext";
import { BookOpen, Moon, Sun, Library as LibraryIcon, Crosshair, Flame, Award, ClipboardList, PenTool, Timer } from "lucide-react";
import { getStreak, isMastered, hasPendingQuiz } from "./lib/storage";

const Home = lazy(() => import("./pages/Home"));
const Library = lazy(() => import("./pages/Library"));
const Focus = lazy(() => import("./pages/Focus"));
const QuizPage = lazy(() => import("./pages/QuizPage"));
const NoteTaker = lazy(() => import("./pages/NoteTaker"));
const FocusTimerPage = lazy(() => import("./pages/FocusTimerPage"));

type Page = "study" | "library" | "focus" | "quiz" | "note-taker" | "focus-timer";

function AppNav({
  currentPage,
  setPage,
  quizInProgress,
  onNavAttempt,
}: {
  currentPage: Page;
  setPage: (p: Page) => void;
  quizInProgress: boolean;
  onNavAttempt: (target: Page) => void;
}) {
  const { document, analysis } = useSession();
  const hasSession = Boolean(document && (analysis.summary || analysis.keyPoints.length > 0));
  const pendingQuiz = hasPendingQuiz();

  const handleNav = (target: Page) => {
    if (quizInProgress) onNavAttempt(target);
    else setPage(target);
  };

  return (
    <nav className="hidden sm:flex items-center gap-0.5" aria-label="Primary">
      <button
        type="button"
        onClick={() => handleNav("study")}
        className={`rounded-lg px-3 py-2 text-caption font-medium transition-colors duration-150 ${
          currentPage === "study"
            ? "text-deep-moss bg-deep-moss/10 dark:text-dark-moss dark:bg-dark-moss/15"
            : "text-deep-moss/80 hover:text-deep-moss dark:text-dark-moss/80 dark:hover:text-dark-moss"
        }`}
      >
        Study
      </button>
      <button
        type="button"
        onClick={() => hasSession && handleNav("library")}
        disabled={!hasSession}
        className={`rounded-lg px-3 py-2 text-caption font-medium transition-colors duration-150 ${
          currentPage === "library"
            ? "text-deep-moss bg-deep-moss/10 dark:text-dark-moss dark:bg-dark-moss/15"
            : hasSession
              ? "text-deep-moss/80 hover:text-deep-moss dark:text-dark-moss/80 dark:hover:text-dark-moss"
              : "text-deep-moss/40 cursor-not-allowed dark:text-dark-moss/40"
        }`}
        title={hasSession ? "Self-Assessment Center" : "Upload a document in Study first"}
      >
        <span className="flex items-center gap-1.5">
          <LibraryIcon className="h-4 w-4" />
          Library
        </span>
      </button>
      <button
        type="button"
        onClick={() => hasSession && handleNav("focus")}
        disabled={!hasSession}
        className={`rounded-lg px-3 py-2 text-caption font-medium transition-colors duration-150 ${
          currentPage === "focus"
            ? "text-deep-moss bg-deep-moss/10 dark:text-dark-moss dark:bg-dark-moss/15"
            : hasSession
              ? "text-deep-moss/80 hover:text-deep-moss dark:text-dark-moss/80 dark:hover:text-dark-moss"
              : "text-deep-moss/40 cursor-not-allowed dark:text-dark-moss/40"
        }`}
        title={hasSession ? "Focus mode" : "Upload a document in Study first"}
      >
        <span className="flex items-center gap-1.5">
          <Crosshair className="h-4 w-4" />
          Focus
        </span>
      </button>
      <button
        type="button"
        onClick={() => handleNav("note-taker")}
        className={`rounded-lg px-3 py-2 text-caption font-medium transition-colors duration-150 flex items-center gap-1.5 ${
          currentPage === "note-taker"
            ? "text-deep-moss bg-deep-moss/10 dark:text-dark-moss dark:bg-dark-moss/15"
            : "text-deep-moss/80 hover:text-deep-moss dark:text-dark-moss/80 dark:hover:text-dark-moss"
        }`}
        title="Whiteboard notes"
      >
        <PenTool className="h-4 w-4" />
        Note Taker
      </button>
      <button
        type="button"
        onClick={() => handleNav("focus-timer")}
        className={`rounded-lg px-3 py-2 text-caption font-medium transition-colors duration-150 flex items-center gap-1.5 ${
          currentPage === "focus-timer"
            ? "text-deep-moss bg-deep-moss/10 dark:text-dark-moss dark:bg-dark-moss/15"
            : "text-deep-moss/80 hover:text-deep-moss dark:text-dark-moss/80 dark:hover:text-dark-moss"
        }`}
        title="Focus timer"
      >
        <Timer className="h-4 w-4" />
        Focus Timer
      </button>
      <button
        type="button"
        onClick={() => handleNav("quiz")}
        className={`rounded-lg px-3 py-2 text-caption font-medium transition-colors duration-150 flex items-center gap-1.5 ${
          currentPage === "quiz"
            ? "text-deep-moss bg-deep-moss/10 dark:text-dark-moss dark:bg-dark-moss/15"
            : "text-deep-moss/80 hover:text-deep-moss dark:text-dark-moss/80 dark:hover:text-dark-moss"
        }`}
        title="Daily quiz"
      >
        <ClipboardList className="h-4 w-4" />
        Quiz
        {pendingQuiz && (
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-soft-clay dark:bg-dark-clay"
            aria-label="Pending quiz"
            title="Quiz not completed today"
          />
        )}
      </button>
    </nav>
  );
}

function StreakAndMastery() {
  const { docKey } = useSession();
  const { currentStreak, lastActivityDate } = getStreak();
  const today = new Date().toISOString().slice(0, 10);
  const showStreak = currentStreak > 0 && lastActivityDate === today;
  const mastered = docKey ? isMastered(docKey) : false;
  return (
    <div className="hidden items-center gap-2 sm:flex">
      {showStreak && (
        <span
          className="flex items-center gap-1.5 rounded-lg bg-soft-clay/20 px-2.5 py-1.5 text-caption font-semibold text-deep-moss dark:bg-dark-clay/20 dark:text-deep-moss"
          title="Daily streak"
        >
          <Flame className="h-4 w-4" />
          {currentStreak} day{currentStreak !== 1 ? "s" : ""}
        </span>
      )}
      {mastered && (
        <span
          className="flex items-center gap-1.5 rounded-lg bg-green-500/15 px-2.5 py-1.5 text-caption font-semibold text-green-700 dark:text-green-400"
          title="Document mastered"
        >
          <Award className="h-4 w-4" />
          Mastered
        </span>
      )}
    </div>
  );
}

function AppContent() {
  const [page, setPage] = useState<Page>("study");
  const [quizInProgress, setQuizInProgress] = useState(false);
  const [leaveModalTarget, setLeaveModalTarget] = useState<{ page?: Page; newSession?: true } | null>(null);
  const { theme, toggleTheme } = useTheme();
  const { resetSession } = useSession();

  const handleNavAttempt = (target: Page) => {
    setLeaveModalTarget({ page: target });
  };

  const handleNewSession = () => {
    if (quizInProgress) setLeaveModalTarget({ newSession: true });
    else {
      resetSession();
      setPage("study");
    }
  };

  const confirmLeaveQuiz = () => {
    setQuizInProgress(false);
    if (leaveModalTarget?.newSession) {
      resetSession();
      setPage("study");
    } else if (leaveModalTarget?.page) {
      setPage(leaveModalTarget.page);
    }
    setLeaveModalTarget(null);
  };

  const cancelLeaveQuiz = () => {
    setLeaveModalTarget(null);
  };

  return (
    <div className="min-h-screen bg-pale-sage text-deep-moss transition-colors duration-200 dark:bg-dark-sage dark:text-dark-moss">
      {leaveModalTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-deep-moss/20 dark:bg-dark-moss/20"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-quiz-title"
        >
          <div className="mx-4 max-w-md rounded-2xl border border-deep-moss/15 bg-white p-6 shadow-soft-lg dark:border-dark-moss/20 dark:bg-dark-sage-surface dark:shadow-soft-dark">
            <h2 id="leave-quiz-title" className="text-title font-semibold text-deep-moss dark:text-dark-moss">
              Leave quiz?
            </h2>
            <p className="mt-2 text-body text-deep-moss/80 dark:text-dark-moss/80">
              If you leave, the quiz will be terminated and you&apos;ll need to start from the beginning. Do you want to leave?
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={cancelLeaveQuiz}
                className="rounded-xl border border-deep-moss/20 px-4 py-2.5 text-caption font-semibold text-deep-moss hover:bg-deep-moss/5 dark:border-dark-moss/30 dark:text-dark-moss dark:hover:bg-dark-moss/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLeaveQuiz}
                className="rounded-xl bg-soft-clay px-4 py-2.5 text-caption font-semibold text-deep-moss shadow-soft hover:bg-soft-clay-hover dark:bg-dark-clay dark:text-deep-moss dark:hover:opacity-90"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-deep-moss/[0.12] bg-pale-sage/95 backdrop-blur-md dark:border-dark-moss/20 dark:bg-dark-sage/95 shadow-soft dark:shadow-soft-dark">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-deep-moss text-pale-sage shadow-soft dark:bg-dark-moss dark:text-deep-moss dark:shadow-soft-dark">
              <BookOpen className="h-5 w-5" aria-hidden />
            </div>
            <span className="text-title font-semibold tracking-tight text-deep-moss dark:text-dark-moss">
              Lumen
            </span>
          </div>

          <AppNav
            currentPage={page}
            setPage={setPage}
            quizInProgress={quizInProgress}
            onNavAttempt={handleNavAttempt}
          />

          <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
            <FocusTimerMiniWidget
              onOpenFocusTimer={() =>
                quizInProgress ? handleNavAttempt("focus-timer") : setPage("focus-timer")
              }
            />
            <StreakAndMastery />
            <button
              type="button"
              onClick={handleNewSession}
              className="rounded-xl bg-soft-clay px-4 py-2.5 text-caption font-semibold text-deep-moss shadow-soft transition-colors duration-150 hover:bg-soft-clay-hover focus:outline-none focus:ring-2 focus:ring-soft-clay focus:ring-offset-2 focus:ring-offset-pale-sage dark:bg-dark-clay dark:text-deep-moss dark:hover:opacity-90 dark:focus:ring-dark-clay dark:focus:ring-offset-dark-sage"
            >
              New session
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-deep-moss/80 transition-colors duration-150 hover:bg-deep-moss/10 hover:text-deep-moss focus:outline-none focus:ring-2 focus:ring-soft-clay focus:ring-offset-2 focus:ring-offset-pale-sage dark:text-dark-moss/80 dark:hover:bg-dark-moss/15 dark:hover:text-dark-moss dark:focus:ring-offset-dark-sage"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </header>
      <main
        className={
          page === "note-taker"
            ? "w-full max-w-none px-0"
            : "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"
        }
      >
        <Suspense
          fallback={
            <div className="py-8 text-center text-caption text-deep-moss/70 dark:text-dark-moss/70">
              Loading...
            </div>
          }
        >
          {page === "study" && <Home />}
          {page === "library" && (
            <Library onEnterFocus={() => (quizInProgress ? handleNavAttempt("focus") : setPage("focus"))} />
          )}
          {page === "focus" && <Focus />}
          {page === "note-taker" && <NoteTaker />}
          {page === "focus-timer" && <FocusTimerPage />}
          {page === "quiz" && (
            <QuizPage
              onQuizStarted={() => setQuizInProgress(true)}
              onQuizCompleted={() => setQuizInProgress(false)}
            />
          )}
        </Suspense>
      </main>
    </div>
  );
}

function App() {
  return (
    <SessionProvider>
      <TimerProvider>
        <AppContent />
      </TimerProvider>
    </SessionProvider>
  );
}

export default App;
