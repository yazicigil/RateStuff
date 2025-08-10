'use client';

import { useState } from 'react';

export default function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl border p-0 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3"
        aria-expanded={open}
      >
        <h3 className="text-lg">{title}</h3>
        <span className="text-sm opacity-70">{open ? '−' : '+'}</span>
      </button>

      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}
