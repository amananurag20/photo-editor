import test from "node:test";
import assert from "node:assert/strict";
import {
  createProject,
  duplicateSpread,
  makeLayout,
  parseProject,
  warnings,
} from "../app/editor/model.ts";

test("starter book round-trips through a portable project file", () => {
  const project = createProject();
  assert.equal(project.spreads.length, 11);
  assert.deepEqual(parseProject(JSON.stringify(project)), project);
  assert.equal(project.spreads[1].pages[0].locked, true);
});

test("duplicating a spread gives every object an independent identity", () => {
  const original = createProject().spreads[2];
  const duplicate = duplicateSpread(original);
  assert.notEqual(original.id, duplicate.id);
  original.pages.forEach((page, side) => {
    assert.notEqual(page.id, duplicate.pages[side].id);
    page.elements.forEach((element, index) => {
      assert.notEqual(element.id, duplicate.pages[side].elements[index].id);
      assert.equal(element.kind, duplicate.pages[side].elements[index].kind);
    });
  });
  duplicate.pages[0].elements[0].x = 999;
  assert.notEqual(original.pages[0].elements[0].x, 999);
});

test("preflight counts only visible empty photo frames", () => {
  const project = createProject();
  const before = warnings(project).length;
  const frame = project.spreads[2].pages[0].elements[0];
  frame.hidden = true;
  assert.equal(warnings(project).length, before - 1);
  frame.hidden = false;
  frame.src = "data:image/png;base64,AAAA";
  assert.equal(warnings(project).length, before - 1);
});

test("layouts have unique elements and valid positive dimensions", () => {
  for (const name of ["full", "duo", "grid", "story", "scrapbook"]) {
    const elements = makeLayout(name);
    assert.equal(new Set(elements.map((e) => e.id)).size, elements.length);
    assert.ok(elements.every((e) => e.w > 0 && e.h > 0));
  }
});

test("import rejects corrupt structure, duplicate IDs, and external image sources", () => {
  assert.throws(() => parseProject("{}"));
  assert.throws(() => parseProject("not JSON"));
  for (const damage of [
    (p) => {
      p.spreads = [];
    },
    (p) => {
      p.spreads[0].pages.pop();
    },
    (p) => {
      p.spreads[1].id = p.spreads[0].id;
    },
    (p) => {
      p.spreads[2].pages[0].elements[0].src =
        "https://example.com/tracking.png";
    },
    (p) => {
      p.spreads[2].pages[0].elements[0].w = -1;
    },
    (p) => {
      p.spreads[2].pages[0].elements[0].text = {};
    },
    (p) => {
      p.comments.push({
        id: "note",
        spreadId: "missing",
        text: "hello",
        date: "today",
        resolved: false,
      });
    },
  ]) {
    const project = createProject();
    damage(project);
    assert.throws(() => parseProject(JSON.stringify(project)));
  }
});
