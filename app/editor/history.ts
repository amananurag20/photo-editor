import type { Project } from "./model";
export type History = {
  present: Project | null;
  past: Project[];
  future: Project[];
};
export type HistoryAction =
  { type: "load" | "commit"; project: Project } | { type: "undo" | "redo" };
export function historyReducer(state: History, action: HistoryAction): History {
  if (action.type === "load")
    return { present: action.project, past: [], future: [] };
  if (action.type === "commit") {
    if (action.project === state.present) return state;
    return {
      present: action.project,
      past: state.present ? [...state.past, state.present].slice(-70) : [],
      future: [],
    };
  }
  if (action.type === "undo" && state.past.length)
    return {
      present: state.past.at(-1)!,
      past: state.past.slice(0, -1),
      future: [state.present!, ...state.future],
    };
  if (action.type === "redo" && state.future.length)
    return {
      present: state.future[0],
      past: [...state.past, state.present!].slice(-70),
      future: state.future.slice(1),
    };
  return state;
}
