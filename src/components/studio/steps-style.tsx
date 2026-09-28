import { Button } from "@/components/ui/button";
import { Field, NativeSelect } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { STYLE_PRESETS } from "@/lib/constants";
import { useStudio } from "@/lib/store";
import type { ArtStyle } from "@/lib/types";
import { cn } from "@/lib/cn";

export function StyleStep() {
  const project = useStudio((s) => s.project)!;
  const patch = useStudio((s) => s.patch);
  const rebuildPrompts = useStudio((s) => s.rebuildPrompts);

  function apply(style: ArtStyle) {
    patch((p) => {
      p.style = { ...style, customDirection: p.style.customDirection, applyScope: p.style.applyScope };
    });
    rebuildPrompts();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.18em] text-muted uppercase">Art style lab</p>
        <h1 className="mt-1 font-display text-3xl">Change the rendering, not the story</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Style controls line, light, and medium. It cannot add a character the manuscript does not name.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {STYLE_PRESETS.map((s) => {
          const active = project.style.presetId === s.presetId;
          return (
            <button
              key={s.presetId}
              type="button"
              onClick={() => apply(s)}
              className={cn(
                "rounded-xl p-4 text-left shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)] transition-colors duration-150",
                active ? "bg-elevated" : "bg-surface hover:bg-elevated/50",
              )}
            >
              <p className="font-medium">{s.name}</p>
              <p className="mt-1 text-sm text-muted">{s.description}</p>
            </button>
          );
        })}
      </div>
      {project.style.presetId === "custom" ? (
        <Field label="Custom visual direction">
          <Textarea
            value={project.style.customDirection}
            placeholder="Dark 1990s supernatural anime with hand-painted backgrounds, muted jewel tones, dramatic moonlight…"
            onChange={(e) => {
              patch((p) => {
                p.style.customDirection = e.target.value;
              });
              rebuildPrompts();
            }}
          />
        </Field>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Apply style to">
          <NativeSelect
            value={project.style.applyScope}
            onChange={(e) =>
              patch((p) => {
                p.style.applyScope = e.target.value as ArtStyle["applyScope"];
              })
            }
          >
            <option value="book">Entire book</option>
            <option value="chapter">Selected chapter</option>
            <option value="page">Selected page</option>
          </NativeSelect>
        </Field>
        <div className="flex items-end">
          <Button variant="secondary" onClick={rebuildPrompts} className="w-full">
            Rebuild all prompts in this style
          </Button>
        </div>
      </div>
    </div>
  );
}
