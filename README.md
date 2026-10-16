# Storybook Gen Illustration

A standalone illustrated-novel production studio.

Upload a manuscript, lock canon, extract character bibles, choose an art direction, storyboard scenes, generate plates (AI Horde by default, no API key), assemble pages, and export PDF / ZIP / JSON.

This repository is independent of Nightshade Forge, Nightcast, Amber, and every other project.

- GitHub: [Spacepocohontas/storybook-gen-illustration](https://github.com/Spacepocohontas/storybook-gen-illustration)
- Production: [storybook-gen-illustration.vercel.app](https://storybook-gen-illustration.vercel.app)

## Principles

1. The manuscript is the authority.
2. The user is the director.
3. The AI is the production assistant.
4. Free-first: AI Horde works with no key. Optional keys stay in session storage and are only sent to the matching provider.

## Local development

```bash
npm install
npm run dev
```

Projects are stored in the browser (IndexedDB). Nothing is uploaded until you press a generate action.


### Document import

Import selectable-text PDF, DOCX, TXT, Markdown, EPUB, ODT, RTF, HTML, JSON, CSV, and other common text files. Extraction runs locally using bundled readers and a local PDF worker. Review the extracted text before continuing. Unsupported files, legacy DOC, and scanned PDFs without selectable text produce conversion/OCR guidance; a failed import preserves the previous manuscript.

Specialized character-card (PNG, WebP, JSON, CHARX), lore, and reference-image import remain separate from manuscript import.
