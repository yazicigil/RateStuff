'use client';
import React from 'react';

type Props = {
  /** Ortalama (ana sayfadaki mantıkla: avgRating ?? avg) */
  avg?: number | null;
  /** Toplam oy adedi */
  count?: number;
  /** Ek tailwind vb. sınıflar */
  className?: string;
};

export default function RatingPill({ avg, count = 0, className }: Props) {
  const hasAvg = typeof avg === 'number' && Number.isFinite(avg);
  const v = hasAvg ? (avg as number) : null;

  return (
    <span
      className={[
        'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full',
        'border bg-white dark:bg-gray-800 dark:border-gray-700 shrink-0',
        className || ''
      ].join(' ')}
      title={
        hasAvg
          ? `${v!.toFixed(2)} / 5 • ${count} oy`
          : `Henüz oy yok`
      }
      aria-label={
        hasAvg
          ? `Ortalama ${v!.toFixed(2)} / 5, ${count} oy`
          : `Henüz oy yok`
      }
    >
      <span aria-hidden="true">★</span>
      <span className="tabular-nums">{v !== null ? v.toFixed(2) : '—'}</span>
      <span className="opacity-60 tabular-nums">({count})</span>
    </span>
  );
}