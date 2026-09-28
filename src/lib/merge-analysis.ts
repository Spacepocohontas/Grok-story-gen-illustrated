import { uid } from "./id";
import { emptyCharacter } from "./project-factory";
import { NOT_STATED, SHOT_TYPES, type Character, type Project, type Scene, type ShotType, type StoryLocation, type StoryObject } from "./types";

function str(v: unknown, fallback = NOT_STATED): string {
  if (typeof v === "string" && v.trim()) return v.trim();
  return fallback;
}

function arr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  return [];
}

function shot(v: unknown): ShotType {
  const s = String(v ?? "").toLowerCase();
  return (SHOT_TYPES as readonly string[]).includes(s) ? (s as ShotType) : "medium shot";
}

export function applyStructuredAnalysis(project: Project, raw: unknown): Project {
  if (!raw || typeof raw !== "object") return project;
  const data = raw as Record<string, unknown>;

  const analysis = {
    title: str(data.title, project.name),
    author: str(data.author),
    genre: str(data.genre),
    synopsis: str(data.synopsis),
    themes: arr(data.themes),
    tone: str(data.tone),
    setting: str(data.setting),
    timePeriod: str(data.timePeriod),
    chronology: str(data.chronology, "Sequence follows the manuscript order."),
    majorEvents: arr(data.majorEvents),
    analyzedAt: Date.now(),
    provider: "ai",
    notes: ["AI analysis merged. Anything the model could not support is marked as not stated."],
  };

  const characters: Character[] = Array.isArray(data.characters)
    ? (data.characters as Record<string, unknown>[]).map((c) => {
        const base = emptyCharacter(str(c.name, "Unnamed"));
        return {
          ...base,
          aliases: str(c.aliases),
          role: str(c.role),
          age: str(c.age),
          gender: str(c.gender),
          appearance: str(c.appearance),
          hair: str(c.hair),
          eyes: str(c.eyes),
          skin: str(c.skin),
          height: str(c.height),
          bodyType: str(c.bodyType),
          clothing: str(c.clothing),
          accessories: str(c.accessories),
          identifyingFeatures: str(c.identifyingFeatures),
          personality: str(c.personality),
          relationships: str(c.relationships),
          powers: str(c.powers),
          arc: str(c.arc),
          visualIdentifiers: str(c.visualIdentifiers),
          source: "manuscript",
        };
      })
    : project.characters;

  const locations: StoryLocation[] = Array.isArray(data.locations)
    ? (data.locations as Record<string, unknown>[]).map((l) => ({
        id: uid("loc"),
        name: str(l.name, "Unnamed place"),
        architecture: str(l.architecture),
        environment: str(l.environment),
        geography: str(l.geography),
        interior: str(l.interior),
        exterior: str(l.exterior),
        recurringVisuals: str(l.recurringVisuals),
        timeSeasonWeather: str(l.timeSeasonWeather),
        notes: "",
      }))
    : project.locations;

  const objects: StoryObject[] = Array.isArray(data.objects)
    ? (data.objects as Record<string, unknown>[]).map((o) => ({
        id: uid("obj"),
        name: str(o.name, "Unnamed object"),
        kind: str(o.kind),
        description: str(o.description),
        visual: str(o.visual),
        owners: str(o.owners),
        firstAppears: str(o.firstAppears),
      }))
    : project.objects;

  const scenes: Scene[] | null = Array.isArray(data.scenes)
    ? (data.scenes as Record<string, unknown>[]).map((s, i) => ({
        id: uid("sc"),
        chapter: str(s.chapter, "Manuscript"),
        sceneNumber: i + 1,
        sourcePassage: str(s.sourcePassage, str(s.summary)),
        summary: str(s.summary),
        location: str(s.location),
        characters: arr(s.characters),
        action: str(s.action),
        emotionalBeat: str(s.emotionalBeat),
        dialogue: str(s.dialogue),
        visualRequirements: str(s.visualRequirements),
        continuityWarnings: [],
        illustrationPrompt: "",
        negativePrompt: project.settings.defaultNegative,
        shotType: shot(s.shotType),
        seed: 1400 + i * 13,
        aspectRatio: project.settings.defaultAspect,
        images: [],
        status: "planned",
      }))
    : null;

  return {
    ...project,
    name: analysis.title || project.name,
    analysis: { ...analysis, provider: "ai" },
    characters: characters.length ? characters : project.characters,
    locations: locations.length ? locations : project.locations,
    objects: objects.length ? objects : project.objects,
    storyboard: scenes && scenes.length ? scenes : project.storyboard,
  };
}
