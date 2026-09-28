import type { Project } from "../types";

export const CANON_SYSTEM = `You are the production assistant for Storybook Gen Illustration, an illustrated-novel studio.

CANON RULES — non-negotiable:
- The manuscript is the only story authority.
- Do NOT invent characters, names, relationships, locations, chronology, events, physical traits, dialogue, backstory, powers, objects, or world rules.
- If a detail is not in the source, write exactly: "Not stated in source material."
- Art style may change rendering, color, lighting, composition, linework, texture, and medium. It must NEVER change the story.
- Prefer omissions over guesses.
- Output must be directly usable in production.`;

export function analysisPrompt(project: Project): string {
  const text = project.manuscript.text.slice(0, 24000);
  return `${CANON_SYSTEM}

TASK: Analyze this manuscript into structured JSON. Return ONLY JSON (no markdown).

Schema:
{
  "title": string,
  "author": string,
  "genre": string,
  "synopsis": string,
  "themes": string[],
  "tone": string,
  "setting": string,
  "timePeriod": string,
  "chronology": string,
  "majorEvents": string[],
  "chapters": [{"title": string, "summary": string}],
  "characters": [{
    "name": string, "aliases": string, "role": string, "age": string, "gender": string,
    "appearance": string, "hair": string, "eyes": string, "skin": string, "height": string,
    "bodyType": string, "clothing": string, "accessories": string, "identifyingFeatures": string,
    "personality": string, "relationships": string, "powers": string, "arc": string, "visualIdentifiers": string
  }],
  "locations": [{"name": string, "architecture": string, "environment": string, "geography": string, "interior": string, "exterior": string, "recurringVisuals": string, "timeSeasonWeather": string}],
  "objects": [{"name": string, "kind": string, "description": string, "visual": string, "owners": string, "firstAppears": string}],
  "scenes": [{"chapter": string, "summary": string, "sourcePassage": string, "location": string, "characters": string[], "action": string, "emotionalBeat": string, "dialogue": string, "visualRequirements": string, "shotType": string}]
}

Shot types allowed: establishing shot, wide shot, medium shot, close-up, extreme close-up, over-the-shoulder, profile, full-body, action shot, environmental shot, portrait.

MANUSCRIPT:
${text}`;
}

export function enhancePrompt(project: Project): string {
  return `${CANON_SYSTEM}

TASK: Improve prose for clarity, rhythm, and sensory detail. Preserve every story fact, name, relationship, sequence, and important line of dialogue. Do not add plot. Return the full rewritten manuscript as plain text, not JSON.

WORKING MANUSCRIPT:
${project.manuscript.text.slice(0, 24000)}`;
}

export function characterBiblePrompt(project: Project): string {
  return `${CANON_SYSTEM}

TASK: Extract a character bible as JSON array "characters" using the schema from analysis. Only characters the manuscript supports.

MANUSCRIPT:
${project.manuscript.text.slice(0, 20000)}`;
}

export function storyboardPrompt(project: Project): string {
  const chars = project.characters
    .map((c) => `${c.name}: hair=${c.hair}; eyes=${c.eyes}; body=${c.bodyType}; clothes=${c.clothing}; extras=${c.accessories}`)
    .join("\n");
  return `${CANON_SYSTEM}

TASK: Turn the manuscript into a visual storyboard. Return ONLY JSON:
{ "scenes": [{ "chapter": string, "summary": string, "sourcePassage": string, "location": string, "characters": string[], "action": string, "emotionalBeat": string, "dialogue": string, "visualRequirements": string, "shotType": string }] }

Use only named characters. Style (visual only): ${project.style.name}. ${project.style.customDirection || project.style.promptPrefix}

CHARACTER BIBLE:
${chars || "None extracted yet."}

MANUSCRIPT:
${project.manuscript.text.slice(0, 20000)}`;
}

export function taskPrompt(mode: string, project: Project): string {
  switch (mode) {
    case "enhance":
      return enhancePrompt(project);
    case "characters":
      return characterBiblePrompt(project);
    case "storyboard":
      return storyboardPrompt(project);
    default:
      return analysisPrompt(project);
  }
}
