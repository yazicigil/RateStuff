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

  const wrapCls = `flex items-center justify-center gap-3 mt-6 select-none ${className}`;
  const dotBase = "inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-full text-sm transition";
  const dotActive = "bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-100";
  const dotIdle = "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800";
  const arrowBtn = "inline-flex items-center justify-center h-8 w-8 rounded-full text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div
      className={wrapCls}
      role="navigation"
      aria-label="Sayfalandırma"
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        className={arrowBtn}
        onClick={() => go(1)}
        disabled={disabled || page <= 1}
        aria-label="İlk sayfa"
        title="İlk sayfa"
      >
        «
      </button>
      <button
        type="button"
        className={arrowBtn}
        onClick={() => go(page - 1)}
        disabled={disabled || page <= 1}
        aria-label="Önceki sayfa"
        title="Önceki sayfa"
      >
        ‹
      </button>

      {model.map((it, i) =>
        it === '…' ? (
          <span key={`e-${i}`} className="px-1.5 text-sm text-gray-500 dark:text-gray-400 select-none">…</span>
        ) : (
          <button
            key={`p-${it}`}
            type="button"
            className={`${dotBase} ${it === page ? dotActive : dotIdle}`}
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
        className={arrowBtn}
        onClick={() => go(page + 1)}
        disabled={disabled || page >= totalPages}
        aria-label="Sonraki sayfa"
        title="Sonraki sayfa"
      >
        ›
      </button>
      <button
        type="button"
        className={arrowBtn}
        onClick={() => go(totalPages)}
        disabled={disabled || page >= totalPages}
        aria-label="Son sayfa"
        title="Son sayfa"
      >
        »
      </button>
    </div>
  );
}