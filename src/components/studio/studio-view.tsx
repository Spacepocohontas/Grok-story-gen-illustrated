import { Link } from "@tanstack/react-router";
import {
  BookMarked,
  BookOpen,
  Download,
  Image as ImageIcon,
  LayoutGrid,
  Lock,
  Map,
  Palette,
  Settings,
  Shield,
  Upload,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { STEP_HINT, STEP_LABEL } from "@/lib/project-factory";
import { useStudio } from "@/lib/store";
import { STUDIO_STEPS, type StudioStep } from "@/lib/types";
import { cn } from "@/lib/cn";
import { SettingsPanel } from "./settings-panel";
import { ManuscriptStep } from "./steps-manuscript";
import { CanonStep } from "./steps-canon";
import { CharactersStep } from "./steps-characters";
import { WorldStep } from "./steps-world";
import { StyleStep } from "./steps-style";
import { StoryboardStep } from "./steps-storyboard";
import { IllustrateStep } from "./steps-illustrate";
import { BookStep } from "./steps-book";
import { ExportStep } from "./steps-export";

const ICONS: Record<StudioStep, typeof Upload> = {
  manuscript: Upload,
  canon: Shield,
  characters: Users,
  world: Map,
  style: Palette,
  storyboard: LayoutGrid,
  illustrate: ImageIcon,
  book: BookMarked,
  export: Download,
};

export function StudioView() {
  const project = useStudio((s) => s.project);
  const setStep = useStudio((s) => s.setStep);
  const [settings, setSettings] = useState(false);

  if (!project) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-8">
        <div className="text-center">
          <p className="font-display text-2xl">No manuscript open</p>
          <Button className="mt-4" asChild>
            <Link to="/">Back to library</Link>
          </Button>
        </div>
      </div>
    );
  }

  const step = project.step;
  const idx = STUDIO_STEPS.indexOf(step);

  return (
    <div className="flex min-h-dvh bg-bg text-fg">
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-border bg-surface/80 lg:flex">
        <Link to="/" className="block px-5 py-5">
          <p className="text-[10px] tracking-[0.22em] text-muted uppercase">Storybook Gen</p>
          <p className="font-display text-lg leading-tight">Illustration</p>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 px-3 pb-4" aria-label="Studio steps">
          {STUDIO_STEPS.map((s) => {
            const Icon = ICONS[s];
            const active = s === step;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStep(s)}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 text-left text-sm transition-colors duration-150",
                  active ? "bg-elevated text-fg" : "text-muted hover:bg-elevated/60 hover:text-fg",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {STEP_LABEL[s]}
              </button>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-border p-4">
          <div className="flex items-center gap-2 text-xs text-muted">
            {project.canonLock ? <Lock className="size-3.5" /> : <Shield className="size-3.5" />}
            {project.canonLock ? "Canon lock on" : "Canon lock off"}
          </div>
          <Button variant="secondary" size="sm" className="w-full" onClick={() => setSettings(true)}>
            <Settings className="size-4" />
            Settings
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 lg:px-8">
          <div className="min-w-0">
            <p className="truncate font-display text-lg">{project.name}</p>
            <p className="truncate text-xs text-muted">
              {STEP_LABEL[step]} · {STEP_HINT[step]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSettings(true)} aria-label="Settings">
              <Settings className="size-5" />
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link to="/">Library</Link>
            </Button>
          </div>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 lg:hidden">
          {STUDIO_STEPS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s)}
              className={cn(
                "min-h-11 shrink-0 rounded-full px-3 text-xs font-medium",
                s === step ? "bg-accent text-accent-fg" : "bg-elevated text-muted",
              )}
            >
              {STEP_LABEL[s]}
            </button>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-5xl">
            {step === "manuscript" && <ManuscriptStep />}
            {step === "canon" && <CanonStep />}
            {step === "characters" && <CharactersStep />}
            {step === "world" && <WorldStep />}
            {step === "style" && <StyleStep />}
            {step === "storyboard" && <StoryboardStep />}
            {step === "illustrate" && <IllustrateStep />}
            {step === "book" && <BookStep />}
            {step === "export" && <ExportStep />}
          </div>
        </main>

        <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 lg:px-8">
          <Button
            variant="secondary"
            disabled={idx <= 0}
            onClick={() => setStep(STUDIO_STEPS[idx - 1]!)}
          >
            Back
          </Button>
          <p className="hidden text-xs text-subtle sm:block">
            <BookOpen className="mr-1 inline size-3.5" />
            Original manuscript is preserved separately from edits.
          </p>
          <Button
            disabled={idx >= STUDIO_STEPS.length - 1}
            onClick={() => setStep(STUDIO_STEPS[idx + 1]!)}
          >
            Continue
          </Button>
        </footer>
      </div>
      {settings ? <SettingsPanel onClose={() => setSettings(false)} /> : null}
    </div>
  );
}
