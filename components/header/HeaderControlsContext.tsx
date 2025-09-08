"use client";
import { createContext, useContext } from "react";

export type HeaderControls = {
  q: string;
  onQ: (v: string) => void;

  order: string;
  onOrder: (v: string) => void;

  starBuckets: string[];
  onStarBuckets: (arr: string[]) => void;

  onCommit: () => void;

  suggestions?: string[];
  onClickSuggestion?: (s: string) => void;

  tagMatches?: string[];
  onClickTagMatch?: (t: string) => void;

  showSuggestions?: boolean;
};

const Ctx = createContext<HeaderControls | null>(null);

export function HeaderControlsProvider({
  value,
  children,
}: { value: HeaderControls; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHeaderControls() {
  return useContext(Ctx); // null dönebilir -> Header içinde guard edeceğiz
}