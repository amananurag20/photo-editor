export type Kind = "text" | "photo" | "sticker" | "shape";
export type Element = {
  id: string;
  kind: Kind;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  color: string;
  opacity: number;
  text?: string;
  font?: string;
  size?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  letterSpacing?: number;
  lineHeight?: number;
  aspectLocked?: boolean;
  sourceW?: number;
  sourceH?: number;
  fit?: "cover" | "contain";
  flipX?: boolean;
  flipY?: boolean;
  align?: "left" | "center" | "right";
  src?: string;
  frame?: string;
  mask?: string;
  crop?: number;
  focalX?: number;
  focalY?: number;
  sticker?: string;
  locked?: boolean;
  hidden?: boolean;
};
export type Page = {
  id: string;
  background: string;
  pattern?: string;
  locked?: boolean;
  elements: Element[];
};
export type Spread = { id: string; pages: [Page, Page] };
export type Photo = {
  id: string;
  src: string;
  name: string;
  width?: number;
  height?: number;
};
export type Comment = {
  id: string;
  spreadId: string;
  text: string;
  date: string;
  resolved: boolean;
};
export type Project = {
  version: 1;
  name: string;
  spreads: Spread[];
  photos: Photo[];
  comments: Comment[];
};
export const W = 420,
  H = 594;
export const PAPER = "#f5f2ec",
  INK = "#815c5c";
export const fonts = ["Cursive", "Serif", "Sans", "Monospace"];
export const fontFamily = (font?: string) =>
  ({
    Cursive: "PixoryCursive, cursive",
    Serif: "PixorySerif, serif",
    Sans: "PixorySans, sans-serif",
    Monospace: "PixoryMonospace, monospace",
  })[font || "Serif"] || "Georgia, serif";
export const uid = () => crypto.randomUUID();
export const label = (index: number) =>
  index === 0 ? "cover" : `${index * 2} – ${index * 2 + 1}`;
export const baseElement = (
  kind: Kind,
  props: Partial<Element> = {},
): Element => ({
  id: uid(),
  kind,
  x: 95,
  y: 180,
  w: 230,
  h: 100,
  rotation: 0,
  color: INK,
  opacity: 1,
  ...props,
});
function text(
  text: string,
  x: number,
  y: number,
  w: number,
  size = 28,
  extra: Partial<Element> = {},
) {
  return baseElement("text", {
    text,
    x,
    y,
    w,
    h: size * 2.8,
    size,
    font: "Cursive",
    align: "center",
    ...extra,
  });
}
function photo(
  x: number,
  y: number,
  w: number,
  h: number,
  extra: Partial<Element> = {},
) {
  return baseElement("photo", { x, y, w, h, frame: "polaroid", ...extra });
}
function sticker(
  sticker: string,
  x: number,
  y: number,
  w: number,
  h: number,
  rotation = 0,
) {
  return baseElement("sticker", { sticker, x, y, w, h, rotation });
}
export function makePage(elements: Element[] = [], background = PAPER): Page {
  return { id: uid(), background, elements };
}
export function makeSpread(
  pages: [Page, Page] = [makePage(), makePage()],
): Spread {
  return { id: uid(), pages };
}
export function makeLayout(layout: string): Element[] {
  if (layout === "full")
    return [
      photo(24, 24, 372, 488),
      text("a moment to remember", 25, 525, 370, 20),
    ];
  if (layout === "duo")
    return [
      photo(36, 56, 348, 210),
      photo(36, 300, 348, 210),
      text("the little things", 30, 530, 360, 20),
    ];
  if (layout === "grid")
    return [
      photo(28, 60, 170, 213),
      photo(222, 60, 170, 213),
      photo(28, 302, 170, 213),
      photo(222, 302, 170, 213),
    ];
  if (layout === "story")
    return [
      text("our story", 35, 35, 350, 36),
      photo(50, 135, 320, 260),
      text("Write a little something about this memory…", 45, 438, 330, 17, {
        font: "Serif",
      }),
    ];
  return [
    photo(45, 90, 270, 310, { rotation: -7 }),
    photo(185, 300, 185, 200, { rotation: 8 }),
    sticker("tape", 112, 72, 145, 35, -8),
    text("collected moments", 40, 525, 340, 23),
  ];
}
export function createProject(): Project {
  const cover = makeSpread([
    makePage(
      [
        text("a year of us", 25, 45, 210, 19, { color: "#fffdf6" }),
        sticker("flower", 44, 430, 70, 90),
      ],
      "#b8afa3",
    ),
    makePage(
      [
        text("a year\nof us", 40, 55, 340, 64, {
          font: "Serif",
          color: "#fffdf6",
          bold: true,
        }),
        text("2025", 55, 270, 310, 30, { color: "#fffdf6" }),
        sticker("heart-note", 135, 358, 195, 195, 8),
      ],
      "#b8afa3",
    ),
  ]);
  const intro = makeSpread([
    { ...makePage([], "#363733"), locked: true },
    makePage([
      sticker("polaroid", 28, -18, 148, 196, -10),
      sticker("polaroid", 208, -22, 149, 194, 10),
      sticker("polaroid", 32, 315, 173, 151, -6),
      sticker("polaroid", 218, 396, 119, 157, -5),
      sticker("heart-note", 215, 170, 163, 199, 12),
      text("a year", 105, 226, 210, 33),
      text("of us", 133, 289, 145, 35),
    ]),
  ]);
  const first = makeSpread([
    makePage([
      photo(35, 36, 350, 436),
      text("first photo of us from 2025", 30, 500, 360, 23),
      sticker("tape", 270, 20, 115, 35, 10),
    ]),
    makePage([
      text("me & you", 48, 40, 320, 36, { font: "Serif" }),
      text("at the start", 23, 105, 295, 29),
      text("of the year", 130, 171, 265, 29),
      sticker("polaroid", 51, 281, 175, 205, -7),
      sticker("heart-note", 207, 268, 160, 205, 9),
      text(
        "Write a little something about how you started the year together…",
        37,
        515,
        346,
        15,
        { font: "Serif", color: "#82776f" },
      ),
    ]),
  ]);
  const timeline = makeSpread([
    makePage([
      text("our 2025", 30, 28, 360, 39, { font: "Serif" }),
      text("january – march", 30, 100, 360, 21),
      photo(42, 155, 151, 177),
      photo(228, 155, 151, 177),
      text("april – june", 30, 368, 360, 21),
      text("Here is where your story goes…", 45, 431, 330, 18, {
        font: "Serif",
      }),
    ]),
    makePage([
      text("storyline", 30, 28, 360, 39, { font: "Serif" }),
      text("july – september", 30, 100, 360, 21),
      photo(42, 155, 151, 177),
      photo(228, 155, 151, 177),
      text("october – december", 30, 368, 360, 21),
      text("The moments that made this year ours.", 45, 431, 330, 18, {
        font: "Serif",
      }),
    ]),
  ]);
  const titles = [
    [
      "the way we spent the first week of the year",
      "a little moment we loved from january",
    ],
    ["our valentine’s day", "lessons in love we learned this year"],
    ["moments we’ll never forget", "favourite photos of me and you"],
    ["our go-to plans for the weekend", "somewhere new we tried and loved"],
    ["the meal we still talk about", "favourite date at…"],
    [
      "candids & outtakes from our camera roll",
      "the photo that always cheers us up",
    ],
    ["celebrating your birthday together", "celebrating my birthday together"],
  ];
  const more = titles.map((pair, i) =>
    makeSpread(
      pair.map((title, j) =>
        makePage([
          text(title, 35, 35, 350, 26, { font: i % 2 ? "Serif" : "Cursive" }),
          ...(i === 2 && j === 1
            ? [
                photo(35, 155, 160, 170),
                photo(225, 155, 160, 170),
                photo(35, 350, 160, 170),
                photo(225, 350, 160, 170),
              ]
            : [photo(38, 153, 344, 330)]),
          ...(i % 2
            ? [sticker("heart", 325, 489, 45, 48, 10)]
            : [text("a little piece of our story", 40, 512, 340, 18)]),
        ]),
      ) as [Page, Page],
    ),
  );
  return {
    version: 1,
    name: "a year of us",
    spreads: [cover, intro, first, timeline, ...more],
    photos: [],
    comments: [],
  };
}
export function duplicateSpread(spread: Spread): Spread {
  return {
    ...spread,
    id: uid(),
    pages: spread.pages.map((p) => ({
      ...p,
      id: uid(),
      elements: p.elements.map((e) => ({ ...e, id: uid() })),
    })) as [Page, Page],
  };
}
export function warnings(project: Project) {
  return project.spreads.flatMap((s, i) =>
    s.pages.flatMap((p) =>
      p.elements
        .filter((e) => e.kind === "photo" && !e.src && !e.hidden)
        .map((e) => ({
          spread: i,
          id: e.id,
          text: `Empty photo frame on ${i === 0 ? "cover" : `pages ${label(i)}`}`,
        })),
    ),
  );
}
const finite = (n: unknown) => typeof n === "number" && Number.isFinite(n);
const validSrc = (src: unknown) =>
  src === undefined ||
  (typeof src === "string" &&
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src));
export function parseProject(raw: string): Project {
  const p = JSON.parse(raw);
  if (
    !p ||
    p.version !== 1 ||
    typeof p.name !== "string" ||
    p.name.length > 200 ||
    !Array.isArray(p.spreads) ||
    !p.spreads.length ||
    p.spreads.length > 100 ||
    !Array.isArray(p.photos) ||
    !Array.isArray(p.comments)
  )
    throw new Error("This is not a valid Pixory project.");
  const ids = new Set<string>();
  const id = (v: unknown) => {
    if (typeof v !== "string" || !v || ids.has(v))
      throw new Error("Invalid or duplicate project ID.");
    ids.add(v);
  };
  for (const s of p.spreads) {
    id(s.id);
    if (!Array.isArray(s.pages) || s.pages.length !== 2)
      throw new Error("Each spread must contain two pages.");
    for (const page of s.pages) {
      id(page.id);
      if (
        typeof page.background !== "string" ||
        !/^#[a-f\d]{6}$/i.test(page.background) ||
        !Array.isArray(page.elements) ||
        page.elements.length > 300
      )
        throw new Error("Invalid page.");
      for (const e of page.elements) {
        id(e.id);
        if (
          !["text", "photo", "sticker", "shape"].includes(e.kind) ||
          ![e.x, e.y, e.w, e.h, e.rotation, e.opacity].every(finite) ||
          e.w <= 0 ||
          e.h <= 0 ||
          e.w > 10000 ||
          e.h > 10000 ||
          !validSrc(e.src) ||
          typeof e.color !== "string"
        )
          throw new Error("Invalid page element.");
        if (
          e.text !== undefined &&
          (typeof e.text !== "string" || e.text.length > 20000)
        )
          throw new Error("Invalid text.");
        for (const k of [
          "size",
          "crop",
          "focalX",
          "focalY",
          "sourceW",
          "sourceH",
          "letterSpacing",
          "lineHeight",
        ])
          if (e[k] !== undefined && !finite(e[k]))
            throw new Error("Invalid element measurement.");
        if (
          (e.sourceW !== undefined && e.sourceW <= 0) ||
          (e.sourceH !== undefined && e.sourceH <= 0) ||
          (e.size !== undefined && e.size <= 0) ||
          (e.crop !== undefined && (e.crop < 1 || e.crop > 10)) ||
          (e.lineHeight !== undefined &&
            (e.lineHeight < 0.5 || e.lineHeight > 5))
        )
          throw new Error("Invalid element dimensions.");
        if (e.font !== undefined && !fonts.includes(e.font))
          throw new Error("Unknown font family.");
        for (const k of [
          "bold",
          "italic",
          "underline",
          "aspectLocked",
          "flipX",
          "flipY",
          "hidden",
          "locked",
        ])
          if (e[k] !== undefined && typeof e[k] !== "boolean")
            throw new Error("Invalid element flag.");
        for (const k of ["font", "align", "frame", "mask", "sticker"])
          if (e[k] !== undefined && typeof e[k] !== "string")
            throw new Error("Invalid element style.");
      }
    }
  }
  for (const photo of p.photos) {
    id(photo.id);
    if (!photo.src || !validSrc(photo.src) || typeof photo.name !== "string")
      throw new Error("Invalid photo.");
  }
  for (const comment of p.comments) {
    id(comment.id);
    if (
      typeof comment.text !== "string" ||
      typeof comment.date !== "string" ||
      !p.spreads.some((s: Spread) => s.id === comment.spreadId) ||
      typeof comment.resolved !== "boolean"
    )
      throw new Error("Invalid comment.");
  }
  return p as Project;
}
