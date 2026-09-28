import { createServerFn } from "@tanstack/react-start";
import { HORDE_CLIENT_AGENT } from "../constants";
import type { ImageProvider, OptionalKeys, TextProvider } from "../types";

const HORDE = "https://aihorde.net/api/v2";
const ANON = "0000000000";

function hordeHeaders(key?: string) {
  return {
    "Content-Type": "application/json",
    apikey: key?.trim() || ANON,
    "Client-Agent": HORDE_CLIENT_AGENT,
  };
}

function friendlyHorde(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("timeout") || m.includes("busy") || m.includes("wait")) {
    return "AI Horde is currently busy. Your manuscript is safe. Try again in a moment.";
  }
  if (m.includes("model")) {
    return "The selected model is temporarily unavailable. Choose another model, or leave it on Auto.";
  }
  return message || "The free generation network could not finish this request. Your manuscript is safe.";
}

export type TextJobInput = {
  prompt: string;
  provider: TextProvider;
  hordeModel?: string;
  keys?: OptionalKeys;
  maxTokens?: number;
};

export type ImageJobInput = {
  prompt: string;
  negative?: string;
  provider: ImageProvider;
  hordeModel?: string;
  width: number;
  height: number;
  seed?: number;
  keys?: OptionalKeys;
};

async function xaiChat(prompt: string, maxTokens = 3500): Promise<string> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Grok is not available in this environment. Use AI Horde (no key) instead.");
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      temperature: 0.3,
      max_tokens: maxTokens,
      messages: [
        {
          role: "system",
          content:
            "You are a careful illustrated-novel production assistant. Never invent canon. Use 'Not stated in source material.' for gaps.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error("Grok could not complete this pass. Your manuscript is safe. Try AI Horde or retry shortly.");
  }
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("Grok returned an empty response. Try again.");
  return text;
}

async function openAiCompat(opts: {
  key: string;
  base: string;
  model: string;
  prompt: string;
  headers?: Record<string, string>;
}): Promise<string> {
  const res = await fetch(`${opts.base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.key}`,
      ...opts.headers,
    },
    body: JSON.stringify({
      model: opts.model,
      temperature: 0.35,
      messages: [{ role: "user", content: opts.prompt }],
    }),
  });
  const data = (await res.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  if (!res.ok) throw new Error(data.error?.message || "The selected text provider failed.");
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("The selected text provider returned an empty response.");
  return text;
}

async function geminiChat(key: string, prompt: string): Promise<string> {
  const model = "gemini-2.5-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.35 },
      }),
    },
  );
  const data = (await res.json()) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  if (!res.ok) throw new Error(data.error?.message || "Gemini could not complete this request.");
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ?? "";
  if (!text.trim()) throw new Error("Gemini returned an empty response.");
  return text;
}

async function pollinationsText(prompt: string, key?: string): Promise<string> {
  if (key) {
    return openAiCompat({
      key,
      base: "https://gen.pollinations.ai/v1",
      model: "openai",
      prompt,
    });
  }
  const res = await fetch("https://text.pollinations.ai/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: prompt }], jsonMode: false }),
  });
  if (!res.ok) throw new Error("Pollinations is unavailable right now. Try AI Horde instead.");
  return (await res.text()).trim();
}

async function hordeSubmitText(prompt: string, model: string | undefined, key?: string): Promise<string> {
  const models = model && model !== "auto" ? [model] : undefined;
  const res = await fetch(`${HORDE}/generate/text/async`, {
    method: "POST",
    headers: hordeHeaders(key),
    body: JSON.stringify({
      prompt,
      models,
      params: {
        max_length: 1200,
        max_context_length: 8192,
        temperature: 0.4,
        top_p: 0.9,
      },
    }),
  });
  const data = (await res.json()) as { id?: string; message?: string };
  if (!res.ok || !data.id) throw new Error(friendlyHorde(data.message || "AI Horde text request failed."));
  return data.id;
}

export const getAiCapabilities = createServerFn({ method: "GET" }).handler(async () => {
  return {
    grokText: Boolean(process.env.XAI_API_KEY),
    grokImage: Boolean(process.env.XAI_API_KEY),
  };
});

export const listHordeModels = createServerFn({ method: "GET" }).handler(async () => {
  const [text, image] = await Promise.all([
    fetch(`${HORDE}/status/models?type=text`, { headers: hordeHeaders() }),
    fetch(`${HORDE}/status/models?type=image`, { headers: hordeHeaders() }),
  ]);
  const textModels = text.ok
    ? ((await text.json()) as { name: string; count?: number }[])
        .filter((m) => (m.count ?? 0) > 0)
        .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
        .map((m) => m.name)
        .slice(0, 40)
    : [];
  const imageModels = image.ok
    ? ((await image.json()) as { name: string; count?: number }[])
        .filter((m) => (m.count ?? 0) > 0)
        .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
        .map((m) => m.name)
        .slice(0, 40)
    : [];
  return { textModels, imageModels };
});

export const generateTextComplete = createServerFn({ method: "POST" })
  .validator((d: TextJobInput) => d)
  .handler(async ({ data }) => {
    const { provider, prompt, keys, hordeModel } = data;
    try {
      if (provider === "grok") {
        const text = await xaiChat(prompt, data.maxTokens ?? 3500);
        return { ok: true as const, kind: "complete" as const, text, provider: "grok" };
      }
      if (provider === "groq") {
        const key = keys?.groq;
        if (!key) {
          return {
            ok: false as const,
            error: "Add a free Groq key from console.groq.com in Settings, or switch to AI Horde / Pollinations (no key).",
          };
        }
        const text = await openAiCompat({
          key,
          base: "https://api.groq.com/openai/v1",
          model: "llama-3.3-70b-versatile",
          prompt,
        });
        return { ok: true as const, kind: "complete" as const, text, provider: "groq" };
      }
      if (provider === "deepseek") {
        const key = keys?.deepseek;
        if (!key) {
          return {
            ok: false as const,
            error: "Add a free DeepSeek key from platform.deepseek.com in Settings, or switch to AI Horde / Pollinations (no key).",
          };
        }
        const text = await openAiCompat({
          key,
          base: "https://api.deepseek.com",
          model: "deepseek-chat",
          prompt,
        });
        return { ok: true as const, kind: "complete" as const, text, provider: "deepseek" };
      }
      if (provider === "openai") {
        const key = keys?.openai;
        if (!key) return { ok: false as const, error: "Add an OpenAI key in Settings, or switch to AI Horde (no key)." };
        const text = await openAiCompat({
          key,
          base: "https://api.openai.com/v1",
          model: "gpt-4.1-mini",
          prompt,
        });
        return { ok: true as const, kind: "complete" as const, text, provider: "openai" };
      }
      if (provider === "openrouter") {
        const key = keys?.openrouter;
        if (!key) return { ok: false as const, error: "Add an OpenRouter key in Settings, or switch to AI Horde (no key)." };
        const text = await openAiCompat({
          key,
          base: "https://openrouter.ai/api/v1",
          model: "openrouter/auto",
          prompt,
          headers: {
            "HTTP-Referer": "https://storybook-gen-illustration.vercel.app",
            "X-Title": "Storybook Gen Illustration",
          },
        });
        return { ok: true as const, kind: "complete" as const, text, provider: "openrouter" };
      }
      if (provider === "gemini") {
        const key = keys?.gemini;
        if (!key) return { ok: false as const, error: "Add a Gemini key in Settings, or switch to AI Horde (no key)." };
        const text = await geminiChat(key, prompt);
        return { ok: true as const, kind: "complete" as const, text, provider: "gemini" };
      }
      if (provider === "pollinations") {
        const text = await pollinationsText(prompt, keys?.pollinations);
        return { ok: true as const, kind: "complete" as const, text, provider: "pollinations" };
      }
      const id = await hordeSubmitText(prompt, hordeModel, keys?.horde);
      return { ok: true as const, kind: "job" as const, id, provider: "horde" };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed.";
      return { ok: false as const, error: message };
    }
  });

export const pollHordeText = createServerFn({ method: "POST" })
  .validator((d: { id: string; key?: string }) => d)
  .handler(async ({ data }) => {
    const res = await fetch(`${HORDE}/generate/text/status/${encodeURIComponent(data.id)}`, {
      headers: hordeHeaders(data.key),
    });
    const body = (await res.json()) as {
      done?: boolean;
      faulted?: boolean;
      wait_time?: number;
      queue_position?: number;
      message?: string;
      generations?: { text?: string }[];
    };
    if (!res.ok) return { ok: false as const, error: friendlyHorde(body.message || "Horde status failed.") };
    if (body.faulted) return { ok: false as const, error: friendlyHorde(body.message || "A Horde worker failed.") };
    if (body.done) {
      const text = body.generations?.map((g) => g.text || "").join("\n").trim() ?? "";
      if (!text) return { ok: false as const, error: "AI Horde finished without text. Try another model." };
      return { ok: true as const, done: true, text, wait: 0, position: 0 };
    }
    return {
      ok: true as const,
      done: false,
      wait: body.wait_time ?? 0,
      position: body.queue_position ?? 0,
    };
  });

async function xaiImage(prompt: string): Promise<string> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Grok image generation is not available. Use AI Horde (no key) instead.");
  const res = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-imagine-image",
      prompt,
      n: 1,
      response_format: "b64_json",
    }),
  });
  if (!res.ok) throw new Error("Grok could not generate this illustration. Your manuscript is safe.");
  const body = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
  const b64 = body.data?.[0]?.b64_json;
  if (b64) return `data:image/png;base64,${b64}`;
  const url = body.data?.[0]?.url;
  if (!url) throw new Error("Grok returned no image.");
  const img = await fetch(url);
  const buf = Buffer.from(await img.arrayBuffer());
  return `data:image/png;base64,${buf.toString("base64")}`;
}

async function pollinationsImage(prompt: string, w: number, h: number): Promise<string> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&seed=${Date.now() % 99999}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Pollinations could not generate this illustration right now.");
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type") || "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export const generateImageComplete = createServerFn({ method: "POST" })
  .validator((d: ImageJobInput) => d)
  .handler(async ({ data }) => {
    try {
      if (data.provider === "grok") {
        const dataUrl = await xaiImage(data.prompt);
        return { ok: true as const, kind: "complete" as const, dataUrl, provider: "grok", model: "grok-imagine-image" };
      }
      if (data.provider === "pollinations") {
        const dataUrl = await pollinationsImage(data.prompt, data.width, data.height);
        return { ok: true as const, kind: "complete" as const, dataUrl, provider: "pollinations", model: "pollinations" };
      }
      const params: Record<string, unknown> = {
        width: data.width,
        height: data.height,
        steps: 20,
        n: 1,
        karras: true,
        seed: data.seed ?? 42,
      };
      if (data.negative) params.negative_prompt = data.negative;
      const models = data.hordeModel && data.hordeModel !== "auto" ? [data.hordeModel] : undefined;
      const res = await fetch(`${HORDE}/generate/async`, {
        method: "POST",
        headers: hordeHeaders(data.keys?.horde),
        body: JSON.stringify({
          prompt: data.prompt,
          params,
          nsfw: false,
          censor_nsfw: true,
          models,
          r2: true,
          shared: false,
        }),
      });
      const body = (await res.json()) as { id?: string; message?: string };
      if (!res.ok || !body.id) {
        return { ok: false as const, error: friendlyHorde(body.message || "AI Horde image request failed.") };
      }
      return { ok: true as const, kind: "job" as const, id: body.id, provider: "horde" };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "Image generation failed." };
    }
  });

export const pollHordeImage = createServerFn({ method: "POST" })
  .validator((d: { id: string; key?: string }) => d)
  .handler(async ({ data }) => {
    const check = await fetch(`${HORDE}/generate/check/${encodeURIComponent(data.id)}`, {
      headers: hordeHeaders(data.key),
    });
    const status = (await check.json()) as {
      done?: boolean;
      faulted?: boolean;
      wait_time?: number;
      queue_position?: number;
      message?: string;
    };
    if (!check.ok) return { ok: false as const, error: friendlyHorde(status.message || "Horde check failed.") };
    if (status.faulted) return { ok: false as const, error: friendlyHorde(status.message || "A Horde worker failed.") };
    if (!status.done) {
      return { ok: true as const, done: false, wait: status.wait_time ?? 0, position: status.queue_position ?? 0 };
    }
    const full = await fetch(`${HORDE}/generate/status/${encodeURIComponent(data.id)}`, {
      headers: hordeHeaders(data.key),
    });
    const body = (await full.json()) as {
      generations?: { img?: string; model?: string; seed?: number }[];
      message?: string;
    };
    const gen = body.generations?.[0];
    if (!gen?.img) return { ok: false as const, error: "AI Horde finished without an image. Try another model." };
    let dataUrl = gen.img;
    if (!dataUrl.startsWith("data:")) {
      if (/^https?:/i.test(dataUrl)) {
        const img = await fetch(dataUrl);
        const buf = Buffer.from(await img.arrayBuffer());
        const mime = img.headers.get("content-type") || "image/webp";
        dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
      } else {
        dataUrl = `data:image/webp;base64,${dataUrl}`;
      }
    }
    return {
      ok: true as const,
      done: true,
      dataUrl,
      model: gen.model ?? "horde",
      seed: gen.seed,
    };
  });
