export const masks = [
  "rectangle",
  "rounded",
  "circle",
  "ellipse",
  "arch",
  "heart",
  "star",
  "hexagon",
  "diamond",
  "petal",
  "teardrop",
];
export function MaskShape({
  shape,
  w,
  h,
}: {
  shape?: string;
  w: number;
  h: number;
}) {
  if (shape === "circle")
    return <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) / 2} />;
  if (shape === "ellipse")
    return <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} />;
  if (shape === "rounded")
    return <rect width={w} height={h} rx={Math.min(24, w / 4, h / 4)} />;
  if (shape === "arch") {
    const r = Math.min(w / 2, h);
    return <path d={`M0 ${r}Q0 0 ${w / 2} 0Q${w} 0 ${w} ${r}V${h}H0Z`} />;
  }
  const paths: Record<string, string> = {
    heart:
      "M50 97C25 77-8 42 5 17 18-7 44-1 50 20 65-9 97-3 99 24 102 48 72 82 50 97Z",
    star: "M50 0L62 35 100 36 69 59 81 97 50 74 19 97 31 59 0 36 38 35Z",
    hexagon: "M25 0H75L100 50 75 100H25L0 50Z",
    diamond: "M50 0L100 50 50 100 0 50Z",
    petal: "M0 100V50Q0 0 50 0H100V50Q100 100 50 100Z",
    teardrop: "M50 0C50 0 0 45 0 65A50 35 0 0 0 100 65C100 45 50 0 50 0Z",
  };
  return paths[shape || ""] ? (
    <path transform={`scale(${w / 100} ${h / 100})`} d={paths[shape!]} />
  ) : (
    <rect width={w} height={h} />
  );
}
