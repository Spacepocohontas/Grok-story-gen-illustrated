import { uid } from "./id";
import { NOT_STATED, type Character, type ContinuityWarning, type Scene } from "./types";

function stated(v: string): boolean {
  return Boolean(v) && v !== NOT_STATED;
}

export function scanSceneContinuity(scene: Scene, characters: Character[]): ContinuityWarning[] {
  const warnings: ContinuityWarning[] = [];
  const passage = `${scene.sourcePassage} ${scene.illustrationPrompt} ${scene.visualRequirements}`.toLowerCase();

  for (const c of characters) {
    if (!scene.characters.includes(c.name) && !scene.sourcePassage.includes(c.name)) continue;
    if (c.locks.clothing && stated(c.clothing)) {
      const coat = c.clothing.toLowerCase();
      if (coat.includes("black") && /white (coat|jacket|cloak)/i.test(passage)) {
        warnings.push({
          id: uid("warn"),
          sceneId: scene.id,
          message: `${c.name} is described wearing ${c.clothing} in the character bible, but this scene prompt specifies a white coat.`,
          severity: "warn",
          resolution: "open",
        });
      }
    }
    if (c.locks.hair && stated(c.hair)) {
      const hair = c.hair.toLowerCase();
      const other = ["black", "brown", "blonde", "red", "white", "silver", "blue", "green"].filter(
        (h) => !hair.includes(h),
      );
      for (const h of other) {
        const re = new RegExp(`${h}\\s+hair`, "i");
        if (re.test(scene.illustrationPrompt) && !hair.includes(h)) {
          warnings.push({
            id: uid("warn"),
            sceneId: scene.id,
            message: `${c.name}'s hair is locked as “${c.hair}”, but the prompt mentions ${h} hair.`,
            severity: "warn",
            resolution: "open",
          });
          break;
        }
      }
    }
  }
  return warnings;
}

export function applyWarningResolution(
  warning: ContinuityWarning,
  scene: Scene,
): Pick<Scene, "illustrationPrompt" | "continuityWarnings"> {
  const next = scene.continuityWarnings.map((w) => (w.id === warning.id ? { ...w, resolution: warning.resolution } : w));
  let prompt = scene.illustrationPrompt;
  if (warning.resolution === "canon") {
    prompt = `${prompt}\n\nCANON OVERRIDE: ${warning.message} Keep the manuscript / character bible.`;
  }
  return { illustrationPrompt: prompt, continuityWarnings: next };
}
