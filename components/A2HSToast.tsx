'use client';
import { useEffect, useMemo, useState } from "react";

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
            <div className="opacity-80">Safari’de <span className="font-medium">Paylaş</span> → <span className="font-medium">Ana Ekrana Ekle</span> de.</div>
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
    </div>
  );
}