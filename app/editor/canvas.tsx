"use client";
import { useId, useRef, useState } from "react";
import { ElementArt, PageArt } from "./artwork";
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
    resize: boolean;
  } | null>(null);
  const [draft, setDraft] = useState<Element | null>(null);
  const currentDraft = useRef<Element | null>(null);
  function point(event: React.PointerEvent) {
    const rect = svg.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * W,
      y: ((event.clientY - rect.top) / rect.height) * H,
    };
  }
  function start(
    event: React.PointerEvent<SVGGElement | SVGRectElement>,
    element: Element,
    resize = false,
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
    const radians = (g.original.rotation * Math.PI) / 180;
    const next = {
      ...g.original,
      ...(g.resize
        ? {
            w: Math.max(
              25,
              g.original.w + dx * Math.cos(radians) + dy * Math.sin(radians),
            ),
            h: Math.max(
              25,
              g.original.h - dx * Math.sin(radians) + dy * Math.cos(radians),
            ),
          }
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
          x = ((event.clientX - rect.left) / rect.width) * W,
          y = ((event.clientY - rect.top) / rect.height) * H;
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
        viewBox={`0 0 ${W} ${H}`}
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
        <PageArt page={{ ...page, elements: [] }} index={number} />
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
                          {[
                            [-3, -3],
                            [e.w + 3, -3],
                            [-3, e.h + 3],
                          ].map(([x, y], i) => (
                            <rect
                              key={i}
                              x={x - 3}
                              y={y - 3}
                              width="6"
                              height="6"
                              fill="white"
                              stroke="#bd7f69"
                            />
                          ))}
                          <rect
                            aria-label="Resize selected element"
                            role="button"
                            x={e.w - 3}
                            y={e.h - 3}
                            width="12"
                            height="12"
                            rx="1"
                            fill="white"
                            stroke="#bd7f69"
                            onPointerDown={(event) => start(event, e, true)}
                            style={{ cursor: "nwse-resize" }}
                          />
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
              x="25"
              y="25"
              width={W - 50}
              height={H - 50}
              stroke="#78a185"
              strokeWidth="1"
              strokeDasharray="5 4"
              fill="none"
            />
          )}
          {bleed && (
            <rect
              x="8"
              y="8"
              width={W - 16}
              height={H - 16}
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
