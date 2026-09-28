import { ImagePlus, Link2, Plus, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import {
  detectPlatform,
  fileToReferenceImage,
  importCharacterAsset,
  importLorebookJson,
  PLATFORM_LABELS,
  type ExternalPlatform,
} from "@/lib/character-import";
import { emptyCharacter } from "@/lib/project-factory";
import { uid } from "@/lib/id";
import { useStudio } from "@/lib/store";
import { LOCKABLE_ATTRS, type Character, type LockableAttr, type LorebookEntry } from "@/lib/types";

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
  const cardInputRef = useRef<HTMLInputElement>(null);
  const loreInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function update(id: string, fn: (c: Character) => void) {
    patch((p) => {
      p.characters = p.characters.map((c) => {
        if (c.id !== id) return c;
        const n = {
          ...c,
          locks: { ...c.locks },
          referenceImages: [...(c.referenceImages ?? [])],
          externalLinks: [...(c.externalLinks ?? [])],
        };
        fn(n);
        return n;
      });
    });
  }

  async function onImportCards(files: FileList | null) {
    if (!files?.length) return;
    setBusy("Importing…");
    try {
      const allNotes: string[] = [];
      for (const file of Array.from(files)) {
        const result = await importCharacterAsset(file);
        allNotes.push(...result.notes.map((n) => `${file.name}: ${n}`));
        patch((p) => {
          if (!p.lorebook) p.lorebook = [];
          p.characters.push(...result.characters);
          p.lorebook.push(...result.lorebook);
        });
      }
      rebuildPrompts();
      toast.success(allNotes[0] || "Import complete.");
      if (allNotes.length > 1) allNotes.slice(1).forEach((n) => toast.message(n));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(null);
      if (cardInputRef.current) cardInputRef.current.value = "";
    }
  }

  async function onImportLore(files: FileList | null) {
    if (!files?.length) return;
    setBusy("Importing lorebook…");
    try {
      for (const file of Array.from(files)) {
        const entries = await importLorebookJson(file);
        patch((p) => {
          if (!p.lorebook) p.lorebook = [];
          p.lorebook.push(...entries);
        });
        toast.success(`Imported ${entries.length} lore entries from ${file.name}.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lorebook import failed.");
    } finally {
      setBusy(null);
      if (loreInputRef.current) loreInputRef.current.value = "";
    }
  }

  async function onAddReference(characterId: string, file: File | null) {
    if (!file) return;
    try {
      const ref = await fileToReferenceImage(file);
      update(characterId, (c) => {
        if (!c.referenceImages) c.referenceImages = [];
        c.referenceImages.push(ref);
        if (!c.avatarDataUrl) c.avatarDataUrl = ref.dataUrl;
      });
      toast.success("Reference image attached.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read image.");
    }
  }

  function addLink(characterId: string) {
    update(characterId, (c) => {
      if (!c.externalLinks) c.externalLinks = [];
      c.externalLinks.push({
        id: uid("link"),
        platform: "other",
        url: "",
        label: "External link",
      });
    });
  }

  const lorebook: LorebookEntry[] = project.lorebook ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.18em] text-muted uppercase">Character bible</p>
          <h1 className="mt-1 font-display text-3xl">Faces that do not drift</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Import Tavern/Chub PNG cards, JSON cards, reference images, and lorebooks. Optional links to Chub, SpicyChat,
            Character.AI, Crush, Shapes, and Tavern stay on the card for your reference.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={cardInputRef}
            type="file"
            accept=".png,.webp,.json,.charx,image/png,image/webp,application/json"
            multiple
            className="hidden"
            onChange={(e) => void onImportCards(e.target.files)}
          />
          <input
            ref={loreInputRef}
            type="file"
            accept=".json,application/json"
            multiple
            className="hidden"
            onChange={(e) => void onImportLore(e.target.files)}
          />
          <Button variant="secondary" disabled={Boolean(busy)} onClick={() => cardInputRef.current?.click()}>
            <Upload className="size-4" />
            {busy ?? "Import card / image / JSON"}
          </Button>
          <Button variant="secondary" disabled={Boolean(busy)} onClick={() => loreInputRef.current?.click()}>
            <Upload className="size-4" />
            Import lorebook JSON
          </Button>
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
      </div>

      {project.characters.length === 0 ? (
        <Card>
          <p className="text-muted">
            No characters yet. Analyze the manuscript, import a card, or add someone the source names.
          </p>
        </Card>
      ) : null}

      <div className="space-y-4">
        {project.characters.map((c) => (
          <Card key={c.id} className="space-y-4 p-4 sm:p-5">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="flex size-20 items-center justify-center overflow-hidden rounded-xl bg-elevated text-xs text-muted">
                  {c.avatarDataUrl ? (
                    <img src={c.avatarDataUrl} alt="" className="size-full object-cover" />
                  ) : (
                    "No portrait"
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-accent p-1.5 text-accent-fg shadow">
                  <ImagePlus className="size-3.5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void onAddReference(c.id, e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <Input
                    value={c.name}
                    onChange={(e) => update(c.id, (x) => (x.name = e.target.value))}
                    aria-label="Name"
                  />
                  <Input
                    value={c.role}
                    onChange={(e) => update(c.id, (x) => (x.role = e.target.value))}
                    aria-label="Role"
                  />
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
            </div>

            {(c.referenceImages?.length ?? 0) > 0 ? (
              <div className="flex flex-wrap gap-2">
                {c.referenceImages!.map((ref) => (
                  <div key={ref.id} className="group relative size-14 overflow-hidden rounded-lg bg-elevated">
                    <img src={ref.dataUrl} alt={ref.label} className="size-full object-cover" />
                    <button
                      type="button"
                      className="absolute inset-0 hidden items-center justify-center bg-bg/70 text-xs group-hover:flex"
                      onClick={() =>
                        update(c.id, (x) => {
                          x.referenceImages = (x.referenceImages ?? []).filter((r) => r.id !== ref.id);
                          if (x.avatarDataUrl === ref.dataUrl) {
                            x.avatarDataUrl = x.referenceImages[0]?.dataUrl;
                          }
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

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

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted">External character links</span>
                <Button variant="ghost" size="sm" onClick={() => addLink(c.id)}>
                  <Link2 className="size-3.5" />
                  Add link
                </Button>
              </div>
              {(c.externalLinks ?? []).map((link) => (
                <div key={link.id} className="flex flex-wrap items-center gap-2">
                  <Input
                    className="min-w-[12rem] flex-1"
                    placeholder="https://chub.ai/… / spicychat / character.ai / …"
                    value={link.url}
                    onChange={(e) => {
                      const url = e.target.value;
                      const platform = detectPlatform(url) as ExternalPlatform;
                      update(c.id, (x) => {
                        x.externalLinks = (x.externalLinks ?? []).map((l) =>
                          l.id === link.id
                            ? { ...l, url, platform, label: PLATFORM_LABELS[platform] }
                            : l,
                        );
                      });
                    }}
                  />
                  <span className="rounded-full bg-elevated px-2 py-1 text-[10px] tracking-wide text-muted uppercase">
                    {PLATFORM_LABELS[link.platform] ?? link.platform}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove link"
                    onClick={() =>
                      update(c.id, (x) => {
                        x.externalLinks = (x.externalLinks ?? []).filter((l) => l.id !== link.id);
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

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

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs tracking-[0.18em] text-muted uppercase">Lorebook</p>
            <h2 className="font-display text-2xl">World info entries</h2>
            <p className="mt-1 text-sm text-muted">
              Imported from character cards or standalone JSON. Link an entry to specific characters, or leave it global.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              patch((p) => {
                if (!p.lorebook) p.lorebook = [];
                p.lorebook.push({
                  id: uid("lore"),
                  name: "New lore entry",
                  keys: [],
                  content: "",
                  enabled: true,
                  priority: 100,
                  linkedCharacterIds: [],
                });
              })
            }
          >
            <Plus className="size-4" />
            Add lore entry
          </Button>
        </div>

        {lorebook.length === 0 ? (
          <Card>
            <p className="text-muted">No lorebook entries yet. Import a card with world info, or add one manually.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {lorebook.map((entry) => (
              <Card key={entry.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <Input
                    value={entry.name}
                    onChange={(e) =>
                      patch((p) => {
                        p.lorebook = (p.lorebook ?? []).map((l) =>
                          l.id === entry.id ? { ...l, name: e.target.value } : l,
                        );
                      })
                    }
                    aria-label="Lore name"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove lore entry"
                    onClick={() =>
                      patch((p) => {
                        p.lorebook = (p.lorebook ?? []).filter((l) => l.id !== entry.id);
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <Input
                  value={entry.keys.join(", ")}
                  placeholder="Trigger keys, comma-separated"
                  onChange={(e) =>
                    patch((p) => {
                      p.lorebook = (p.lorebook ?? []).map((l) =>
                        l.id === entry.id
                          ? {
                              ...l,
                              keys: e.target.value
                                .split(/[,;|]/)
                                .map((s) => s.trim())
                                .filter(Boolean),
                            }
                          : l,
                      );
                    })
                  }
                />
                <Textarea
                  className="min-h-24"
                  value={entry.content}
                  onChange={(e) =>
                    patch((p) => {
                      p.lorebook = (p.lorebook ?? []).map((l) =>
                        l.id === entry.id ? { ...l, content: e.target.value } : l,
                      );
                    })
                  }
                />
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={entry.enabled}
                    onChange={(e) =>
                      patch((p) => {
                        p.lorebook = (p.lorebook ?? []).map((l) =>
                          l.id === entry.id ? { ...l, enabled: e.target.checked } : l,
                        );
                      })
                    }
                  />
                  Enabled
                </label>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
