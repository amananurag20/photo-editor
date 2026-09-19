"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import Canvas from "./canvas";
import Icon from "./icons";
import { PageArt, Sticker } from "./artwork";
import {
  baseElement,
  createProject,
  duplicateSpread,
  fonts,
  fontFamily,
  H,
  INK,
  label,
  makeLayout,
  makePage,
  makeSpread,
  PAPER,
  parseProject,
  uid,
  W,
  warnings,
  type Element,
  type Page,
  type Project,
} from "./model";
import { download, loadProject, readPhoto, saveProject } from "./storage";

type History = { present: Project | null; past: Project[]; future: Project[] };
type Action =
  { type: "load" | "commit"; project: Project } | { type: "undo" | "redo" };
function reducer(state: History, action: Action): History {
  if (action.type === "load")
    return { present: action.project, past: [], future: [] };
  if (action.type === "commit")
    return {
      present: action.project,
      past: state.present ? [...state.past, state.present].slice(-70) : [],
      future: [],
    };
  if (action.type === "undo" && state.past.length)
    return {
      present: state.past.at(-1)!,
      past: state.past.slice(0, -1),
      future: [state.present!, ...state.future],
    };
  if (action.type === "redo" && state.future.length)
    return {
      present: state.future[0],
      past: [...state.past, state.present!],
      future: state.future.slice(1),
    };
  return state;
}
const tabs = [
  "templates",
  "photos",
  "text",
  "stickers",
  "frames",
  "masks",
  "bg",
  "layouts",
  "themes",
  "pages",
  "layers",
];
const colors = [
  "#f5f2ec",
  "#ffffff",
  "#eee5dc",
  "#e9d7d3",
  "#dce3d8",
  "#d9e2e5",
  "#c5b6a5",
  "#b6847c",
  "#596951",
  "#363733",
  "#815c5c",
  "#d7c69b",
];
const stickerNames = [
  "heart-note",
  "heart",
  "polaroid",
  "tape",
  "flower",
  "bow",
  "star",
  "sparkle",
  "camera",
];
const layouts = [
  { id: "full", name: "The big picture" },
  { id: "duo", name: "Better together" },
  { id: "grid", name: "Little moments" },
  { id: "story", name: "A story to tell" },
  { id: "scrapbook", name: "The scrapbook" },
];
function Button({
  icon,
  title,
  onClick,
  active,
  disabled,
  className = "",
}: {
  icon: string;
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`icon-button ${active ? "is-active" : ""} ${className}`}
    >
      <Icon name={icon} />
    </button>
  );
}
function MiniSpread({
  spread,
  index,
}: {
  spread: Project["spreads"][number];
  index: number;
}) {
  return (
    <div className="mini-spread">
      {spread.pages.map((p, j) => (
        <PageArt key={p.id} page={p} index={index * 2 + j} />
      ))}
    </div>
  );
}
function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 1000,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="number-field">
      <span>{label}</span>
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        value={Math.round(value)}
        onChange={(e) => {
          if (e.target.value !== "")
            onChange(Math.min(max, Math.max(min, Number(e.target.value))));
        }}
      />
    </label>
  );
}

export default function Editor() {
  const [history, dispatch] = useReducer(reducer, {
    present: null,
    past: [],
    future: [],
  });
  const project = history.present;
  const [index, setIndex] = useState(1),
    [side, setSide] = useState(1),
    [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState<string | null>("photos"),
    [modal, setModal] = useState<string | null>(null),
    [fileMenu, setFileMenu] = useState(false);
  const [zoom, setZoom] = useState(85),
    [grid, setGrid] = useState(false),
    [safe, setSafe] = useState(false),
    [bleed, setBleed] = useState(false);
  const [saved, setSaved] = useState("loading"),
    [toast, setToast] = useState(""),
    [search, setSearch] = useState(""),
    [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(false),
    [allPages, setAllPages] = useState(false);
  const [quantity, setQuantity] = useState(1),
    [binding, setBinding] = useState("hardcover"),
    [cartAdded, setCartAdded] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 1000, height: 700 });
  const stage = useRef<HTMLDivElement>(null),
    upload = useRef<HTMLInputElement>(null),
    importInput = useRef<HTMLInputElement>(null),
    textArea = useRef<HTMLTextAreaElement>(null);
  const uploadTarget = useRef<{ side: number; id?: string } | null>(null),
    dialog = useRef<HTMLDivElement>(null);
  const currentIndex = project
    ? Math.min(index, project.spreads.length - 1)
    : 0;
  const spread = project?.spreads[currentIndex],
    page = spread?.pages[side];
  const selectedElement = page?.elements.find((e) => e.id === selected);
  const notify = useCallback((message: string) => setToast(message), []);
  const commit = useCallback(
    (next: Project) => dispatch({ type: "commit", project: next }),
    [],
  );

  useEffect(() => {
    let live = true;
    loadProject()
      .then((p) => {
        if (live) {
          dispatch({
            type: "load",
            project: p ? parseProject(JSON.stringify(p)) : createProject(),
          });
          setSaved("saved");
        }
      })
      .catch(() => {
        if (live) {
          dispatch({ type: "load", project: createProject() });
          setSaved("error");
          notify(
            "Local storage is unavailable. Download your project to keep a copy.",
          );
        }
      });
    return () => {
      live = false;
    };
  }, [notify]);
  useEffect(() => {
    if (!project) return;
    let live = true;
    const timer = setTimeout(() => {
      setSaved("saving");
      saveProject(project)
        .then(() => {
          if (live) setSaved("saved");
        })
        .catch(() => {
          if (live) {
            setSaved("error");
            notify(
              "Could not save on this device. Use File → Download project to keep your work.",
            );
          }
        });
    }, 450);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [project, notify]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!project || !stage.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setStageSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, [project, preview]);
  useEffect(() => {
    if (!modal) return;
    const before = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => before?.focus();
  }, [modal]);

  const updatePage = useCallback(
    (patch: Partial<Page>, target = side) => {
      if (!project || !spread || spread.pages[target].locked) return;
      commit({
        ...project,
        spreads: project.spreads.map((s, i) =>
          i === currentIndex
            ? {
                ...s,
                pages: s.pages.map((p, j) =>
                  j === target ? { ...p, ...patch } : p,
                ) as [Page, Page],
              }
            : s,
        ),
      });
    },
    [project, spread, side, currentIndex, commit],
  );
  const updateElement = useCallback(
    (id: string, patch: Partial<Element>, target = side) => {
      if (!spread) return;
      updatePage(
        {
          elements: spread.pages[target].elements.map((e) =>
            e.id === id ? { ...e, ...patch } : e,
          ),
        },
        target,
      );
    },
    [spread, side, updatePage],
  );
  const removeElement = useCallback(() => {
    if (!page || !selectedElement || selectedElement.locked) return;
    updatePage({ elements: page.elements.filter((e) => e.id !== selected) });
    setSelected(null);
  }, [page, selectedElement, selected, updatePage]);
  const duplicateElement = useCallback(() => {
    if (!page || !selectedElement) return;
    const next = {
      ...selectedElement,
      id: uid(),
      x: selectedElement.x + 15,
      y: selectedElement.y + 15,
      locked: false,
    };
    updatePage({ elements: [...page.elements, next] });
    setSelected(next.id);
  }, [page, selectedElement, updatePage]);
  function addElement(element: Element, target = side) {
    if (!spread) return;
    if (spread.pages[target].locked) {
      notify(
        "This end paper is locked. Select the right page to add your memories.",
      );
      return;
    }
    updatePage(
      { elements: [...spread.pages[target].elements, element] },
      target,
    );
    setSide(target);
    setSelected(element.id);
  }
  function addText(style = "heading") {
    addElement(
      baseElement("text", {
        text:
          style === "body"
            ? "Write your story here…"
            : style === "handwriting"
              ? "a little moment, forever"
              : "Your beautiful story",
        font:
          style === "handwriting"
            ? "Cursive"
            : style === "body"
              ? "Sans"
              : "Serif",
        size: style === "body" ? 18 : 34,
        w: 320,
        h: 100,
        x: 50,
        y: 230,
        align: "center",
      }),
    );
  }
  function navigate(next: number) {
    if (!project) return;
    setIndex(Math.max(0, Math.min(project.spreads.length - 1, next)));
    setSelected(null);
    setSide(next === 1 ? 1 : 0);
  }
  const changePanel = (next: string) => {
    setPanel(panel === next ? null : next);
    setSearch("");
  };
  function addPhoto(src: string, target = side, id?: string) {
    if (!spread) return;
    const p = spread.pages[target];
    if (p.locked) {
      notify("Choose an editable page first.");
      return;
    }
    const frame = id
      ? p.elements.find((e) => e.id === id)
      : p.elements.find(
          (e) => e.id === selected && e.kind === "photo" && !e.locked,
        );
    if (frame && !frame.locked) {
      updateElement(frame.id, { src, crop: 1, focalX: 50, focalY: 50 }, target);
      setSide(target);
      setSelected(frame.id);
    } else
      addElement(
        baseElement("photo", {
          src,
          x: 75,
          y: 100,
          w: 270,
          h: 350,
          frame: "polaroid",
        }),
        target,
      );
  }
  async function uploadPhotos(
    files: File[],
    target?: { side: number; id?: string },
  ) {
    if (!project || !spread || !files.length) return;
    setBusy(true);
    try {
      const results = await Promise.allSettled(
        files
          .slice(0, 30)
          .map(async (f) => ({
            id: uid(),
            name: f.name,
            src: await readPhoto(f),
          })),
      );
      const added = results.flatMap((r) =>
        r.status === "fulfilled" ? [r.value] : [],
      );
      const failed = results.find((r) => r.status === "rejected");
      if (added.length) {
        const next = { ...project, photos: [...project.photos, ...added] };
        if (target && !spread.pages[target.side].locked) {
          const p = spread.pages[target.side],
            frame = p.elements.find((e) => e.id === target.id && !e.locked),
            newElement = baseElement("photo", {
              src: added[0].src,
              x: 75,
              y: 100,
              w: 270,
              h: 350,
              frame: "polaroid",
            });
          next.spreads = project.spreads.map((s, i) =>
            i === currentIndex
              ? {
                  ...s,
                  pages: s.pages.map((pg, j) =>
                    j === target.side
                      ? {
                          ...pg,
                          elements: frame
                            ? pg.elements.map((e) =>
                                e.id === frame.id
                                  ? { ...e, src: added[0].src, crop: 1 }
                                  : e,
                              )
                            : [...pg.elements, newElement],
                        }
                      : pg,
                  ) as [Page, Page],
                }
              : s,
          );
          setSide(target.side);
          setSelected(frame?.id || newElement.id);
        }
        commit(next);
      }
      notify(
        failed?.status === "rejected"
          ? String(failed.reason?.message || "Some photos could not be read.")
          : `${added.length} photo${added.length === 1 ? "" : "s"} added. Your photos stay on this device.${files.length > 30 ? " Upload limited to 30 at a time." : ""}`,
      );
    } finally {
      setBusy(false);
      uploadTarget.current = null;
      if (upload.current) upload.current.value = "";
    }
  }
  function addSpread() {
    if (!project) return;
    if (project.spreads.length >= 100) {
      notify("This book has reached the 100-spread limit.");
      return;
    }
    const next = makeSpread();
    commit({
      ...project,
      spreads: [
        ...project.spreads.slice(0, currentIndex + 1),
        next,
        ...project.spreads.slice(currentIndex + 1),
      ],
    });
    navigate(currentIndex);
    setIndex(currentIndex + 1);
    setSide(0);
    notify("A fresh spread, ready for your story.");
  }
  function duplicateCurrent() {
    if (!project || !spread) return;
    if (project.spreads.length >= 100) {
      notify("This book has reached the 100-spread limit.");
      return;
    }
    commit({
      ...project,
      spreads: [
        ...project.spreads.slice(0, currentIndex + 1),
        duplicateSpread(spread),
        ...project.spreads.slice(currentIndex + 1),
      ],
    });
    setIndex(currentIndex + 1);
    setSelected(null);
    notify("Spread duplicated.");
  }
  function reorder(direction: number) {
    if (
      !project ||
      currentIndex === 0 ||
      currentIndex + direction < 1 ||
      currentIndex + direction >= project.spreads.length
    )
      return;
    const next = [...project.spreads];
    [next[currentIndex], next[currentIndex + direction]] = [
      next[currentIndex + direction],
      next[currentIndex],
    ];
    commit({ ...project, spreads: next });
    setIndex(currentIndex + direction);
  }
  function applyLayout(layout: string) {
    if (!page || page.locked) {
      notify("Select an editable page first.");
      return;
    }
    updatePage({ elements: makeLayout(layout) });
    setSelected(null);
    notify("Layout applied. You can undo to restore the previous page.");
  }
  function applyPhotoStyle(patch: Partial<Element>) {
    if (selectedElement?.kind === "photo") {
      if (selectedElement.locked) {
        notify("Unlock the photo before changing its style.");
        return;
      }
      updateElement(selectedElement.id, patch);
    } else
      addElement(
        baseElement("photo", {
          x: 85,
          y: 110,
          w: 250,
          h: 320,
          frame: "polaroid",
          ...patch,
        }),
      );
  }
  function moveLayer(direction: number) {
    if (!page || !selected) return;
    const elements = [...page.elements],
      i = elements.findIndex((e) => e.id === selected),
      j = i + direction;
    if (i < 0 || j < 0 || j >= elements.length) return;
    [elements[i], elements[j]] = [elements[j], elements[i]];
    updatePage({ elements });
  }
  function exportProject() {
    if (!project) return;
    download(
      new Blob([JSON.stringify(project, null, 2)], {
        type: "application/json",
      }),
      `${project.name || "my-photobook"}.pixory.json`,
    );
    setFileMenu(false);
    notify("Project downloaded. Import it any time to keep editing.");
  }
  async function importProject(file?: File) {
    if (!file) return;
    try {
      if (file.size > 100 * 1024 * 1024)
        throw new Error("Projects must be smaller than 100 MB.");
      const next = parseProject(await file.text());
      commit(next);
      setIndex(0);
      setSide(1);
      setSelected(null);
      notify("Project imported. Undo is available for your previous project.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not open this project.");
    } finally {
      if (importInput.current) importInput.current.value = "";
    }
  }
  async function exportSpread(format: "png" | "svg") {
    if (!project || !spread) return;
    setBusy(true);
    try {
      const { renderToStaticMarkup } = await import("react-dom/server");
      const markup = renderToStaticMarkup(
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={W * 2}
          height={H}
          viewBox={`0 0 ${W * 2} ${H}`}
        >
          <svg width={W} height={H}>
            <PageArt page={spread.pages[0]} index={currentIndex * 2} preview />
          </svg>
          <svg x={W} width={W} height={H}>
            <PageArt
              page={spread.pages[1]}
              index={currentIndex * 2 + 1}
              preview
            />
          </svg>
        </svg>,
      );
      const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
      const name = `${project.name}-${label(currentIndex)}`;
      if (format === "svg") download(blob, `${name}.svg`);
      else {
        const url = URL.createObjectURL(blob);
        try {
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () =>
              reject(new Error("Image export failed. Try SVG instead."));
            img.src = url;
          });
          const canvas = document.createElement("canvas");
          canvas.width = W * 4;
          canvas.height = H * 2;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas export unavailable.");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const png = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(
              (b) =>
                b ? resolve(b) : reject(new Error("Could not create image.")),
              "image/png",
            ),
          );
          download(png, `${name}.png`);
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      notify(`${format.toUpperCase()} exported successfully.`);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }
  function newProject() {
    commit(createProject());
    setIndex(1);
    setSide(1);
    setSelected(null);
    setModal(null);
    notify("A new chapter begins. Undo restores your previous project.");
  }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === "Escape") {
        setModal(null);
        setFileMenu(false);
        setPreview(false);
        setSelected(null);
        return;
      }
      if (target.matches("input,textarea,select,[contenteditable=true]"))
        return;
      if (modal || busy) return;
      const command = event.metaKey || event.ctrlKey;
      if (command && event.key.toLowerCase() === "z") {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? "redo" : "undo" });
        return;
      }
      if (command && event.key.toLowerCase() === "y") {
        event.preventDefault();
        dispatch({ type: "redo" });
        return;
      }
      if (command && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateElement();
        return;
      }
      if (command && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (project)
          saveProject(project)
            .then(() => {
              setSaved("saved");
              notify("Saved on this device.");
            })
            .catch(() => notify("Save failed. Please download your project."));
        return;
      }
      if (preview) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeElement();
      }
      if (
        selectedElement &&
        !selectedElement.locked &&
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      ) {
        event.preventDefault();
        const n = event.shiftKey ? 10 : 1;
        updateElement(selectedElement.id, {
          x:
            selectedElement.x +
            (event.key === "ArrowLeft"
              ? -n
              : event.key === "ArrowRight"
                ? n
                : 0),
          y:
            selectedElement.y +
            (event.key === "ArrowUp" ? -n : event.key === "ArrowDown" ? n : 0),
        });
      }
      if (event.key.toLowerCase() === "g") setGrid((v) => !v);
      if (event.key === "?") setModal("help");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    project,
    selectedElement,
    modal,
    preview,
    busy,
    duplicateElement,
    removeElement,
    updateElement,
    notify,
  ]);

  if (!project || !spread || !page)
    return (
      <main className="loading-screen">
        <div className="wordmark">
          pixory<span>✳</span>
        </div>
        <span>Opening your little book of memories…</span>
      </main>
    );
  const issues = warnings(project),
    scale =
      Math.max(
        0.15,
        Math.min(
          (stageSize.width - 104) / (W * 2),
          (stageSize.height - 168) / H,
          0.98,
        ),
      ) *
      (zoom / 85);
  const writable = !page.locked,
    editable = selectedElement && !selectedElement.locked;
  const editSelected = () => setTimeout(() => textArea.current?.focus(), 0);
  const currentPhotos = project.photos.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="wordmark"
          aria-label="About Pixory"
          onClick={() => setModal("about")}
        >
          pixory<span>✳</span>
        </button>
        <div className="header-divider" />
        <div className="file-wrapper">
          <button
            className={`file-button ${fileMenu ? "is-active" : ""}`}
            onClick={() => setFileMenu(!fileMenu)}
          >
            <Icon name="folder" size={18} /> <span>file</span>
            <Icon name="down" size={12} />
          </button>
          {fileMenu && (
            <>
              <button
                className="menu-backdrop"
                aria-label="Close file menu"
                onClick={() => setFileMenu(false)}
              />
              <div className="file-menu">
                <button
                  onClick={() => {
                    setModal("new");
                    setFileMenu(false);
                  }}
                >
                  <Icon name="plus" />
                  New project
                </button>
                <button
                  onClick={() => {
                    importInput.current?.click();
                    setFileMenu(false);
                  }}
                >
                  <Icon name="folder" />
                  Open project
                </button>
                <button onClick={exportProject}>
                  <Icon name="download" />
                  Download project<span>JSON</span>
                </button>
                <hr />
                <button
                  onClick={() => {
                    setModal("export");
                    setFileMenu(false);
                  }}
                >
                  <Icon name="export" />
                  Export your book
                </button>
                <button
                  onClick={() => {
                    setModal("help");
                    setFileMenu(false);
                  }}
                >
                  <Icon name="help" />
                  Help & shortcuts
                </button>
              </div>
            </>
          )}
        </div>
        <div className="history-actions">
          <Button
            icon="undo"
            title="Undo (⌘Z)"
            onClick={() => dispatch({ type: "undo" })}
            disabled={!history.past.length}
          />
          <Button
            icon="redo"
            title="Redo (⌘⇧Z)"
            onClick={() => dispatch({ type: "redo" })}
            disabled={!history.future.length}
          />
        </div>
        <input
          className="project-name"
          aria-label="Project name"
          maxLength={100}
          value={project.name}
          onChange={(e) => commit({ ...project, name: e.target.value })}
        />
        <div className="header-spacer" />
        <button
          className={`status-pill warning-pill ${issues.length ? "" : "no-warnings"}`}
          onClick={() => setModal("warnings")}
        >
          <Icon name={issues.length ? "warning" : "check"} size={15} />
          <span>
            {issues.length ? `${issues.length} warnings` : "print ready"}
          </span>
        </button>
        <span
          className={`save-status ${saved === "error" ? "save-error" : ""}`}
          title="Your project is saved only in this browser"
        >
          <Icon name={saved === "error" ? "warning" : "check"} size={15} />
          <span>
            {saved === "saving"
              ? "saving…"
              : saved === "error"
                ? "not saved"
                : "all changes saved"}
          </span>
        </span>
        <Button
          icon="share"
          title="Share project"
          onClick={() => setModal("share")}
          className="share-button"
        />
        <Button
          icon="keyboard"
          title="Keyboard shortcuts"
          onClick={() => setModal("help")}
          className="shortcuts-button"
        />
        <div className="header-divider compact-divider" />
        <button
          className="button preview-button"
          onClick={() => {
            setPreview(true);
            setSelected(null);
          }}
        >
          preview
        </button>
        <button
          className="button primary"
          onClick={() => {
            setModal("cart");
            setCartAdded(false);
          }}
        >
          <Icon name="cart" size={16} />
          <span>add to cart</span>
        </button>
      </header>

      <div className="editor-body">
        <nav className="tool-rail" aria-label="Editor tools">
          {tabs.map((t) => (
            <button
              key={t}
              title={t === "bg" ? "Background" : t}
              aria-label={t === "bg" ? "Background" : t}
              aria-pressed={panel === t}
              className={panel === t ? "active" : ""}
              onClick={() => changePanel(t)}
            >
              <Icon name={t} size={21} />
              <span>{t}</span>
            </button>
          ))}
          <button className="rail-help" onClick={() => setModal("help")}>
            <Icon name="help" />
            <span>help</span>
          </button>
        </nav>
        {panel && (
          <aside className="asset-panel">
            <div className="panel-heading">
              <h2>{panel === "bg" ? "background" : panel}</h2>
              <Button
                icon="close"
                title="Close panel"
                onClick={() => setPanel(null)}
              />
            </div>
            <div className="panel-content">
              {panel === "photos" && (
                <>
                  <p className="panel-intro">Your moments, all in one place.</p>
                  <button
                    className="button primary upload-button"
                    disabled={busy}
                    onClick={() => {
                      uploadTarget.current = null;
                      upload.current?.click();
                    }}
                  >
                    <Icon name="upload" size={17} />
                    {busy ? "adding photos…" : "upload photos"}
                  </button>
                  <div className="search-field">
                    <Icon name="search" size={16} />
                    <input
                      aria-label="Search photos"
                      placeholder="Search your photos"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="section-label">
                    <span>YOUR PHOTOS</span>
                    <span>{project.photos.length}</span>
                  </div>
                  {currentPhotos.length ? (
                    <>
                      <div className="photo-library">
                        {currentPhotos.map((photo) => (
                          <button
                            key={photo.id}
                            title={`Add ${photo.name}`}
                            onClick={() => addPhoto(photo.src)}
                            draggable
                            onDragStart={(e) =>
                              e.dataTransfer.setData(
                                "application/x-pixory-photo",
                                photo.src,
                              )
                            }
                          >
                            <img src={photo.src} alt={photo.name} />
                            <span>{photo.name}</span>
                          </button>
                        ))}
                      </div>
                      <p className="muted small">
                        Click to add, or drag a photo into a frame.
                      </p>
                    </>
                  ) : (
                    <div
                      className="upload-dropzone"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        void uploadPhotos(Array.from(e.dataTransfer.files));
                      }}
                    >
                      <div className="photo-empty-art">
                        <div />
                        <div>
                          <Icon name="photos" size={32} />
                        </div>
                      </div>
                      <h3>
                        {search
                          ? "No photos found"
                          : "A home for your memories"}
                      </h3>
                      <p>
                        {search
                          ? "Try another filename."
                          : "Drop your favourite photos here and let your story take shape."}
                      </p>
                      <button
                        className="text-link"
                        onClick={() => upload.current?.click()}
                      >
                        browse files <span>↗</span>
                      </button>
                      <small>JPG, PNG or WebP · up to 25 MB</small>
                    </div>
                  )}
                  <div className="privacy-note">
                    <Icon name="lock" size={14} />
                    <span>
                      Your photos stay yours.
                      <br />
                      Stored privately on this device.
                    </span>
                  </div>
                  <div className="tip-card">
                    <span>✧ A LITTLE TIP</span>
                    <p>
                      The blurry ones. The in-between ones. Sometimes they make
                      the best memories.
                    </p>
                  </div>
                </>
              )}

              {panel === "text" && (
                <>
                  <p className="panel-intro">A few words can say so much.</p>
                  <button
                    className="text-preset heading-preset"
                    onClick={() => addText()}
                  >
                    Add a heading<span>for the big moments</span>
                  </button>
                  <button
                    className="text-preset handwriting-preset"
                    onClick={() => addText("handwriting")}
                  >
                    a handwritten note<span>make it feel like you</span>
                  </button>
                  <button
                    className="text-preset body-preset"
                    onClick={() => addText("body")}
                  >
                    Add a little body text<span>tell the whole story</span>
                  </button>
                  <div className="section-label">WORDS TO BORROW</div>
                  {[
                    "you, me & all the little things",
                    "the best is yet to come",
                    "this is our kind of beautiful",
                    "a moment, a memory, forever",
                  ].map((t) => (
                    <button
                      className="quote-preset"
                      key={t}
                      onClick={() =>
                        addElement(
                          baseElement("text", {
                            text: t,
                            font: "Cursive",
                            size: 28,
                            x: 45,
                            y: 245,
                            w: 330,
                            h: 100,
                            align: "center",
                          }),
                        )
                      }
                    >
                      {t}
                    </button>
                  ))}
                </>
              )}

              {panel === "stickers" && (
                <>
                  <p className="panel-intro">
                    The little details make it yours.
                  </p>
                  <div className="search-field">
                    <Icon name="search" size={16} />
                    <input
                      placeholder="Find a little something"
                      aria-label="Search stickers"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="section-label">
                    LOVE NOTES & LITTLE THINGS
                  </div>
                  <div className="sticker-library">
                    {stickerNames
                      .filter((s) => s.includes(search.toLowerCase()))
                      .map((name) => (
                        <button
                          key={name}
                          aria-label={`Add ${name} sticker`}
                          onClick={() =>
                            addElement(
                              baseElement("sticker", {
                                sticker: name,
                                w: name === "tape" ? 150 : 145,
                                h: name === "tape" ? 38 : 160,
                                x: 130,
                                y: 190,
                                color: name === "tape" ? "#b59e7c" : "#b8848b",
                              }),
                            )
                          }
                        >
                          <svg viewBox="0 0 100 100">
                            <Sticker name={name} />
                          </svg>
                          <span>{name.replace("-", " ")}</span>
                        </button>
                      ))}
                  </div>
                </>
              )}

              {(panel === "frames" || panel === "masks") && (
                <>
                  <p className="panel-intro">
                    {selectedElement?.kind === "photo"
                      ? "Give your selected photo a new look."
                      : "Pick a style to add a new photo frame."}
                  </p>
                  <div className="style-library">
                    {(panel === "frames"
                      ? ["polaroid", "thin", "dark", "none"]
                      : ["rectangle", "rounded", "circle", "arch", "heart"]
                    ).map((style) => (
                      <button
                        key={style}
                        onClick={() =>
                          applyPhotoStyle(
                            panel === "frames"
                              ? { frame: style }
                              : { mask: style },
                          )
                        }
                      >
                        <div
                          className={`frame-example ${panel === "frames" ? style : "none"}`}
                          style={{
                            borderRadius:
                              style === "circle"
                                ? "50%"
                                : style === "rounded"
                                  ? 12
                                  : style === "arch"
                                    ? "50% 50% 0 0"
                                    : undefined,
                            clipPath:
                              style === "heart"
                                ? "polygon(50% 16%, 70% 0, 100% 15%, 100% 45%, 50% 100%, 0 45%, 0 15%, 30% 0)"
                                : undefined,
                          }}
                        >
                          <Icon name="image" size={25} />
                        </div>
                        <span>{style}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {panel === "bg" && (
                <>
                  <p className="panel-intro">Set the mood for your memories.</p>
                  <PageTarget
                    side={side}
                    setSide={(s) => {
                      setSide(s);
                      setSelected(null);
                    }}
                  />
                  <div className="section-label">PAPER COLOURS</div>
                  <div className="color-grid">
                    {colors.map((color) => (
                      <button
                        key={color}
                        aria-label={`Background ${color}`}
                        title={color}
                        style={{ background: color }}
                        className={
                          page.background === color ? "selected-color" : ""
                        }
                        onClick={() => updatePage({ background: color })}
                      >
                        {page.background === color && (
                          <Icon name="check" size={17} />
                        )}
                      </button>
                    ))}
                  </div>
                  <label className="custom-color">
                    Custom colour
                    <input
                      type="color"
                      aria-label="Custom background color"
                      value={page.background}
                      onChange={(e) =>
                        updatePage({ background: e.target.value })
                      }
                    />
                  </label>
                  <div className="section-label">A LITTLE TEXTURE</div>
                  <div className="texture-options">
                    {["linen", "dots", "lines"].map((pattern) => (
                      <button
                        key={pattern}
                        className={`texture-swatch ${pattern} ${page.pattern === pattern ? "selected-texture" : ""}`}
                        onClick={() => updatePage({ pattern })}
                      >
                        {pattern}
                      </button>
                    ))}
                  </div>
                  {page.locked && (
                    <p className="muted">
                      This end paper is locked. Select the right page.
                    </p>
                  )}
                </>
              )}

              {(panel === "layouts" || panel === "templates") && (
                <>
                  <p className="panel-intro">
                    {panel === "templates"
                      ? "A lovely starting point for your story."
                      : "Make room for every memory."}
                  </p>
                  <PageTarget
                    side={side}
                    setSide={(s) => {
                      setSide(s);
                      setSelected(null);
                    }}
                  />
                  <p className="small muted">
                    Applying a layout replaces this page. Undo is always
                    available.
                  </p>
                  <div className="layout-library">
                    {layouts.map((l) => (
                      <button key={l.id} onClick={() => applyLayout(l.id)}>
                        <div className={`layout-sketch sketch-${l.id}`}>
                          {Array.from(
                            {
                              length:
                                l.id === "grid"
                                  ? 4
                                  : l.id === "duo" || l.id === "scrapbook"
                                    ? 2
                                    : 1,
                            },
                            (_, i) => (
                              <span key={i} />
                            ),
                          )}
                        </div>
                        <span>{l.name}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    className="button wide"
                    onClick={() => {
                      updatePage({ elements: [] });
                      setSelected(null);
                    }}
                  >
                    Start with a blank page
                  </button>
                </>
              )}

              {panel === "themes" && (
                <>
                  <p className="panel-intro">
                    One feeling, from cover to cover.
                  </p>
                  {[
                    {
                      name: "A year of us",
                      sub: "Soft paper. Handwritten memories.",
                      bg: PAPER,
                      color: INK,
                      font: "Cursive",
                    },
                    {
                      name: "Sunday journal",
                      sub: "Warm, understated, timeless.",
                      bg: "#eee5dc",
                      color: "#6c5948",
                      font: "Serif",
                    },
                    {
                      name: "Botanical",
                      sub: "For a life a little closer to nature.",
                      bg: "#dce3d8",
                      color: "#435540",
                      font: "Serif",
                    },
                    {
                      name: "Modern love",
                      sub: "Clean lines. All heart.",
                      bg: "#ffffff",
                      color: "#30302e",
                      font: "Sans",
                    },
                  ].map((theme) => (
                    <button
                      className="theme-card"
                      key={theme.name}
                      onClick={() => {
                        commit({
                          ...project,
                          spreads: project.spreads.map((s) => ({
                            ...s,
                            pages: s.pages.map((p) =>
                              p.locked
                                ? p
                                : {
                                    ...p,
                                    background: theme.bg,
                                    elements: p.elements.map((e) => ({
                                      ...e,
                                      color: theme.color,
                                      ...(e.kind === "text"
                                        ? { font: theme.font }
                                        : {}),
                                    })),
                                  },
                            ) as [Page, Page],
                          })),
                        });
                        notify(`${theme.name} applied to your book.`);
                      }}
                    >
                      <div
                        style={{
                          background: theme.bg,
                          color: theme.color,
                          fontFamily: fontFamily(theme.font),
                        }}
                      >
                        <span>
                          a little
                          <br />
                          bit of us
                        </span>
                        <svg viewBox="0 0 100 100">
                          <Sticker name="flower" color={theme.color} />
                        </svg>
                      </div>
                      <strong>{theme.name}</strong>
                      <small>{theme.sub}</small>
                    </button>
                  ))}
                </>
              )}

              {panel === "pages" && (
                <>
                  <p className="panel-intro">Every chapter belongs here.</p>
                  <button className="button primary wide" onClick={addSpread}>
                    <Icon name="plus" size={17} /> add a spread
                  </button>
                  <div className="page-actions">
                    <Button
                      icon="duplicate"
                      title="Duplicate spread"
                      onClick={duplicateCurrent}
                    />
                    <Button
                      icon="arrowUp"
                      title="Move spread earlier"
                      disabled={currentIndex < 2}
                      onClick={() => reorder(-1)}
                    />
                    <Button
                      icon="arrowDown"
                      title="Move spread later"
                      disabled={
                        currentIndex === 0 ||
                        currentIndex === project.spreads.length - 1
                      }
                      onClick={() => reorder(1)}
                    />
                    <Button
                      icon="trash"
                      title="Delete spread"
                      disabled={currentIndex === 0}
                      onClick={() => setModal("delete-spread")}
                    />
                  </div>
                  <div className="pages-list">
                    {project.spreads.map((s, i) => (
                      <button
                        key={s.id}
                        className={i === currentIndex ? "selected" : ""}
                        onClick={() => navigate(i)}
                      >
                        <MiniSpread spread={s} index={i} />
                        <span>{i === 0 ? "Cover" : `Pages ${label(i)}`}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {panel === "layers" && (
                <>
                  <p className="panel-intro">
                    Everything in its own little place.
                  </p>
                  <PageTarget
                    side={side}
                    setSide={(s) => {
                      setSide(s);
                      setSelected(null);
                    }}
                  />
                  {page.elements.length ? (
                    <div className="layers-list">
                      {[...page.elements].reverse().map((e) => (
                        <div
                          key={e.id}
                          className={selected === e.id ? "selected" : ""}
                        >
                          <button
                            className="layer-name"
                            onClick={() => setSelected(e.id)}
                          >
                            <Icon
                              name={
                                e.kind === "photo"
                                  ? "photos"
                                  : e.kind === "sticker"
                                    ? "stickers"
                                    : e.kind === "text"
                                      ? "text"
                                      : "frames"
                              }
                              size={17}
                            />
                            <span>{e.text || e.sticker || e.kind}</span>
                          </button>
                          <Button
                            icon={e.locked ? "lock" : "unlock"}
                            title={e.locked ? "Unlock layer" : "Lock layer"}
                            onClick={() =>
                              updateElement(e.id, { locked: !e.locked })
                            }
                          />
                          <Button
                            icon="eye"
                            title={e.hidden ? "Show layer" : "Hide layer"}
                            active={e.hidden}
                            onClick={() =>
                              updateElement(e.id, { hidden: !e.hidden })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <Icon name="layers" size={32} />
                      <p>
                        {page.locked
                          ? "This is a locked end paper."
                          : "Your page is a blank canvas."}
                      </p>
                    </div>
                  )}
                  {selectedElement && (
                    <div className="page-actions">
                      <button className="button" onClick={() => moveLayer(1)}>
                        <Icon name="arrowUp" size={16} /> forward
                      </button>
                      <button className="button" onClick={() => moveLayer(-1)}>
                        <Icon name="arrowDown" size={16} /> backward
                      </button>
                    </div>
                  )}
                </>
              )}

              {panel === "comments" && (
                <>
                  <p className="panel-intro">
                    A note for this part of the story.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!comment.trim()) return;
                      commit({
                        ...project,
                        comments: [
                          ...project.comments,
                          {
                            id: uid(),
                            spreadId: spread.id,
                            text: comment.trim(),
                            date: new Date().toISOString(),
                            resolved: false,
                          },
                        ],
                      });
                      setComment("");
                    }}
                  >
                    <textarea
                      aria-label="Your comment"
                      placeholder="Leave a little note…"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      maxLength={2000}
                    />
                    <button
                      className="button primary wide"
                      disabled={!comment.trim()}
                    >
                      add note
                    </button>
                  </form>
                  <p className="small muted">
                    Personal notes are saved on this device.
                  </p>
                  {project.comments
                    .filter((c) => c.spreadId === spread.id)
                    .map((c) => (
                      <div
                        className={`comment-card ${c.resolved ? "resolved" : ""}`}
                        key={c.id}
                      >
                        <div>
                          <strong>You</strong>
                          <small>{new Date(c.date).toLocaleDateString()}</small>
                        </div>
                        <p>{c.text}</p>
                        <button
                          className="text-link"
                          onClick={() =>
                            commit({
                              ...project,
                              comments: project.comments.map((n) =>
                                n.id === c.id
                                  ? { ...n, resolved: !n.resolved }
                                  : n,
                              ),
                            })
                          }
                        >
                          {c.resolved ? "reopen note" : "mark as resolved"}
                        </button>
                      </div>
                    ))}
                </>
              )}
            </div>
            <div className="panel-bottom">
              <span className="tiny-flower">✳</span> made for your kind of
              memories
            </div>
          </aside>
        )}

        <main className="workspace">
          <div className="canvas-stage" ref={stage}>
            <div className="floating-toolbar">
              <Button
                icon="pointer"
                title="Select tool"
                active={!selected}
                onClick={() => setSelected(null)}
              />
              <Button
                icon="text"
                title="Add text"
                onClick={() => addText()}
                disabled={!writable}
              />
              <Button
                icon="crop"
                title="Crop photo"
                disabled={selectedElement?.kind !== "photo"}
                onClick={() => {
                  setModal("crop");
                }}
              />
              <Button
                icon="rotate"
                title="Rotate selection"
                disabled={!editable}
                onClick={() =>
                  selectedElement &&
                  updateElement(selectedElement.id, {
                    rotation: (selectedElement.rotation + 90) % 360,
                  })
                }
              />
              <span className="toolbar-divider" />
              <Button
                icon="minus"
                title="Zoom out"
                onClick={() => setZoom((z) => Math.max(35, z - 10))}
              />
              <button
                className="zoom-value"
                title="Reset zoom"
                onClick={() => setZoom(85)}
              >
                {zoom}%
              </button>
              <Button
                icon="plus"
                title="Zoom in"
                onClick={() => setZoom((z) => Math.min(200, z + 10))}
              />
              <Button
                icon="fit"
                title="Fit to view"
                onClick={() => setZoom(85)}
              />
              <span className="toolbar-divider" />
              <button
                className={`guide-button ${bleed ? "enabled" : ""}`}
                title="Toggle bleed"
                aria-label="Toggle bleed"
                aria-pressed={bleed}
                onClick={() => setBleed(!bleed)}
              >
                <span style={{ background: "#dba3a0" }} />
              </button>
              <button
                className={`guide-button ${safe ? "enabled" : ""}`}
                title="Toggle safe area"
                aria-label="Toggle safe area"
                aria-pressed={safe}
                onClick={() => setSafe(!safe)}
              >
                <span style={{ background: "#91af96" }} />
              </button>
              <Button
                icon="grid"
                title="Toggle grid (G)"
                active={grid}
                onClick={() => setGrid(!grid)}
              />
            </div>
            <div className="stage-actions">
              <Button
                icon="layers"
                title="Show layers"
                active={panel === "layers"}
                onClick={() => changePanel("layers")}
              />
              <Button
                icon="comments"
                title="Show comments"
                active={panel === "comments"}
                onClick={() => changePanel("comments")}
              />
            </div>
            <div className="book-area">
              <div className="book-and-labels" style={{ width: W * 2 * scale }}>
                <div className="book" style={{ height: H * scale }}>
                  {spread.pages.map((p, j) => (
                    <Canvas
                      key={p.id}
                      page={p}
                      number={currentIndex * 2 + j}
                      active={side === j}
                      selected={side === j ? selected : null}
                      grid={grid}
                      safe={safe}
                      bleed={bleed}
                      onSelect={(id) => {
                        setSide(j);
                        setSelected(id);
                      }}
                      onChange={(id, patch) => updateElement(id, patch, j)}
                      onPhoto={(src, id) => addPhoto(src, j, id)}
                      onFiles={(files, id) =>
                        void uploadPhotos(files, { side: j, id })
                      }
                      onEdit={editSelected}
                    />
                  ))}
                  <div className="book-spine" />
                </div>
                <div className="page-labels">
                  <button
                    onClick={() => {
                      setSide(0);
                      setSelected(null);
                    }}
                  >
                    {currentIndex === 0
                      ? "back cover"
                      : `page ${currentIndex * 2}`}
                    {side === 0 && <span />}
                  </button>
                  <button
                    onClick={() => {
                      setSide(1);
                      setSelected(null);
                    }}
                  >
                    {currentIndex === 0
                      ? "front cover"
                      : `page ${currentIndex * 2 + 1}`}
                    {side === 1 && <span />}
                  </button>
                </div>
              </div>
            </div>
            <button
              className="page-arrow previous"
              aria-label="Previous spread"
              disabled={currentIndex === 0}
              onClick={() => navigate(currentIndex - 1)}
            >
              <Icon name="left" />
            </button>
            <button
              className="page-arrow next"
              aria-label="Next spread"
              disabled={currentIndex === project.spreads.length - 1}
              onClick={() => navigate(currentIndex + 1)}
            >
              <Icon name="right" />
            </button>
            <div className="canvas-hint">
              <Icon name={selectedElement ? "pointer" : "heart"} size={13} />
              <span>
                {selectedElement
                  ? "Drag to move · pull the corner to resize"
                  : "A little book. A whole lot of you."}
              </span>
            </div>
            <span className="book-spec">
              A4 PORTRAIT · {project.spreads.length * 2} PAGES
            </span>
          </div>
          <div className="filmstrip">
            <Button
              icon="left"
              title="Previous page"
              disabled={currentIndex === 0}
              onClick={() => navigate(currentIndex - 1)}
            />
            <div
              className="filmstrip-scroll"
              role="tablist"
              aria-label="Book spreads"
            >
              {project.spreads.map((s, i) => (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={currentIndex === i}
                  aria-label={`Go to ${i === 0 ? "cover" : `pages ${label(i)}`}`}
                  className={`spread-thumbnail ${currentIndex === i ? "selected" : ""}`}
                  onClick={(e) => {
                    navigate(i);
                    e.currentTarget.scrollIntoView({
                      block: "nearest",
                      inline: "nearest",
                      behavior: "smooth",
                    });
                  }}
                >
                  <MiniSpread spread={s} index={i} />
                  <span>{label(i)}</span>
                  {currentIndex === i && <i />}
                </button>
              ))}
              <button className="add-spread" onClick={addSpread}>
                <Icon name="plus" size={20} />
                <span>add spread</span>
              </button>
            </div>
            <Button
              icon="right"
              title="Next page"
              disabled={currentIndex === project.spreads.length - 1}
              onClick={() => navigate(currentIndex + 1)}
            />
          </div>
        </main>

        {selectedElement && (
          <aside className="inspector">
            <div className="panel-heading">
              <h2>
                {selectedElement.kind === "photo"
                  ? "photo"
                  : selectedElement.kind === "text"
                    ? "text styling"
                    : "element"}
              </h2>
              <Button
                icon="close"
                title="Close properties"
                onClick={() => setSelected(null)}
              />
            </div>
            <div className="panel-content">
              <div className="selection-type">
                <Icon
                  name={
                    selectedElement.kind === "text"
                      ? "text"
                      : selectedElement.kind === "photo"
                        ? "photos"
                        : "stickers"
                  }
                />
                <span>{selectedElement.kind} properties</span>
                <Button
                  icon={selectedElement.locked ? "lock" : "unlock"}
                  title={
                    selectedElement.locked ? "Unlock element" : "Lock element"
                  }
                  onClick={() =>
                    updateElement(selectedElement.id, {
                      locked: !selectedElement.locked,
                    })
                  }
                />
              </div>
              <fieldset disabled={!editable}>
                {selectedElement.kind === "text" && (
                  <>
                    <label className="field-label">
                      YOUR WORDS
                      <textarea
                        ref={textArea}
                        aria-label="Edit text"
                        value={selectedElement.text || ""}
                        onChange={(e) =>
                          updateElement(selectedElement.id, {
                            text: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="field-label">
                      FONT
                      <select
                        aria-label="Font family"
                        value={selectedElement.font || "Serif"}
                        onChange={(e) =>
                          updateElement(selectedElement.id, {
                            font: e.target.value,
                          })
                        }
                      >
                        {fonts.map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </select>
                    </label>
                    <div className="text-controls">
                      <NumberField
                        label="Font size"
                        value={selectedElement.size || 28}
                        min={8}
                        max={160}
                        onChange={(size) =>
                          updateElement(selectedElement.id, { size })
                        }
                      />
                      <button
                        className={selectedElement.bold ? "active" : ""}
                        aria-label="Bold"
                        onClick={() =>
                          updateElement(selectedElement.id, {
                            bold: !selectedElement.bold,
                          })
                        }
                      >
                        <b>B</b>
                      </button>
                      <button
                        className={selectedElement.italic ? "active" : ""}
                        aria-label="Italic"
                        onClick={() =>
                          updateElement(selectedElement.id, {
                            italic: !selectedElement.italic,
                          })
                        }
                      >
                        <i>I</i>
                      </button>
                    </div>
                    <div className="segmented">
                      {["left", "center", "right"].map((align) => (
                        <button
                          key={align}
                          className={
                            selectedElement.align === align ? "active" : ""
                          }
                          onClick={() =>
                            updateElement(selectedElement.id, {
                              align: align as Element["align"],
                            })
                          }
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {selectedElement.kind === "photo" && (
                  <>
                    <button
                      className="button primary wide"
                      onClick={() => {
                        uploadTarget.current = { side, id: selectedElement.id };
                        upload.current?.click();
                      }}
                    >
                      <Icon name="upload" size={16} />{" "}
                      {selectedElement.src ? "replace photo" : "choose a photo"}
                    </button>
                    <button
                      className="button wide"
                      disabled={!selectedElement.src}
                      onClick={() => setModal("crop")}
                    >
                      <Icon name="crop" size={16} /> adjust crop
                    </button>
                    <label className="field-label">
                      FRAME
                      <select
                        aria-label="Photo frame"
                        value={selectedElement.frame || "polaroid"}
                        onChange={(e) =>
                          updateElement(selectedElement.id, {
                            frame: e.target.value,
                          })
                        }
                      >
                        {["polaroid", "thin", "dark", "none"].map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                {selectedElement.kind !== "photo" && (
                  <label className="custom-color">
                    {selectedElement.kind === "text" ? "Text colour" : "Colour"}
                    <input
                      type="color"
                      aria-label="Element color"
                      value={selectedElement.color}
                      onChange={(e) =>
                        updateElement(selectedElement.id, {
                          color: e.target.value,
                        })
                      }
                    />
                  </label>
                )}
                <div className="section-label">POSITION & SIZE</div>
                <div className="position-grid">
                  <NumberField
                    label="X"
                    min={-1000}
                    value={selectedElement.x}
                    onChange={(x) => updateElement(selectedElement.id, { x })}
                  />
                  <NumberField
                    label="Y"
                    min={-1000}
                    value={selectedElement.y}
                    onChange={(y) => updateElement(selectedElement.id, { y })}
                  />
                  <NumberField
                    label="Width"
                    min={25}
                    value={selectedElement.w}
                    onChange={(w) => updateElement(selectedElement.id, { w })}
                  />
                  <NumberField
                    label="Height"
                    min={25}
                    value={selectedElement.h}
                    onChange={(h) => updateElement(selectedElement.id, { h })}
                  />
                </div>
                <NumberField
                  label="Rotation °"
                  min={-360}
                  max={360}
                  value={selectedElement.rotation}
                  onChange={(rotation) =>
                    updateElement(selectedElement.id, { rotation })
                  }
                />
                <label className="range-label">
                  <span>
                    Opacity <b>{Math.round(selectedElement.opacity * 100)}%</b>
                  </span>
                  <input
                    aria-label="Opacity"
                    type="range"
                    min="0"
                    max="1"
                    step=".05"
                    value={selectedElement.opacity}
                    onChange={(e) =>
                      updateElement(selectedElement.id, {
                        opacity: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <div className="page-actions">
                  <Button
                    icon="arrowUp"
                    title="Bring forward"
                    onClick={() => moveLayer(1)}
                  />
                  <Button
                    icon="arrowDown"
                    title="Send backward"
                    onClick={() => moveLayer(-1)}
                  />
                  <Button
                    icon="duplicate"
                    title="Duplicate element"
                    onClick={duplicateElement}
                  />
                  <Button
                    icon="trash"
                    title="Delete element"
                    onClick={removeElement}
                  />
                </div>
              </fieldset>
              {selectedElement.locked && (
                <p className="small muted">
                  Unlock this element to make changes.
                </p>
              )}
            </div>
          </aside>
        )}
      </div>

      {preview && (
        <section className="preview-overlay" aria-label="Print preview">
          <header>
            <button className="button" onClick={() => setPreview(false)}>
              <Icon name="left" size={17} /> back to editor
            </button>
            <strong>{project.name}</strong>
            <span>hardcover photobook · A4 portrait</span>
            <button
              className="button primary"
              onClick={() => setModal("export")}
            >
              <Icon name="download" size={16} /> export book
            </button>
          </header>
          <div className={`preview-stage ${allPages ? "all-pages" : ""}`}>
            {(allPages ? project.spreads : [spread]).map((s, i) => (
              <div className="preview-item" key={s.id}>
                <div className="book preview-book">
                  {s.pages.map((p, j) => (
                    <PageArt
                      key={p.id}
                      page={p}
                      index={(allPages ? i : currentIndex) * 2 + j}
                      preview
                    />
                  ))}
                  <div className="book-spine" />
                </div>
                <span>{label(allPages ? i : currentIndex)}</span>
              </div>
            ))}
          </div>
          <footer>
            <div className="segmented">
              <button
                className={!allPages ? "active" : ""}
                onClick={() => setAllPages(false)}
              >
                one spread
              </button>
              <button
                className={allPages ? "active" : ""}
                onClick={() => setAllPages(true)}
              >
                all pages
              </button>
            </div>
            <div className="preview-navigation">
              <Button
                icon="left"
                title="Preview previous spread"
                disabled={currentIndex === 0}
                onClick={() => navigate(currentIndex - 1)}
              />
              <span>{label(currentIndex)}</span>
              <Button
                icon="right"
                title="Preview next spread"
                disabled={currentIndex === project.spreads.length - 1}
                onClick={() => navigate(currentIndex + 1)}
              />
            </div>
            <span className="small muted">
              {project.spreads.length} spreads · {project.spreads.length * 2}{" "}
              pages
            </span>
          </footer>
        </section>
      )}

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div
            className={`modal ${modal === "crop" ? "crop-modal" : ""}`}
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "help" ? "Help and keyboard shortcuts" : modal
            }
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key !== "Tab") return;
              const nodes = dialog.current?.querySelectorAll<HTMLElement>(
                'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
              );
              if (!nodes?.length) return;
              const first = nodes[0],
                last = nodes[nodes.length - 1];
              if (
                e.shiftKey &&
                (document.activeElement === first ||
                  document.activeElement === dialog.current)
              ) {
                e.preventDefault();
                last.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
              }
            }}
          >
            <Button
              icon="close"
              title="Close dialog"
              className="modal-close"
              onClick={() => setModal(null)}
            />
            {modal === "help" && (
              <>
                <div className="modal-eyebrow">A LITTLE HELP</div>
                <h2>Make yourself at home.</h2>
                <p>
                  Choose a tool on the left. Click an element to style it, drag
                  to move it, and pull its corner to resize. Drop your photos
                  into any frame.
                </p>
                <div className="shortcut-list">
                  {[
                    ["Undo", "⌘ / Ctrl + Z"],
                    ["Redo", "⌘ / Ctrl + Shift + Z"],
                    ["Duplicate element", "⌘ / Ctrl + D"],
                    ["Save locally", "⌘ / Ctrl + S"],
                    ["Move element", "Arrow keys"],
                    ["Move by 10 pixels", "Shift + arrows"],
                    ["Delete element", "Delete / Backspace"],
                    ["Toggle grid", "G"],
                    ["Close / deselect", "Esc"],
                  ].map(([a, b]) => (
                    <div key={a}>
                      <span>{a}</span>
                      <kbd>{b}</kbd>
                    </div>
                  ))}
                </div>
                <p className="small muted">
                  Your book saves automatically in this browser. Download a
                  project file for a portable backup.
                </p>
              </>
            )}
            {modal === "about" && (
              <>
                <div className="wordmark modal-logo">
                  pixory<span>✳</span>
                </div>
                <h2>
                  A little book.
                  <br />A whole lot of you.
                </h2>
                <p>
                  Collect the moments that make your life yours. Create a
                  photobook with photos, handwritten notes, and the little
                  details you never want to forget.
                </p>
                <div className="local-notice">
                  <Icon name="lock" />
                  <span>
                    Your book and photos live in this browser. No account or
                    upload to a server is needed.
                  </span>
                </div>
                <button
                  className="button primary wide"
                  onClick={() => setModal(null)}
                >
                  back to making memories
                </button>
              </>
            )}
            {modal === "cart" && (
              <>
                <div className="modal-eyebrow">
                  YOUR MEMORIES, IN YOUR HANDS
                </div>
                <h2>
                  {cartAdded
                    ? "Your book is in the demo cart."
                    : "A keepsake, made by you."}
                </h2>
                <div className="cart-book">
                  <MiniSpread spread={project.spreads[0]} index={0} />
                  <div>
                    <strong>{project.name}</strong>
                    <span>
                      A4 portrait · {project.spreads.length * 2} pages
                    </span>
                    <small>Personalised photobook</small>
                  </div>
                </div>
                <label className="field-label">
                  BINDING
                  <select
                    aria-label="Book binding"
                    value={binding}
                    onChange={(e) => {
                      setBinding(e.target.value);
                      setCartAdded(false);
                    }}
                  >
                    <option value="hardcover">Hardcover</option>
                    <option value="softcover">Softcover</option>
                  </select>
                </label>
                <NumberField
                  label="Quantity"
                  value={quantity}
                  min={1}
                  max={10}
                  onChange={(n) => {
                    setQuantity(n);
                    setCartAdded(false);
                  }}
                />
                <div className="cart-total">
                  <span>Demo total</span>
                  <strong>
                    $
                    {(
                      (binding === "hardcover" ? 83.5 : 59.5) * quantity
                    ).toFixed(2)}
                  </strong>
                </div>
                {issues.length > 0 && (
                  <button
                    className="export-warning"
                    onClick={() => setModal("warnings")}
                  >
                    <Icon name="warning" size={16} />
                    {issues.length} photo frames still need a memory
                  </button>
                )}
                <div className="local-notice">
                  <Icon name="info" />
                  <span>
                    This is a frontend cart preview. No order is placed and no
                    payment is collected. Prices are illustrative.
                  </span>
                </div>
                <button
                  className="button primary wide"
                  onClick={() =>
                    cartAdded ? setModal("export") : setCartAdded(true)
                  }
                >
                  <Icon name={cartAdded ? "download" : "cart"} size={16} />
                  {cartAdded ? "download your book" : "add to demo cart"}
                </button>
                <button
                  className="button wide"
                  onClick={() => {
                    setModal(null);
                    setPreview(true);
                  }}
                >
                  preview all the memories
                </button>
              </>
            )}
            {modal === "share" && (
              <>
                <div className="modal-eyebrow">PASS THE MEMORIES ON</div>
                <h2>A story worth sharing.</h2>
                <p>
                  Download an editable project to send to someone you love. They
                  can open it through <strong>File → Open project</strong> in
                  this editor.
                </p>
                <div className="local-notice">
                  <Icon name="info" />
                  <span>
                    This frontend stores projects locally. Shared links and live
                    collaboration aren’t connected.
                  </span>
                </div>
                <button className="button primary wide" onClick={exportProject}>
                  <Icon name="download" size={18} /> download shareable project
                </button>
                <button
                  className="button wide"
                  onClick={() => setModal("export")}
                >
                  share as an image instead
                </button>
              </>
            )}
            {modal === "export" && (
              <>
                <div className="modal-eyebrow">MADE BY YOU, KEPT FOREVER</div>
                <h2>Take your memories with you.</h2>
                <p>
                  Export the current spread, print your whole book, or save an
                  editable copy.
                </p>
                {issues.length > 0 && (
                  <button
                    className="export-warning"
                    onClick={() => setModal("warnings")}
                  >
                    <Icon name="warning" size={18} />
                    <span>
                      {issues.length} empty photo frames — review your book
                    </span>
                    <Icon name="right" size={16} />
                  </button>
                )}
                <div className="export-options">
                  <button
                    disabled={busy}
                    onClick={() => void exportSpread("png")}
                  >
                    <span className="format-icon">PNG</span>
                    <span>
                      <strong>High-resolution image</strong>
                      <small>Current spread · 1680 × 1160 pixels</small>
                    </span>
                    <Icon name="download" />
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => void exportSpread("svg")}
                  >
                    <span className="format-icon">SVG</span>
                    <span>
                      <strong>Scalable artwork</strong>
                      <small>Current spread · embedded photos</small>
                    </span>
                    <Icon name="download" />
                  </button>
                  <button
                    onClick={() => {
                      setModal(null);
                      setTimeout(() => window.print(), 100);
                    }}
                  >
                    <span className="format-icon">PDF</span>
                    <span>
                      <strong>Print your whole book</strong>
                      <small>All spreads · select “Save as PDF”</small>
                    </span>
                    <Icon name="export" />
                  </button>
                  <button onClick={exportProject}>
                    <span className="format-icon">JSON</span>
                    <span>
                      <strong>Editable project</strong>
                      <small>All pages, photos, and personal notes</small>
                    </span>
                    <Icon name="download" />
                  </button>
                </div>
                <p className="small muted">
                  Exports are free. Physical printing and checkout are not
                  connected.
                </p>
              </>
            )}
            {modal === "warnings" && (
              <>
                <div className="modal-eyebrow">ONE LAST LOOK</div>
                <h2>
                  {issues.length
                    ? "A few finishing touches."
                    : "Looking lovely."}
                </h2>
                <p>
                  {issues.length
                    ? "These photo frames are still waiting for a memory. Click one to jump to it."
                    : "Every visible photo frame has a photo. Preview your book before exporting."}
                </p>
                <div className="warning-list">
                  {issues.map((issue) => (
                    <button
                      key={issue.id}
                      onClick={() => {
                        navigate(issue.spread);
                        const s = project.spreads[issue.spread];
                        setSide(
                          s.pages[0].elements.some((e) => e.id === issue.id)
                            ? 0
                            : 1,
                        );
                        setSelected(issue.id);
                        setPanel("photos");
                        setPreview(false);
                        setModal(null);
                      }}
                    >
                      <Icon name="image" size={18} />
                      <span>{issue.text}</span>
                      <Icon name="right" size={15} />
                    </button>
                  ))}
                </div>
                <button
                  className="button primary wide"
                  onClick={() => setModal("export")}
                >
                  continue to export
                </button>
              </>
            )}
            {modal === "crop" && selectedElement?.kind === "photo" && (
              <>
                <div className="modal-eyebrow">JUST THE RIGHT MOMENT</div>
                <h2>Make it fit beautifully.</h2>
                <div className="crop-preview">
                  <PageArt
                    page={makePage(
                      [
                        {
                          ...selectedElement,
                          x: 30,
                          y: 30,
                          w: 360,
                          h: 480,
                          rotation: 0,
                        },
                      ],
                      PAPER,
                    )}
                    preview
                  />
                </div>
                {!selectedElement.src && (
                  <p>Add a photo first to adjust its crop.</p>
                )}
                {[
                  {
                    key: "crop",
                    name: "Zoom",
                    min: 1,
                    max: 4,
                    step: 0.05,
                    value: selectedElement.crop || 1,
                  },
                  {
                    key: "focalX",
                    name: "Horizontal position",
                    min: 0,
                    max: 100,
                    step: 1,
                    value: selectedElement.focalX ?? 50,
                  },
                  {
                    key: "focalY",
                    name: "Vertical position",
                    min: 0,
                    max: 100,
                    step: 1,
                    value: selectedElement.focalY ?? 50,
                  },
                ].map((range) => (
                  <label className="range-label" key={range.key}>
                    <span>
                      {range.name}
                      <b>
                        {range.key === "crop"
                          ? `${range.value.toFixed(2)}×`
                          : `${range.value}%`}
                      </b>
                    </span>
                    <input
                      disabled={!selectedElement.src || selectedElement.locked}
                      aria-label={range.name}
                      type="range"
                      min={range.min}
                      max={range.max}
                      step={range.step}
                      value={range.value}
                      onChange={(e) =>
                        updateElement(selectedElement.id, {
                          [range.key]: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                ))}
                <button
                  className="button primary wide"
                  onClick={() => setModal(null)}
                >
                  done
                </button>
              </>
            )}
            {modal === "new" && (
              <>
                <h2>A new chapter?</h2>
                <p>
                  Download your current book first if you’d like to keep a
                  separate copy. Starting over can also be undone.
                </p>
                <button className="button wide" onClick={exportProject}>
                  download current project
                </button>
                <button className="button primary wide" onClick={newProject}>
                  start a new book
                </button>
              </>
            )}
            {modal === "delete-spread" && (
              <>
                <h2>Remove this spread?</h2>
                <p>
                  Pages {label(currentIndex)} will be removed. You can restore
                  them with Undo.
                </p>
                <button
                  className="button primary wide"
                  onClick={() => {
                    commit({
                      ...project,
                      spreads: project.spreads.filter(
                        (s) => s.id !== spread.id,
                      ),
                      comments: project.comments.filter(
                        (c) => c.spreadId !== spread.id,
                      ),
                    });
                    navigate(currentIndex - 1);
                    setModal(null);
                  }}
                >
                  remove spread
                </button>
                <button className="button wide" onClick={() => setModal(null)}>
                  keep these memories
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <input
        hidden
        ref={upload}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={(e) =>
          void uploadPhotos(
            Array.from(e.target.files || []),
            uploadTarget.current || undefined,
          )
        }
      />
      <input
        hidden
        ref={importInput}
        type="file"
        accept=".json,application/json"
        onChange={(e) => void importProject(e.target.files?.[0])}
      />
      {busy && (
        <div className="busy-overlay" role="status" aria-live="polite">
          <div>
            <Icon name="photos" size={24} />
            <span>Preparing your memories…</span>
          </div>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Icon name="info" size={17} />
          <span>{toast}</span>
          <Button
            icon="close"
            title="Dismiss notification"
            onClick={() => setToast("")}
          />
        </div>
      )}
      <div className="print-book">
        {project.spreads.map((s, i) => (
          <div className="print-spread" key={s.id}>
            {s.pages.map((p, j) => (
              <PageArt key={p.id} page={p} index={i * 2 + j} preview />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function PageTarget({
  side,
  setSide,
}: {
  side: number;
  setSide: (side: number) => void;
}) {
  return (
    <div className="segmented page-target">
      <button className={side === 0 ? "active" : ""} onClick={() => setSide(0)}>
        left page
      </button>
      <button className={side === 1 ? "active" : ""} onClick={() => setSide(1)}>
        right page
      </button>
    </div>
  );
}
