"use client";

import Link from "next/link";
import { useState } from "react";
import AnimatedLab from "@/components/common/AnimatedLab";

/**
 * Header'da Bildirim Laboratuvarı toggle butonu.
 * - Hover'da animasyon oynar
 * - Lab açıkken (showingLab=true) mor "filled" görünüm alır ve animasyon oynar
 */
export default function LabHeaderButton({
  showingLab,
  toggleHref,
}: {
  showingLab: boolean;
  toggleHref: string;
}) {
  const [hover, setHover] = useState(false);
  const active = showingLab;

  return (
    <Link
      href={toggleHref}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-pressed={active}
      className={[
        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition border",
        active
          ? "bg-purple-600 text-white border-purple-600 hover:bg-purple-600"
          : "text-purple-700 border-purple-300 hover:bg-purple-50 dark:text-purple-300 dark:border-purple-500/40 dark:hover:bg-purple-900/20",
      ].join(" ")}
    >
      <AnimatedLab playing={hover || active} white={active} />
      <span className="hidden sm:inline">Bildirim Laboratuvarı</span>
    </Link>
  );
}