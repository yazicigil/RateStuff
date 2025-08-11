'use client';

type Props = {
  label: string;
  active?: boolean;
  onClick?: (t: string) => void;
  onDoubleClick?: (t: string) => void;
  /**
   * Extra Tailwind (or any) classes to customize styling from the caller.
   * Appended last so it can override the defaults.
   */
  className?: string;
};

export default function Tag({ label, active, onClick, onDoubleClick, className }: Props) {
  const base = 'px-2 py-1 rounded-full text-sm border transition-colors';
  const normal = 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700';
  const activeCls = 'bg-black text-white border-black';

  return (
    <button
      type="button"
      onClick={() => onClick?.(label)}
      onDoubleClick={() => onDoubleClick?.(label)}
      className={[base, active ? activeCls : normal, className].filter(Boolean).join(' ')}
      title={`#${label}`}
      aria-pressed={!!active}
    >
      #{label}
    </button>
  );
}
