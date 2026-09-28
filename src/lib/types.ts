export const STUDIO_STEPS = [
  "manuscript",
  "canon",
  "characters",
  "world",
  "style",
  "storyboard",
  "illustrate",
  "book",
  "export",
] as const;

export type StudioStep = (typeof STUDIO_STEPS)[number];

export const SHOT_TYPES = [
  "establishing shot",
  "wide shot",
  "medium shot",
  "close-up",
  "extreme close-up",
  "over-the-shoulder",
  "profile",
  "full-body",
  "action shot",
  "environmental shot",
  "portrait",
] as const;

export type ShotType = (typeof SHOT_TYPES)[number];

export const PAGE_LAYOUTS = [
  "full-page illustration",
  "image + text",
  "text-heavy illustrated page",
  "two-panel",
  "three-panel",
  "four-panel",
  "comic page",
  "manga page",
  "cinematic spread",
] as const;

export type PageLayout = (typeof PAGE_LAYOUTS)[number];

export const ASPECT_RATIOS = ["portrait", "landscape", "square", "wide"] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const TEXT_PROVIDERS = [
  "horde",
  "grok",
  "openrouter",
  "gemini",
  "pollinations",
  "openai",
] as const;
export type TextProvider = (typeof TEXT_PROVIDERS)[number];

export const IMAGE_PROVIDERS = ["horde", "grok", "pollinations"] as const;
export type ImageProvider = (typeof IMAGE_PROVIDERS)[number];

export const LOCKABLE_ATTRS = [
  "hair",
  "eyes",
  "face",
  "bodyType",
  "clothing",
  "accessories",
  "age",
  "palette",
  "design",
] as const;
export type LockableAttr = (typeof LOCKABLE_ATTRS)[number];

export const NOT_STATED = "Not stated in source material.";

export type ContinuityWarning = {
  id: string;
  sceneId: string;
  message: string;
  severity: "warn" | "block";
  resolution: "canon" | "scene" | "edit" | "ignore" | "open";
};

export type Character = {
  id: string;
  name: string;
  aliases: string;
  role: string;
  age: string;
  gender: string;
  appearance: string;
  hair: string;
  eyes: string;
  skin: string;
  height: string;
  bodyType: string;
  clothing: string;
  accessories: string;
  identifyingFeatures: string;
  personality: string;
  relationships: string;
  powers: string;
  arc: string;
  visualIdentifiers: string;
  locks: Partial<Record<LockableAttr, boolean>>;
  notes: string;
  source: "manuscript" | "user";
};

export type StoryLocation = {
  id: string;
  name: string;
  architecture: string;
  environment: string;
  geography: string;
  interior: string;
  exterior: string;
  recurringVisuals: string;
  timeSeasonWeather: string;
  notes: string;
};

export type StoryObject = {
  id: string;
  name: string;
  kind: string;
  description: string;
  visual: string;
  owners: string;
  firstAppears: string;
};

export type TimelineEvent = {
  id: string;
  chapter: string;
  scene: string;
  dateEra: string;
  sequence: number;
  preceding: string;
  following: string;
  summary: string;
};

export type StoryAnalysis = {
  title: string;
  author: string;
  genre: string;
  synopsis: string;
  themes: string[];
  tone: string;
  setting: string;
  timePeriod: string;
  chronology: string;
  majorEvents: string[];
  analyzedAt: number;
  provider: string;
  notes: string[];
};

export type Chapter = {
  id: string;
  title: string;
  summary: string;
  startOffset: number;
  text: string;
};

export type GeneratedImage = {
  id: string;
  dataUrl: string;
  prompt: string;
  negativePrompt: string;
  seed: number;
  model: string;
  provider: string;
  createdAt: number;
  favorite: boolean;
  aspectRatio: AspectRatio;
};

export type Scene = {
  id: string;
  chapter: string;
  sceneNumber: number;
  sourcePassage: string;
  summary: string;
  location: string;
  characters: string[];
  action: string;
  emotionalBeat: string;
  dialogue: string;
  visualRequirements: string;
  continuityWarnings: ContinuityWarning[];
  illustrationPrompt: string;
  negativePrompt: string;
  shotType: ShotType;
  seed: number;
  aspectRatio: AspectRatio;
  images: GeneratedImage[];
  activeImageId?: string;
  status: "planned" | "queued" | "generating" | "done" | "failed";
  error?: string;
};

export type BookPage = {
  id: string;
  chapter: string;
  pageNumber: number;
  layout: PageLayout;
  sceneId?: string;
  caption: string;
  narration: string;
  dialogue: string;
  title?: string;
};

export type ArtStyle = {
  presetId: string;
  name: string;
  description: string;
  promptPrefix: string;
  colorPhilosophy: string;
  linework: string;
  lighting: string;
  texture: string;
  era: string;
  customDirection: string;
  applyScope: "book" | "chapter" | "page";
};

export type CoverSpec = {
  format: "paperback" | "hardcover" | "ebook" | "poster" | "social";
  titleTreatment: string;
  subtitle: string;
  authorName: string;
  prompt: string;
  images: GeneratedImage[];
  activeImageId?: string;
};

export type QueueJob = {
  id: string;
  kind: "image" | "text";
  label: string;
  sceneId?: string;
  status: "queued" | "processing" | "completed" | "failed";
  error?: string;
  createdAt: number;
};

export type Manuscript = {
  filename: string;
  format: string;
  text: string;
  parseNotes: string[];
  pageCount?: number;
  scanned: boolean;
};

export type ProjectSettings = {
  textProvider: TextProvider;
  imageProvider: ImageProvider;
  hordeTextModel: string;
  hordeImageModel: string;
  defaultAspect: AspectRatio;
  defaultNegative: string;
};

export type Project = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  manuscript: Manuscript;
  originalManuscript: string;
  chapters: Chapter[];
  analysis: StoryAnalysis | null;
  characters: Character[];
  locations: StoryLocation[];
  objects: StoryObject[];
  timeline: TimelineEvent[];
  style: ArtStyle;
  storyboard: Scene[];
  pages: BookPage[];
  cover: CoverSpec | null;
  canonLock: boolean;
  queue: QueueJob[];
  settings: ProjectSettings;
  step: StudioStep;
};

export type ProjectSummary = {
  id: string;
  name: string;
  updatedAt: number;
  createdAt: number;
  filename: string;
  characterCount: number;
  sceneCount: number;
  imageCount: number;
  styleName: string;
};

export type OptionalKeys = {
  openrouter?: string;
  gemini?: string;
  openai?: string;
  pollinations?: string;
  horde?: string;
};
