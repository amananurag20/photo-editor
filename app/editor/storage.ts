import type { Project } from "./model";

export async function restorePhotoMetadata(project: Project): Promise<Project> {
  const dimensions = new Map<
    string,
    Promise<{ width: number; height: number }>
  >();
  const read = (src: string) => {
    if (!dimensions.has(src))
      dimensions.set(
        src,
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () =>
            resolve({ width: image.naturalWidth, height: image.naturalHeight });
          image.onerror = () =>
            reject(new Error("A saved photo could not be decoded."));
          image.src = src;
        }),
      );
    return dimensions.get(src)!;
  };
  const photos = await Promise.all(
    project.photos.map(async (p) =>
      p.width && p.height ? p : { ...p, ...(await read(p.src)) },
    ),
  );
  const spreads = await Promise.all(
    project.spreads.map(async (s) => ({
      ...s,
      pages: (await Promise.all(
        s.pages.map(async (p) => ({
          ...p,
          elements: await Promise.all(
            p.elements.map(async (e) => {
              if (e.kind !== "photo" || !e.src || (e.sourceW && e.sourceH))
                return e;
              const { width, height } = await read(e.src);
              return { ...e, sourceW: width, sourceH: height };
            }),
          ),
        })),
      )) as typeof s.pages,
    })),
  );
  return { ...project, photos, spreads };
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("pixory-studio", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("projects");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function loadProject(): Promise<Project | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("projects", "readonly"),
      req = tx.objectStore("projects").get("current");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}
export async function saveProject(project: Project): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("projects", "readwrite");
    tx.objectStore("projects").put(project, "current");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export async function readPhoto(
  file: File,
): Promise<{ src: string; width: number; height: number }> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Please choose JPG, PNG, or WebP photos.");
  if (file.size > 25 * 1024 * 1024)
    throw new Error(`${file.name} is larger than 25 MB.`);
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  bitmap.close();
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read photo."));
    reader.readAsDataURL(file);
  });
  return { src, width, height };
}
