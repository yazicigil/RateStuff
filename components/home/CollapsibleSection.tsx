'use client';
import { useState, type ReactNode } from 'react';

type Props = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;        // ✅ dış <details> için
  summaryClassName?: string; // ✅ başlık satırı için
};

export default function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
  className = '',
  summaryClassName = '',
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className={`rounded-2xl border dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm ${className}`}
    >
      <summary className={`cursor-pointer select-none px-4 py-3 text-base font-semibold list-none flex items-center justify-between ${summaryClassName}`}>
        <span>{title}</span>
        <span className="text-sm opacity-60">{open ? '−' : '+'}</span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}
