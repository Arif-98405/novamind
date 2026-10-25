import { useState } from "react";
import {
  FileText,
  Upload,
  Wand2,
  Trash2,
  Download,
  FileUp,
  ListChecks,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Section, Badge, EmptyState } from "../components/ui.jsx";
import { summarizeText } from "../utils/ai.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_TEXT_LENGTH = 12000;

async function extractPdfText(file) {
  const pdfData = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");

    pages.push(pageText);

    if (pages.join("\n").length >= MAX_TEXT_LENGTH) {
      break;
    }
  }

  return pages.join("\n\n").slice(0, MAX_TEXT_LENGTH).trim();
}

export default function Summarizer({ data }) {
  const { summaries, addSummary, deleteSummary } = data;
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError("");
    setText("");

    try {
      if (
        file.type === "text/plain" ||
        file.type === "text/markdown" ||
        /\.(txt|md)$/i.test(file.name)
      ) {
        setText((await file.text()).slice(0, MAX_TEXT_LENGTH));
      } else if (
        file.type === "application/pdf" ||
        /\.pdf$/i.test(file.name)
      ) {
        setBusy(true);
        const extractedText = await extractPdfText(file);

        if (!extractedText) {
          setError(
            "No selectable text was found in this PDF. It may be a scanned document; try an OCR tool or paste the text manually."
          );
        } else {
          setText(extractedText);
        }
      } else {
        const content = await file.text();
        setText(content.slice(0, MAX_TEXT_LENGTH));
      }
    } catch (err) {
      console.error("File text extraction failed:", err);
      setError(
        "Could not read this file. Check that the PDF is valid and not password-protected, then try again."
      );
    } finally {
      setBusy(false);
      // Clear the input so the same file can be selected again after an error.
      event.target.value = "";
    }
  };

  const summarize = () => {
    if (text.trim().length < 40 || busy) return;

    setBusy(true);
    setError("");

    setTimeout(() => {
      try {
        const { summary, questions } = summarizeText(text);
        addSummary({
          title: fileName || "Pasted text",
          summary,
          questions,
          preview: text.slice(0, 120),
        });
      } catch (err) {
        console.error("Summary generation failed:", err);
        setError("Could not generate a summary. Please try again.");
      } finally {
        setBusy(false);
      }
    }, 500);
  };

  const clearText = () => {
    setText("");
    setFileName("");
    setError("");
  };

  const download = (summary) => {
    const content = [
      `Summary of: ${summary.title}`,
      "",
      summary.summary,
      "",
      "Important Questions:",
      ...summary.questions.map((question, index) => `${index + 1}. ${question}`),
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${summary.title.replace(/\.[^.]+$/, "")}-summary.txt`;
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <Section
          title="Notes Summarizer"
          subtitle="Paste text or upload a .txt, .md, or text-based PDF"
        >
          <div className="space-y-4">
            <div className="rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] p-6 text-center transition-all hover:border-brand-500/40">
              <FileUp className="mx-auto h-8 w-8 text-brand-300" />
              <p className="mt-2 text-sm text-slate-300">
                Drop a file or click to upload
              </p>
              <p className="text-[11px] text-slate-500">
                Supports .txt, .md, and text-based PDFs
              </p>

              <label className="btn-ghost mt-3 inline-flex cursor-pointer text-xs">
                <Upload className="h-3.5 w-3.5" />
                Choose file
                <input
                  type="file"
                  className="hidden"
                  accept=".txt,.md,.pdf,text/plain,application/pdf"
                  onChange={handleFile}
                />
              </label>

              {fileName && (
                <div className="mt-2 text-xs text-brand-300">
                  Loaded: {fileName}
                </div>
              )}
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200"
              >
                {error}
              </p>
            )}

            <div>
              <label className="label" htmlFor="summarizer-text">
                Text content
              </label>
              <textarea
                id="summarizer-text"
                className="input min-h-[220px] resize-y font-mono text-xs leading-relaxed"
                placeholder="Paste your notes, an article, or any study text here..."
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                <span>{text.length} characters</span>
                <button
                  type="button"
                  onClick={clearText}
                  className="hover:text-slate-300"
                >
                  Clear
                </button>
              </div>
            </div>

            <button
              type="button"
              className="btn-primary w-full"
              onClick={summarize}
              disabled={busy || text.trim().length < 40}
            >
              <Wand2 className="h-4 w-4" />
              {busy
                ? fileName.toLowerCase().endsWith(".pdf") && !text
                  ? "Extracting PDF text..."
                  : "Summarizing..."
                : "Generate Summary"}
            </button>

            <p className="text-center text-[11px] text-slate-500">
              Summary and questions are generated locally from the extracted
              text.
            </p>
          </div>
        </Section>
      </div>

      <div className="lg:col-span-2">
        <Section
          title="Saved Summaries"
          subtitle={`${summaries.length} saved`}
        >
          {summaries.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No summaries yet"
              subtitle="Your generated summaries will appear here."
            />
          ) : (
            <div className="space-y-3">
              {summaries.map((summary) => (
                <div
                  key={summary.id}
                  className="rounded-xl border border-white/5 bg-white/[0.03] p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">
                        {summary.title}
                      </div>
                      <Badge tone="brand">
                        <FileText className="h-3 w-3" />
                        Summary
                      </Badge>
                    </div>

                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => download(summary)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white"
                        aria-label={`Download summary of ${summary.title}`}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSummary(summary.id)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
                        aria-label={`Delete summary of ${summary.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-300">
                    {summary.summary}
                  </p>

                  <details className="mt-2">
                    <summary className="flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-brand-300">
                      <ListChecks className="h-3.5 w-3.5" />
                      {summary.questions.length} important questions
                    </summary>
                    <ol className="mt-2 list-inside list-decimal space-y-1 text-xs text-slate-300">
                      {summary.questions.map((question, index) => (
                        <li key={index}>{question}</li>
                      ))}
                    </ol>
                  </details>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}