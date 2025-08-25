// components/ScrollToTop.tsx
"use client";
import { useEffect, useState } from "react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);

    // iOS klavye açılınca butonu gizle
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    const onViewport = () => {
      if (!vv) return;
      // yüksekliğin ciddi düşmesi = klavye açık
      setKeyboardOpen(vv.height < window.innerHeight * 0.8);
    };
    vv?.addEventListener("resize", onViewport);
    vv?.addEventListener("scroll", onViewport);

    return () => {
      window.removeEventListener("scroll", onScroll);
      vv?.removeEventListener("resize", onViewport);
      vv?.removeEventListener("scroll", onViewport);
    };
  }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  if (!visible || keyboardOpen) return null;

  return (
    <button
      onClick={scrollTop}
      aria-label="Yukarı dön"
      className="
        fixed z-50
        p-3 rounded-full shadow-lg
        bg-violet-600 text-white
        hover:bg-violet-700 active:scale-95
        transition
        pointer-events-auto
      "
      // iOS Safari alt barına çarpmaması için safe-area
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        right: "calc(env(safe-area-inset-right, 0px) + 16px)",
      }}
    >
      {/* inline chevron-up */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" strokeWidth={2}
           strokeLinecap="round" strokeLinejoin="round"
           className="w-5 h-5">
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  );
}