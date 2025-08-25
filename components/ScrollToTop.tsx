// components/ScrollToTop.tsx
"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [vvOffset, setVvOffset] = useState(0); // iOS alt bar için ek offset

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });

    // iOS klavye ve alt bar için visualViewport dinle
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    const onViewport = () => {
      if (!vv) return;
      // klavye açık mı?
      setKeyboardOpen(vv.height < window.innerHeight * 0.8);
      // Dinamik alt bar/URL bar farkı kadar yukarı al
      const extra = Math.max(0, (window.innerHeight - vv.height - vv.offsetTop) || 0);
      setVvOffset(extra);
    };
    vv?.addEventListener("resize", onViewport);
    vv?.addEventListener("scroll", onViewport);
    onViewport(); // ilk değer

    return () => {
      window.removeEventListener("scroll", onScroll);
      vv?.removeEventListener("resize", onViewport);
      vv?.removeEventListener("scroll", onViewport);
    };
  }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  if (!mounted || !visible || keyboardOpen) return null;

  const btn = (
    <button
      type="button"
      onClick={scrollTop}
      aria-label="Yukarı dön"
      className="fixed z-[60] w-12 h-12 grid place-items-center rounded-full shadow-lg bg-violet-600 text-white hover:bg-violet-700 active:scale-95 transition pointer-events-auto"
      // iOS Safari alt bar + safe-area için dinamik konum
      style={{
        right: `calc(env(safe-area-inset-right, 0px) + 16px)`,
        bottom: `calc(env(safe-area-inset-bottom, 0px) + ${16 + vvOffset}px)`,
      }}
    >
      {/* inline chevron-up */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
      >
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  );

  // Portala koy ki olası overflow/transform kapsayıcıları etkilemesin
  return createPortal(btn, document.body);
}