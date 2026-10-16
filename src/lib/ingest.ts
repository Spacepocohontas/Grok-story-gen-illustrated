import { readDocument } from "./documents";
export type IngestResult = {
  text: string;
  format: string;
  filename: string;
  pageCount?: number;
  scanned: boolean;
  notes: string[];
};

const MAX_BYTES = 12 * 1024 * 1024;

async function extractPdf(data: ArrayBuffer): Promise<{ text: string; pages: number; scanned: boolean; notes: string[] }> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const doc = await pdfjs.getDocument({ data }).promise;
  const notes: string[] = [];
  let text = "";
  let emptyPages = 0;

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? String(item.str) : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!pageText) emptyPages += 1;
    else text += `\n\n[Page ${i}]\n${pageText}`;
  }

  const scanned = doc.numPages > 0 && (!text.trim().length || emptyPages / doc.numPages > 0.6);
  if (scanned) {
    notes.push(
      "This PDF looks image-only or scanned. Selectable text was missing or nearly empty, so OCR is needed. Paste the text, or export a text-based PDF.",
    );
  }
  if (emptyPages && !scanned) {
    notes.push(`${emptyPages} page${emptyPages === 1 ? "" : "s"} contained no selectable text.`);
  }
  notes.push(`Extracted ${doc.numPages} PDF page${doc.numPages === 1 ? "" : "s"}. Page markers were preserved.`);
  return { text: text.trim(), pages: doc.numPages, scanned, notes };
}

export async function ingestFile(file: File): Promise<IngestResult> {
  if (file.size > MAX_BYTES) {
    throw new Error("That file is larger than 12 MB. Split the manuscript or export a smaller copy.");
  }
  if (!file.size) throw new Error("Choose a non-empty document. The manuscript was not changed.");
  const name = file.name;
  const lower = name.toLowerCase();
  const notes: string[] = [];

  if (/\.(txt|md|markdown|html?|rtf|epub|odt|json|csv|tsv|xml|ya?ml|log|srt|vtt)$/.test(lower)) {
    return { text: await readDocument(file), format: lower.split('.').pop() || 'txt', filename: name, scanned: false, notes: ['Document text was extracted in your browser. Review the manuscript before analysis.'] };
  }

  if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    if (!result.value.trim()) throw new Error("No readable text was found in this DOCX. The manuscript was not changed.");
    if (result.messages.length) {
      notes.push(...result.messages.map((m) => m.message));
    }
    notes.push("DOCX text was extracted in your browser. Layout and images were not imported.");
    return { text: result.value, format: "docx", filename: name, scanned: false, notes };
  }

  if (lower.endsWith('.doc')) throw new Error('Legacy DOC files need conversion. Save as DOCX, PDF or TXT, then import again. The manuscript was not changed.');

  if (lower.endsWith(".pdf")) {
    const pdf = await extractPdf(await file.arrayBuffer());
    if (!pdf.text.trim()) throw new Error("This PDF has no selectable text. Run OCR first, then import it again. The manuscript was not changed.");
    return {
      text: pdf.text,
      format: "pdf",
      filename: name,
      pageCount: pdf.pages,
      scanned: pdf.scanned,
      notes: pdf.notes,
    };
  }

  throw new Error("Use TXT, Markdown, PDF, DOCX, EPUB, ODT, RTF, HTML, JSON or CSV. Legacy DOC and encrypted files need conversion first.");
}

export function ingestPasted(text: string): IngestResult {
  return {
    text,
    format: "paste",
    filename: "pasted-manuscript.txt",
    scanned: false,
    notes: ["Manuscript arrived as pasted text. This copy is the working source of truth."],
  };
}
