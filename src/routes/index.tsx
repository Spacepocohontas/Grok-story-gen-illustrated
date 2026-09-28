import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useStudio } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const navigate = useNavigate();
  const ready = useStudio((s) => s.ready);
  const projects = useStudio((s) => s.projects);
  const hydrate = useStudio((s) => s.hydrate);
  const createBlank = useStudio((s) => s.createBlank);
  const createFromSample = useStudio((s) => s.createFromSample);
  const open = useStudio((s) => s.open);
  const remove = useStudio((s) => s.remove);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  async function start(fn: () => Promise<string>) {
    const id = await fn();
    await navigate({ to: "/studio/$projectId", params: { projectId: id } });
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div>
          <p className="text-[10px] tracking-[0.24em] text-muted uppercase">Storybook Gen Illustration</p>
          <p className="font-display text-lg">Illustrated novel studio</p>
        </div>
        <Button
          onClick={() => void start(createBlank)}
        >
          <Plus className="size-4" />
          New project
        </Button>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div className="stagger-in space-y-5">
          <p className="text-xs tracking-[0.2em] text-muted uppercase">The manuscript is the authority</p>
          <h1 className="max-w-xl font-display text-4xl leading-[1.05] md:text-6xl">
            Upload a story. Protect its canon. Produce the illustrated book.
          </h1>
          <p className="max-w-xl text-base text-muted md:text-lg">
            A free-first production studio: character bibles, style lock, storyboard, illustrations, and export — without selling the plot to the model.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={() => void start(createBlank)}>
              Start from a manuscript
            </Button>
            <Button size="lg" variant="secondary" onClick={() => void start(createFromSample)}>
              Open sample: The Lantern Keeper
            </Button>
          </div>
        </div>
        <div className="ruled-page relative min-h-64 overflow-hidden rounded-2xl p-6 text-parchment-ink shadow-elevated">
          <p className="font-display text-2xl">The Lantern Keeper</p>
          <p className="mt-4 font-serif text-[15px] leading-7">
            Mira Vale was seventeen, petite, and already tired of being told she was too slight to climb the North Lantern. Her hair was white. Her eyes were a clear river-blue.
          </p>
          <p className="mt-6 text-xs tracking-[0.16em] uppercase">Canon excerpt · never invented</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="mb-4 flex items-center gap-2 text-muted">
          <BookOpen className="size-4" />
          <h2 className="font-display text-2xl text-fg">Library</h2>
        </div>
        {!ready ? <p className="text-muted">Opening local library…</p> : null}
        {ready && projects.length === 0 ? (
          <p className="text-muted">No projects on this device yet. They are stored in this browser, not in the cloud.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Card key={p.id} className="flex flex-col gap-3">
                <button
                  type="button"
                  className="text-left"
                  onClick={async () => {
                    await open(p.id);
                    await navigate({ to: "/studio/$projectId", params: { projectId: p.id } });
                  }}
                >
                  <p className="font-display text-xl">{p.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {p.characterCount} characters · {p.sceneCount} scenes · {p.imageCount} plates
                  </p>
                  <p className="text-xs text-subtle">{p.styleName}</p>
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void remove(p.id)}
                >
                  <Trash2 className="size-4" />
                  Remove
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
