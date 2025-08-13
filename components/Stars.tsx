'use client';
  
type Variant = 'default' | 'muted' | 'mine';
type Size = 'sm' | 'md';

function Star({ filled, onClick, disabled, title, size='md', variant='default' }: { filled: boolean; onClick?: ()=>void; disabled?: boolean; title?: string; size?: Size; variant?: Variant; }) {
  const base = 'inline-flex items-center justify-center transition-transform';
  const canClick = !!onClick && !disabled;
  const btnCls = `${base} ${size==='sm' ? 'w-5 h-5' : 'w-6 h-6'} ${canClick ? 'hover:scale-110' : ''}`;
  const fillClass = filled
    ? (variant==='mine' ? 'fill-amber-400' : variant==='muted' ? 'fill-gray-300 dark:fill-gray-600' : 'fill-yellow-400')
    : 'fill-gray-300 dark:fill-gray-600';
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={btnCls} title={title} aria-pressed={filled} aria-label={title}>
      <svg viewBox="0 0 24 24" className={`${size==='sm' ? 'w-4 h-4' : 'w-5 h-5'} ${fillClass}`} aria-hidden="true">
        <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.401 8.168L12 18.897l-7.335 3.868 1.401-8.168L.132 9.21l8.2-1.192z" />
      </svg>
    </button>
  );
}

export default function Stars({
  value,
  onRate,
  readOnly = false,
  variant = 'default',
  size = 'md',
  rating,
  onRatingChange,
}: {
  value?: number;
  onRate?: (n: number) => void;
  readOnly?: boolean;
  variant?: Variant;
  size?: Size;
  rating?: number;
  onRatingChange?: (n: number) => void;
}) {
  // Support both value/onRate and rating/onRatingChange for backward compatibility
  const actualValue = typeof rating === "number" ? rating : value || 0;
  const handleRate = onRatingChange ? onRatingChange : onRate;
  const rounded = Math.round(actualValue || 0);

  if (readOnly) {
    return (
      <div className="flex">
        {[1,2,3,4,5].map(n => (
          <span key={n} className={n <= rounded ? "text-yellow-400" : "text-gray-300"}>★</span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <Star
          key={n}
          filled={n <= rounded}
          onClick={readOnly ? undefined : () => handleRate?.(n)}
          disabled={readOnly}
          title={readOnly ? undefined : `Puan: ${n}`}
          size={size}
          variant={variant}
        />
      ))}
    </div>
  );
}
