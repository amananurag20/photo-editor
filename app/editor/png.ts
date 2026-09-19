function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
/** Add physical resolution metadata without recompressing the image. */
export function pngResolution(bytes: Uint8Array, dpi: number): Uint8Array {
  if (
    bytes.length < 33 ||
    bytes[0] !== 137 ||
    bytes[1] !== 80 ||
    bytes[2] !== 78 ||
    bytes[3] !== 71
  )
    throw new Error("Invalid PNG export.");
  const chunk = new Uint8Array(21),
    view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk.set([112, 72, 89, 115], 4);
  const ppm = Math.round(dpi / 0.0254);
  view.setUint32(8, ppm);
  view.setUint32(12, ppm);
  chunk[16] = 1;
  view.setUint32(17, crc32(chunk.subarray(4, 17)));
  const parts: Uint8Array[] = [bytes.subarray(0, 8)];
  let offset = 8,
    inserted = false;
  while (offset + 12 <= bytes.length) {
    const n = new DataView(
      bytes.buffer,
      bytes.byteOffset + offset,
      4,
    ).getUint32(0);
    if (offset + n + 12 > bytes.length)
      throw new Error("Truncated PNG export.");
    const tag = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (tag === "IDAT" && !inserted) {
      parts.push(chunk);
      inserted = true;
    }
    if (tag !== "pHYs") parts.push(bytes.subarray(offset, offset + n + 12));
    offset += n + 12;
  }
  if (!inserted) throw new Error("PNG export has no image data.");
  const result = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let position = 0;
  for (const part of parts) {
    result.set(part, position);
    position += part.length;
  }
  return result;
}
