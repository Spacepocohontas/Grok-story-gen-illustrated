import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, Field, NativeSelect } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { ASPECT_RATIOS, PAGE_LAYOUTS, SHOT_TYPES, type AspectRatio, type Scene, type ShotType } from "@/lib/types";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/cn";

export function StoryboardStep() {
  const project = useStudio((s) => s.project)!;
  const patch = useStudio((s) => s.patch);
  const rebuildPrompts = useStudio((s) => s.rebuildPrompts);
  const [selected, setSelected] = useState(project.storyboard[0]?.id);

  const scene = project.storyboard.find((s) => s.id === selected) ?? project.storyboard[0];

  function move(id: string, dir: -1 | 1) {
    patch((p) => {
      const i = p.storyboard.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= p.storyboard.length) return;
      const copy = [...p.storyboard];
      const [item] = copy.splice(i, 1);
      copy.splice(j, 0, item!);
      p.storyboard = copy.map((s, n) => ({ ...s, sceneNumber: n + 1 }));
    });
  }

  function edit(fn: (s: Scene) => void) {
    if (!scene) return;
    patch((p) => {
      p.storyboard = p.storyboard.map((s) => {
        if (s.id !== scene.id) return s;
        const n = { ...s };
        fn(n);
        return n;
      });
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.18em] text-muted uppercase">Storyboard</p>
          <h1 className="mt-1 font-display text-3xl">Scenes in story order</h1>
        </div>
        <Button variant="secondary" onClick={rebuildPrompts}>
          Rebuild prompts
        </Button>
      </div>

      {project.storyboard.length === 0 ? (
        <Card>
          <p className="text-muted">Analyze the manuscript first so scenes can be planned from the source.</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
          <div className="space-y-1">
            {project.storyboard.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelected(s.id)}
                  className={cn(
                    "min-h-14 flex-1 rounded-lg px-3 py-2 text-left text-sm",
                    s.id === scene?.id ? "bg-elevated" : "bg-surface hover:bg-elevated/50",
                  )}
                >
                  <span className="text-xs text-muted tabular-nums">{String(s.sceneNumber).padStart(2, "0")}</span>
                  <p className="line-clamp-2">{s.summary}</p>
                </button>
                <div className="flex flex-col">
                  <button type="button" className="size-9 text-muted" onClick={() => move(s.id, -1)} aria-label="Move up" disabled={i === 0}>
                    <ChevronUp className="mx-auto size-4" />
                  </button>
                  <button
                    type="button"
                    className="size-9 text-muted"
                    onClick={() => move(s.id, 1)}
                    aria-label="Move down"
                    disabled={i === project.storyboard.length - 1}
                  >
                    <ChevronDown className="mx-auto size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {scene ? (
            <Card className="space-y-4">
              <p className="text-xs text-muted">
                {scene.chapter} · {scene.shotType}
              </p>
              <p className="whitespace-pre-wrap font-serif text-[15px] leading-7 text-fg">{scene.sourcePassage}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Shot type">
                  <NativeSelect value={scene.shotType} onChange={(e) => edit((s) => (s.shotType = e.target.value as ShotType))}>
                    {SHOT_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Aspect">
                  <NativeSelect
                    value={scene.aspectRatio}
                    onChange={(e) => edit((s) => (s.aspectRatio = e.target.value as AspectRatio))}
                  >
                    {ASPECT_RATIOS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
              <Field label="Illustration prompt">
                <Textarea
                  className="min-h-40"
                  value={scene.illustrationPrompt}
                  onChange={(e) => edit((s) => (s.illustrationPrompt = e.target.value))}
                />
              </Field>
              <Field label="Negative prompt">
                <Textarea
                  className="min-h-20"
                  value={scene.negativePrompt}
                  onChange={(e) => edit((s) => (s.negativePrompt = e.target.value))}
                />
              </Field>
              {scene.continuityWarnings.filter((w) => w.resolution === "open").length ? (
                <div className="space-y-2 rounded-lg bg-warn/10 p-3 text-sm">
                  {scene.continuityWarnings
                    .filter((w) => w.resolution === "open")
                    .map((w) => (
                      <div key={w.id}>
                        <p>{w.message}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(["canon", "scene", "ignore"] as const).map((r) => (
                            <Button
                              key={r}
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                edit((s) => {
                                  s.continuityWarnings = s.continuityWarnings.map((x) =>
                                    x.id === w.id ? { ...x, resolution: r } : x,
                                  );
                                })
                              }
                            >
                              {r === "canon" ? "Keep manuscript canon" : r === "scene" ? "Use scene instruction" : "Ignore"}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              ) : null}
              <p className="text-xs text-subtle">Layout hint for later assembly: {PAGE_LAYOUTS[0]}</p>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
