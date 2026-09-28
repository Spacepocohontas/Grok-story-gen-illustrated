import { NOT_STATED, type ArtStyle, type Character, type Project, type Scene, type StoryLocation } from "./types";

function stated(value: string | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v || v === NOT_STATED) return null;
  return v;
}

export function characterLockLine(c: Character): string {
  const bits: string[] = [c.name];
  if (c.locks.age && stated(c.age)) bits.push(stated(c.age)!);
  if (c.locks.hair && stated(c.hair)) bits.push(`${stated(c.hair)} hair`);
  if (c.locks.eyes && stated(c.eyes)) bits.push(`${stated(c.eyes)} eyes`);
  if (c.locks.bodyType && stated(c.bodyType)) bits.push(stated(c.bodyType)!);
  if (c.locks.face && stated(c.identifyingFeatures)) bits.push(stated(c.identifyingFeatures)!);
  if (c.locks.clothing && stated(c.clothing)) bits.push(`wearing ${stated(c.clothing)}`);
  if (c.locks.accessories && stated(c.accessories)) bits.push(stated(c.accessories)!);
  if (c.locks.design && stated(c.visualIdentifiers)) bits.push(stated(c.visualIdentifiers)!);
  if (stated(c.appearance) && bits.length < 4) bits.push(stated(c.appearance)!);
  return bits.join(", ");
}

export function styleBlock(style: ArtStyle): string {
  const custom = style.presetId === "custom" ? style.customDirection : "";
  return [
    custom || style.promptPrefix,
    `color: ${style.colorPhilosophy}`,
    `line: ${style.linework}`,
    `light: ${style.lighting}`,
    `texture: ${style.texture}`,
    `era: ${style.era}`,
  ]
    .filter(Boolean)
    .join(". ");
}

export function locationLine(loc?: StoryLocation): string {
  if (!loc) return "";
  return [loc.name, stated(loc.architecture), stated(loc.environment), stated(loc.interior), stated(loc.exterior), stated(loc.timeSeasonWeather)]
    .filter(Boolean)
    .join(", ");
}

export function buildIllustrationPrompt(project: Project, scene: Scene): string {
  const chars = scene.characters
    .map((name) => project.characters.find((c) => c.name === name))
    .filter((c): c is Character => Boolean(c))
    .map(characterLockLine);

  const loc =
    project.locations.find((l) => scene.location && scene.location !== NOT_STATED && scene.location.includes(l.name)) ??
    project.locations.find((l) => scene.sourcePassage.includes(l.name));

  const body = [
    "Illustrated novel plate, single still image, no caption text, no title lettering, no watermark, no speech bubbles unless dialogue is visually implied without glyphs.",
    styleBlock(project.style),
    `Shot: ${scene.shotType}. Aspect ${scene.aspectRatio}.`,
    loc ? `Setting (canon): ${locationLine(loc)}.` : scene.location !== NOT_STATED ? `Setting: ${scene.location}.` : "",
    chars.length ? `Character continuity (locked): ${chars.join(" | ")}.` : "",
    scene.action !== NOT_STATED ? `Action: ${scene.action}.` : "",
    scene.emotionalBeat !== NOT_STATED ? `Emotional beat: ${scene.emotionalBeat}.` : "",
    scene.visualRequirements !== NOT_STATED ? `Visual requirements: ${scene.visualRequirements}.` : "",
    `Story moment from the manuscript: ${scene.sourcePassage.slice(0, 900)}`,
    "Do not invent characters, costumes, locations, or plot. If a detail is missing, keep it generic rather than fabricating canon.",
  ]
    .filter(Boolean)
    .join("\n");

  return body;
}

export function buildCoverPrompt(project: Project): string {
  const lead = project.characters[0];
  return [
    "Front cover illustration for a literary illustrated novel. Leave a quiet upper third for a title. No readable text in the image.",
    styleBlock(project.style),
    project.analysis?.title ? `Book: ${project.analysis.title}.` : "",
    project.analysis?.tone !== NOT_STATED ? `Tone: ${project.analysis?.tone}.` : "",
    lead ? `Lead figure continuity: ${characterLockLine(lead)}.` : "",
    project.locations[0] ? `Place: ${locationLine(project.locations[0])}.` : "",
    "Cinematic, iconic, faithful to the manuscript. Do not add characters the story does not name.",
  ]
    .filter(Boolean)
    .join(" ");
}
