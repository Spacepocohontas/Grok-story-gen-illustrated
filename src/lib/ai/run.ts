import { loadKeys } from "../keys";
import type { ImageProvider, TextProvider } from "../types";
import {
  generateImageComplete,
  generateTextComplete,
  pollHordeImage,
  pollHordeText,
} from "./server";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runText(opts: {
  prompt: string;
  provider: TextProvider;
  hordeModel?: string;
  onStatus?: (msg: string) => void;
}): Promise<{ text: string; provider: string }> {
  const keys = loadKeys();
  opts.onStatus?.("Sending to the production assistant…");
  const start = await generateTextComplete({
    data: {
      prompt: opts.prompt,
      provider: opts.provider,
      hordeModel: opts.hordeModel,
      keys,
    },
  });
  if (!start.ok) throw new Error(start.error);
  if (start.kind === "complete") return { text: start.text, provider: start.provider };

  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    await sleep(2800);
    const poll = await pollHordeText({ data: { id: start.id, key: keys.horde } });
    if (!poll.ok) throw new Error(poll.error);
    if (poll.done && "text" in poll && poll.text) return { text: poll.text, provider: "horde" };
    const pos = "position" in poll ? poll.position : 0;
    const wait = "wait" in poll ? poll.wait : 0;
    opts.onStatus?.(
      pos
        ? `AI Horde queue position ${pos}. Anonymous jobs are slower — manuscript is safe.`
        : `AI Horde is working (~${wait}s). Anonymous jobs have lower priority.`,
    );
  }
  throw new Error("AI Horde is currently busy. Your manuscript is safe. Try again in a moment.");
}

export async function runImage(opts: {
  prompt: string;
  negative?: string;
  provider: ImageProvider;
  hordeModel?: string;
  width: number;
  height: number;
  seed?: number;
  onStatus?: (msg: string) => void;
}): Promise<{ dataUrl: string; provider: string; model: string; seed?: number }> {
  const keys = loadKeys();
  opts.onStatus?.("Queued for illustration…");
  const start = await generateImageComplete({
    data: {
      prompt: opts.prompt,
      negative: opts.negative,
      provider: opts.provider,
      hordeModel: opts.hordeModel,
      width: opts.width,
      height: opts.height,
      seed: opts.seed,
      keys,
    },
  });
  if (!start.ok) throw new Error(start.error);
  if (start.kind === "complete") {
    return { dataUrl: start.dataUrl, provider: start.provider, model: start.model };
  }

  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    await sleep(3200);
    const poll = await pollHordeImage({ data: { id: start.id, key: keys.horde } });
    if (!poll.ok) throw new Error(poll.error);
    if (poll.done && "dataUrl" in poll && poll.dataUrl) {
      return { dataUrl: poll.dataUrl, provider: "horde", model: poll.model ?? "horde", seed: poll.seed };
    }
    const pos = "position" in poll ? poll.position : 0;
    opts.onStatus?.(
      pos
        ? `Illustration queued at position ${pos}. Free Horde jobs are slower.`
        : "A volunteer GPU is painting this plate…",
    );
  }
  throw new Error("AI Horde is currently busy. Your manuscript is safe. Try again in a moment.");
}
