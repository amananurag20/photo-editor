"use client";
import { useId, useRef, useState } from "react";
import { ElementArt, PageArt } from "./artwork";
import { resizeElement, PRINT, type Handle } from "./geometry";
import { H, W, type Element, type Page } from "./model";

type Props = {
  page: Page;
  number: number;
  selected: string | null;
  active: boolean;
  grid: boolean;
  safe: boolean;
  bleed: boolean;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<Element>) => void;
  onPhoto: (src: string, id?: string) => void;
  onFiles: (files: File[], id?: string) => void;
  onEdit: () => void;
};
export default function Canvas({
  page,
  number,
  selected,
  active,
  grid,
  safe,
  bleed,
  onSelect,
  onChange,
  onPhoto,
  onFiles,
  onEdit,
}: Props) {
  const svg = useRef<SVGSVGElement>(null),
    id = useId().replace(/:/g, "");
  const gesture = useRef<{
    id: string;
    x: number;
    y: number;
    original: Element;
    resize: Handle | null;
  } | null>(null);
  const [draft, setDraft] = useState<Element | null>(null);
  const currentDraft = useRef<Element | null>(null);
  const bx = bleed ? (PRINT.bleedMm / PRINT.widthMm) * W : 0,
    by = bleed ? (PRINT.bleedMm / PRINT.heightMm) * H : 0;
  function point(event: React.PointerEvent) {
    const rect = svg.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * (W + bx * 2) - bx,
      y: ((event.clientY - rect.top) / rect.height) * (H + by * 2) - by,
    };
  }
  function start(
    event: React.PointerEvent<SVGGElement | SVGRectElement>,
    element: Element,
    resize: Handle | null = null,
  ) {
    event.stopPropagation();
    onSelect(element.id);
    if (element.locked) return;
    const p = point(event);
    gesture.current = { id: element.id, ...p, original: element, resize };
    currentDraft.current = element;
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: React.PointerEvent) {
    const g = gesture.current;
    if (!g) return;
    const p = point(event),
      dx = p.x - g.x,
      dy = p.y - g.y;
    const next = {
      ...g.original,
      ...(g.resize
        ? resizeElement(
            g.original,
            dx,
            dy,
            g.resize,
            event.shiftKey || g.original.aspectLocked,
          )
        : {
            x: Math.max(
              -g.original.w + 15,
              Math.min(W - 15, g.original.x + dx),
            ),
            y: Math.max(
              -g.original.h + 15,
              Math.min(H - 15, g.original.y + dy),
            ),
          }),
    };
    currentDraft.current = next;
    setDraft(next);
  }
  function end() {
    if (gesture.current && currentDraft.current) {
      const { id, original } = gesture.current;
      if (JSON.stringify(original) !== JSON.stringify(currentDraft.current))
        onChange(id, currentDraft.current);
    }
    gesture.current = null;
    currentDraft.current = null;
    setDraft(null);
  }
  return (
    <div
      className={`book-page ${active ? "active-page" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (page.locked) return;
        onSelect(null);
        const rect = svg.current!.getBoundingClientRect(),
          x = ((event.clientX - rect.left) / rect.width) * (W + bx * 2) - bx,
          y = ((event.clientY - rect.top) / rect.height) * (H + by * 2) - by;
        const target = [...page.elements]
          .reverse()
          .find(
            (e) =>
              e.kind === "photo" &&
              !e.locked &&
              !e.hidden &&
              x >= e.x &&
              x <= e.x + e.w &&
              y >= e.y &&
              y <= e.y + e.h,
          );
        const src = event.dataTransfer.getData("application/x-pixory-photo");
        if (src) onPhoto(src, target?.id);
        else if (event.dataTransfer.files.length)
          onFiles(Array.from(event.dataTransfer.files), target?.id);
      }}
    >
      <svg
        ref={svg}
        className="interactive-page"
        viewBox={`${-bx} ${-by} ${W + bx * 2} ${H + by * 2}`}
        preserveAspectRatio="none"
        role="group"
        aria-label={`Page ${number}`}
        onPointerDown={() => onSelect(null)}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={() => {
          gesture.current = null;
          currentDraft.current = null;
          setDraft(null);
        }}
      >
        <svg x={-bx} y={-by} width={W + bx * 2} height={H + by * 2}>
          <PageArt
            page={{ ...page, elements: [] }}
            index={number}
            bleedMm={bleed ? PRINT.bleedMm : 0}
          />
        </svg>
        {!page.locked &&
          page.elements
            .filter((e) => !e.hidden)
            .map((original) => {
              const e = draft?.id === original.id ? draft : original;
              return (
                <g
                  key={e.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${e.kind}: ${e.text || e.sticker || (e.src ? "photo" : "empty photo frame")}`}
                  transform={`translate(${e.x} ${e.y}) rotate(${e.rotation} ${e.w / 2} ${e.h / 2})`}
                  opacity={e.opacity}
                  onPointerDown={(event) => start(event, e)}
                  onDoubleClick={() => {
                    onSelect(e.id);
                    onEdit();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      onSelect(e.id);
                      onEdit();
                    }
                  }}
                  style={{
                    cursor: e.locked ? "not-allowed" : "move",
                    outline: "none",
                  }}
                >
                  <rect width={e.w} height={e.h} fill="transparent" />
                  <g pointerEvents="none">
                    <ElementArt element={e} prefix={id} />
                  </g>
                  {selected === e.id && (
                    <g data-editor-guide="true">
                      <rect
                        x="-3"
                        y="-3"
                        width={e.w + 6}
                        height={e.h + 6}
                        fill="none"
                        stroke="#bd7f69"
                        strokeWidth="1.4"
                        strokeDasharray={e.locked ? "4 3" : undefined}
                      />
                      {!e.locked && (
                        <>
                          {(
                            [
                              [-1, -1],
                              [0, -1],
                              [1, -1],
                              [-1, 0],
                              [1, 0],
                              [-1, 1],
                              [0, 1],
                              [1, 1],
                            ] as Handle[]
                          ).map(([hx, hy], i) => (
                            <rect
                              key={i}
                              aria-label={`Resize ${["top left", "top", "top right", "left", "right", "bottom left", "bottom", "bottom right"][i]}`}
                              role="button"
                              x={((hx + 1) / 2) * e.w - 5}
                              y={((hy + 1) / 2) * e.h - 5}
                              width="10"
                              height="10"
                              fill="white"
                              stroke="#bd7f69"
                              onPointerDown={(event) =>
                                start(event, e, [hx, hy])
                              }
                              style={{
                                cursor:
                                  hx === 0
                                    ? "ns-resize"
                                    : hy === 0
                                      ? "ew-resize"
                                      : hx === hy
                                        ? "nwse-resize"
                                        : "nesw-resize",
                              }}
                            />
                          ))}
                        </>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
        <g pointerEvents="none" data-editor-guide="true">
          {grid && (
            <g stroke="#84766b" opacity=".19" strokeDasharray="4 5">
              {[1, 2, 3].map((i) => (
                <g key={i}>
                  <path d={`M${(W * i) / 4} 0V${H}`} />
                  <path d={`M0 ${(H * i) / 4}H${W}`} />
                </g>
              ))}
            </g>
          )}
          {safe && (
            <rect
              x={(PRINT.safeMm / PRINT.widthMm) * W}
              y={(PRINT.safeMm / PRINT.heightMm) * H}
              width={W - ((2 * PRINT.safeMm) / PRINT.widthMm) * W}
              height={H - ((2 * PRINT.safeMm) / PRINT.heightMm) * H}
              stroke="#78a185"
              strokeWidth="1"
              strokeDasharray="5 4"
              fill="none"
            />
          )}
          {bleed && (
            <rect
              x={0}
              y={0}
              width={W}
              height={H}
              stroke="#d89494"
              strokeWidth="1"
              strokeDasharray="5 4"
              fill="none"
            />
          )}
        </g>
      </svg>
    </div>
  );
}
