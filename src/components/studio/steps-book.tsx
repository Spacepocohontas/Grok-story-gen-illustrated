import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, Field, NativeSelect } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { runImage } from "@/lib/ai/run";
import { buildCoverPrompt } from "@/lib/illustration";
import { uid } from "@/lib/id";
import { useStudio } from "@/lib/store";
import { PAGE_LAYOUTS, type CoverSpec, type PageLayout } from "@/lib/types";

export function BookStep() {
  const project = useStudio((s) => s.project)!;
  const patch = useStudio((s) => s.patch);
  const [busy, setBusy] = useState<string | null>(null);

  function ensurePages() {
    if (project.pages.length) return;
    patch((p) => {
      p.pages = p.storyboard.map((s, i) => ({
        id: uid("pg"),
        chapter: s.chapter,
        pageNumber: i + 1,
        layout: "image + text",
        sceneId: s.id,
        caption: s.summary.slice(0, 140),
        narration: s.sourcePassage,
        dialogue: s.dialogue,
        title: s.chapter,
      }));
    });
  }

  async function makeCover() {
    setBusy("Composing cover…");
    try {
      const prompt = buildCoverPrompt(project);
      const result = await runImage({
        prompt,
        provider: project.settings.imageProvider,
        hordeModel: project.settings.hordeImageModel,
        width: 640,
        height: 896,
        seed: 7,
        onStatus: setBusy,
      });
      const cover: CoverSpec = {
        format: "paperback",
        titleTreatment: project.analysis?.title || project.name,
        subtitle: project.analysis?.tone || "",
        authorName: project.analysis?.author || "",
        prompt,
        images: [
          {
            id: uid("cover"),
            dataUrl: result.dataUrl,
            prompt,
            negativePrompt: project.settings.defaultNegative,
            seed: 7,
            model: result.model,
            provider: result.provider,
            createdAt: Date.now(),
            favorite: true,
            aspectRatio: "portrait",
          },
        ],
      };
      cover.activeImageId = cover.images[0]?.id;
      patch((p) => {
        p.cover = cover;
      });
      toast("Cover plate ready.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cover failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.18em] text-muted uppercase">Assemble</p>
        <h1 className="mt-1 font-display text-3xl">Pages and cover</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={ensurePages}>
          Build pages from scenes
        </Button>
        <Button onClick={() => void makeCover()} disabled={Boolean(busy)}>
          Generate cover
        </Button>
      </div>
      {busy ? <p className="text-sm text-muted">{busy}</p> : null}

      {project.cover?.images[0] ? (
        <img
          src={project.cover.images.find((i) => i.id === project.cover?.activeImageId)?.dataUrl ?? project.cover.images[0].dataUrl}
          alt="Cover"
          className="art mx-auto max-h-[480px] rounded-lg"
        />
      ) : null}

      <div className="space-y-3">
        {project.pages.map((pg) => {
          const scene = project.storyboard.find((s) => s.id === pg.sceneId);
          const img = scene?.images.find((i) => i.id === scene.activeImageId) ?? scene?.images[0];
          return (
            <Card key={pg.id} className="grid gap-4 md:grid-cols-[160px_1fr]">
              {img ? (
                <img src={img.dataUrl} alt="" className="art h-40 w-full rounded-md object-cover" />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-md bg-elevated text-xs text-muted">No plate</div>
              )}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Input
                    className="max-w-24"
                    value={String(pg.pageNumber)}
                    onChange={(e) =>
                      patch((p) => {
                        p.pages = p.pages.map((x) =>
                          x.id === pg.id ? { ...x, pageNumber: Number(e.target.value) || x.pageNumber } : x,
                        );
                      })
                    }
                    aria-label="Page number"
                  />
                  <NativeSelect
                    value={pg.layout}
                    onChange={(e) =>
                      patch((p) => {
                        p.pages = p.pages.map((x) =>
                          x.id === pg.id ? { ...x, layout: e.target.value as PageLayout } : x,
                        );
                      })
                    }
                  >
                    {PAGE_LAYOUTS.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </NativeSelect>
                </div>
                <Field label="Caption">
                  <Textarea
                    className="min-h-16"
                    value={pg.caption}
                    onChange={(e) =>
                      patch((p) => {
                        p.pages = p.pages.map((x) => (x.id === pg.id ? { ...x, caption: e.target.value } : x));
                      })
                    }
                  />
                </Field>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
