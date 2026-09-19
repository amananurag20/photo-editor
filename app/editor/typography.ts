import * as opentype from "opentype.js";
import type { Font } from "opentype.js";
import type { Element } from "./model";

const families: Record<string, string> = {
  Cursive: "caveat",
  Serif: "lora",
  Sans: "noto-sans",
  Monospace: "roboto-mono",
};
const cache = new Map<string, Font>();
let pending: Promise<void> | undefined;
const key = (e: Pick<Element, "font" | "bold" | "italic">) =>
  `${e.font || "Serif"}-${e.bold ? 700 : 400}-${e.italic && e.font !== "Cursive" ? "italic" : "normal"}`;
export function loadFonts(): Promise<void> {
  if (!pending)
    pending = Promise.all(
      Object.entries(families).flatMap(([family, name]) =>
        [400, 700].flatMap((weight) =>
          (family === "Cursive" ? ["normal"] : ["normal", "italic"]).map(
            async (style) => {
              const response = await fetch(
                `/fonts/${name}-latin-${weight}-${style}.woff`,
              );
              if (!response.ok)
                throw new Error(
                  `Could not load ${family} font. Please reload.`,
                );
              const bytes = await response.arrayBuffer();
              cache.set(`${family}-${weight}-${style}`, opentype.parse(bytes));
              const face = new FontFace(`Pixory${family}`, bytes, {
                weight: String(weight),
                style,
              });
              await face.load();
              document.fonts.add(face);
            },
          ),
        ),
      ),
    )
      .then(() => undefined)
      .catch((error) => {
        pending = undefined;
        throw error;
      });
  return pending;
}
export function fontFor(e: Pick<Element, "font" | "bold" | "italic">) {
  return cache.get(key(e));
}
export function glyphWidth(
  font: Font,
  text: string,
  size: number,
  spacing = 0,
) {
  const glyphs = Array.from(text.normalize("NFC")).map((c) =>
    font.charToGlyph(c),
  );
  let width = 0;
  glyphs.forEach((g, i) => {
    if (i)
      width +=
        (font.getKerningValue(glyphs[i - 1], g) * size) / font.unitsPerEm +
        spacing;
    width += ((g.advanceWidth || 0) * size) / font.unitsPerEm;
  });
  return width;
}
export function outlineText(
  font: Font,
  text: string,
  x: number,
  y: number,
  size: number,
  spacing = 0,
) {
  const glyphs = Array.from(text.normalize("NFC")).map((c) =>
    font.charToGlyph(c),
  );
  let pen = x;
  return glyphs
    .map((g, i) => {
      if (i)
        pen +=
          (font.getKerningValue(glyphs[i - 1], g) * size) / font.unitsPerEm +
          spacing;
      const path = g.getPath(pen, y, size).toPathData(3);
      pen += ((g.advanceWidth || 0) * size) / font.unitsPerEm;
      return path;
    })
    .join(" ");
}
export function wrapMeasured(
  text: string,
  width: number,
  measure: (text: string) => number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= width) {
        line = candidate;
        continue;
      }
      if (line) {
        lines.push(line);
        line = "";
      }
      for (const letter of Array.from(word)) {
        if (line && measure(line + letter) > width) {
          lines.push(line);
          line = "";
        }
        line += letter;
      }
    }
    lines.push(line);
  }
  return lines;
}
export function textLayout(e: Element) {
  const font = fontFor(e),
    size = e.size || 28,
    spacing = e.letterSpacing || 0;
  const measure = (t: string) =>
    font ? glyphWidth(font, t, size, spacing) : 0;
  const lines = wrapMeasured(e.text || "", Math.max(1, e.w), measure);
  const baseline = font ? (font.ascender / font.unitsPerEm) * size : size;
  const step = size * (e.lineHeight || 1.35);
  return {
    font,
    size,
    spacing,
    measure,
    lines,
    baseline,
    step,
    height:
      baseline +
      (lines.length - 1) * step +
      (font ? (-font.descender / font.unitsPerEm) * size : 0),
  };
}
export function textPaths(e: Element) {
  const layout = textLayout(e);
  if (!layout.font) return [];
  const { font, size, spacing, measure, lines, baseline, step } = layout;
  return lines.map((text, index) => {
    const width = measure(text),
      x =
        e.align === "left"
          ? 0
          : e.align === "right"
            ? e.w - width
            : (e.w - width) / 2,
      y = baseline + index * step;
    return { d: outlineText(font, text, x, y, size, spacing), x, y, width };
  });
}
