'use client';
import { create } from 'zustand';

type Order = 'new' | 'top';

type HeaderControlsState = {
  // inputs
  qInput: string;
  qCommitted: string;
  order: Order;
  starBuckets: number[];        // [1,3,5] gibi
  suggestions: string[];        // page hesaplayıp buraya yazar
  tagMatches: string[];         // page hesaplayıp buraya yazar
  selectedTags: string[];       // page’in seçili tag setiyle senkron

  // setters
  setQInput: (v: string) => void;
  setQCommitted: (v: string) => void;
  setOrder: (v: Order) => void;
  setStarBuckets: (v: number[]) => void;

  setSuggestions: (v: string[]) => void;
  setTagMatches: (v: string[]) => void;
  setSelectedTags: (v: string[]) => void;

  addTag: (t: string) => void;
  removeTag: (t: string) => void;
  clearTags: () => void;
};

export const useHeaderControlsStore = create<HeaderControlsState>((set, get) => ({
  qInput: '',
  qCommitted: '',
  order: 'new',
  starBuckets: [],
  suggestions: [],
  tagMatches: [],
  selectedTags: [],

  setQInput: (v) => set({ qInput: v }),
  setQCommitted: (v) => set({ qCommitted: v }),
  setOrder: (v) => set({ order: v }),
  setStarBuckets: (v) => set({ starBuckets: v }),

  setSuggestions: (v) => set({ suggestions: v }),
  setTagMatches: (v) => set({ tagMatches: v }),
  setSelectedTags: (v) => set({ selectedTags: v }),

  addTag: (t) => {
    if (!t) return;
    const cur = get().selectedTags;
    if (cur.includes(t)) return;
    set({ selectedTags: [...cur, t] });
  },
  removeTag: (t) => {
    const cur = get().selectedTags;
    set({ selectedTags: cur.filter(x => x !== t) });
  },
  clearTags: () => set({ selectedTags: [] }),
}));