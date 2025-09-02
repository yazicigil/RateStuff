// components/AdCard.tsx
"use client";

import { useEffect, useRef } from "react";

type AdCardProps = {
  slot: string;              // data-ad-slot (ör: "1234567890")
  className?: string;        // grid kartıyla uyumlu wrapper
  label?: string;            // "Reklam" rozeti
  style?: React.CSSProperties;// isteğe göre minHeight, vb.
};

export default function AdCard({ slot, className = "", label = "Reklam", style }: AdCardProps) {
  const pushedRef = useRef(false);

  useEffect(() => {
    // window.adsbygoogle mevcutsa yalnızca bir kez push et
    try {
      const w = window as any;
      if (!pushedRef.current && w.adsbygoogle && Array.isArray(w.adsbygoogle)) {
        w.adsbygoogle.push({});
        pushedRef.current = true;
      }
    } catch {
      // no-op
    }
  }, []);

  return (
    <div
      className={`relative border rounded-lg bg-gray-50 dark:bg-gray-900 p-3 flex flex-col ${className}`}
      style={{ minHeight: 180, ...style }}
    >
      <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </span>

      {/* AdSense ins */}
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
