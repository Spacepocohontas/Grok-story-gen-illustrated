import { create } from "zustand";
import { heuristicAnalyze } from "./analysis";
import { buildIllustrationPrompt } from "./illustration";
import { scanSceneContinuity } from "./continuity";
import { createProject } from "./project-factory";
import { SAMPLE_FILENAME, SAMPLE_MANUSCRIPT } from "./sample-manuscript";
import * as db from "./storage";
import type { IngestResult } from "./ingest";
import type { Project, ProjectSummary, StudioStep } from "./types";

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(project: Project) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void db.putProject(project);
  }, 400);
}

type Store = {
  ready: boolean;
  projects: ProjectSummary[];
  project: Project | null;
  busy: string | null;
  hydrate: () => Promise<void>;
  refreshList: () => Promise<void>;
  createBlank: () => Promise<string>;
  createFromSample: () => Promise<string>;
  open: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setStep: (step: StudioStep) => void;
  patch: (fn: (p: Project) => Project | void) => void;
  applyIngest: (result: IngestResult) => void;
  runLocalAnalyze: () => void;
  rebuildPrompts: () => void;
};

export const useStudio = create<Store>((set, get) => ({
  ready: false,
  projects: [],
  project: null,
  busy: null,

  hydrate: async () => {
    const projects = await db.listProjects();
    set({ projects, ready: true });
  },

  refreshList: async () => {
    set({ projects: await db.listProjects() });
  },

  createBlank: async () => {
    const project = createProject();
    await db.putProject(project);
    set({ project });
    await get().refreshList();
    return project.id;
  },

  createFromSample: async () => {
    const project = createProject({
      name: "The Lantern Keeper",
      manuscript: {
        filename: SAMPLE_FILENAME,
        format: "md",
        text: SAMPLE_MANUSCRIPT,
        parseNotes: ["Loaded the sample manuscript. This copy stays on this device."],
        scanned: false,
      },
      originalManuscript: SAMPLE_MANUSCRIPT,
    });
    const local = heuristicAnalyze(SAMPLE_MANUSCRIPT, SAMPLE_FILENAME);
    project.analysis = local.analysis;
    project.chapters = local.chapters;
    project.characters = local.characters;
    project.locations = local.locations;
    project.objects = local.objects;
    project.timeline = local.timeline;
    project.storyboard = local.scenes.map((s) => ({
      ...s,
      illustrationPrompt: "",
      negativePrompt: project.settings.defaultNegative,
    }));
    project.name = local.analysis.title;
    await db.putProject(project);
    set({ project });
    await get().refreshList();
    return project.id;
  },

  open: async (id) => {
    const project = await db.getProject(id);
    set({ project });
  },

  remove: async (id) => {
    await db.deleteProject(id);
    const current = get().project;
    set({ project: current?.id === id ? null : current });
    await get().refreshList();
  },

  setStep: (step) => {
    const project = get().project;
    if (!project) return;
    const next = { ...project, step, updatedAt: Date.now() };
    set({ project: next });
    scheduleSave(next);
  },

  patch: (fn) => {
    const project = get().project;
    if (!project) return;
    const cloned = structuredClone(project) as Project;
    const returned = fn(cloned);
    const next = { ...(returned ?? cloned), updatedAt: Date.now() };
    set({ project: next });
    scheduleSave(next);
  },

  applyIngest: (result) => {
    get().patch((p) => {
      p.manuscript = {
        filename: result.filename,
        format: result.format,
        text: result.text,
        parseNotes: result.notes,
        pageCount: result.pageCount,
        scanned: result.scanned,
      };
      p.originalManuscript = result.text;
      p.name = result.filename.replace(/\.[a-z0-9]+$/i, "") || p.name;
    });
  },

  runLocalAnalyze: () => {
    const project = get().project;
    if (!project?.manuscript.text) return;
    const local = heuristicAnalyze(project.manuscript.text, project.manuscript.filename);
    get().patch((p) => {
      p.analysis = local.analysis;
      p.chapters = local.chapters;
      p.characters = local.characters;
      p.locations = local.locations;
      p.objects = local.objects;
      p.timeline = local.timeline;
      p.storyboard = local.scenes.map((s) => ({
        ...s,
        negativePrompt: p.settings.defaultNegative,
      }));
      p.name = local.analysis.title || p.name;
    });
    get().rebuildPrompts();
  },

  rebuildPrompts: () => {
    get().patch((p) => {
      p.storyboard = p.storyboard.map((s) => {
        const prompt = buildIllustrationPrompt(p, s);
        const warnings = scanSceneContinuity({ ...s, illustrationPrompt: prompt }, p.characters);
        return {
          ...s,
          illustrationPrompt: prompt,
          negativePrompt: s.negativePrompt || p.settings.defaultNegative,
          continuityWarnings: warnings,
        };
      });
    });
  },
}));
