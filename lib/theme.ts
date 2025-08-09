// lib/theme.ts
export type ThemePref = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'theme-pref';

let systemMQ: MediaQueryList | null = null;
let systemListener: ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null = null;

export function readTheme(): ThemePref {
  if (typeof window === 'undefined') return 'system';
  const v = window.localStorage.getItem(STORAGE_KEY) as ThemePref | null;
  return v ?? 'system';
}

export function applyTheme(pref: ThemePref) {
  if (typeof window === 'undefined') return;

  // sistem dinleyicisini temizle
  if (systemMQ && systemListener) {
    systemMQ.removeEventListener('change', systemListener);
    systemListener = null;
  }

  const root = document.documentElement;

  const setClass = (dark: boolean) => {
    root.classList.toggle('dark', dark);
  };

  if (pref === 'light') {
    setClass(false);
  } else if (pref === 'dark') {
    setClass(true);
  } else {
    // system
    systemMQ = window.matchMedia('(prefers-color-scheme: dark)');
    setClass(systemMQ.matches);
    systemListener = (e) => setClass(e.matches);
    systemMQ.addEventListener('change', systemListener);
  }

  window.localStorage.setItem(STORAGE_KEY, pref);
}
