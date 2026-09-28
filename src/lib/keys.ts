import type { OptionalKeys } from "./types";

const PREFIX = "storybook-gen-key:";

const FIELDS = ["openrouter", "gemini", "openai", "pollinations", "horde"] as const;

export function loadKeys(): OptionalKeys {
  if (typeof sessionStorage === "undefined") return {};
  const out: OptionalKeys = {};
  for (const f of FIELDS) {
    const v = sessionStorage.getItem(PREFIX + f);
    if (v) out[f] = v;
  }
  return out;
}

export function saveKeys(keys: OptionalKeys) {
  if (typeof sessionStorage === "undefined") return;
  for (const f of FIELDS) {
    const v = keys[f]?.trim();
    if (v) sessionStorage.setItem(PREFIX + f, v);
    else sessionStorage.removeItem(PREFIX + f);
  }
}

export function clearKeys() {
  if (typeof sessionStorage === "undefined") return;
  for (const f of FIELDS) sessionStorage.removeItem(PREFIX + f);
}
