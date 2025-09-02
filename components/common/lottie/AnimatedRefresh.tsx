"use client";

import { useRef, useState, useEffect } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
// A seçeneği için import:
// import refreshAnim from "@/assets/animations/refresh.json";

type Props = {
  onClick: () => Promise<any> | any;
  className?: string;
  size?: number;
  path?: string;                // public/refresh.json gibi bir yol
  animationData?: unknown;      // import edilen JSON
};

export default function AnimatedRefresh({
  onClick,
  className = "",
  size = 16,
  path,                 // B seçeneği
  animationData,        // A seçeneği
}: Props) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [loading, setLoading] = useState(false);

  const [remoteData, setRemoteData] = useState<unknown | null>(null);

  // public yolundan JSON yükleme desteği (lottie-react 'path' prop'unu desteklemez)
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!path) return;
      try {
        const r = await fetch(path, { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (alive) setRemoteData(j);
      } catch {}
    };
    load();
    return () => {
      alive = false;
    };
  }, [path]);

  const playOnce = () => {
    // Baştan oynat, tek sefer
    lottieRef.current?.setDirection(1);
    lottieRef.current?.goToAndStop(0, true);
    lottieRef.current?.play();
  };

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    playOnce();
    try {
      await onClick();
    } finally {
      // animasyon bitince onComplete zaten stop’luyor; fallback için küçük bir gecikme:
      setTimeout(() => setLoading(false), 300);
    }
  };

  const baseClasses =
    "inline-flex items-center justify-center opacity-70 hover:opacity-100 transition";

  const anim = (animationData as object) ?? (remoteData as object) ?? null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${baseClasses} ${className}`}
      aria-label="Refresh"
      title="Yenile"
    >
      {anim ? (
        <Lottie
          lottieRef={lottieRef}
          animationData={anim}
          loop={false}
          autoplay={false}
          style={{ width: size, height: size }}
          rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
          onComplete={() => {
            lottieRef.current?.stop();
          }}
        />
      ) : (
        // Basit fallback ikon (SVG), animasyon verisi yüklenene kadar
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="opacity-60"
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}