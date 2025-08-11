'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { applyTheme, readTheme, type ThemePref } from '@/lib/theme';

type Controls = {
  q: string;
  onQ: (v: string) => void;
  order: 'new' | 'top';
  onOrder: (v: 'new' | 'top') => void;
};

export default function Header({ controls }: { controls?: Controls }) {
  const { data: session, status } = useSession(); // ← buradan takip
  const me = session?.user as ( { id?: string; name?: string|null; email?: string|null; avatarUrl?: string|null } | undefined );
  const loading = status === 'loading';

  const [theme, setTheme] = useState<ThemePref>('system');
  const searchRef = useRef<HTMLInputElement>(null);

  // Tema
  useEffect(() => { const t = readTheme(); setTheme(t); applyTheme(t); }, []);
  function changeTheme(next: ThemePref) { setTheme(next); applyTheme(next); }

  // "/" kısayolu aramaya odak; Esc temizle
  useEffect(() => {
    if (!controls) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && (document.activeElement as HTMLElement | null)?.tagName !== 'INPUT') {
        e.preventDefault(); searchRef.current?.focus();
      }
      if (e.key === 'Escape' && controls.q) controls.onQ('');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [controls?.q]);

  return (
    <header className="sticky top-0 z-40 backdrop-blur border-b bg-white/80 dark:bg-gray-900/70 dark:border-gray-800">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-xl font-bold">RateStuff</Link>

        {controls && (
          <div className="mx-auto flex items-center gap-2 w-full max-w-xl">
            <div className="relative flex-1">
              <input
                ref={searchRef}
                value={controls.q}
                onChange={(e) => controls.onQ(e.target.value)}
                placeholder="ara ( / )"
                aria-label="Ara"
                className="w-full border rounded-xl pl-3 pr-8 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
              />
              {controls.q && (
                <button
                  type="button"
                  onClick={() => controls.onQ('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                  aria-label="Temizle"
                  title="Temizle"
                >
                  ×
                </button>
              )}
            </div>
            <select
              value={controls.order}
              onChange={(e) => controls.onOrder(e.target.value as 'new' | 'top')}
              className="border rounded-xl px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              aria-label="Sırala"
            >
              <option value="new">En yeni</option>
              <option value="top">En çok oy</option>
            </select>
          </div>
        )}

        <nav className="ml-auto flex items-center gap-2">
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
      </div>
    </header>
  );
}
