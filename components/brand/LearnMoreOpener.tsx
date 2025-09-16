// components/brand/LearnMoreOpener.tsx
"use client";
import { useState } from "react";
import LearnMore from "./LearnMore";

export default function LearnMoreOpener() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full px-5 py-2.5 text-sm font-medium border border-violet-500 text-violet-700 hover:bg-violet-500/10 dark:border-violet-400 dark:text-violet-300 dark:hover:bg-violet-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 transition"
      >
        Bilgi al
      </button>
      <LearnMore open={open} onClose={() => setOpen(false)} />
    </>
  );
}