import { useState, useEffect } from "react";
import UploadForm from "../components/UploadForm";
import ChatPanel from "../components/ChatPanel";
import AnalysisPanel from "../components/AnalysisPanel";
import PreviewColumn from "../components/PreviewColumn";
import DocumentPreviewModal from "../components/DocumentPreviewModal";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import { getAnalysis } from "../lib/groq";
import { useSession } from "../contexts/SessionContext";
import type { DocumentFile } from "../types/session";
import { getDocKey, getLastDoc, setLastDoc } from "../lib/storage";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "/pdf-worker/pdf.worker.min.mjs",
  window.location.origin
).href;

const Home = () => {
  const {
    document,
    setDocument,
    analysis,
    setAnalysis,
    isAnalysisLoading,
    setIsAnalysisLoading,
    apiKeyError,
    setApiKeyError,
    recallRatings,
    docKey,
  } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    let docState: DocumentFile | null = null;

    try {
      let textContent = "";
      switch (extension) {
        case "pdf": {
          const pdfArrayBuffer = await file.arrayBuffer();
          const pdfCopy = pdfArrayBuffer.slice(0);
          const pdf = await pdfjsLib.getDocument({
            data: new Uint8Array(pdfArrayBuffer),
            useSystemFonts: true,
          }).promise;
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const pageContent = await page.getTextContent();
            textContent += pageContent.items
              .map((item: { str: string }) => item.str)
              .join(" ");
          }
          docState = {
            name: file.name,
            type: "pdf",
            content: pdfCopy,
            textContent,
          };
          break;
        }
        case "md":
        case "markdown":
        case "txt":
          textContent = await file.text();
          docState = {
            name: file.name,
            type: extension as "md" | "markdown" | "txt",
            content: textContent,
            textContent,
          };
          break;
        case "docx": {
          const arrayBuffer = await file.arrayBuffer();
          const { value: docxText } = await mammoth.extractRawText({
            arrayBuffer,
          });
          textContent = docxText;
          const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
          docState = {
            name: file.name,
            type: "docx",
            content: html,
            textContent,
          };
          break;
        }
        default:
          alert(`Unsupported file type: .${extension}`);
          break;
      }
    } catch (error) {
      console.error("Error processing file:", error);
      alert("There was an error reading your file.");
    }

    setDocument(docState);
    setIsLoading(false);
  };

  useEffect(() => {
    if (!document) return;
    const currentDocKey = getDocKey(document.name, document.textContent.length);
    const hasCurrentAnalysis =
      analysis.summary.trim().length > 0 ||
      analysis.keyPoints.length > 0 ||
      analysis.questions.length > 0;
    const lastDoc = getLastDoc();

    // Home unmounts/remounts when switching tabs; skip regeneration if this doc
    // already has analysis in session state and matches the last analyzed doc key.
    if (hasCurrentAnalysis && lastDoc?.docKey === currentDocKey) return;

    const generateAnalysis = async () => {
      setIsAnalysisLoading(true);
      try {
        const result = await getAnalysis(document.textContent);
        const keyPoints = result.key_points.map((kp, i) => ({ ...kp, id: i }));
        const questions = result.questions.map((q, i) => ({ ...q, id: i }));
        setAnalysis({
          summary: result.summary,
          keyPoints,
          questions,
        });
        setLastDoc({
          docKey: currentDocKey,
          docName: document.name,
          questions,
          keyPoints,
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("VITE_GROQ_API_KEY")
        ) {
          setApiKeyError(true);
        } else {
          console.error("Error generating analysis:", error);
          setAnalysis({
            summary: "Sorry, there was an error generating the analysis.",
            keyPoints: [],
            questions: [],
          });
        }
      }
      setIsAnalysisLoading(false);
    };
    generateAnalysis();
  }, [
    document,
    analysis.summary,
    analysis.keyPoints.length,
    analysis.questions.length,
    setAnalysis,
    setIsAnalysisLoading,
    setApiKeyError,
  ]);

  if (apiKeyError) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-deep-moss/15 bg-white p-8 shadow-soft-md dark:border-dark-moss/25 dark:bg-dark-sage-surface dark:shadow-soft-dark">
          <h2 className="text-title font-semibold text-deep-moss dark:text-dark-moss">
            API key required
          </h2>
          <p className="mt-3 text-body text-deep-moss/80 dark:text-dark-moss/80">
            VITE_GROQ_API_KEY is not configured. Add it to a{" "}
            <code className="rounded bg-pale-sage px-1.5 py-0.5 dark:bg-dark-sage">
              .env
            </code>{" "}
            file in the project root.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-xl bg-deep-moss/10 px-4 py-3 text-caption text-deep-moss dark:bg-dark-moss/15 dark:text-dark-moss">
            VITE_GROQ_API_KEY=your_api_key_here
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-soft-clay px-5 py-3 text-body font-semibold text-deep-moss shadow-soft transition-colors duration-150 hover:bg-soft-clay-hover focus:outline-none focus:ring-2 focus:ring-soft-clay focus:ring-offset-2 dark:bg-dark-clay dark:text-deep-moss dark:hover:opacity-90 dark:focus:ring-dark-clay dark:focus:ring-offset-dark-sage"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-6 py-6">
        <UploadForm onFileUpload={handleFileUpload} isLoading={isLoading} />
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-4 overflow-y-auto py-4 md:gap-4 md:py-6">
        <div className="flex min-h-[420px] shrink-0 flex-col gap-4 md:flex-row md:gap-4 md:h-[min(70vh,720px)]">
          <section
            className="flex min-h-[320px] min-w-0 flex-1 flex-col md:min-h-0 md:h-full"
            aria-label="Chat with document"
          >
            <ChatPanel
              fileName={document.name}
              summary={analysis.summary}
              keyPoints={analysis.keyPoints}
              fullDocument={document.textContent}
              isAnalysisReady={!isAnalysisLoading && (analysis.summary.length > 0 || analysis.keyPoints.length > 0)}
            />
          </section>
          <section
            className="flex min-h-[320px] min-w-0 flex-1 flex-col md:min-h-0 md:h-full"
            aria-label="Analysis and study tools"
          >
            <AnalysisPanel
              analysis={analysis}
              isLoading={isAnalysisLoading}
              recallRatings={recallRatings}
              docKey={docKey}
              docName={document.name}
            />
          </section>
        </div>
        <section
          className="hidden flex-col md:flex md:h-[880px]"
          aria-label="Document preview"
        >
          <PreviewColumn
            document={document}
            onFocusClick={() => setIsPreviewOpen(true)}
            layout="readable"
          />
        </section>
      </div>
      {isPreviewOpen && document && (
        <DocumentPreviewModal
          document={document}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </>
  );
};

export default Home;
