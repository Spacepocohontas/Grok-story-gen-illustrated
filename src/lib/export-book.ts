import type { Project } from "./types";

export function downloadBlob(filename: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 800);
}

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "storybook";
}

export function exportProjectJson(project: Project) {
  downloadBlob(
    `${slug(project.name)}.storybook.json`,
    new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }),
  );
}

export function exportPromptPack(project: Project) {
  const body = project.storyboard
    .map(
      (s) =>
        `## ${s.chapter} — Scene ${s.sceneNumber}\nShot: ${s.shotType}\n\n${s.sourcePassage}\n\nPROMPT:\n${s.illustrationPrompt}\n\nNEGATIVE:\n${s.negativePrompt}\n`,
    )
    .join("\n---\n\n");
  downloadBlob(`${slug(project.name)}-prompts.txt`, new Blob([body], { type: "text/plain" }));
}

export async function exportImageZip(project: Project) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  let n = 0;
  for (const scene of project.storyboard) {
    for (const img of scene.images) {
      const match = img.dataUrl.match(/^data:(.+);base64,(.+)$/);
      if (!match) continue;
      const ext = match[1].includes("png") ? "png" : match[1].includes("webp") ? "webp" : "jpg";
      zip.file(`scene-${String(scene.sceneNumber).padStart(2, "0")}-${img.id}.${ext}`, match[2], {
        base64: true,
      });
      n += 1;
    }
  }
  if (project.cover) {
    for (const img of project.cover.images) {
      const match = img.dataUrl.match(/^data:(.+);base64,(.+)$/);
      if (!match) continue;
      const ext = match[1].includes("png") ? "png" : "jpg";
      zip.file(`cover-${img.id}.${ext}`, match[2], { base64: true });
      n += 1;
    }
  }
  if (!n) throw new Error("No illustrations to zip yet. Generate plates first.");
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(`${slug(project.name)}-plates.zip`, blob);
}

export async function exportPdf(project: Project) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a5", orientation: "portrait" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  const cover = project.cover?.images.find((i) => i.id === project.cover?.activeImageId) ?? project.cover?.images[0];
  doc.setFillColor(12, 11, 10);
  doc.rect(0, 0, w, h, "F");
  if (cover?.dataUrl) {
    try {
      doc.addImage(cover.dataUrl, "JPEG", 0, 0, w, h);
    } catch {
      /* keep ink field */
    }
  }
  doc.setTextColor(241, 236, 228);
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.text(project.analysis?.title || project.name, w / 2, h - 72, { align: "center", maxWidth: w - 72 });
  if (project.analysis?.author && project.analysis.author !== "Not stated in source material.") {
    doc.setFont("times", "italic");
    doc.setFontSize(12);
    doc.text(project.analysis.author, w / 2, h - 48, { align: "center" });
  }

  for (const scene of project.storyboard) {
    doc.addPage();
    doc.setFillColor(235, 228, 212);
    doc.rect(0, 0, w, h, "F");
    const img = scene.images.find((i) => i.id === scene.activeImageId) ?? scene.images[0];
    let y = 36;
    if (img?.dataUrl) {
      try {
        const ih = h * 0.52;
        doc.addImage(img.dataUrl, "JPEG", 28, y, w - 56, ih);
        y += ih + 22;
      } catch {
        y = 48;
      }
    }
    doc.setTextColor(42, 36, 28);
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text(`${scene.chapter} · Scene ${scene.sceneNumber}`, 36, y);
    y += 18;
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    const page = project.pages.find((pg) => pg.sceneId === scene.id);
    const body = page?.narration || scene.sourcePassage;
    const lines = doc.splitTextToSize(body, w - 72) as string[];
    doc.text(lines.slice(0, 16), 36, y);
  }

  doc.save(`${slug(project.name)}.pdf`);
}
