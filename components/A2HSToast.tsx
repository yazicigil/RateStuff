'use client';
import { useEffect, useMemo } from "react";

type Props = {
  onInstallClick?: () => void;   // Android için .prompt() tetiklenecek
  platform: 'android' | 'ios';
  onClose: () => void;
};

export default function A2HSToast({ onInstallClick, platform, onClose }: Props) {
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-[1000] max-w-[560px] w-[calc(100%-1.5rem)]">
      <div className="rounded-2xl border bg-white/85 dark:bg-zinc-900/85 backdrop-blur p-3 shadow-lg flex items-start gap-3">
        <div className="shrink-0 w-6 h-6 rounded-md overflow-hidden">
          <img src="/android-chrome-192x192.png" alt="app" className="w-full h-full object-cover" />
        </div>
        <div className="text-sm leading-5">
          <div className="font-medium">RateStuff’u ana ekrana ekle</div>
          {platform === 'android' ? (
            <div className="opacity-80">Hızlı erişim için uygulama gibi kullan.</div>
          ) : (
            <div className="opacity-90">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="opacity-90">Daha iyi bir deneyim için ana ekrana ekle:</span>
                {/* Share icon */}
                <span className="inline-flex items-center gap-1">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3v10" />
                    <path d="M8.5 6.5L12 3l3.5 3.5" className="a2hs-share-arrow" />
                    <rect x="5" y="10" width="14" height="11" rx="2" />
                  </svg>
                  <span className="font-medium">Paylaş</span>
                </span>
                <span>→</span>
                {/* Add to Home icon */}
                <span className="inline-flex items-center gap-1">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="4" y="4" width="16" height="16" rx="3" />
                    <path d="M12 8v8M8 12h8" className="a2hs-plus" />
                  </svg>
                  <span className="font-medium">Ana Ekrana Ekle</span>
                </span>
                <span>→</span>
                {/* Confirm icon */}
                <span className="inline-flex items-center gap-1">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5" className="a2hs-check" />
                  </svg>
                  <span className="font-medium">Onayla</span>
                </span>
              </div>
            </div>
          )}
          <div className="mt-2 flex gap-2">
            {platform === 'android' && (
              <button onClick={onInstallClick} className="px-3 py-1.5 rounded-lg border text-sm">
                Ekle
              </button>
            )}
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm opacity-80 hover:opacity-100">
              Kapat
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes a2hs-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes a2hs-pulse {
          0% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1); opacity: 0.9; }
        }
        @keyframes a2hs-draw-loop {
          0% { stroke-dasharray: 0 100; }
          50% { stroke-dasharray: 100 0; }
          100% { stroke-dasharray: 0 100; }
        }
        .a2hs-share-arrow {
          animation: a2hs-bounce 1.4s ease-in-out infinite;
          transform-origin: center;
        }
        .a2hs-plus {
          animation: a2hs-pulse 1.6s ease-in-out infinite;
          transform-origin: center;
        }
        .a2hs-check {
          animation: a2hs-draw-loop 1200ms ease-in-out infinite;
        }
        .a2hs-accordion {
          transition: opacity 220ms ease, transform 220ms ease;
        }
        .a2hs-accordion-enter {
          opacity: 0;
          transform: translateY(-4px);
        }
        .a2hs-accordion-enter-active {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}