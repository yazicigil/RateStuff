'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { applyTheme, readTheme, type ThemePref } from '@/lib/theme';

type Me = { id: string; name: string | null; avatarUrl?: string | null };

// Arama & sıralama kontrolü (page.tsx gönderiyor)
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

  // me
  useEffect(() => {
    let ok = true;
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (ok) setMe(j?.me ?? null); })
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, []);

  // theme
  useEffect(() => {
    const initial = readTheme();
    setTheme(initial);
    // SSR sonrasında ilk render’da uygula
    applyTheme(initial);
  }, []);

  function changeTheme(next: ThemePref) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <header className="sticky top-0 z-40 backdrop-blur border-b bg-white/80 dark:bg-gray-900/70 dark:border-gray-800">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-xl font-bold">RateStuff</Link>

        {/* Orta kısım: arama + sıralama (sadece ana sayfa gönderiyorsa) */}
        {controls && (
          <div className="mx-auto flex items-center gap-2 w-full max-w-xl">
            <div className="relative flex-1">
              <input
                value={controls.q}
                onChange={(e) => controls.onQ(e.target.value)}
                placeholder="ara ( / )"
                className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
              />
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

        {/* Sağ taraf: tema + profil */}
        <nav className="ml-auto flex items-center gap-2">
          {/* Tema seçici */}
          <select
            value={theme}
            onChange={(e) => changeTheme(e.target.value as ThemePref)}
            title="Tema"
            className="border rounded-xl px-2 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">Auto</option>
          </select>

          {!loading && !me && (
            <Link
              href="/api/auth/signin?callbackUrl=/"
              className="px-3 py-2 rounded-xl border text-sm dark:border-gray-700"
            >
              Google ile giriş
            </Link>
          )}

          {me && (
            <>
              <Link
                href="/profile"
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

              <Link
                href="/api/auth/signout?callbackUrl=/"
                className="px-3 py-2 rounded-xl border text-sm dark:border-gray-700"
                title="Çıkış yap"
              >
                Çıkış
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
