'use client';
import { useEffect, useMemo, useState } from "react";

type Props = {
  onInstallClick?: () => void;   // Android için .prompt() tetiklenecek
  platform: 'android' | 'ios';
  onClose: () => void;
};

export default function A2HSToast({ onInstallClick, platform, onClose }: Props) {
  const [showSteps, setShowSteps] = useState(false);
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
              <div>Safari’de <span className="font-medium">Paylaş</span> → <span className="font-medium">Ana Ekrana Ekle</span> de.</div>
              <button
                type="button"
                onClick={() => setShowSteps((s) => !s)}
                className="mt-2 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                aria-expanded={showSteps}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Adım adım
              </button>
              {showSteps && (
                <div className="a2hs-accordion a2hs-accordion-enter a2hs-accordion-enter-active">
                  <ol className="mt-2 space-y-1.5 text-[13px]">
                    <li className="flex items-start gap-2">
                      <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px]">1</span>
                      <span className="inline-flex items-center gap-2">
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          {/* iOS Share icon (square with up-arrow) */}
                          <path d="M12 3v10" />
                          <path d="M8.5 6.5L12 3l3.5 3.5" className="a2hs-share-arrow" />
                          <rect x="5" y="10" width="14" height="11" rx="2" />
                        </svg>
                        Alttaki <span className="font-medium">Paylaş</span> simgesine dokun.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px]">2</span>
                      <span className="inline-flex items-center gap-2">
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          {/* Plus in rounded square icon */}
                          <rect x="4" y="4" width="16" height="16" rx="3" />
                          <path d="M12 8v8M8 12h8" className="a2hs-plus" />
                        </svg>
                        Listeyi aşağı kaydırıp <span className="font-medium">Ana Ekrana Ekle</span>’ye dokun.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px]">3</span>
                      <span className="inline-flex items-center gap-2">
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          {/* Check icon */}
                          <path d="M20 6L9 17l-5-5" className="a2hs-check" />
                        </svg>
                        İsim onayla, <span className="font-medium">Ekle</span> de.
                      </span>
                    </li>
                  </ol>
                </div>
              )}
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
        @keyframes a2hs-draw {
          0% { stroke-dasharray: 0 100; }
          100% { stroke-dasharray: 100 0; }
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
          stroke-dasharray: 100 0;
          animation: a2hs-draw 700ms ease forwards;
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