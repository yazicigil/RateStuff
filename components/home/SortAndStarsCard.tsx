// components/SortAndStarsCard.tsx
'use client';
import { memo } from 'react';

type Props = {
  order: 'new' | 'top';
  onOrder: (o: 'new' | 'top') => void;
  starBuckets: Set<number>;
  onToggleStar: (n: number) => void;
  onClearStars: () => void;
  compact?: boolean;
  className?: string;
};

function SortAndStarsCardImpl({
  order,
  onOrder,
  starBuckets,
  onToggleStar,
  onClearStars,
  compact = false,
  className = '',
}: Props) {
  const baseCard =
    'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3';
  const btnBase =
    'rounded-full px-3 py-1.5 text-sm transition-colors';
  const btnActive =
    'bg-gray-900 text-white border border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white shadow';
  const btnIdle =
    'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800';

  const starBaseIdle =
    'rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-[0_0_0_2px_rgba(250,204,21,0.3)] px-3 py-1.5 text-sm flex items-center gap-1 transition-colors';
  const starBaseActive =
    'rounded-full bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-100 hover:shadow-[0_0_0_2px_rgba(250,204,21,0.3)] px-3 py-1.5 text-sm flex items-center gap-1 transition-colors';

  return (
    <div className={`${baseCard} ${className}`}>
      {/* Sıralama */}
      <div>
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">Sıralama</div>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            className={`${btnBase} ${order === 'new' ? btnActive : btnIdle} ${compact ? '' : ''}`}
            onClick={() => onOrder('new')}
            aria-pressed={order === 'new'}
          >
            En yeni
          </button>
          <button
            type="button"
            className={`${btnBase} ${order === 'top' ? btnActive : btnIdle} ${compact ? '' : ''}`}
            onClick={() => onOrder('top')}
            aria-pressed={order === 'top'}
          >
            En yüksek puan
          </button>
        </div>
      </div>

      {/* Yıldızlar */}
      <div className="border-t border-gray-200 dark:border-gray-800 pt-3">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">Yıldızlar</div>
        <div className="flex flex-wrap gap-2 mt-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = starBuckets.has(n);
            return (
              <button
                key={`s-${compact ? 'm' : 'd'}-${n}`}
                type="button"
                className={active ? starBaseActive : starBaseIdle}
                onClick={() => onToggleStar(n)}
                aria-pressed={active}
                title={`${n} yıldız`}
              >
                {n} <span aria-hidden>★</span>
              </button>
            );
          })}
          {starBuckets.size > 0 && (
            <button
              type="button"
              className="ml-1 rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-[0_0_0_2px_rgba(250,204,21,0.3)] px-3 py-1.5 text-sm flex items-center gap-1 transition-colors"
              onClick={onClearStars}
              title="Filtreyi temizle"
            >
              Temizle
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const SortAndStarsCard = memo(SortAndStarsCardImpl);
export default SortAndStarsCard;