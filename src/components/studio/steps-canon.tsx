import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, Field } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { analysisPrompt } from "@/lib/ai/prompts";
import { runText } from "@/lib/ai/run";
import { parseJsonBlock } from "@/lib/analysis";
import { applyStructuredAnalysis } from "@/lib/merge-analysis";
import { useStudio } from "@/lib/store";
import { NOT_STATED } from "@/lib/types";

export function CanonStep() {
  const project = useStudio((s) => s.project)!;
  const patch = useStudio((s) => s.patch);
  const runLocalAnalyze = useStudio((s) => s.runLocalAnalyze);
  const rebuildPrompts = useStudio((s) => s.rebuildPrompts);
  const [busy, setBusy] = useState<string | null>(null);

  async function analyzeAi() {
    setBusy("Reading the manuscript with the production assistant…");
    try {
      const { text, provider } = await runText({
        prompt: analysisPrompt(project),
        provider: project.settings.textProvider,
        hordeModel: project.settings.hordeTextModel,
        onStatus: setBusy,
      });
      const json = parseJsonBlock(text);
      if (json) {
        patch((p) => applyStructuredAnalysis(p, json));
        rebuildPrompts();
        toast(`Canon updated via ${provider}. Gaps stay marked as not stated.`);
      } else {
        toast("The assistant did not return structured JSON. Local canon pass is unchanged. You can retry.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setBusy(null);
    }
  }

  const a = project.analysis;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.18em] text-muted uppercase">Canon lock</p>
          <h1 className="mt-1 font-display text-3xl">What the story actually says</h1>
          <p className="mt-2 max-w-2xl text-muted">
            If it is not in the manuscript, it is not in the book. Empty fields stay as “Not stated in source material.”
          </p>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={project.canonLock}
            onChange={(e) =>
              patch((p) => {
                p.canonLock = e.target.checked;
              })
            }
          />
          Keep canon lock
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={runLocalAnalyze} disabled={!project.manuscript.text}>
          Local canon pass
        </Button>
        <Button onClick={() => void analyzeAi()} disabled={Boolean(busy) || !project.manuscript.text}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Analyze with AI
        </Button>
      </div>
      {busy ? <p className="text-sm text-muted">{busy}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title">
          <Input
            value={a?.title ?? project.name}
            onChange={(e) =>
              patch((p) => {
                p.name = e.target.value;
                if (p.analysis) p.analysis.title = e.target.value;
              })
            }
          />
        </Field>
        <Field label="Author">
          <Input
            value={a?.author ?? NOT_STATED}
            onChange={(e) =>
              patch((p) => {
                if (!p.analysis) return;
                p.analysis.author = e.target.value;
              })
            }
          />
        </Field>
        <Field label="Genre">
          <Input
            value={a?.genre ?? NOT_STATED}
            onChange={(e) =>
              patch((p) => {
                if (p.analysis) p.analysis.genre = e.target.value;
              })
            }
          />
        </Field>
        <Field label="Tone">
          <Input
            value={a?.tone ?? NOT_STATED}
            onChange={(e) =>
              patch((p) => {
                if (p.analysis) p.analysis.tone = e.target.value;
              })
            }
          />
        </Field>
        <Field label="Setting">
          <Input
            value={a?.setting ?? NOT_STATED}
            onChange={(e) =>
              patch((p) => {
                if (p.analysis) p.analysis.setting = e.target.value;
              })
            }
          />
        </Field>
        <Field label="Time period">
          <Input
            value={a?.timePeriod ?? NOT_STATED}
            onChange={(e) =>
              patch((p) => {
                if (p.analysis) p.analysis.timePeriod = e.target.value;
              })
            }
          />
        </Field>
      </div>
      <Field label="Synopsis">
        <Textarea
          value={a?.synopsis ?? ""}
          onChange={(e) =>
            patch((p) => {
              if (p.analysis) p.analysis.synopsis = e.target.value;
            })
          }
        />
      </Field>

      <div className="grid gap-3 md:grid-cols-2">
        {project.chapters.map((ch) => (
          <Card key={ch.id}>
            <p className="text-xs text-muted">Chapter</p>
            <h2 className="font-display text-xl">{ch.title}</h2>
            <p className="mt-2 line-clamp-4 text-sm text-muted">{ch.text.slice(0, 280)}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
