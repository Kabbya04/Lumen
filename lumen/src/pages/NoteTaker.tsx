import { useMemo } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

const STORAGE_KEY = "lumen-note-taker-scene";

type ExcalidrawScene = {
  elements?: unknown[];
  appState: {
    collaborators: Map<string, unknown>;
    showWelcomeScreen?: boolean;
  };
};

function loadScene(): ExcalidrawScene | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { elements?: unknown[]; appState?: unknown; files?: unknown };
    if (!Array.isArray(parsed.elements)) return null;
    // Migrate legacy payloads by stripping unsafe fields written by old versions.
    if ("appState" in parsed || "files" in parsed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ elements: parsed.elements }));
    }
    return {
      elements: parsed.elements,
      appState: {
        collaborators: new Map<string, unknown>(),
        showWelcomeScreen: false,
      },
    };
  } catch {
    return null;
  }
}

export default function NoteTaker() {
  const initialData = useMemo(() => {
    const loaded = loadScene();
    if (loaded) return loaded;
    return {
      appState: {
        collaborators: new Map<string, unknown>(),
        showWelcomeScreen: false,
      },
    };
  }, []);

  return (
    <div className="note-taker-excalidraw h-[calc(100vh-4rem)] w-full min-h-0">
      <div className="flex h-full w-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 w-full overflow-hidden bg-white dark:bg-dark-sage-surface">
          <Excalidraw
            name="Notes"
            aiEnabled={false}
            initialData={initialData}
            onChange={(elements) => {
              try {
                // Persist only scene elements to avoid runtime crashes from non-serializable app state.
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ elements }));
              } catch {
                // Ignore persistence failures so the editor never crashes.
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
