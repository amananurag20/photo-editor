import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import opentype from "opentype.js";
import { baseElement, createProject } from "../app/editor/model.ts";
import {
  resizeElement,
  preserveLocked,
  reorderLayer,
  exportDimensions,
  photoGeometry,
} from "../app/editor/geometry.ts";
import { historyReducer } from "../app/editor/history.ts";
import { pngResolution } from "../app/editor/png.ts";

test("PNG resolution metadata is written as 300 DPI without duplicating chunks", () => {
  const original = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  );
  const result = pngResolution(pngResolution(original, 150), 300);
  let offset = 8,
    count = 0;
  while (offset + 12 <= result.length) {
    const view = new DataView(result.buffer, result.byteOffset + offset),
      length = view.getUint32(0),
      tag = String.fromCharCode(...result.subarray(offset + 4, offset + 8));
    if (tag === "pHYs") {
      count++;
      assert.equal(view.getUint32(8), 11811);
      assert.equal(view.getUint32(12), 11811);
      assert.equal(result[offset + 16], 1);
    }
    offset += length + 12;
  }
  assert.equal(count, 1);
  assert.equal(result.length, original.length + 21);
});
import {
  wrapMeasured,
  glyphWidth,
  outlineText,
} from "../app/editor/typography.ts";

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
function world(e, hx, hy) {
  const a = (e.rotation * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return [
    e.x + e.w / 2 + (c * hx * e.w) / 2 - (s * hy * e.h) / 2,
    e.y + e.h / 2 + (s * hx * e.w) / 2 + (c * hy * e.h) / 2,
  ];
}
test("every resize handle preserves its opposite anchor under rotation", () => {
  for (const rotation of [0, 30, 90, 145, 270])
    for (const handle of [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ]) {
      const original = baseElement("photo", { rotation, w: 180, h: 270 }),
        after = resizeElement(original, 31, -17, handle);
      const a = world(original, -handle[0], -handle[1]),
        b = world(after, -handle[0], -handle[1]);
      near(a[0], b[0]);
      near(a[1], b[1]);
    }
});
test("aspect lock preserves ratio including the minimum-size constraint", () => {
  const e = baseElement("photo", { rotation: 36, w: 240, h: 160 });
  for (const delta of [
    [400, 20],
    [-10000, -10000],
  ]) {
    const r = resizeElement(e, ...delta, [1, 1], true);
    near(r.w / r.h, 1.5);
    assert.ok(r.w >= 25 && r.h >= 25);
  }
});
test("bulk replacement and reordering cannot change locked layers", () => {
  const a = baseElement("text"),
    b = baseElement("photo", { locked: true }),
    c = baseElement("sticker");
  const all = [a, b, c],
    next = preserveLocked(all, [{ ...b, x: 999 }, c, a]);
  assert.equal(next[1], b);
  assert.deepEqual(preserveLocked(all, []), [b]);
  assert.equal(reorderLayer(all, b.id, 1), all);
  assert.equal(reorderLayer(all, a.id, 2), all);
  assert.equal(
    preserveLocked(all, [a, { ...b, locked: false }, c], b.id)[1].locked,
    false,
  );
});
test("crop geometry fills without distorting and pans at native fill zoom", () => {
  const e = baseElement("photo", {
    w: 200,
    h: 200,
    frame: "none",
    sourceW: 400,
    sourceH: 200,
    fit: "cover",
  });
  const left = photoGeometry({ ...e, focalX: 0 }),
    right = photoGeometry({ ...e, focalX: 100 });
  assert.equal(left.width, 400);
  near(left.x, 0);
  assert.equal(right.x, -200);
  const fit = photoGeometry({ ...e, fit: "contain" });
  assert.equal(fit.width, 200);
  assert.equal(fit.height, 100);
  assert.equal(fit.y, 50);
  const tiny = photoGeometry({ ...e, w: 25, h: 25, frame: "polaroid" });
  assert.ok(tiny.iw > 0 && tiny.ih > 0);
});
test("300 DPI export uses A4 physical dimensions and real bleed", () => {
  assert.deepEqual(exportDimensions(300, true, false), {
    widthMm: 426,
    heightMm: 303,
    width: 5031,
    height: 3579,
    margin: 3,
  });
  const marked = exportDimensions(300, true, true);
  assert.equal(marked.widthMm, 436);
  assert.equal(marked.heightMm, 313);
  assert.equal(marked.margin, 8);
});
test("undo restores geometry; redo restores edit; a new branch drops redo", () => {
  const p = createProject();
  let state = { present: p, past: [], future: [] };
  const next = { ...p, name: "Changed" };
  state = historyReducer(state, { type: "commit", project: next });
  state = historyReducer(state, { type: "undo" });
  assert.equal(state.present, p);
  state = historyReducer(state, { type: "redo" });
  assert.equal(state.present, next);
  state = historyReducer(state, { type: "undo" });
  state = historyReducer(state, {
    type: "commit",
    project: { ...p, name: "Branch" },
  });
  assert.equal(state.future.length, 0);
  for (let i = 0; i < 100; i++)
    state = historyReducer(state, {
      type: "commit",
      project: { ...p, name: String(i) },
    });
  assert.equal(state.past.length, 70);
});
test("bundled fonts parse, outline glyphs, and wrap using measured advances", () => {
  for (const family of ["caveat", "lora", "noto-sans", "roboto-mono"])
    for (const weight of [400, 700])
      for (const style of family === "caveat"
        ? ["normal"]
        : ["normal", "italic"]) {
        const bytes = readFileSync(
          new URL(
            `../public/fonts/${family}-latin-${weight}-${style}.woff`,
            import.meta.url,
          ),
        );
        const font = opentype.parse(
          bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ),
        );
        const measure = (t) => glyphWidth(font, t, 24);
        const lines = wrapMeasured(
          "Wide words WWW and narrow iii\nA_new_very_long_word_here",
          150,
          measure,
        );
        assert.ok(lines.every((line) => measure(line) <= 150));
        assert.ok(outlineText(font, "Our memories", 0, 30, 24).length > 20);
      }
});
