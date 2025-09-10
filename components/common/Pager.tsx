'use client';
import * as React from 'react';

export type PagerProps = {
  /** 1-based current page */
  page: number;
  /** total page count (≥ 1) */
  totalPages: number;
  /** called with the next page (1..totalPages) */
  onPageChange: (next: number) => void;

  /** how many neighbors to show around current page (default: 1) */
  neighborCount?: number;
  /** extra class names for outer wrapper */
  className?: string;
  /** disable scroll/side effects at call sites */
  disabled?: boolean;
};

function buildPageModel(
  cur: number,
  total: number,
  neighbors = 1
): (number | '…')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const show = new Set<number>([1, 2, total - 1, total]);
  for (let d = -neighbors; d <= neighbors; d++) {
    const p = cur + d;
    if (p >= 1 && p <= total) show.add(p);
  }
  const out: (number | '…')[] = [];
  let prev = 0;
  for (let p = 1; p <= total; p++) {
    if (!show.has(p)) continue;
    if (prev && p - prev > 1) out.push('…');
    out.push(p);
    prev = p;
  }
  return out;
}

export default function Pager({
  page,
  totalPages,
  onPageChange,
  neighborCount = 1,
  className = '',
  disabled = false,
}: PagerProps) {
  if (!totalPages || totalPages <= 1) return null;

  const model = React.useMemo(
    () => buildPageModel(page, totalPages, neighborCount),
    [page, totalPages, neighborCount]
  );

  const go = (next: number) => {
    if (disabled) return;
    const clamped = Math.max(1, Math.min(totalPages, next));
    if (clamped !== page) onPageChange(clamped);
  };

  // keyboard: ← / → support
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(page - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(page + 1); }
  };

  const arrowBase =
    'inline-flex items-center justify-center h-9 w-9 rounded-md border text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-transparent';
  const pageBase =
    'inline-flex items-center justify-center h-9 min-w-9 px-2 rounded-md text-sm';
  const pageActive =
    'bg-purple-600 text-white dark:bg-purple-400 dark:text-gray-900';
  const pageIdle = 'hover:bg-gray-100 dark:hover:bg-gray-800 border';

  return (
    <div
      className={`flex items-center justify-center gap-1.5 mt-6 select-none ${className}`}
      role="navigation"
      aria-label="Sayfalandırma"
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        className={arrowBase}
        onClick={() => go(page - 1)}
        disabled={disabled || page <= 1}
        aria-label="Önceki sayfa"
      >
        ‹
      </button>

      {model.map((it, i) =>
        it === '…' ? (
          <span key={`e-${i}`} className="px-2 text-sm opacity-60">
            …
          </span>
        ) : (
          <button
            key={`p-${it}`}
            type="button"
            className={`${pageBase} ${it === page ? pageActive : pageIdle}`}
            onClick={() => go(it as number)}
            aria-current={it === page ? 'page' : undefined}
            aria-label={`Sayfa ${it}`}
          >
            {it}
          </button>
        )
      )}

      <button
        type="button"
        className={arrowBase}
        onClick={() => go(page + 1)}
        disabled={disabled || page >= totalPages}
        aria-label="Sonraki sayfa"
      >
        ›
      </button>
    </div>
  );
}