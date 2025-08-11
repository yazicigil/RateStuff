'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signIn, signOut } from 'next-auth/react';
import { applyTheme, readTheme, type ThemePref } from '@/lib/theme';

type Me = { id: string; name: string | null; avatarUrl?: string | null };
type Controls = {
  q: string;
  onQ: (v: string) => void;
  order: 'new' | 'top';
  onOrder: (v: 'new' | 'top') => void;
};

export default function Header({ controls }: { controls?: Controls }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<ThemePref>('system');

  async function refetchMe() {
    try {
      const r = await fetch('/api/me', { cache: 'no-store' });
      if (!r.ok) { setMe(null); return; }
      const j = await r.json().catch(() => null);
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

  return (
    <header className="sticky top-0 z-40 backdrop-blur border-b bg-white/80 dark:bg-gray-900/70 dark:border-gray-800">
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        
        {/* Logo */}
        <Link href="/" className="text-xl font-bold whitespace-nowrap">RateStuff</Link>

        {/* Arama ve Sıralama */}
        {controls && (
          <div className="flex flex-col gap-2 flex-1 md:flex-row md:items-center">
            <div className="relative flex-1">
              <input
                value={controls.q}
                onChange={(e) => controls.onQ(e.target.value)}
                placeholder="ara ( / )"
                className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
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
              className="border rounded-xl px-3 py-2 text-sm md:w-40 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            >
              <option value="new">En yeni</option>
              <option value="top">En çok oy</option>
            </select>
          </div>
        )}

        {/* Sağdaki Butonlar */}
        <nav className="flex items-center gap-2 md:ml-auto">
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
              onClick={() => signIn('google', { callbackUrl: '/', prompt: 'select_account' })}
              className="px-3 py-2 rounded-xl border text-sm dark:border-gray-700 flex items-center gap-2"
            >
              Google ile giriş
            </button>
          )}

          {me && (
            <>
              <Link
                href="/me"
                className="flex items-center gap-2 px-2 py-1 rounded-xl border text-sm dark:border-gray-700"
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
