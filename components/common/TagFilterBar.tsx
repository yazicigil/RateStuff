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
  brandTheme?: boolean;
};

/**
 * TagFilterBar — SavedTab/ItemsTab'teki TagPager'ın bağımsız hâli
 * - Satır genişliğine göre dinamik sayfalama (Hepsi + chip'ler)
 * - Oklarla sayfalar arası geçiş
 * - Trend/Seçili renk varyantları
 */
export default function TagFilterBar({ tags, trending = [], selected, onToggle, onClear, className = '', brandTheme = false }: TagFilterBarProps) {
  const [page, setPage] = React.useState(0);
  const [pages, setPages] = React.useState<string[][]>([]);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const measureRef = React.useRef<HTMLDivElement | null>(null);

  const [surfaceTone, setSurfaceTone] = React.useState<'light' | 'dark' | null>(null);

  const parseRgb = (s: string) => {
    if (!s) return null;
    if (s.startsWith('rgb')) {
      const nums = s.match(/rgba?\(([^)]+)\)/i)?.[1]?.split(',').map((v) => parseFloat(v.trim()));
      if (!nums || nums.length < 3) return null;
      const [r, g, b, a = 1] = nums as any;
      return { r, g, b, a };
    }
    if (s.startsWith('#')) {
      const hex = s.replace('#','');
      const cv = (h: string) => parseInt(h, 16);
      if (hex.length === 3) {
        const r = cv(hex[0]+hex[0]);
        const g = cv(hex[1]+hex[1]);
        const b = cv(hex[2]+hex[2]);
        return { r, g, b, a: 1 };
      }
      if (hex.length >= 6) {
        const r = cv(hex.slice(0,2));
        const g = cv(hex.slice(2,4));
        const b = cv(hex.slice(4,6));
        return { r, g, b, a: 1 };
      }
    }
    return null;
  };
  const relLum = (rgb: {r:number;g:number;b:number}) => {
    const srgb = [rgb.r, rgb.g, rgb.b].map(v => v/255).map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
    return 0.2126*srgb[0] + 0.7152*srgb[1] + 0.0722*srgb[2];
  };

  React.useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    let node: HTMLElement | null = root;
    let bg = '';
    while (node) {
      const cs = getComputedStyle(node);
      const cand = cs.backgroundColor || cs.background || '';
      if (cand && !cand.includes('transparent') && cand !== 'rgba(0, 0, 0, 0)') { bg = cand; break; }
      node = node.parentElement;
    }
    const rgb = parseRgb(bg);
    if (!rgb) { setSurfaceTone(null); return; }
    const L = relLum(rgb);
    setSurfaceTone(L < 0.42 ? 'dark' : 'light');
  }, [brandTheme, pages.length, page]);

  const inkByTone = surfaceTone === 'dark' ? '#fff' : 'var(--brand-ink, var(--brand-ink-strong, #111))';
  const bdByTone = surfaceTone === 'dark' ? 'rgba(255,255,255,.28)' : 'var(--brand-elev-bd, rgba(0,0,0,.14))';

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
      let className = '';
      let styles: any | undefined;

      if (brandTheme) {
        className = base;
        styles = {};
        if (isSel) {
          // Seçiliyken: daha koyu brand tonu
          styles.background = 'var(--brand-accent-strong, var(--brand-accent))';
          styles.borderColor = 'var(--brand-accent)';
          styles.color = '#fff';
        } else {
          // Seçili değilken: brand rengine uyumlu açık ton + daha yüksek kontrastlı outline/ink
          styles.background = 'var(--brand-elev-weak, transparent)';
          styles.borderColor = bdByTone;
          styles.color = inkByTone;
        }
      } else {
        className = isSel
          ? (isTrend
              ? `${base} bg-violet-600 text-white border-violet-600`
              : `${base} bg-black text-white border-black`)
          : (isTrend
              ? `${base} bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-800/40 dark:text-violet-100 dark:border-violet-700`
              : `${base} bg-white dark:bg-gray-900 dark:border-gray-800`);
      }

      const btn = document.createElement('button');
      btn.className = className;
      if (styles) Object.assign(btn.style, styles);
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
  }, [tags, trending, selected, brandTheme, bdByTone, inkByTone]);

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
    <div className={`relative ${className}`} style={brandTheme ? { color: inkByTone } : undefined}>
      {/* hidden measurer */}
      <div ref={measureRef} style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', zIndex: -1 }} />

      {/* Oklar */}
      {canPrev && (
        <button
          type="button"
          className="rs-sug-nav absolute left-0 top-1/2 -translate-y-1/2 z-10"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          aria-label="Önceki"
          style={brandTheme ? { ['--rs-bg' as any]: surfaceTone === 'dark' ? 'rgba(255,255,255,.08)' : 'var(--brand-elev-weak, #fff)', ['--rs-bd' as any]: bdByTone, ['--rs-fg' as any]: inkByTone } : undefined}
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
          style={brandTheme ? { ['--rs-bg' as any]: surfaceTone === 'dark' ? 'rgba(255,255,255,.08)' : 'var(--brand-elev-weak, #fff)', ['--rs-bd' as any]: bdByTone, ['--rs-fg' as any]: inkByTone } : undefined}
        >
          ›
        </button>
      )}

      {/* İçerik (Hepsi + görünür chipler) */}
      <div className="pr-12 min-h-[32px] transition-[padding] duration-150 ease-out" ref={containerRef} style={{ paddingLeft: canPrev ? 48 : 0 }}>
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            className={`h-8 px-3 py-0 rounded-full border text-xs shrink-0 ${brandTheme ? '' : (selected.size === 0
              ? 'bg-black text-white border-black'
              : 'bg-white dark:bg-gray-900 dark:border-gray-800')}`}
            style={brandTheme ? (selected.size === 0
              // Hepsi seçiliyken (tüm filtreler kapalı): seçili chip stili
              ? { background: 'var(--brand-accent-strong, var(--brand-accent))', borderColor: 'var(--brand-accent)', color: '#fff' }
              // Hepsi seçili değilken: tone-aware unselected chip stili
              : { background: 'var(--brand-elev-weak, transparent)', borderColor: bdByTone, color: inkByTone }
            ) : undefined}
            onClick={onClear}
            onDoubleClick={onClear}
          >
            Hepsi
          </button>

          {/* sayfa animasyonu */}
          <div key={`page-${page}`} className="flex items-center gap-2 animate-[sugIn_.22s_ease_both]">
            {visibleTags.map((t) => {
              const isSel = selected.has(t);
              const isTrend = trending.includes(t);
              const base = 'inline-flex items-center gap-1 h-7 px-2 py-0 rounded-full border text-[11px] shrink-0 sm:h-8 sm:px-3 sm:text-xs';
              const classNameChip = brandTheme
                ? base
                : (isSel
                    ? (isTrend
                        ? `${base} bg-violet-600 text-white border-violet-600`
                        : `${base} bg-black text-white border-black`)
                    : (isTrend
                        ? `${base} bg-violet-100 text-violet-900 border-violet-300 hover:bg-violet-200 dark:bg-violet-800/40 dark:text-violet-100 dark:border-violet-700 dark:hover:bg-violet-800/60`
                        : `${base} bg-white dark:bg-gray-900 dark:border-gray-800`));
              const styleChip = brandTheme ? (
                isSel
                  ? { background: 'var(--brand-accent-strong, var(--brand-accent))', borderColor: 'var(--brand-accent)', color: '#fff' }
                  : { background: 'var(--brand-elev-weak, transparent)', borderColor: bdByTone, color: inkByTone }
              ) : undefined;
              return (
                <button
                  key={t}
                  className={classNameChip}
                  style={styleChip as any}
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
