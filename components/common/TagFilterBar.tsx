'use client';

import React from 'react';

export type TagFilterBarProps = {
  /** Tüm etiketler (sıralı) */
  tags: string[];
  /** Trend etiketler (renk varyantı için) */
  trending?: string[];
  /** Seçili etiketler (dış kontrollü) */
  selected: Set<string>;
  /** Seç/toggle */
  onToggle: (t: string) => void;
  /** Hepsi (temizle) */
  onClear: () => void;
  /** Opsiyonel sınıf isimleri */
  className?: string;
};

/**
 * TagFilterBar — SavedTab/ItemsTab'teki TagPager'ın bağımsız hâli
 * - Satır genişliğine göre dinamik sayfalama (Hepsi + chip'ler)
 * - Oklarla sayfalar arası geçiş
 * - Trend/Seçili renk varyantları
 */
export default function TagFilterBar({ tags, trending = [], selected, onToggle, onClear, className = '' }: TagFilterBarProps) {
  const [page, setPage] = React.useState(0);
  const [pages, setPages] = React.useState<string[][]>([]);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const measureRef = React.useRef<HTMLDivElement | null>(null);

  const rebuildPages = React.useCallback(() => {
    const root = containerRef.current;
    const meas = measureRef.current;
    if (!root || !meas) return;

    const contentWidth = root.clientWidth; // satır genişliği

    // Ölçü alanını temizle
    meas.innerHTML = '';

    // Hepsi butonu ölçümü
    const hepsi = document.createElement('button');
    hepsi.className = 'h-8 px-3 py-0 rounded-full border text-xs shrink-0';
    hepsi.textContent = 'Hepsi';
    meas.appendChild(hepsi);
    const hepsiW = hepsi.getBoundingClientRect().width;

    const gapPx = 8; // gap-2
    const avail = Math.max(0, contentWidth - hepsiW - gapPx);

    // Chip ölçüm helper
    const makeChip = (label: string, isTrend: boolean, isSel: boolean) => {
      const base = 'inline-flex items-center gap-1 h-7 px-2 py-0 rounded-full border text-[11px] shrink-0 sm:h-8 sm:px-3 sm:text-xs';
      const className = isSel
        ? isTrend
          ? `${base} bg-violet-600 text-white border-violet-600`
          : `${base} bg-black text-white border-black`
        : isTrend
          ? `${base} bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-800/40 dark:text-violet-100 dark:border-violet-700`
          : `${base} bg-white dark:bg-gray-900 dark:border-gray-800`;
      const btn = document.createElement('button');
      btn.className = className;
      btn.innerHTML = `<span>#${label}</span>`;
      return btn;
    };

    const chipWidths: number[] = [];
    tags.forEach((t) => {
      const isSel = selected.has(t);
      const isTrend = trending.includes(t);
      const el = makeChip(t, isTrend, isSel);
      meas.appendChild(el);
      chipWidths.push(el.getBoundingClientRect().width);
    });

    const newPages: string[][] = [];
    let i = 0;
    while (i < tags.length) {
      let used = 0;
      const p: string[] = [];
      while (i < tags.length) {
        const w = chipWidths[i];
        const nextUsed = p.length === 0 ? w : used + gapPx + w;
        if (nextUsed <= avail) {
          used = nextUsed;
          p.push(tags[i]);
          i++;
        } else {
          break;
        }
      }
      if (p.length === 0) { p.push(tags[i]); i++; }
      newPages.push(p);
    }

    setPages(newPages);
    setPage((prev) => (prev >= newPages.length ? 0 : prev));
  }, [tags, trending, selected]);

  React.useEffect(() => {
    rebuildPages();
    const ro = new ResizeObserver(() => rebuildPages());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [rebuildPages]);

  // Seçili etiketler görünmüyorsa ilk sayfaya dön
  React.useEffect(() => {
    if (!pages.length) return;
    const visible = new Set(pages[page] || []);
    const anyVisible = Array.from(selected).some((t) => visible.has(t));
    if (!anyVisible && selected.size > 0) setPage(0);
  }, [pages, page, selected]);

  const canPrev = page > 0;
  const canNext = page < Math.max(0, pages.length - 1);
  const visibleTags = pages[page] || tags.slice(0, 1);

  return (
    <div className={`relative ${className}`}>
      {/* hidden measurer */}
      <div ref={measureRef} style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', zIndex: -1 }} />

      {/* Oklar */}
      {canPrev && (
        <button
          type="button"
          className="rs-sug-nav absolute left-0 top-1/2 -translate-y-1/2 z-10"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          aria-label="Önceki"
        >
          ‹
        </button>
      )}
      {canNext && (
        <button
          type="button"
          className="rs-sug-nav absolute right-0 top-1/2 -translate-y-1/2 z-10"
          onClick={() => setPage((p) => Math.min(pages.length - 1, p + 1))}
          aria-label="Sonraki"
        >
          ›
        </button>
      )}

      {/* İçerik (Hepsi + görünür chipler) */}
      <div className="pr-12 min-h-[32px] transition-[padding] duration-150 ease-out" ref={containerRef} style={{ paddingLeft: canPrev ? 48 : 0 }}>
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            className={`h-8 px-3 py-0 rounded-full border text-xs shrink-0 ${
              selected.size === 0
                ? 'bg-black text-white border-black'
                : 'bg-white dark:bg-gray-900 dark:border-gray-800'
            }`}
            onClick={onClear}
            onDoubleClick={onClear}
          >
            Hepsi
          </button>

          {/* sayfa animasyonu */}
          <div key={`page-${page}`} className="flex flex-wrap items-center gap-2 animate-[sugIn_.22s_ease_both]">
            {visibleTags.map((t) => {
              const isSel = selected.has(t);
              const isTrend = trending.includes(t);
              const base = 'inline-flex items-center gap-1 h-7 px-2 py-0 rounded-full border text-[11px] shrink-0 sm:h-8 sm:px-3 sm:text-xs';
              const className = isSel
                ? isTrend
                  ? `${base} bg-violet-600 text-white border-violet-600`
                  : `${base} bg-black text-white border-black`
                : isTrend
                  ? `${base} bg-violet-100 text-violet-900 border-violet-300 hover:bg-violet-200 dark:bg-violet-800/40 dark:text-violet-100 dark:border-violet-700 dark:hover:bg-violet-800/60`
                  : `${base} bg-white dark:bg-gray-900 dark:border-gray-800`;
              return (
                <button
                  key={t}
                  className={className}
                  onClick={() => onToggle(t)}
                  title={isSel ? 'Filtreden kaldır' : 'Filtreye ekle'}
                >
                  <span>#{t}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes sugIn { from { opacity:.0; transform: translateX(8px); } to { opacity:1; transform: translateX(0); } }
        .rs-sug-nav { width: 32px; height: 32px; border-radius: 9999px; border: 1px solid var(--rs-bd, #e5e7eb); background: var(--rs-bg, #fff); color: var(--rs-fg, #111827); opacity: .95; z-index: 10; pointer-events: auto; }
        .dark .rs-sug-nav { --rs-bg: rgba(17, 24, 39, .92); --rs-bd: #374151; --rs-fg: #e5e7eb; }
        .rs-sug-nav:hover { transform: translateY(-50%) scale(1.02); }
        .rs-sug-nav:active { transform: translateY(-50%) scale(.98); }
      `}</style>
    </div>
  );
}
