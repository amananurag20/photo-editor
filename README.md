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
- Native SVG canvas with eight resize handles, anchored rotated resizing, aspect-ratio locking (or Shift + corner drag), opacity, keyboard nudging, grid, and physical safe-area and bleed guides.
- JPG, PNG and WebP uploads, drag into frames, crop zoom and positioning, photo frames and masks.
- Bundled fonts with measured text wrapping, vector-outlined text, size, alignment, colour, bold, italic, underline, letter spacing, and line-height controls.
- Hand-drawn vector stickers, page layouts, backgrounds, textures and book-wide themes.
- Spread creation, duplication, reordering and deletion; layer ordering, visibility and locking.
- Undo/redo, local comments, automatic IndexedDB saving, and validated JSON project import/export.
- Single-spread or all-spread print preview, PNG and SVG exports, and whole-book print-to-PDF through the browser print dialog.
- Frontend cart with binding and quantity selection. Cart prices are illustrative; no payment or order is submitted.
- Responsive panels, accessible controls, keyboard shortcuts, and reduced-motion support.

## Data and exports

Photos are decoded locally and preserved at their original resolution (up to 25 MB per file). Existing saved images have their dimensions recovered on load; images downsized by older versions cannot recover lost pixels without uploading their originals again. Projects are saved in this browser's IndexedDB; clearing browser data removes them. Download a `.pixory.json` backup from **File → Download project** to keep an editable copy or move it to another device. Share sends no network request; it downloads this portable file.

Exports use A4 trim dimensions (210 × 297 mm per page), optional 3 mm bleed and crop marks, and 150 or 300 DPI PNG rasterization. PNG files include physical resolution metadata. At 300 DPI, a spread is 5031 × 3579 pixels with bleed, or 5150 × 3697 pixels with bleed and crop-mark space. The export dialog shows a vector proof and the last generated raster proof. SVG embeds images and outlines user text, preserving its appearance without installed fonts. **File → Export your book → Print your whole book** opens the browser print dialog; choose Save as PDF, enable background graphics if prompted, and use the document's physical page size at 100% scale. The PDF layout follows the chosen bleed and crop-mark settings. Print exports omit editing guides and the end-paper notice.

The red editor guide is the trim boundary; the visible region outside it is the 3 mm bleed. Green guides show the 5 mm safe margin. Page backgrounds extend into bleed automatically; edge-to-edge photos must be enlarged past the trim boundary. Preflight flags empty photo frames, effective photo resolution below 200 DPI, text overflow, and unsupported glyphs. Four bundled Latin font families (Caveat, Lora, Noto Sans, Roboto Mono) render using glyph outlines, kerning, and measured advances. Advanced script shaping, arbitrary font uploads, CMYK/PDF-X colour workflows, and printer-specific binding imposition are not implemented. Font licenses are included in `public/fonts/`.

Photo tools support fit/fill, focal positioning, flips, and rectangle, rounded, circle, ellipse, arch, heart, star, hexagon, diamond, petal, and teardrop masks. Locked elements are preserved through layout replacement and themes; layer moves cannot cross locked layers. Physical production, cloud accounts, live collaboration, and real checkout are intentionally not connected.

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

Tests cover project round-tripping, independent spread duplication, preflight warnings, malformed imports, every rotated resize handle, aspect constraints, locked layers, fit/fill geometry, history branching, physical export dimensions, PNG resolution metadata, and all bundled font styles. Browser checks include original-image uploads, proportional resizing, rotated masked photos, theme changes with locked elements, and decoding a 5150 × 3697 production PNG proof.

## Structure

- `app/editor/editor.tsx`: editor state, history, library panels, inspector, dialogs and exports.
- `app/editor/canvas.tsx`: pointer interactions and canvas guides.
- `app/editor/artwork.tsx`: shared SVG rendering for canvas, thumbnails, preview and export.
- `app/editor/model.ts`: typed document model, starter book, layouts, duplication, validation and preflight.
- `app/editor/storage.ts`: IndexedDB, image processing and downloads.
- `app/editor/geometry.ts`, `history.ts`: tested transformations, locking, print dimensions and history transitions.
- `app/editor/typography.ts`, `masks.tsx`: shared font outlines and mask geometry.
- `app/editor/print-artwork.tsx`, `png.ts`: physical print composition, crop marks and PNG resolution metadata.
- `app/globals.css`, `app/editor/panels.css`: editor and responsive styling.

All visuals are rendered locally; no fonts or stock photos are fetched from a third-party service.
