import type { CSSProperties } from "react";
const paths: Record<string, string> = {
  templates: "M3 3h18v6H3z M3 13h7v8H3z M14 13h7v8h-7z",
  photos: "M3 3h18v18H3z M3 16l6-6 5 5 3-3 4 5 M15 7h.01",
  text: "M4 4h16 M12 4v16 M8 20h8",
  stickers: "M4 3h16v12l-6 6H4z M14 21v-7h6 M8 8h.01 M15 8h.01 M8 11q3 3 7 0",
  frames: "M5 2v20 M19 2v20 M2 5h20 M2 19h20",
  masks:
    "M8 8l12 12 M8 16L20 4 M5 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M5 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  bg: "M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h4a4 4 0 0 0 0-8z M7 8h.01 M11 6h.01 M16 8h.01 M6 13h.01",
  layouts: "M12 5v16 M3 3l9 2 9-2v16l-9 2-9-2z",
  themes:
    "M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z M20 2v4 M18 4h4",
  pages: "M6 3h10l4 4v14H6z M16 3v5h4 M3 7v14 M9 12h8 M9 16h8",
  layers: "M12 3l10 5-10 5L2 8z M2 12l10 5 10-5 M2 16l10 5 10-5",
  help: "M9 8a3 3 0 1 1 4 3c-1 0-1 2-1 3 M12 17h.01 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20",
  close: "M6 6l12 12 M6 18L18 6",
  plus: "M12 5v14 M5 12h14",
  minus: "M5 12h14",
  left: "M15 5l-7 7 7 7",
  right: "M9 5l7 7-7 7",
  down: "M6 9l6 6 6-6",
  undo: "M8 4L3 9l5 5 M3 9h11a6 6 0 0 1 0 12",
  redo: "M16 4l5 5-5 5 M21 9H10a6 6 0 0 0 0 12",
  folder: "M3 5h7l2 3h9v12H3z",
  check: "M5 12l4 4L19 6",
  share:
    "M7 12l10-6 M7 12l10 6 M5 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M19 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M19 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  keyboard:
    "M2 5h20v14H2z M5 9h.01 M9 9h.01 M13 9h.01 M17 9h.01 M5 12h.01 M9 12h.01 M13 12h.01 M17 12h.01 M7 16h10",
  cart: "M2 3h3l3 13h11l3-9H6 M9 20h.01 M18 20h.01",
  pointer: "M5 3l14 9-7 1-3 7z",
  crop: "M5 2v17h17 M2 5h17v17",
  rotate: "M20 8V3l-5 5h5a9 9 0 1 0 1 8",
  fit: "M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5 M8 12h8 M12 8v8",
  grid: "M3 3h18v18H3z M9 3v18 M15 3v18 M3 9h18 M3 15h18",
  comments: "M3 3h18v14H9l-6 4z",
  upload: "M12 16V3 M6 9l6-6 6 6 M3 16v5h18v-5",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6",
  trash: "M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7",
  duplicate: "M8 8h13v13H8z M16 8V3H3v13h5",
  lock: "M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4",
  unlock: "M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0",
  eye: "M2 12q10-15 20 0-10 15-20 0 M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  download: "M12 3v13 M6 10l6 6 6-6 M3 17v4h18v-4",
  warning: "M12 3L2 21h20z M12 9v5 M12 17h.01",
  heart: "M12 21L3 12C-3 3 8-2 12 6c4-8 15-3 9 6z",
  arrowUp: "M12 20V4 M5 11l7-7 7 7",
  arrowDown: "M12 4v16 M5 13l7 7 7-7",
  image: "M3 3h18v18H3z M3 16l6-6 5 5 3-3 4 5 M15 7h.01",
  info: "M12 11v6 M12 7h.01 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20",
  export: "M14 3h7v7 M21 3L10 14 M10 3H3v18h18v-7",
};
export default function Icon({
  name,
  size = 20,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      <path d={paths[name] || paths.help} />
    </svg>
  );
}
