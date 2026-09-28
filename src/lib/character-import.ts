import { emptyCharacter } from "./project-factory";
import { uid } from "./id";
import { NOT_STATED, type Character, type LorebookEntry } from "./types";

export type CharacterImportResult = {
  characters: Character[];
  lorebook: LorebookEntry[];
  notes: string[];
};

export type ExternalPlatform =
  | "chub"
  | "spicychat"
  | "characterai"
  | "crush"
  | "shapes"
  | "tavern"
  | "janitor"
  | "other";

export const PLATFORM_LABELS: Record<ExternalPlatform, string> = {
  chub: "Chub.ai",
  spicychat: "SpicyChat",
  characterai: "Character.AI",
  crush: "Crush.on",
  shapes: "Shapes.AI",
  tavern: "Tavern / SillyTavern",
  janitor: "JanitorAI",
  other: "Other",
};

export function detectPlatform(url: string): ExternalPlatform {
  const u = url.toLowerCase();
  if (u.includes("chub.ai") || u.includes("characterhub.org")) return "chub";
  if (u.includes("spicychat.ai")) return "spicychat";
  if (u.includes("character.ai") || u.includes("c.ai")) return "characterai";
  if (u.includes("crush.on")) return "crush";
  if (u.includes("shapes.inc") || u.includes("shapes.ai")) return "shapes";
  if (u.includes("discord.gg") || u.includes("tavern")) return "tavern";
  if (u.includes("janitorai.com")) return "janitor";
  return "other";
}

function clean(value: unknown, fallback = NOT_STATED): string {
  if (typeof value !== "string") return fallback;
  const t = value.trim();
  return t || fallback;
}

function pick(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return NOT_STATED;
}

function mapCardToCharacter(raw: Record<string, unknown>, avatarDataUrl?: string): Character {
  const data =
    (raw.data as Record<string, unknown> | undefined) ??
    (raw.character as Record<string, unknown> | undefined) ??
    raw;

  const name = pick(data.name, data.char_name, data.character_name, raw.name);
  const description = pick(
    data.description,
    data.char_persona,
    data.personality,
    data.scenario,
    raw.description,
  );
  const appearance = pick(
    data.appearance,
    data.visual_description,
    data.physical_description,
    description,
  );
  const personality = pick(data.personality, data.char_persona, data.mes_example);
  const scenario = pick(data.scenario, data.first_mes, data.greeting);
  const tags = Array.isArray(data.tags) ? data.tags.filter((t) => typeof t === "string").join(", ") : "";

  const ch = emptyCharacter(name === NOT_STATED ? "Imported character" : name);
  ch.source = "import";
  ch.role = pick(data.role, data.char_role, tags || NOT_STATED);
  ch.appearance = appearance;
  ch.personality = personality;
  ch.identifyingFeatures = appearance;
  ch.visualIdentifiers = appearance;
  ch.notes = [
    scenario !== NOT_STATED ? `Scenario / greeting:\n${scenario}` : "",
    tags ? `Tags: ${tags}` : "",
    typeof data.creator_notes === "string" ? data.creator_notes : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  ch.avatarDataUrl = avatarDataUrl;
  if (avatarDataUrl) {
    ch.referenceImages = [
      { id: uid("ref"), dataUrl: avatarDataUrl, label: "Card avatar" },
    ];
  }

  // Best-effort trait extraction from free text
  const blob = `${appearance}\n${description}`;
  const hair = blob.match(/\b([\w-]+\s+)?hair\b[^.,;\n]{0,40}/i)?.[0];
  const eyes = blob.match(/\b([\w-]+\s+)?eyes?\b[^.,;\n]{0,40}/i)?.[0];
  if (hair) ch.hair = hair.trim();
  if (eyes) ch.eyes = eyes.trim();

  const link = pick(data.avatar, data.link, data.url, data.source_url);
  if (link !== NOT_STATED && /^https?:\/\//i.test(link)) {
    ch.externalLinks = [
      {
        id: uid("link"),
        platform: detectPlatform(link),
        url: link,
        label: PLATFORM_LABELS[detectPlatform(link)],
      },
    ];
  }

  return ch;
}

function extractLorebook(raw: Record<string, unknown>): LorebookEntry[] {
  const book =
    (raw.character_book as Record<string, unknown> | undefined) ??
    (raw.data as Record<string, unknown> | undefined)?.character_book ??
    raw.lorebook ??
    raw.world_info;

  if (!book || typeof book !== "object") return [];
  const entries = (book as { entries?: unknown }).entries;
  if (!Array.isArray(entries)) return [];

  return entries
    .map((entry): LorebookEntry | null => {
      if (!entry || typeof entry !== "object") return null;
      const e = entry as Record<string, unknown>;
      const keysRaw = e.keys ?? e.key ?? e.triggers;
      const keys = Array.isArray(keysRaw)
        ? keysRaw.filter((k) => typeof k === "string").map(String)
        : typeof keysRaw === "string"
          ? keysRaw.split(/[,;|]/).map((s) => s.trim()).filter(Boolean)
          : [];
      const content = clean(e.content ?? e.entry ?? e.value, "");
      if (!content) return null;
      return {
        id: uid("lore"),
        name: clean(e.name ?? e.comment ?? keys[0] ?? "Lore entry", "Lore entry"),
        keys,
        content,
        enabled: e.enabled !== false && e.disable !== true,
        priority: typeof e.insertion_order === "number" ? e.insertion_order : 100,
        linkedCharacterIds: [],
      };
    })
    .filter((x): x is LorebookEntry => Boolean(x));
}

function parseJsonPayload(text: string): Record<string, unknown> {
  const parsed = JSON.parse(text) as unknown;
  if (Array.isArray(parsed)) {
    return { characters: parsed };
  }
  if (parsed && typeof parsed === "object") {
    return parsed as Record<string, unknown>;
  }
  throw new Error("JSON root must be an object or array.");
}

async function extractPngCardJson(file: File): Promise<{ json: Record<string, unknown>; dataUrl: string }> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // PNG signature
  if (
    bytes.length < 8 ||
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47
  ) {
    throw new Error("Not a PNG character card.");
  }

  let offset = 8;
  let charaB64: string | null = null;

  while (offset + 8 <= bytes.length) {
    const length =
      (bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3];
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7],
    );
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.length) break;

    if (type === "tEXt" || type === "iTXt") {
      const chunk = bytes.slice(dataStart, dataEnd);
      const nullIdx = chunk.indexOf(0);
      if (nullIdx > 0) {
        const keyword = new TextDecoder().decode(chunk.slice(0, nullIdx));
        if (keyword === "chara" || keyword === "ccv3") {
          let textBytes = chunk.slice(nullIdx + 1);
          if (type === "iTXt") {
            // iTXt: keyword\0 compression flag\0 compression method\0 language\0 translated\0 text
            // Skip compression flag + method, then two null-terminated strings
            let i = 0;
            // compression flag
            i += 1;
            // compression method
            i += 1;
            // language tag
            while (i < textBytes.length && textBytes[i] !== 0) i++;
            i += 1;
            // translated keyword
            while (i < textBytes.length && textBytes[i] !== 0) i++;
            i += 1;
            textBytes = textBytes.slice(i);
          }
          charaB64 = new TextDecoder().decode(textBytes);
          break;
        }
      }
    }

    if (type === "IEND") break;
    offset = dataEnd + 4; // skip CRC
  }

  if (!charaB64) {
    throw new Error(
      "This PNG has no embedded character card data (missing chara/ccv3 chunk). Use a Tavern/Chub card export, or upload a JSON card instead.",
    );
  }

  let decoded: string;
  try {
    decoded = atob(charaB64.trim());
  } catch {
    decoded = charaB64;
  }

  // Some cards are UTF-8 inside base64; TextDecoder cleans binary from atob
  try {
    const bin = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
    decoded = new TextDecoder().decode(bin);
  } catch {
    // keep decoded as-is
  }

  const json = parseJsonPayload(decoded);
  const dataUrl = await fileToDataUrl(file);
  return { json, dataUrl };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function collectCharacters(raw: Record<string, unknown>, avatar?: string): Character[] {
  if (Array.isArray(raw.characters)) {
    return raw.characters
      .filter((c) => c && typeof c === "object")
      .map((c) => mapCardToCharacter(c as Record<string, unknown>, avatar));
  }
  // Single card shapes
  if (raw.name || raw.char_name || raw.data || raw.character) {
    return [mapCardToCharacter(raw, avatar)];
  }
  return [];
}

export async function importCharacterAsset(file: File): Promise<CharacterImportResult> {
  const notes: string[] = [];
  const lower = file.name.toLowerCase();

  if (lower.endsWith(".png") || lower.endsWith(".webp") || file.type.startsWith("image/")) {
    if (lower.endsWith(".png") || file.type === "image/png") {
      try {
        const { json, dataUrl } = await extractPngCardJson(file);
        const characters = collectCharacters(json, dataUrl);
        const lorebook = extractLorebook(json);
        if (characters.length === 0) {
          // PNG with no usable card fields — treat as pure reference image
          const ch = emptyCharacter(file.name.replace(/\.[^.]+$/, "") || "Reference character");
          ch.source = "import";
          ch.avatarDataUrl = dataUrl;
          ch.referenceImages = [{ id: uid("ref"), dataUrl, label: "Uploaded image" }];
          notes.push("PNG had no full character card metadata; imported as a reference image character.");
          return { characters: [ch], lorebook: [], notes };
        }
        notes.push(`Imported ${characters.length} character${characters.length === 1 ? "" : "s"} from PNG card.`);
        if (lorebook.length) notes.push(`Pulled ${lorebook.length} lorebook entries.`);
        return { characters, lorebook, notes };
      } catch (err) {
        // Fall through to pure image import
        notes.push(err instanceof Error ? err.message : "PNG card parse failed; treating as image.");
      }
    }

    const dataUrl = await fileToDataUrl(file);
    const ch = emptyCharacter(file.name.replace(/\.[^.]+$/, "") || "Reference character");
    ch.source = "import";
    ch.avatarDataUrl = dataUrl;
    ch.referenceImages = [{ id: uid("ref"), dataUrl, label: "Uploaded image" }];
    notes.push("Imported as a reference image. Fill in traits or attach a card JSON next.");
    return { characters: [ch], lorebook: [], notes };
  }

  if (lower.endsWith(".json") || lower.endsWith(".charx") || file.type.includes("json")) {
    const text = await file.text();
    const json = parseJsonPayload(text);
    const characters = collectCharacters(json);
    const lorebook = extractLorebook(json);
    if (characters.length === 0 && lorebook.length === 0) {
      throw new Error("JSON did not contain a recognizable character card or lorebook.");
    }
    if (characters.length) notes.push(`Imported ${characters.length} character${characters.length === 1 ? "" : "s"} from JSON.`);
    if (lorebook.length) notes.push(`Imported ${lorebook.length} lorebook entries.`);
    return { characters, lorebook, notes };
  }

  throw new Error("Use a PNG/WebP character card, a reference image, or a JSON character/lorebook export.");
}

export async function importLorebookJson(file: File): Promise<LorebookEntry[]> {
  const text = await file.text();
  const json = parseJsonPayload(text);
  const entries = extractLorebook(json);
  if (entries.length === 0) {
    // Accept a bare array of lore entries
    if (Array.isArray(json.entries)) {
      return extractLorebook({ character_book: { entries: json.entries } });
    }
    throw new Error("No lorebook entries found in that JSON.");
  }
  return entries;
}

export async function fileToReferenceImage(file: File): Promise<{ id: string; dataUrl: string; label: string }> {
  if (!file.type.startsWith("image/") && !/\.(png|jpe?g|webp|gif)$/i.test(file.name)) {
    throw new Error("Reference uploads must be images (PNG, JPG, WebP, GIF).");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Keep reference images under 8 MB.");
  }
  const dataUrl = await fileToDataUrl(file);
  return { id: uid("ref"), dataUrl, label: file.name };
}
