import { FileUp, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { ingestFile, ingestPasted } from "@/lib/ingest";
import { useStudio } from "@/lib/store";

export function ManuscriptStep() {
  const project = useStudio((s) => s.project)!;
  const applyIngest = useStudio((s) => s.applyIngest);
  const patch = useStudio((s) => s.patch);
  const setStep = useStudio((s) => s.setStep);
  const runLocalAnalyze = useStudio((s) => s.runLocalAnalyze);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  async function onFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const result = await ingestFile(file);
      applyIngest(result);
      result.notes.forEach((n) => toast(n));
      if (result.scanned) {
        toast.error("This PDF looks scanned. Paste the text or provide a text-based PDF.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stagger-in space-y-6">
      <div>
        <p className="text-xs tracking-[0.18em] text-muted uppercase">Source of truth</p>
        <h1 className="mt-1 font-display text-3xl md:text-4xl">Upload the manuscript</h1>
        <p className="mt-2 max-w-2xl text-muted">
          TXT, Markdown, DOC, DOCX, and PDF. The uploaded text is canon. Generation cannot quietly replace it.
        </p>
      </div>

      <label
        className={`flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition-colors duration-150 ${
          drag ? "border-accent bg-elevated" : "border-border-strong bg-surface"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void onFiles(e.dataTransfer.files);
        }}
      >
        {busy ? <Loader2 className="size-6 animate-spin" /> : <FileUp className="size-6 text-muted" />}
        <span className="font-medium">{busy ? "Reading…" : "Drop a manuscript or choose a file"}</span>
        <span className="text-sm text-subtle">
          {project.manuscript.filename || "PDF · DOCX · TXT · MD"}
        </span>
        <input
          type="file"
          className="sr-only"
          accept=".pdf,.doc,.docx,.txt,.md,.markdown,.rtf,.html"
          onChange={(e) => void onFiles(e.target.files)}
        />
      </label>

      <Card className="p-2 sm:p-3">
        <Textarea
          aria-label="Manuscript"
          className="min-h-[320px] rounded-lg font-serif text-[15px] leading-7"
          value={project.manuscript.text}
          onChange={(e) =>
            patch((p) => {
              p.manuscript.text = e.target.value;
              if (!p.originalManuscript) p.originalManuscript = e.target.value;
            })
          }
          placeholder="Paste the story here if you would rather not upload a file."
        />
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            applyIngest(ingestPasted(project.manuscript.text));
            toast("Pasted text is now the working manuscript.");
          }}
          disabled={!project.manuscript.text.trim()}
        >
          Use pasted text
        </Button>
        <Button
          onClick={() => {
            runLocalAnalyze();
            setStep("canon");
            toast("Canon pass complete. Review before generating art.");
          }}
          disabled={!project.manuscript.text.trim()}
        >
          Analyze manuscript
        </Button>
      </div>

      {project.manuscript.parseNotes.length ? (
        <ul className="space-y-1 text-sm text-muted">
          {project.manuscript.parseNotes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}

      <p className="text-xs text-subtle tabular-nums">
        {project.manuscript.text.length.toLocaleString()} characters
        {project.originalManuscript && project.originalManuscript !== project.manuscript.text
          ? " · working copy differs from original"
          : ""}
      </p>
    </div>
  );
}
