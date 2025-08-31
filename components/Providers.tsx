'use client';
  
import { SessionProvider } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';
  
// --- A2HS helpers (inline to avoid new files) ---
const DISMISS_KEY = 'a2hs:lastDismissedAt';
  
function isStandalone() {
  // PWA display-mode or iOS standalone
  // @ts-ignore
  return window.matchMedia?.('(display-mode: standalone)')?.matches || (window.navigator as any).standalone === true;
}
function isiOS() {
  const ua = window.navigator.userAgent || '';
  // iPadOS 13+ pretends to be Mac; check touch points
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
}
function cooledDown(days = 7) {
  try {
    const t = localStorage.getItem(DISMISS_KEY);
    if (!t) return true;
    const last = Number(t);
    return Date.now() - last > days * 24 * 60 * 60 * 1000;
  } catch { return true; }
}
  
export default function Providers({ children }: { children: React.ReactNode }) {
  const [showA2HS, setShowA2HS] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | null>(null);
  const deferredPromptRef = useRef<any>(null);
  
  const closeA2HS = useCallback(() => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setShowA2HS(false);
  }, []);
  
  const promptInstall = useCallback(async () => {
    const e = deferredPromptRef.current;
    if (!e) return;
    e.prompt();
    try { await e.userChoice; } catch {}
    deferredPromptRef.current = null;
    closeA2HS();
  }, [closeA2HS]);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone()) return;           // already installed
    if (!cooledDown(7)) return;           // recently dismissed
  
    // ANDROID (Chrome) path: use beforeinstallprompt
    const onBIP = (e: any) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setPlatform('android');
      setShowA2HS(true);
    };
    window.addEventListener('beforeinstallprompt', onBIP as any);
  
    // iOS (Safari) path: no event; show gentle hint after a small delay
    let iosTimer: any = null;
    if (isiOS()) {
      iosTimer = setTimeout(() => {
        setPlatform('ios');
        setShowA2HS(true);
      }, 1800);
    }
  
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP as any);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);
  
  return (
    <SessionProvider>
      {children}
      {showA2HS && platform && (
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
                  <button onClick={promptInstall} className="px-3 py-1.5 rounded-lg border text-sm">
                    Ekle
                  </button>
                )}
                <button onClick={closeA2HS} className="px-3 py-1.5 rounded-lg text-sm opacity-80 hover:opacity-100">
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SessionProvider>
  );
}
