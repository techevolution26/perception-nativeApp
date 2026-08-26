// store/usePerceptionsStore.ts
//
// Shared, in-memory cache of perceptions currently loaded in this session.
// This exists so that creating a perception from ANYWHERE (the global "+"
// composer, in particular) is instantly visible on the home feed without a
// reload. Ported directly from the web app's Zustand store — the logic
// itself is 100% platform-agnostic, so nothing needed to change here.
import { create } from "zustand";
import type { Perception } from "../types/models";

interface PerceptionsState {
  byId: Record<number, Perception>;
  order: number[]; // ids, most-recent-first, for the home feed
  hydrateFeed: (list: Perception[]) => void;
  addPerception: (perception: Perception) => void;
  updatePerception: (id: number, patch: Partial<Perception>) => void;
  removePerception: (id: number) => void;
}

const usePerceptionsStore = create<PerceptionsState>((set) => ({
  byId: {},
  order: [],

  hydrateFeed: (list = []) =>
    set((state) => {
      const byId = { ...state.byId };
      list.forEach((p) => {
        byId[p.id] = p;
      });
      return { byId, order: list.map((p) => p.id) };
    }),

  addPerception: (perception) =>
    set((state) => ({
      byId: { ...state.byId, [perception.id]: perception },
      order: [perception.id, ...state.order.filter((id) => id !== perception.id)],
    })),

  updatePerception: (id, patch) =>
    set((state) =>
      state.byId[id]
        ? { byId: { ...state.byId, [id]: { ...state.byId[id], ...patch } } }
        : state
    ),

  removePerception: (id) =>
    set((state) => {
      const byId = { ...state.byId };
      delete byId[id];
      return { byId, order: state.order.filter((x) => x !== id) };
    }),
}));

export default usePerceptionsStore;
