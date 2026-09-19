import type { Element } from "./model";

export type Handle = [number, number];
export function resizeElement(
  e: Element,
  dx: number,
  dy: number,
  handle: Handle = [1, 1],
  ratio = false,
): Element {
  const [hx, hy] = handle,
    angle = (e.rotation * Math.PI) / 180;
  const c = Math.cos(angle),
    s = Math.sin(angle);
  const localX = dx * c + dy * s,
    localY = -dx * s + dy * c;
  let w = hx ? Math.max(25, e.w + localX * hx) : e.w;
  let h = hy ? Math.max(25, e.h + localY * hy) : e.h;
  if (ratio && hx && hy) {
    const scale =
      Math.abs(w / e.w - 1) > Math.abs(h / e.h - 1) ? w / e.w : h / e.h;
    const constrained = Math.max(scale, 25 / e.w, 25 / e.h);
    w = e.w * constrained;
    h = e.h * constrained;
  }
  const shiftX = ((w - e.w) * hx) / 2,
    shiftY = ((h - e.h) * hy) / 2;
  return {
    ...e,
    w,
    h,
    x: e.x + e.w / 2 + c * shiftX - s * shiftY - w / 2,
    y: e.y + e.h / 2 + s * shiftX + c * shiftY - h / 2,
  };
}

export function preserveLocked(
  previous: Element[],
  requested: Element[],
  allowedId?: string,
): Element[] {
  const locked = previous.filter((e) => e.locked && e.id !== allowedId);
  const ids = new Set(locked.map((e) => e.id));
  const next = requested.filter((e) => !ids.has(e.id));
  for (const e of locked)
    next.splice(Math.min(previous.indexOf(e), next.length), 0, e);
  return next;
}
export function reorderLayer(
  elements: Element[],
  id: string,
  direction: number,
): Element[] {
  const i = elements.findIndex((e) => e.id === id);
  if (i < 0 || elements[i].locked) return elements;
  const target = Math.max(0, Math.min(elements.length - 1, i + direction));
  if (
    elements
      .slice(Math.min(i, target), Math.max(i, target) + 1)
      .some((e) => e.locked)
  )
    return elements;
  const next = [...elements];
  const [e] = next.splice(i, 1);
  next.splice(target, 0, e);
  return next;
}

export const PRINT = { widthMm: 210, heightMm: 297, bleedMm: 3, safeMm: 5 };
export function exportDimensions(dpi: number, bleed: boolean, marks = false) {
  const margin = (bleed ? PRINT.bleedMm : 0) + (marks ? 5 : 0);
  const widthMm = PRINT.widthMm * 2 + margin * 2,
    heightMm = PRINT.heightMm + margin * 2;
  return {
    widthMm,
    heightMm,
    width: Math.round((widthMm / 25.4) * dpi),
    height: Math.round((heightMm / 25.4) * dpi),
    margin,
  };
}
export function photoGeometry(e: Element) {
  const border = Math.min(
    e.frame === "none" ? 0 : e.frame === "thin" ? 3 : 10,
    e.w / 8,
    e.h / 8,
  );
  const bottom = e.frame === "polaroid" ? Math.min(24, e.h / 5) : 0;
  const iw = Math.max(1, e.w - border * 2),
    ih = Math.max(1, e.h - border * 2 - bottom);
  const sourceW = e.sourceW || iw,
    sourceH = e.sourceH || ih;
  const ratio =
    e.fit === "contain"
      ? Math.min(iw / sourceW, ih / sourceH)
      : Math.max(iw / sourceW, ih / sourceH);
  const zoom = e.crop || 1,
    width = sourceW * ratio * zoom,
    height = sourceH * ratio * zoom;
  return {
    border,
    iw,
    ih,
    width,
    height,
    x: ((iw - width) * (e.focalX ?? 50)) / 100,
    y: ((ih - height) * (e.focalY ?? 50)) / 100,
  };
}
