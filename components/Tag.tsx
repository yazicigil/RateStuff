'use client';
export default function Tag({
  label,
  active,
  onClick,
  onDoubleClick,
}: {
  label: string;
  active?: boolean;
  onClick?: (t: string) => void;
  onDoubleClick?: (t: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(label)}
      onDoubleClick={() => onDoubleClick?.(label)}
      className={`px-2 py-1 rounded-full text-sm border transition-colors ${
        active
          ? 'bg-black text-white border-black'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700'
      }`}
      title={`#${label}`}
      aria-pressed={!!active}
    >
      #{label}
    </button>
  );
}
