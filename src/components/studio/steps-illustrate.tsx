import { Heart, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { runImage } from "@/lib/ai/run";
import { ASPECT_SIZE } from "@/lib/constants";
import { uid } from "@/lib/id";
import { useStudio } from "@/lib/store";
import type { GeneratedImage, Scene } from "@/lib/types";

export function IllustrateStep() {
  const project = useStudio((s) => s.project)!;
  const patch = useStudio((s) => s.patch);
  const [activeId, setActiveId] = useState(project.storyboard[0]?.id);
  const scene = project.storyboard.find((s) => s.id === activeId) ?? project.storyboard[0];
  const [status, setStatus] = useState<string | null>(null);

  async function generate(target: Scene, variation = false) {
    if (!target.illustrationPrompt.trim()) {
      toast("Rebuild prompts from the storyboard first.");
      return;
    }
    const size = ASPECT_SIZE[target.aspectRatio];
    const seed = variation ? target.seed + Math.floor(Math.random() * 99) : target.seed;
    patch((p) => {
      p.storyboard = p.storyboard.map((s) => (s.id === target.id ? { ...s, status: "generating", error: undefined } : s));
      p.queue.push({
        id: uid("job"),
        kind: "image",
        label: `Scene ${target.sceneNumber}`,
        sceneId: target.id,
        status: "processing",
        createdAt: Date.now(),
      });
    });
    setStatus("Queued…");
    try {
      const result = await runImage({
        prompt: target.illustrationPrompt,
        negative: target.negativePrompt,
        provider: project.settings.imageProvider,
        hordeModel: project.settings.hordeImageModel,
        width: size.w,
        height: size.h,
        seed,
        onStatus: setStatus,
      });
      const image: GeneratedImage = {
        id: uid("img"),
        dataUrl: result.dataUrl,
        prompt: target.illustrationPrompt,
        negativePrompt: target.negativePrompt,
        seed,
        model: result.model,
        provider: result.provider,
        createdAt: Date.now(),
        favorite: false,
        aspectRatio: target.aspectRatio,
      };
      patch((p) => {
        p.storyboard = p.storyboard.map((s) =>
          s.id === target.id
            ? { ...s, status: "done", images: [...s.images, image], activeImageId: image.id, seed }
            : s,
        );
        p.queue = p.queue.map((q) =>
          q.sceneId === target.id && q.status === "processing" ? { ...q, status: "completed" } : q,
        );
      });
      toast(`Plate ready via ${result.provider}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Illustration failed.";
      patch((p) => {
        p.storyboard = p.storyboard.map((s) => (s.id === target.id ? { ...s, status: "failed", error: message } : s));
        p.queue = p.queue.map((q) =>
          q.sceneId === target.id && q.status === "processing" ? { ...q, status: "failed", error: message } : q,
        );
      });
      toast.error(message);
    } finally {
      setStatus(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.18em] text-muted uppercase">Illustration</p>
        <h1 className="mt-1 font-display text-3xl">Generate the plates</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Each image combines the scene, character bible, place, and locked style. You can keep editing while a job is in the queue.
        </p>
      </div>

      {project.storyboard.length === 0 ? (
        <Card>
          <p className="text-muted">No scenes yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,240px)_1fr]">
          <div className="space-y-1">
            {project.storyboard.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveId(s.id)}
                className={`flex min-h-12 w-full items-center justify-between rounded-lg px-3 text-left text-sm ${
                  s.id === scene?.id ? "bg-elevated" : "bg-surface"
                }`}
              >
                <span>Scene {s.sceneNumber}</span>
                <span className="text-xs text-muted">{s.status}</span>
              </button>
            ))}
          </div>
          {scene ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl bg-elevated">
                {scene.images.find((i) => i.id === scene.activeImageId)?.dataUrl || scene.images.at(-1)?.dataUrl ? (
                  <img
                    className="art max-h-[70vh] w-full object-contain"
                    alt={`Illustration for scene ${scene.sceneNumber}`}
                    src={scene.images.find((i) => i.id === scene.activeImageId)?.dataUrl ?? scene.images.at(-1)?.dataUrl}
                  />
                ) : (
                  <div className="flex min-h-72 flex-col items-center justify-center gap-2 p-8 text-center text-muted">
                    {scene.status === "generating" ? <Loader2 className="size-6 animate-spin" /> : null}
                    <p>{status ?? "No plate yet. Generate from the locked prompt."}</p>
                  </div>
                )}
              </div>
              {scene.error ? <p className="text-sm text-danger">{scene.error}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void generate(scene)} disabled={scene.status === "generating"}>
                  {scene.status === "generating" ? <Loader2 className="size-4 animate-spin" /> : null}
                  Generate
                </Button>
                <Button variant="secondary" onClick={() => void generate(scene, true)} disabled={scene.status === "generating"}>
                  <RefreshCw className="size-4" />
                  Variation
                </Button>
              </div>
              {scene.images.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto">
                  {scene.images.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      className="relative size-20 shrink-0 overflow-hidden rounded-md"
                      onClick={() =>
                        patch((p) => {
                          p.storyboard = p.storyboard.map((s) => (s.id === scene.id ? { ...s, activeImageId: img.id } : s));
                        })
                      }
                    >
                      <img src={img.dataUrl} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
              {scene.images.length ? (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      patch((p) => {
                        p.storyboard = p.storyboard.map((s) =>
                          s.id === scene.id
                            ? {
                                ...s,
                                images: s.images.map((i) =>
                                  i.id === s.activeImageId ? { ...i, favorite: !i.favorite } : i,
                                ),
                              }
                            : s,
                        );
                      })
                    }
                  >
                    <Heart className="size-4" />
                    Favorite
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      patch((p) => {
                        p.storyboard = p.storyboard.map((s) =>
                          s.id === scene.id
                            ? { ...s, images: s.images.filter((i) => i.id !== s.activeImageId), activeImageId: undefined }
                            : s,
                        );
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                    Delete plate
                  </Button>
                </div>
              ) : null}
              <p className="text-xs text-subtle">
                Seed {scene.seed} · {scene.aspectRatio} · {project.settings.imageProvider}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
