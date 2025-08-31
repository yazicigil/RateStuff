'use client';
import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "a2hs:lastDismissedAt";

function isStandalone() {
  // PWA’da veya iOS’da standalone modda mıyız?
  // @ts-ignore
  return window.matchMedia?.('(display-mode: standalone)')?.matches || (window.navigator as any).standalone === true;
}

function isiOS() {
  const ua = window.navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
}

function isAndroid() {
  const ua = window.navigator.userAgent || '';
  return /Android/.test(ua);
}

function cooledDown(days = 7) {
  try {
    const t = localStorage.getItem(KEY);
    if (!t) return true;
    const last = Number(t);
    const diff = Date.now() - last;
    return diff > days * 24 * 60 * 60 * 1000;
  } catch { return true; }
}

export function useAddToHomeScreen() {
  const deferredPromptRef = useRef<any>(null);
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<'android'|'ios'|null>(null);

  const close = useCallback(() => {
    try { localStorage.setItem(KEY, String(Date.now())); } catch {}
    setShow(false);
  }, []);

  const promptInstall = useCallback(async () => {
    const e = deferredPromptRef.current;
    if (!e) return;
    e.prompt();
    const choice = await e.userChoice.catch(() => null);
    deferredPromptRef.current = null;
    close(); // kabul etse de etmese de kapat
  }, [close]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone()) return;        // zaten ekli
    if (!cooledDown(7)) return;        // yakın zamanda kapatılmış

    // Android (Chrome) yolu
    const onBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setPlatform('android');
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as any);

    // iOS (Safari) — event yok, uygun koşullarda nazikçe göster
    // Safari + iOS + not standalone + cooldown uygunsa ~2sn sonra göster
    let iosTimer: any = null;
    if (isiOS()) {
      iosTimer = setTimeout(() => {
        setPlatform('ios');
        setShow(true);
      }, 2000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as any);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  return { show, platform, promptInstall, close };
}