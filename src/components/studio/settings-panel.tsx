import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAiCapabilities, listHordeModels } from "@/lib/ai/server";
import { clearKeys, loadKeys, saveKeys } from "@/lib/keys";
import { useStudio } from "@/lib/store";
import type { ImageProvider, OptionalKeys, TextProvider } from "@/lib/types";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const project = useStudio((s) => s.project);
  const patch = useStudio((s) => s.patch);
  const [keys, setKeys] = useState<OptionalKeys>({});
  const [textModels, setTextModels] = useState<string[]>([]);
  const [imageModels, setImageModels] = useState<string[]>([]);
  const [grok, setGrok] = useState({ grokText: false, grokImage: false });

  useEffect(() => {
    setKeys(loadKeys());
    void listHordeModels().then((m) => {
      setTextModels(m.textModels);
      setImageModels(m.imageModels);
    }).catch(() => {});
    void getAiCapabilities().then(setGrok).catch(() => {});
  }, []);

  if (!project) return null;

  function persistKeys(next: OptionalKeys) {
    setKeys(next);
    saveKeys(next);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-bg/60" onClick={onClose} role="presentation">
      <aside
        className="flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto bg-surface p-6 shadow-elevated"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="settings-title"
      >
        <div>
          <p className="text-xs tracking-[0.18em] text-muted uppercase">Providers</p>
          <h2 id="settings-title" className="mt-1 font-display text-2xl">
            Studio settings
          </h2>
          <p className="mt-2 text-sm text-muted">
            Default is AI Horde with no key. Optional keys stay in this browser session and are sent only to the matching provider when you generate. Session storage is not absolute security.
          </p>
        </div>

        <Field label="Text assistant">
          <NativeSelect
            value={project.settings.textProvider}
            onChange={(e) =>
              patch((p) => {
                p.settings.textProvider = e.target.value as TextProvider;
              })
            }
          >
            <option value="horde">AI Horde — no API key</option>
            {grok.grokText ? <option value="grok">Grok (included)</option> : null}
            <option value="pollinations">Pollinations</option>
            <option value="openrouter">OpenRouter (optional key)</option>
            <option value="gemini">Gemini (optional key)</option>
            <option value="openai">OpenAI (optional key)</option>
          </NativeSelect>
        </Field>

        <Field label="Illustration">
          <NativeSelect
            value={project.settings.imageProvider}
            onChange={(e) =>
              patch((p) => {
                p.settings.imageProvider = e.target.value as ImageProvider;
              })
            }
          >
            <option value="horde">AI Horde — no API key</option>
            {grok.grokImage ? <option value="grok">Grok Imagine (included)</option> : null}
            <option value="pollinations">Pollinations</option>
          </NativeSelect>
        </Field>

        <Field label="Horde text model" hint="Auto uses whichever worker picks up the job.">
          <NativeSelect
            value={project.settings.hordeTextModel}
            onChange={(e) =>
              patch((p) => {
                p.settings.hordeTextModel = e.target.value;
              })
            }
          >
            <option value="auto">Auto</option>
            {textModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field label="Horde image model">
          <NativeSelect
            value={project.settings.hordeImageModel}
            onChange={(e) =>
              patch((p) => {
                p.settings.hordeImageModel = e.target.value;
              })
            }
          >
            <option value="auto">Auto</option>
            {imageModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <div className="space-y-3">
          <p className="text-sm font-medium text-muted">Optional keys (this session only)</p>
          {(
            [
              ["openrouter", "OpenRouter"],
              ["gemini", "Gemini"],
              ["openai", "OpenAI"],
              ["pollinations", "Pollinations"],
              ["horde", "AI Horde (optional, raises priority)"],
            ] as const
          ).map(([k, label]) => (
            <Input
              key={k}
              type="password"
              autoComplete="off"
              placeholder={label}
              value={keys[k] ?? ""}
              onChange={(e) => persistKeys({ ...keys, [k]: e.target.value })}
            />
          ))}
          <Button
            variant="secondary"
            onClick={() => {
              clearKeys();
              setKeys({});
              toast("Saved keys cleared from this session.");
            }}
          >
            Clear saved keys
          </Button>
        </div>

        <p className="text-xs text-subtle">
          Anonymous Horde jobs are slower because they have lower priority. The manuscript never leaves this device except when you press a generate action.
        </p>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </aside>
    </div>
  );
}
