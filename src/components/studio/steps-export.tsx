import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { exportImageZip, exportPdf, exportProjectJson, exportPromptPack } from "@/lib/export-book";
import { useStudio } from "@/lib/store";

export function ExportStep() {
  const project = useStudio((s) => s.project)!;

  async function run(label: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      toast(`${label} downloaded.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.18em] text-muted uppercase">Export</p>
        <h1 className="mt-1 font-display text-3xl">Take the book with you</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Everything lives on this device until you download it. A failed generation never deletes the manuscript.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-xl">Illustrated PDF</h2>
          <p className="text-sm text-muted">Cover plus one plate and passage per scene.</p>
          <Button onClick={() => void run("PDF", () => exportPdf(project))}>Download PDF</Button>
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-xl">Plate archive</h2>
          <p className="text-sm text-muted">ZIP of generated PNG/JPG/WebP images.</p>
          <Button variant="secondary" onClick={() => void run("ZIP", () => exportImageZip(project))}>
            Download ZIP
          </Button>
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-xl">Prompt pack</h2>
          <p className="text-sm text-muted">Plain-text prompts for every scene.</p>
          <Button variant="secondary" onClick={() => run("Prompt pack", () => exportPromptPack(project))}>
            Download prompts
          </Button>
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-xl">Project file</h2>
          <p className="text-sm text-muted">JSON of manuscript, bible, scenes, and images.</p>
          <Button variant="secondary" onClick={() => run("Project", () => exportProjectJson(project))}>
            Download JSON
          </Button>
        </Card>
      </div>
    </div>
  );
}
