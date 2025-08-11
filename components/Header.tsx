'use client';

import { signIn, signOut } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { applyTheme, readTheme, type ThemePref } from '@/lib/theme';

type Me = { id: string; name: string | null; avatarUrl?: string | null };

type Controls = {
  q: string;
  onQ: (v: string) => void;
  order: 'new' | 'top';
  onOrder: (v: 'new' | 'top') => void;
};

const USE_CURRENTCOLOR = true; // logo.svg tek renk + currentColor ise true, çok renkliyse false

export default function Header({ controls }: { controls?: Controls }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<ThemePref>('system');

  async function refetchMe() {
    try {
      const r = await fetch('/api/me', { cache: 'no-store' });
      if (!r.ok) { setMe(null); return; }
      const j = await r.json();
      setMe(j?.me ?? null);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refetchMe(); }, []);
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') refetchMe(); };
    window.addEventListener('visibilitychange', onVis);
    return () => window.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    const initial = readTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);
  function changeTheme(next: ThemePref) {
    setTheme(next);
    applyTheme(next);
  }

  // Mobil: üst satırda logo + tema + giriş; alt satırda arama + sıralama
  // Desktop: tek satır
  const logoClass = USE_CURRENTCOLOR
    ? 'h-10 w-auto text-gray-900 dark:text-gray-100'
    : 'h-10 w-auto dark:invert';

  return (
    <header className="sticky top-0 z-40 backdrop-blur border-b bg-white/80 dark:bg-gray-900/70 dark:border-gray-800">
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
        {/* SOL: Logo */}
        <div className="flex items-center justify-between md:justify-start gap-3">
          <Link href="/" className="shrink-0" title="Anasayfa">
            {/* Tek renk + currentColor ise <img> yerine <span> ile color veriyoruz */}
            {USE_CURRENTCOLOR ? (
              <span className={logoClass}>
                {/* inline <img> de olur; currentColor için CSS color devreye girer */}
                <img src="/logo.svg" alt="RateStuff" className="h-7 w-auto" />
              </span>
            ) : (
              <img src="/logo.svg" alt="RateStuff" className={logoClass} />
            )}
          </Link>

          {/* Mobil: sağa temas + auth kısayolları */}
          <div className="flex items-center gap-2 md:hidden">
            <select
              value={theme}
              onChange={(e) => changeTheme(e.target.value as ThemePref)}
              title="Tema"
              className="border rounded-xl px-2 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            >
              <option value="light">🌞 Light</option>
              <option value="dark">🌙 Dark</option>
              <option value="system">🖥️ Auto</option>
            </select>

            {!loading && !me && (
              <button
                onClick={() => signIn('google', { callbackUrl: '/' })}
                className="px-3 py-2 rounded-xl border text-sm dark:border-gray-700 flex items-center gap-2"
                title="Google ile giriş"
                type="button"
              >
                {/* Google logosu */}
                <svg width="16" height="16" viewBox="0 0 256 262" aria-hidden="true">
                  <path fill="#4285F4" d="M255.9 133.5c0-10.4-.9-18-2.9-25.9H130v46.9h71.9c-1.5 11.7-9.6 29.3-27.5 41.1l-.3 2.2 40 31 2.8.3c25.7-23.7 40.5-58.6 40.5-96.6z"/>
                  <path fill="#34A853" d="M130 261.1c36.6 0 67.3-12.1 89.8-32.9l-42.8-33.2c-11.5 8-26.9 13.6-47 13.6-35.9 0-66.4-23.7-77.3-56.6l-2 .2-41.9 32.5-.5 2c22.4 44.6 68.5 74.4 121.7 74.4z"/>
                  <path fill="#FBBC05" d="M52.7 151.9c-2.9-8.8-4.6-18.2-4.6-27.9s1.7-19.1 4.6-27.9l-.1-2.1L10.1 60.9l-1.9.9C3 74.2 0 89.4 0 104c0 14.6 3 29.8 8.2 42.2l44.5-34.3z"/>
                  <path fill="#EA4335" d="M130 50.5c25.5 0 42.7 11 52.5 20.3l38.3-37.3C197.1 12.3 166.6 0 130 0 76.8 0 30.7 29.8 8.2 74.5l44.4 34.3C63.6 75.9 94.1 50.5 130 50.5z"/>
                </svg>
                Giriş
              </button>
            )}

            {me && (
              <>
                <Link
                  href="/me"
                  className="flex items-center gap-2 px-2 py-1 rounded-xl border text-sm dark:border-gray-700"
                  title="Profilim"
                >
                  {me.avatarUrl ? (
                    <img src={me.avatarUrl} alt="me" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-200 grid place-items-center text-xs text-gray-700">
                      {(me.name ?? 'U')[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:block">{me.name ?? 'Ben'}</span>
                </Link>

                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="px-3 py-2 rounded-xl border text-sm dark:border-gray-700"
                  title="Çıkış yap"
                  type="button"
                >
                  Çıkış
                </button>
              </>
            )}
          </div>
        </div>

        {/* Desktop arama + sıralama */}
        {controls && (
          <div className="hidden md:flex mx-auto items-center gap-2 w-full max-w-xl">
            <div className="relative flex-1">
              <input
                value={controls.q}
                onChange={(e) => controls.onQ(e.target.value)}
                placeholder="ara ( / )"
                className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
              />
              {controls.q && (
                <button
                  type="button"
                  onClick={() => controls.onQ('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  aria-label="Temizle"
                >
                  ×
                </button>
              )}
            </div>
            <select
              value={controls.order}
              onChange={(e) => controls.onOrder(e.target.value as 'new' | 'top')}
              className="border rounded-xl px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            >
              <option value="new">En yeni</option>
              <option value="top">En çok oy</option>
            </select>
          </div>
        )}

        {/* Desktop sağ: tema + auth */}
        <nav className="hidden md:flex ml-auto items-center gap-2">
          <select
            value={theme}
            onChange={(e) => changeTheme(e.target.value as ThemePref)}
            title="Tema"
            className="border rounded-xl px-2 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
          >
            <option value="light">🌞 Light</option>
            <option value="dark">🌙 Dark</option>
            <option value="system">🖥️ Auto</option>
          </select>

          {!loading && !me && (
            <button
              onClick={() => signIn('google', { callbackUrl: '/' })}
              className="px-3 py-2 rounded-xl border text-sm dark:border-gray-700 flex items-center gap-2"
              title="Google ile giriş"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 256 262" aria-hidden="true">
                <path fill="#4285F4" d="M255.9 133.5c0-10.4-.9-18-2.9-25.9H130v46.9h71.9c-1.5 11.7-9.6 29.3-27.5 41.1l-.3 2.2 40 31 2.8.3c25.7-23.7 40.5-58.6 40.5-96.6z"/>
                <path fill="#34A853" d="M130 261.1c36.6 0 67.3-12.1 89.8-32.9l-42.8-33.2c-11.5 8-26.9 13.6-47 13.6-35.9 0-66.4-23.7-77.3-56.6l-2 .2-41.9 32.5-.5 2c22.4 44.6 68.5 74.4 121.7 74.4z"/>
                <path fill="#FBBC05" d="M52.7 151.9c-2.9-8.8-4.6-18.2-4.6-27.9s1.7-19.1 4.6-27.9l-.1-2.1L10.1 60.9l-1.9.9C3 74.2 0 89.4 0 104c0 14.6 3 29.8 8.2 42.2l44.5-34.3z"/>
                <path fill="#EA4335" d="M130 50.5c25.5 0 42.7 11 52.5 20.3l38.3-37.3C197.1 12.3 166.6 0 130 0 76.8 0 30.7 29.8 8.2 74.5l44.4 34.3C63.6 75.9 94.1 50.5 130 50.5z"/>
              </svg>
              Google ile giriş
            </button>
          )}

          {me && (
            <>
              <Link
                href="/me"
                className="flex items-center gap-2 px-2 py-1 rounded-xl border text-sm dark:border-gray-700"
                title="Profilim"
              >
                {me.avatarUrl ? (
                  <img src={me.avatarUrl} alt="me" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-200 grid place-items-center text-xs text-gray-700">
                    {(me.name ?? 'U')[0]?.toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:block">{me.name ?? 'Ben'}</span>
              </Link>

              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="px-3 py-2 rounded-xl border text-sm dark:border-gray-700"
                title="Çıkış yap"
                type="button"
              >
                Çıkış
              </button>
            </>
          )}
        </nav>

        {/* Mobil: alt sıra (arama + sıralama) */}
        {controls && (
          <div className="md:hidden flex items-center gap-2">
            <div className="relative flex-1">
              <input
                value={controls.q}
                onChange={(e) => controls.onQ(e.target.value)}
                placeholder="ara ( / )"
                className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
              />
              {controls.q && (
                <button
                  type="button"
                  onClick={() => controls.onQ('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  aria-label="Temizle"
                >
                  ×
                </button>
              )}
            </div>
            <select
              value={controls.order}
              onChange={(e) => controls.onOrder(e.target.value as 'new' | 'top')}
              className="border rounded-xl px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            >
              <option value="new">En yeni</option>
              <option value="top">En çok oy</option>
            </select>
          </div>
        )}
      </div>
    </header>
  );
}
