# Pixory — frontend photobook editor

A client-side recreation of the scrapbook editing experience at [Memorify](https://memorify-editor.vercel.app/), built in the existing Next.js 16 / React 19 project. No backend, account, API key, or external image service is needed.

Production builds export a self-contained static website to `out/`, ready for any static host.

## Run

```sh
npm install
npm run dev
```

The development server already running in this workspace uses **http://localhost:3004**. For a new server, use the URL printed by Next.js.

## Features

- Eleven editable two-page spreads, including a cover and a protected end paper.
- Native SVG canvas with drag, resize, rotate, opacity, keyboard nudging, selection, grid, safe-area and bleed guides.
- JPG, PNG and WebP uploads, drag into frames, crop zoom and positioning, photo frames and masks.
- Editable text with font, size, alignment, colour, bold and italic controls.
- Hand-drawn vector stickers, page layouts, backgrounds, textures and book-wide themes.
- Spread creation, duplication, reordering and deletion; layer ordering, visibility and locking.
- Undo/redo, local comments, automatic IndexedDB saving, and validated JSON project import/export.
- Single-spread or all-spread print preview, PNG and SVG exports, and whole-book print-to-PDF through the browser print dialog.
- Frontend cart with binding and quantity selection. Cart prices are illustrative; no payment or order is submitted.
- Responsive panels, accessible controls, keyboard shortcuts, and reduced-motion support.

## Data and exports

Photos are decoded locally and resized to at most 2400 pixels on their longest side. Projects are saved in this browser's IndexedDB; clearing browser data removes them. Download a `.pixory.json` backup from **File → Download project** to keep an editable copy or move it to another device. Share sends no network request; it downloads this portable file.

PNG exports the current spread at 1680 × 1160 pixels. SVG embeds images and preserves vector elements. **File → Export your book → Print your whole book** opens the browser print dialog; choose Save as PDF, enable background graphics if prompted, and use the page size supplied by the document. Print exports omit guides and the non-editable end-paper notice. Physical production, cloud accounts, live collaboration, and real checkout are intentionally not connected.

## Checks

Requires Node.js 22.18+ for the built-in TypeScript support used by tests.

```sh
npm run lint
npm run test
npx tsc --noEmit
npm run build
```

If a restricted execution environment prevents Turbopack from creating its internal worker socket, the equivalent production build works with:

```sh
npm run build -- --webpack
```

Model tests cover project round-tripping, independent spread duplication, preflight warnings, layouts, and malformed import rejection. Browser checks cover text edits, undo/redo, reload persistence, photo uploads, cropping, dragging, resizing, and export generation.

## Structure

- `app/editor/editor.tsx`: editor state, history, library panels, inspector, dialogs and exports.
- `app/editor/canvas.tsx`: pointer interactions and canvas guides.
- `app/editor/artwork.tsx`: shared SVG rendering for canvas, thumbnails, preview and export.
- `app/editor/model.ts`: typed document model, starter book, layouts, duplication, validation and preflight.
- `app/editor/storage.ts`: IndexedDB, image processing and downloads.
- `app/globals.css`, `app/editor/panels.css`: editor and responsive styling.

All visuals are rendered locally; no fonts or stock photos are fetched from a third-party service.
