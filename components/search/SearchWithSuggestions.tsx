'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';

export type Controls = {
  q: string;
  onQ: (v: string) => void;
  order: 'new' | 'top';
  onOrder: (v: 'new' | 'top') => void;
  starBuckets: number[];
  onStarBuckets: (v: number[]) => void;
  // NEW (optional) controls for enter-to-commit & suggestion list
  onCommit?: () => void;
  suggestions?: string[];
  onClickSuggestion?: (s: string) => void;
  showSuggestions?: boolean;
  tagMatches?: string[];
  onClickTagMatch?: (t: string) => void;
  // Trending tags source for suggestions (optional)
  trendingTags?: string[];
  // Optional pills (parent can provide)
  selectedTags?: string[];
  onClickTagRemove?: (t: string) => void;
};

/**
 * SearchWithSuggestions
 * Header.tsx içindeki "arama inputu + öneri dropdown" parçasını birebir dışarı alan bileşen.
 * Desktop ve mobile varyantlarını birlikte render eder (header'daki yerleşim sınıflarıyla).
 */
export default function SearchWithSuggestions({ controls }: { controls: Controls }) {
  // suggestions dropdown open/close control (closes on outside click)
  const [suggOpen, setSuggOpen] = useState(false);
  const suggWrapRefDesktop = useRef<HTMLDivElement | null>(null);
  const suggWrapRefMobile = useRef<HTMLDivElement | null>(null);
  // Keyboard navigation for suggestions
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const suggListRef = useRef<HTMLUListElement | null>(null);

  // keep local open state in sync with external showSuggestions (don't force-close)
  useEffect(() => {
    if (controls?.showSuggestions) setSuggOpen(true);
    // else: kapatma manuel (escape, dış tık, seçim)
  }, [controls?.showSuggestions]);

  // Reset activeIdx when query, suggestions, or dropdown closes
  useEffect(() => {
    if (!suggOpen) { setActiveIdx(-1); return; }
    setActiveIdx(-1);
  }, [controls?.q, controls?.suggestions, suggOpen]);

  // outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node | null;
      const inDesktop = !!suggWrapRefDesktop.current && suggWrapRefDesktop.current.contains(t as Node);
      const inMobile = !!suggWrapRefMobile.current && suggWrapRefMobile.current.contains(t as Node);
      if (!inDesktop && !inMobile) setSuggOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Ensure active suggestion stays in view
  useEffect(() => {
    if (activeIdx < 0 || !suggListRef.current) return;
    const li = suggListRef.current.querySelector<HTMLLIElement>(`li[data-idx="${activeIdx}"]`);
    if (li) {
      const list = suggListRef.current;
      const liTop = li.offsetTop;
      const liBottom = liTop + li.offsetHeight;
      const viewTop = list.scrollTop;
      const viewBottom = viewTop + list.clientHeight;
      if (liTop < viewTop) list.scrollTop = liTop;
      else if (liBottom > viewBottom) list.scrollTop = liBottom - list.clientHeight;
    }
  }, [activeIdx]);

  // Shared search input keydown handler for suggestions navigation
  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const len = controls?.suggestions?.length ?? 0;
    if (!len) {
      if (e.key === 'Enter') { e.preventDefault(); controls?.onCommit?.(); }
      if (e.key === 'Escape') { setSuggOpen(false); }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggOpen(true);
      setActiveIdx((i) => (i + 1) % len);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggOpen(true);
      setActiveIdx((i) => (i <= 0 ? len - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggOpen && activeIdx >= 0 && activeIdx < len) {
        const val = controls!.suggestions![activeIdx];
        setSuggOpen(false);
        controls?.onClickSuggestion?.(val);
      } else {
        controls?.onCommit?.();
      }
    } else if (e.key === 'Escape') {
      setSuggOpen(false);
      setActiveIdx(-1);
    }
  }

  // Helper to highlight query in suggestions
  const renderHighlighted = (text: string, q: string): React.ReactNode => {
    const needle = (q || '').trim().toLowerCase();
    if (!needle) return text;
    const hay = text || '';
    const i = hay.toLowerCase().indexOf(needle);
    if (i === -1) return hay;
    return (
      <>
        {hay.slice(0, i)}
        <mark className="px-0.5 rounded bg-amber-200/70 dark:bg-amber-600/40">{hay.slice(i, i + needle.length)}</mark>
        {hay.slice(i + needle.length)}
      </>
    );
  };

  // ortak dropdown içeriği (desktop/mobile paylaşır)
  const SuggestionDropdown: React.FC = () => (
    <div
      className="absolute left-0 right-0 top-full mt-2 z-30 overflow-hidden rounded-2xl border bg-white/95 dark:bg-gray-900/95 dark:border-gray-800 shadow-xl ring-1 ring-black/5 dark:ring-white/5 backdrop-blur"
      role="listbox"
      aria-label="İlgili Sonuçlar"
    >
      <div className="px-3 py-2 space-y-1">
        {(Array.isArray(controls?.tagMatches) || Array.isArray(controls?.trendingTags)) && (
          (() => {
            const pool = controls.tagMatches || [];
            const trendingSrc = Array.isArray(controls?.trendingTags) ? controls!.trendingTags! : [];
            const searchPool: string[] = Array.from(new Set<string>([...pool, ...trendingSrc]));
            const filtered: string[] = searchPool.slice(0, 5);
            if (filtered.length === 0) return null;
            return (
              <>
                <div className="text-[11px] font-medium tracking-wide text-gray-500 dark:text-gray-400">
                  İlgili Etiketler
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-1 -mb-1 pr-1">
                  {filtered.map((t, i) => {
                    const isTrending = Array.isArray(controls?.trendingTags) && controls!.trendingTags!.includes(t);
                    const trendingClasses = isTrending
                      ? 'bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-100'
                      : '';
                    return (
                      <button
                        key={t + i}
                        type="button"
                        onClick={() => {
                          setSuggOpen(false);
                          controls.onClickTagMatch?.(t);
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-800/70 ${trendingClasses}`}
                        title={`#${t}`}
                      >
                        <span className="opacity-70">#</span>
                        <span className="truncate max-w-[10rem]">{t}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="h-px bg-gray-100 dark:bg-gray-800" />
              </>
            );
          })()
        )}
        <div className="text-[11px] font-medium tracking-wide text-gray-500 dark:text-gray-400">
          İlgili Sonuçlar
        </div>
      </div>
      <ul ref={suggListRef} className="max-h-80 overflow-auto overscroll-contain divide-y dark:divide-gray-800">
        {(controls.suggestions || []).map((s, i) => (
          <li key={i} role="option" data-idx={i} aria-selected={i === activeIdx}>
            <button
              type="button"
              onClick={() => { setSuggOpen(false); controls.onClickSuggestion?.(s); }}
              className={`w-full flex items-center gap-2 px-3 py-3 text-sm ${i === activeIdx ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-800/70'}`}
              title={s}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0 opacity-60">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span className="truncate flex-1">{renderHighlighted(s, controls.q)}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="px-3 py-2 text-[11px] text-gray-500/80 dark:text-gray-400/80 flex items-center justify-between">
        <span className="hidden sm:inline">Enter ile seç</span>
        <span className="inline-flex items-center gap-1">
          <span className="rounded border px-1 py-0.5 text-[10px] dark:border-gray-700">↑</span>
          <span className="rounded border px-1 py-0.5 text-[10px] dark:border-gray-700">↓</span>
          <span className="opacity-70">ile gez</span>
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex items-center gap-2 flex-1 min-w-0 md:max-w-[36rem] lg:max-w-[42rem] xl:max-w-[48rem]">
        <div className="relative w-full min-w-0" ref={suggWrapRefDesktop}>
          <div className="w-full h-9 border border-gray-300 dark:border-gray-700 rounded-xl px-3 text-sm flex items-center gap-2 bg-white/15 dark:bg-gray-900/20 backdrop-blur-sm focus-within:ring-2 focus-within:ring-black/10 dark:focus-within:ring-white/10">
            <input
              type="search"
              inputMode="search"
              value={controls.q}
              onChange={(e) => {
                const v = e.target.value;
                controls.onQ(v);
                setSuggOpen(v.trim().length > 0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="ara ( / )"
              className="flex-1 min-w-[8rem] bg-transparent outline-none border-0 px-0 py-0 text-base md:text-sm leading-none text-gray-900 placeholder:text-gray-400 dark:text-gray-100 dark:placeholder-gray-400"
            />
          </div>
          {!!controls.q && (
            <button
              type="button"
              onClick={() => controls.onQ('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              aria-label="Temizle"
              title="Temizle"
            >
              ×
            </button>
          )}
          {suggOpen && <SuggestionDropdown />}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden flex items-center gap-2">
        <div className="relative flex-1" ref={suggWrapRefMobile}>
          <div className="w-full h-9 border border-gray-300 dark:border-gray-700 rounded-xl px-3 text-sm flex items-center gap-2 bg-white/15 dark:bg-gray-900/20 backdrop-blur-sm focus-within:ring-2 focus-within:ring-black/10 dark:focus-within:ring-white/10">
            <input
              type="search"
              inputMode="search"
              value={controls.q}
              onChange={(e) => {
                const v = e.target.value;
                controls.onQ(v);
                setSuggOpen(v.trim().length > 0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="ara ( / )"
              className="flex-1 min-w-[8rem] bg-transparent outline-none border-0 px-0 py-0 text-base md:text-sm leading-none text-gray-900 placeholder:text-gray-400 dark:text-gray-100 dark:placeholder-gray-400"
            />
          </div>
          {!!controls.q && (
            <button
              type="button"
              onClick={() => controls.onQ('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              aria-label="Temizle"
              title="Temizle"
            >
              ×
            </button>
          )}
          {suggOpen && <SuggestionDropdown />}
        </div>
      </div>
    </>
  );
}
