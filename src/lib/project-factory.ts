import { defaultStyle, DEFAULT_NEGATIVE } from "./constants";
import { uid } from "./id";
import type { Character, Project, ProjectSettings, StudioStep } from "./types";
import { NOT_STATED } from "./types";

export function defaultSettings(): ProjectSettings {
  return {
    textProvider: "horde",
    imageProvider: "horde",
    hordeTextModel: "auto",
    hordeImageModel: "auto",
    defaultAspect: "portrait",
    defaultNegative: DEFAULT_NEGATIVE,
  };
}

export function emptyCharacter(name = ""): Character {
  return {
    id: uid("ch"),
    name,
    aliases: NOT_STATED,
    role: NOT_STATED,
    age: NOT_STATED,
    gender: NOT_STATED,
    appearance: NOT_STATED,
    hair: NOT_STATED,
    eyes: NOT_STATED,
    skin: NOT_STATED,
    height: NOT_STATED,
    bodyType: NOT_STATED,
    clothing: NOT_STATED,
    accessories: NOT_STATED,
    identifyingFeatures: NOT_STATED,
    personality: NOT_STATED,
    relationships: NOT_STATED,
    powers: NOT_STATED,
    arc: NOT_STATED,
    visualIdentifiers: NOT_STATED,
    locks: {
      hair: true,
      eyes: true,
      face: true,
      bodyType: true,
      clothing: false,
      accessories: true,
      age: true,
      palette: true,
      design: true,
    },
    notes: "",
    source: "user",
    avatarDataUrl: undefined,
    referenceImages: [],
    externalLinks: [],
  };
}

export function createProject(partial?: Partial<Project>): Project {
  const now = Date.now();
  return {
    id: uid("proj"),
    name: "Untitled manuscript",
    createdAt: now,
    updatedAt: now,
    manuscript: {
      filename: "",
      format: "txt",
      text: "",
      parseNotes: [],
      scanned: false,
    },
    originalManuscript: "",
    chapters: [],
    analysis: null,
    characters: [],
    locations: [],
    objects: [],
    timeline: [],
    lorebook: [],
    style: defaultStyle(),
    storyboard: [],
    pages: [],
    cover: null,
    canonLock: true,
    queue: [],
    settings: defaultSettings(),
    step: "manuscript",
    ...partial,
  };
}

export const STEP_LABEL: Record<StudioStep, string> = {
  manuscript: "Upload",
  canon: "Canon",
  characters: "Characters",
  world: "World",
  style: "Style",
  storyboard: "Storyboard",
  illustrate: "Generate",
  book: "Assemble",
  export: "Export",
};

export const STEP_HINT: Record<StudioStep, string> = {
  manuscript: "Bring in the source of truth",
  canon: "What the story actually says",
  characters: "Lock faces, clothes, and continuity",
  world: "Places, objects, and time",
  style: "Visual language, not plot",
  storyboard: "Scenes, shots, and prompts",
  illustrate: "Queue and review artwork",
  book: "Pages, layouts, and cover",
  export: "PDF, images, and project file",
};
