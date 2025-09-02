'use client';
  
import { SessionProvider } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import A2HSToast from "@/components/common/A2HSToast";
  
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
function isMobile() {
  const ua = window.navigator.userAgent || '';
  return /Mobi|Android|iPhone|iPad|iPod/.test(ua);
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
    if (!isMobile()) return;
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
        <A2HSToast
          platform={platform}
          onInstallClick={platform === 'android' ? promptInstall : undefined}
          onClose={closeA2HS}
        />
      )}
    </SessionProvider>
  );
}
