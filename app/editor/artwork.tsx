import { useId } from "react";
import { fontFamily, H, W, type Element, type Page } from "./model";

export function Sticker({
  name,
  color = "#b8848b",
}: {
  name?: string;
  color?: string;
}) {
  if (name === "polaroid")
    return (
      <g>
        <rect x="4" y="4" width="94" height="96" fill="#d6d2cc" opacity=".35" />
        <rect width="94" height="96" fill="#fffefa" />
        <rect
          x="7"
          y="7"
          width="80"
          height="69"
          fill="#fcfcfa"
          stroke="#eeede9"
          strokeWidth=".5"
        />
      </g>
    );
  if (name === "tape")
    return (
      <path
        d="M2 3L10 1 18 4 26 1 34 4 42 1 50 4 58 1 66 4 74 1 82 4 90 1 98 3 95 96 87 98 79 95 71 98 63 95 55 98 47 95 39 98 31 95 23 98 15 95 7 98Z"
        fill={color}
        opacity=".3"
      />
    );
  if (name === "heart-note")
    return (
      <g fill="none" stroke={color} strokeWidth="1.15" strokeLinecap="round">
        <path d="M8 23L91 17 96 93 8 96Z M4 28L8 98 92 99 M16 26L86 24 86 88 17 91 M31 15L67 13 68 22 31 24Z M43 15V5q0-7 8-3 5 3 0 7v5 M46 5h3" />
        <path
          d="M51 77C37 66 17 51 28 39 37 28 49 40 50 44 56 23 82 33 75 49 72 60 58 72 51 77Z"
          strokeWidth="1.5"
        />
        <path d="M10 30L13 84 M88 31L91 74 M25 94L75 95" opacity=".65" />
      </g>
    );
  if (name === "heart")
    return (
      <path
        d="M50 89C33 76 0 49 11 24 23 0 47 12 50 29 63-1 91 9 93 30 96 51 67 79 50 89Z"
        fill="none"
        stroke={color}
        strokeWidth="2.3"
      />
    );
  if (name === "star")
    return (
      <path
        d="M50 3L61 36 96 37 68 58 78 94 50 73 22 94 32 58 4 37 39 36Z"
        fill={color}
        opacity=".85"
      />
    );
  if (name === "sparkle")
    return (
      <g fill="none" stroke={color} strokeWidth="2">
        <path d="M50 6Q48 47 12 50q37 2 38 44 2-41 39-44Q52 48 50 6Z M83 2v19 M73 12h20 M13 77v15 M6 85h15" />
      </g>
    );
  if (name === "flower")
    return (
      <g fill="none" stroke={color} strokeWidth="1.6">
        <path d="M49 99Q66 70 50 47 M54 78Q20 56 29 79q11 13 25-1 M55 63Q88 49 78 71q-16 11-23-8" />
        <path d="M50 36C25 6 18 41 40 43 10 51 38 72 46 50 40 80 76 67 57 48 86 63 91 30 63 38 85 12 50 0 50 36Z" />
        <circle cx="51" cy="43" r="8" />
      </g>
    );
  if (name === "bow")
    return (
      <g fill="none" stroke={color} strokeWidth="2">
        <path d="M48 42C6 0-11 72 45 50 M53 42C95 0 111 72 56 50 M47 48L22 95 18 75 6 76 45 49 M55 48L75 96 80 77 95 81 58 50" />
        <ellipse cx="51" cy="46" rx="7" ry="10" />
      </g>
    );
  return (
    <g fill="none" stroke={color} strokeWidth="1.5">
      <rect x="7" y="25" width="86" height="65" rx="6" />
      <circle cx="50" cy="57" r="22" />
      <circle cx="50" cy="57" r="15" />
      <path d="M25 25l8-14h34l8 14 M76 35h9" />
    </g>
  );
}

function wrapText(text: string, width: number, size: number): string[] {
  const max = Math.max(2, Math.floor(width / (size * 0.53)));
  return text.split("\n").flatMap((p) => {
    if (!p) return [""];
    const lines: string[] = [];
    let line = "";
    for (const word of p.split(" ")) {
      if (line && line.length + word.length + 1 > max) {
        lines.push(line);
        line = "";
      }
      if (word.length > max) {
        if (line) lines.push(line);
        for (let i = 0; i < word.length; i += max)
          lines.push(word.slice(i, i + max));
        line = "";
      } else line += (line ? " " : "") + word;
    }
    if (line) lines.push(line);
    return lines;
  });
}

export function ElementArt({
  element: e,
  prefix,
}: {
  element: Element;
  prefix: string;
}) {
  const clip = `${prefix}-${e.id}-clip`;
  if (e.kind === "text") {
    const size = e.size || 28,
      lines = wrapText(e.text || "", e.w, size),
      x = e.align === "left" ? 0 : e.align === "right" ? e.w : e.w / 2;
    return (
      <text
        x={x}
        y={size}
        fill={e.color}
        fontFamily={fontFamily(e.font)}
        fontSize={size}
        fontWeight={e.bold ? 700 : 400}
        fontStyle={e.italic ? "italic" : "normal"}
        textAnchor={
          e.align === "left" ? "start" : e.align === "right" ? "end" : "middle"
        }
      >
        {lines.map((line, i) => (
          <tspan key={i} x={x} dy={i ? size * 1.35 : 0}>
            {line}
          </tspan>
        ))}
      </text>
    );
  }
  if (e.kind === "sticker")
    return (
      <svg
        width={e.w}
        height={e.h}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <Sticker name={e.sticker} color={e.color} />
      </svg>
    );
  if (e.kind === "shape")
    return e.mask === "circle" ? (
      <ellipse
        cx={e.w / 2}
        cy={e.h / 2}
        rx={e.w / 2}
        ry={e.h / 2}
        fill={e.color}
      />
    ) : (
      <rect
        width={e.w}
        height={e.h}
        rx={e.mask === "rounded" ? 20 : 0}
        fill={e.color}
      />
    );
  const border = e.frame === "none" ? 0 : e.frame === "thin" ? 3 : 10;
  const iw = e.w - border * 2,
    ih = e.h - border * 2 - (e.frame === "polaroid" ? 24 : 0);
  const zoom = e.crop || 1;
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          {e.mask === "circle" ? (
            <ellipse cx={e.w / 2} cy={e.h / 2} rx={e.w / 2} ry={e.h / 2} />
          ) : e.mask === "heart" ? (
            <path
              transform={`scale(${e.w / 100} ${e.h / 100})`}
              d="M50 97C25 77-8 42 5 17 18-7 44-1 50 20 65-9 97-3 99 24 102 48 72 82 50 97Z"
            />
          ) : e.mask === "arch" ? (
            <path
              d={`M0 ${e.w / 2}a${e.w / 2} ${e.w / 2} 0 0 1 ${e.w} 0V${e.h}H0Z`}
            />
          ) : (
            <rect width={e.w} height={e.h} rx={e.mask === "rounded" ? 24 : 0} />
          )}
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect
          width={e.w}
          height={e.h}
          fill={e.frame === "dark" ? "#373731" : "#fffefa"}
        />
        <svg
          x={border}
          y={border}
          width={Math.max(iw, 1)}
          height={Math.max(ih, 1)}
          overflow="hidden"
          viewBox={`0 0 ${Math.max(iw, 1)} ${Math.max(ih, 1)}`}
        >
          <rect width={iw} height={ih} fill="#d0cec8" />
          {e.src ? (
            <image
              href={e.src}
              x={(-iw * (zoom - 1) * (e.focalX ?? 50)) / 100}
              y={(-ih * (zoom - 1) * (e.focalY ?? 50)) / 100}
              width={iw * zoom}
              height={ih * zoom}
              preserveAspectRatio="xMidYMid slice"
            />
          ) : (
            <g fill="#fffefa" textAnchor="middle">
              <text
                x={iw / 2}
                y={ih / 2 - 12}
                fontSize={Math.min(18, iw / 9)}
                fontFamily="Arial, sans-serif"
              >
                Drop a photo here
              </text>
              <g
                transform={`translate(${iw / 2 - 18} ${ih / 2 + 2})`}
                fill="none"
                stroke="currentColor"
                color="#fffefa"
                strokeWidth="1.7"
              >
                <path d="M0 0h36v32H0z M0 24l13-14 10 10 7-7 6 7" />
                <circle cx="25" cy="8" r="3" />
              </g>
            </g>
          )}
        </svg>
      </g>
    </g>
  );
}

export function PageArt({
  page,
  index = 0,
  preview = false,
  children,
}: {
  page: Page;
  index?: number;
  preview?: boolean;
  children?: React.ReactNode;
}) {
  const raw = useId(),
    id = raw.replace(/:/g, "");
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${W} ${H}`}
      className="page-art"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={`${id}-linen`}
          width="5"
          height="5"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 0V5M0 0H5"
            stroke={page.locked ? "#ffffff" : "#81705f"}
            opacity={page.locked ? 0.035 : 0.022}
          />
        </pattern>
        <pattern
          id={`${id}-dots`}
          width="18"
          height="18"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="9" cy="9" r="1" fill="#8d8077" opacity=".23" />
        </pattern>
        <pattern
          id={`${id}-lines`}
          width="26"
          height="26"
          patternUnits="userSpaceOnUse"
        >
          <path d="M0 26H26 M26 0V26" stroke="#9a8d82" opacity=".18" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={page.background} />
      <rect
        width={W}
        height={H}
        fill={`url(#${id}-${page.pattern || "linen"})`}
      />
      {page.locked && !preview && (
        <g fill="#eeede8" textAnchor="middle" fontFamily="Arial, sans-serif">
          <text x="210" y="277" fontSize="17" fontWeight="600">
            THIS PAGE CAN NOT BE EDITED
          </text>
          <text x="210" y="302" fontSize="14">
            This is a non-editable end paper
          </text>
        </g>
      )}
      {children ||
        page.elements
          .filter((e) => !e.hidden)
          .map((e) => (
            <g
              key={e.id}
              transform={`translate(${e.x} ${e.y}) rotate(${e.rotation} ${e.w / 2} ${e.h / 2})`}
              opacity={e.opacity}
            >
              <ElementArt element={e} prefix={id} />
            </g>
          ))}
      {index > 1 && !page.locked && (
        <text
          x={index % 2 ? 386 : 34}
          y="558"
          fill="#aaa198"
          fontSize="13"
          fontFamily="Georgia, serif"
        >
          {index}
        </text>
      )}
    </svg>
  );
}
