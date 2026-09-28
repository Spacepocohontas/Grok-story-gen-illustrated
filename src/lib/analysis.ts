import { uid } from "./id";
import { emptyCharacter } from "./project-factory";
import type { Chapter, Character, Scene, StoryAnalysis, StoryLocation, StoryObject, TimelineEvent } from "./types";
import { NOT_STATED, SHOT_TYPES, type ShotType } from "./types";

export function splitChapters(text: string): Chapter[] {
  const lines = text.replace(/\r/g, "").split("\n");
  const marks: { i: number; title: string }[] = [];
  lines.forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    if (/^#{2,3}\s+/.test(t)) {
      marks.push({ i, title: t.replace(/^#{2,3}\s+/, "").trim() });
    } else if (/^(chapter|part)\s+[\divxlc0-9]+/i.test(t)) {
      marks.push({ i, title: t });
    }
  });

  if (marks.length === 0) {
    return [
      {
        id: uid("chap"),
        title: "Manuscript",
        summary: NOT_STATED,
        startOffset: 0,
        text,
      },
    ];
  }

  return marks.map((m, idx) => {
    const start = m.i;
    const end = idx + 1 < marks.length ? marks[idx + 1]!.i : lines.length;
    const body = lines.slice(start, end).join("\n").trim();
    return {
      id: uid("chap"),
      title: m.title,
      summary: NOT_STATED,
      startOffset: start,
      text: body,
    };
  });
}

function firstLineTitle(text: string, filename: string): string {
  const md = text.match(/^#\s+(.+)$/m);
  if (md?.[1]) return md[1].trim();
  const named = filename.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
  return named || "Untitled manuscript";
}

function extractNamedPeople(text: string): string[] {
  const stop = new Set([
    "The", "Chapter", "Greyharbor", "North", "Lantern", "Drowned", "Stair", "Harbour",
    "Guild", "They", "She", "He", "This", "That", "With", "From", "After", "Before",
    "Inside", "Below", "Winter", "Summer", "Someone", "When", "Old",
  ]);
  const counts = new Map<string, number>();
  const re = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const n = m[1]!;
    if (stop.has(n.split(" ")[0]!)) continue;
    if (n.length < 3) continue;
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  const names: string[] = [];
  for (const [n, c] of counts) {
    if (c >= 3) names.push(n);
  }
  return names.slice(0, 24);
}

function fillFromPassage(name: string, text: string): Character {
  const ch = emptyCharacter(name);
  ch.source = "manuscript";
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const windowRe = new RegExp(`.{0,180}${escaped}.{0,220}`, "gi");
  const bits: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = windowRe.exec(text))) bits.push(m[0]);
  const ctx = bits.slice(0, 8).join(" ");
  const hair = ctx.match(/\b([\w-]+)\s+hair\b/i);
  if (hair?.[1]) ch.hair = hair[1];
  const eyes = ctx.match(/\b([\w-]+(?:\s+river)?(?:-blue)?)\s+eyes?\b/i);
  if (eyes?.[1]) ch.eyes = eyes[1];
  const wore = ctx.match(/\bwore\s+([^.]+)\./i);
  if (wore?.[1]) ch.clothing = wore[1];
  const body = ctx.match(/\b(petite|tall|slight|stocky|broad|slender)\b/i);
  if (body?.[1]) ch.bodyType = body[1];
  const age = ctx.match(/\b(seventeen|eighteen|sixteen|sixty|\d{1,2}\s+years old)\b/i);
  if (age?.[1]) ch.age = age[1];
  if (/\b(she|her)\b/i.test(ctx)) ch.gender = "feminine pronouns in source";
  else if (/\b(he|his)\b/i.test(ctx)) ch.gender = "masculine pronouns in source";
  ch.appearance = ctx ? ctx.replace(/\s+/g, " ").slice(0, 280) : NOT_STATED;
  return ch;
}

function extractLocations(text: string): StoryLocation[] {
  const names = new Set<string>();
  const re =
    /\b(the\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?|[A-Z][a-z]+(?:harbor|harbour|tower|stair|lantern|keep|wood|forest|castle|city|village))\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) names.add(m[1]!);
  return [...names].slice(0, 12).map((name) => ({
    id: uid("loc"),
    name,
    architecture: NOT_STATED,
    environment: NOT_STATED,
    geography: NOT_STATED,
    interior: NOT_STATED,
    exterior: NOT_STATED,
    recurringVisuals: NOT_STATED,
    timeSeasonWeather: NOT_STATED,
    notes: "",
  }));
}

export function heuristicAnalyze(text: string, filename: string): {
  analysis: StoryAnalysis;
  chapters: Chapter[];
  characters: Character[];
  locations: StoryLocation[];
  objects: StoryObject[];
  timeline: TimelineEvent[];
  scenes: Scene[];
} {
  const chapters = splitChapters(text);
  const people = extractNamedPeople(text);
  const characters = people.map((n) => fillFromPassage(n, text));
  const locations = extractLocations(text);
  const objects: StoryObject[] = [];
  const objHits =
    text.match(/\b(the\s+(?:brass lantern|iron tide-key|tide-key|wool cap|kelp-green cloak|glass beads|silver snips))\b/gi) ?? [];
  for (const raw of [...new Set(objHits.map((s) => s.replace(/^the\s+/i, "")))]) {
    objects.push({
      id: uid("obj"),
      name: raw,
      kind: NOT_STATED,
      description: NOT_STATED,
      visual: NOT_STATED,
      owners: NOT_STATED,
      firstAppears: NOT_STATED,
    });
  }

  const scenes = chapters.flatMap((ch, ci) => splitScenes(ch, ci, characters));
  const timeline: TimelineEvent[] = scenes.map((s, i) => ({
    id: uid("tl"),
    chapter: s.chapter,
    scene: `Scene ${s.sceneNumber}`,
    dateEra: NOT_STATED,
    sequence: i + 1,
    preceding: i === 0 ? "—" : `Scene ${scenes[i - 1]!.sceneNumber}`,
    following: i === scenes.length - 1 ? "—" : `Scene ${scenes[i + 1]!.sceneNumber}`,
    summary: s.summary,
  }));

  const analysis: StoryAnalysis = {
    title: firstLineTitle(text, filename),
    author: NOT_STATED,
    genre: NOT_STATED,
    synopsis: text.replace(/\s+/g, " ").slice(0, 420) + (text.length > 420 ? "…" : ""),
    themes: [],
    tone: NOT_STATED,
    setting: locations[0]?.name ?? NOT_STATED,
    timePeriod: NOT_STATED,
    chronology: "Sequence follows the manuscript order.",
    majorEvents: scenes.slice(0, 8).map((s) => s.summary),
    analyzedAt: Date.now(),
    provider: "local-canon-pass",
    notes: [
      "This pass only used the uploaded text. Fields the manuscript does not state are marked as such.",
      "Run Analyze with AI to deepen character bibles without inventing facts.",
    ],
  };

  return { analysis, chapters, characters, locations, objects, timeline, scenes };
}

function splitScenes(chapter: Chapter, chapterIndex: number, characters: Character[]): Scene[] {
  const parts = chapter.text
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40 && !/^#/.test(p));
  const chunks: string[] = [];
  let buf = "";
  for (const p of parts) {
    if (buf && buf.length + p.length > 900) {
      chunks.push(buf);
      buf = p;
    } else buf = buf ? `${buf}\n\n${p}` : p;
  }
  if (buf) chunks.push(buf);
  const usable = chunks.length ? chunks : [chapter.text.slice(0, 1200)];
  return usable.slice(0, 12).map((passage, i) => {
    const present = characters.filter((c) => passage.includes(c.name)).map((c) => c.name);
    const shot: ShotType = i === 0 ? "establishing shot" : (SHOT_TYPES[Math.min(i, 3)] ?? "medium shot");
    return {
      id: uid("sc"),
      chapter: chapter.title,
      sceneNumber: chapterIndex * 20 + i + 1,
      sourcePassage: passage.slice(0, 1800),
      summary: passage.replace(/\s+/g, " ").slice(0, 220),
      location: NOT_STATED,
      characters: present,
      action: NOT_STATED,
      emotionalBeat: NOT_STATED,
      dialogue: extractDialogue(passage),
      visualRequirements: NOT_STATED,
      continuityWarnings: [],
      illustrationPrompt: "",
      negativePrompt: "",
      shotType: shot,
      seed: 1000 + chapterIndex * 17 + i,
      aspectRatio: "portrait" as const,
      images: [],
      status: "planned" as const,
    };
  });
}

function extractDialogue(passage: string): string {
  const quotes = passage.match(/[“"]([^”"]{8,240})[”"]/g);
  return quotes?.slice(0, 3).join(" / ") ?? NOT_STATED;
}

export function parseJsonBlock(raw: string): unknown | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}
