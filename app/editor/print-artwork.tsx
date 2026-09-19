import { useId } from "react";
import type { Spread } from "./model";
import { PageArt } from "./artwork";
import { PRINT, exportDimensions } from "./geometry";

export function PrintSpread({
  spread,
  index,
  bleed = true,
  marks = true,
  dpi = 300,
  guides = false,
}: {
  spread: Spread;
  index: number;
  bleed?: boolean;
  marks?: boolean;
  dpi?: number;
  guides?: boolean;
}) {
  const id = useId().replace(/:/g, ""),
    d = exportDimensions(dpi, bleed, marks),
    b = bleed ? PRINT.bleedMm : 0;
  const m = d.margin,
    trimW = PRINT.widthMm * 2,
    trimH = PRINT.heightMm;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={`${d.widthMm}mm`}
      height={`${d.heightMm}mm`}
      viewBox={`0 0 ${d.widthMm} ${d.heightMm}`}
      className="print-artwork"
      aria-label={`Print spread ${index}, ${d.widthMm} by ${d.heightMm} mm`}
    >
      <rect width={d.widthMm} height={d.heightMm} fill="white" />
      {spread.pages.map((p, j) => (
        <g key={p.id}>
          <defs>
            <clipPath id={`${id}-${j}`}>
              <rect
                x={j === 0 ? m - b : m + 210}
                y={m - b}
                width={210 + b}
                height={297 + b * 2}
              />
            </clipPath>
          </defs>
          <g clipPath={`url(#${id}-${j})`}>
            <svg
              x={m - b + j * 210}
              y={m - b}
              width={210 + b * 2}
              height={297 + b * 2}
              overflow="hidden"
            >
              <PageArt page={p} index={index * 2 + j} preview bleedMm={b} />
            </svg>
          </g>
        </g>
      ))}
      {marks && (
        <g stroke="#222" strokeWidth=".15" fill="none">
          {[0, 1].flatMap((x) =>
            [0, 1].map((y) => {
              const px = m + x * trimW,
                py = m + y * trimH,
                dx = x ? 1 : -1,
                dy = y ? 1 : -1;
              return (
                <path
                  key={`${x}-${y}`}
                  d={`M${px + dx * (b + 1)} ${py}h${dx * 3}M${px} ${py + dy * (b + 1)}v${dy * 3}`}
                />
              );
            }),
          )}
        </g>
      )}
      {guides && (
        <g fill="none" strokeWidth=".25" strokeDasharray="2 1">
          <rect x={m} y={m} width={trimW} height={trimH} stroke="#ba746e" />
          {[0, 1].map((j) => (
            <rect
              key={j}
              x={m + j * 210 + 5}
              y={m + 5}
              width="200"
              height="287"
              stroke="#65947a"
            />
          ))}
        </g>
      )}
    </svg>
  );
}
