export type IngestResult = {
  text: string;
  format: string;
  filename: string;
  pageCount?: number;
  scanned: boolean;
  notes: string[];
};

const MAX_BYTES = 12 * 1024 * 1024;

function isOleDoc(buf: ArrayBuffer): boolean {
  const u = new Uint8Array(buf.slice(0, 8));
  return (
    u.length >= 8 &&
    u[0] === 0xd0 &&
    u[1] === 0xcf &&
    u[2] === 0x11 &&
    u[3] === 0xe0
  );
}

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

  const scanned = doc.numPages > 0 && (text.trim().length < 40 || emptyPages / doc.numPages > 0.6);
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
  const name = file.name;
  const lower = name.toLowerCase();
  const notes: string[] = [];

  if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".markdown") || lower.endsWith(".html") || lower.endsWith(".rtf")) {
    const text = await file.text();
    if (lower.endsWith(".rtf")) {
      notes.push("RTF was read as raw text. Some control words may remain — clean them in the editor if needed.");
    }
    if (lower.endsWith(".html")) {
      notes.push("HTML tags were kept. You can clean the manuscript in the editor.");
    }
    return { text, format: lower.split(".").pop() || "txt", filename: name, scanned: false, notes };
  }

  if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    if (result.messages.length) {
      notes.push(...result.messages.map((m) => m.message));
    }
    notes.push("DOCX text was extracted in your browser. Layout and images were not imported.");
    return { text: result.value, format: "docx", filename: name, scanned: false, notes };
  }

  if (lower.endsWith(".doc")) {
    const buf = await file.arrayBuffer();
    if (isOleDoc(buf)) {
      throw new Error(
        "This is a legacy .doc Word file. Save or export it as .docx or .txt, then upload again. The manuscript was not changed.",
      );
    }
    const text = await file.text();
    notes.push("The .doc file was read as plain text. If the result looks garbled, export as DOCX.");
    return { text, format: "doc", filename: name, scanned: false, notes };
  }

  if (lower.endsWith(".pdf")) {
    const pdf = await extractPdf(await file.arrayBuffer());
    return {
      text: pdf.text,
      format: "pdf",
      filename: name,
      pageCount: pdf.pages,
      scanned: pdf.scanned,
      notes: pdf.notes,
    };
  }

  throw new Error("Use TXT, Markdown, DOC, DOCX, or PDF. EPUB and ZIP collections are not available yet.");
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
