import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { emptyCharacter } from "@/lib/project-factory";
import { useStudio } from "@/lib/store";
import { LOCKABLE_ATTRS, type Character, type LockableAttr } from "@/lib/types";

const LOCK_LABEL: Record<LockableAttr, string> = {
  hair: "Hair",
  eyes: "Eyes",
  face: "Face",
  bodyType: "Body",
  clothing: "Clothing",
  accessories: "Accessories",
  age: "Age",
  palette: "Palette",
  design: "Design",
};

export function CharactersStep() {
  const project = useStudio((s) => s.project)!;
  const patch = useStudio((s) => s.patch);
  const rebuildPrompts = useStudio((s) => s.rebuildPrompts);

  function update(id: string, fn: (c: Character) => void) {
    patch((p) => {
      p.characters = p.characters.map((c) => {
        if (c.id !== id) return c;
        const n = { ...c, locks: { ...c.locks } };
        fn(n);
        return n;
      });
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.18em] text-muted uppercase">Character bible</p>
          <h1 className="mt-1 font-display text-3xl">Faces that do not drift</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Locked traits are injected into every illustration prompt. Unlock clothing if outfits change by chapter.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            patch((p) => {
              p.characters.push(emptyCharacter("New character"));
            })
          }
        >
          <Plus className="size-4" />
          Add character
        </Button>
      </div>

      {project.characters.length === 0 ? (
        <Card>
          <p className="text-muted">No characters yet. Analyze the manuscript, or add someone the source names.</p>
        </Card>
      ) : null}

      <div className="space-y-4">
        {project.characters.map((c) => (
          <Card key={c.id} className="space-y-4 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <Input value={c.name} onChange={(e) => update(c.id, (x) => (x.name = e.target.value))} aria-label="Name" />
                <Input value={c.role} onChange={(e) => update(c.id, (x) => (x.role = e.target.value))} aria-label="Role" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${c.name}`}
                onClick={() =>
                  patch((p) => {
                    p.characters = p.characters.filter((x) => x.id !== c.id);
                  })
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ["age", "Age"],
                  ["gender", "Gender"],
                  ["hair", "Hair"],
                  ["eyes", "Eyes"],
                  ["skin", "Skin"],
                  ["height", "Height"],
                  ["bodyType", "Body type"],
                  ["clothing", "Clothing"],
                  ["accessories", "Accessories"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="space-y-1">
                  <span className="text-xs text-muted">{label}</span>
                  <Input
                    value={c[key]}
                    onChange={(e) =>
                      update(c.id, (x) => {
                        x[key] = e.target.value;
                      })
                    }
                  />
                </label>
              ))}
            </div>
            <label className="block space-y-1">
              <span className="text-xs text-muted">Identifying features</span>
              <Textarea
                className="min-h-20"
                value={c.identifyingFeatures}
                onChange={(e) => update(c.id, (x) => (x.identifyingFeatures = e.target.value))}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {LOCKABLE_ATTRS.map((attr) => {
                const on = Boolean(c.locks[attr]);
                return (
                  <button
                    key={attr}
                    type="button"
                    onClick={() => {
                      update(c.id, (x) => {
                        x.locks[attr] = !on;
                      });
                      rebuildPrompts();
                    }}
                    className={`min-h-11 rounded-full px-3 text-xs font-medium ${
                      on ? "bg-accent text-accent-fg" : "bg-elevated text-muted"
                    }`}
                  >
                    Lock {LOCK_LABEL[attr]}
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
