'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signIn, signOut } from 'next-auth/react';
import { applyTheme, readTheme, type ThemePref } from '@/lib/theme';

type Me = { id: string; name: string | null; avatarUrl?: string | null };

type Controls = {
  q: string;
  onQ: (v: string) => void;
  order: 'new' | 'top';
  onOrder: (v: 'new' | 'top') => void;
  starBuckets: number[];
  onStarBuckets: (v: number[]) => void;
};

const USE_CURRENTCOLOR = true;

function StarFilter({ value, onChange }: { value: number[]; onChange: (v:number[])=>void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement|null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selected = [...value].sort((a,b)=>a-b);
  // Label: show selected numbers joined by comma, followed by star emoji, no "ve üzeri"
  // Each number should be shown as a star emoji, e.g. "3, 4, 5 ⭐️"
  const label = selected.length === 0
    ? 'Tümü'
    : selected.join(', ') + ' ⭐️';

  function toggle(n:number) {
    const set = new Set(value);
    if (set.has(n)) set.delete(n); else set.add(n);
    onChange(Array.from(set).sort());
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o=>!o)}
        className="px-3 py-2 rounded-xl border text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Yıldız filtresi"
      >
        <span>⭐️</span>
        <span className="hidden sm:inline">
          {selected.length === 0
            ? 'Tümü'
            : selected.map(n => n).join(', ') + ' ⭐️'
          }
        </span>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-44 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-lg p-2">
          <div className="text-xs px-2 py-1 opacity-70">Yıldızlar</div>
          {[1,2,3,4,5].map(n => {
            const active = value.includes(n);
            return (
              <button
                key={n}
                type="button"
                onClick={() => toggle(n)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${active ? 'bg-amber-100 border border-amber-300 text-amber-900 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-100' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                aria-pressed={active}
              >
                <span>
                  {n}
                  {' '}
                  <span role="img" aria-label={`${n} yıldız`}>⭐️</span>
                </span>
                {active && <span className="text-xs">✓</span>}
              </button>
            );
          })}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="flex-1 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => onChange([])}
            >
              Temizle
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-lg border text-sm bg-black text-white"
              onClick={() => setOpen(false)}
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header({ controls }: { controls?: Controls }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<ThemePref>('system');

  async function refetchMe() {
    try {
      const r = await fetch('/api/me', { cache: 'no-store' });
      const j = await r.json().catch(() => null);
      setMe(r.ok ? (j?.me ?? null) : null);
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
  function changeTheme(next: ThemePref) { setTheme(next); applyTheme(next); }

  const logoClass = USE_CURRENTCOLOR
    ? 'h-14 w-auto text-gray-900 dark:text-gray-100'
    : 'h-14 w-auto dark:invert';

  return (
    <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/70 dark:bg-gray-900/65 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 md:py-2.5 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
        {/* Sol: Logo + (mobil) tema & auth */}
        <div className="flex items-center justify-between md:justify-start gap-2">
          <Link href="/" className="shrink-0" title="Anasayfa">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 127.5 75"
    className="h-14 w-auto text-gray-900 dark:text-gray-100"
    fill="currentColor"
  >
    <g>
      <g transform="translate(15.521087, 36.267131)">
        <path d="M 23.113281 0 L 18.816406 -8.15625 L 23.113281 -8.15625 L 23.113281 -29.253906 L 1.140625 -29.253906 L 1.140625 0 L 8.464844 0 L 8.464844 -8.15625 L 11.621094 -8.15625 L 15.789062 0 Z M 15.789062 -14.824219 L 8.464844 -14.824219 L 8.464844 -22.542969 L 15.789062 -22.542969 Z"/>
      </g>
      <g transform="translate(39.771943, 36.267131)">
        <path d="M 23.113281 0 L 23.113281 -29.253906 L 1.140625 -29.253906 L 1.140625 0 L 8.464844 0 L 8.464844 -8.15625 L 15.789062 -8.15625 L 15.789062 0 Z M 15.789062 -14.824219 L 8.464844 -14.824219 L 8.464844 -22.542969 L 15.789062 -22.542969 Z"/>
      </g>
      <g transform="translate(64.022798, 36.267131)">
        <path d="M 22.632812 -22.542969 L 22.632812 -29.253906 L 0.65625 -29.253906 L 0.65625 -22.542969 L 8.027344 -22.542969 L 8.027344 0 L 15.351562 0 L 15.351562 -22.542969 Z"/>
      </g>
      <g transform="translate(87.30888, 36.267131)">
        <path d="M 23.027344 0 L 23.027344 -6.667969 L 8.464844 -6.667969 L 8.464844 -11.492188 L 23.027344 -11.492188 L 23.027344 -17.9375 L 8.464844 -17.9375 L 8.464844 -22.542969 L 23.027344 -22.542969 L 23.027344 -29.253906 L 1.140625 -29.253906 L 1.140625 0 Z"/>
      </g>
      <g transform="translate(15.594421, 66.382661)">
        <path d="M 18.441406 0 L 18.441406 -14.3125 L 6.753906 -14.3125 L 6.753906 -17.984375 L 18.441406 -17.984375 L 18.441406 -23.339844 L 0.910156 -23.339844 L 0.910156 -9.167969 L 12.597656 -9.167969 L 12.597656 -5.320312 L 0.910156 -5.320312 L 0.910156 0 Z"/>
      </g>
      <g transform="translate(34.910104, 66.382661)">
        <path d="M 18.054688 -17.984375 L 18.054688 -23.339844 L 0.523438 -23.339844 L 0.523438 -17.984375 L 6.402344 -17.984375 L 6.402344 0 L 12.246094 0 L 12.246094 -17.984375 Z"/>
      </g>
      <g transform="translate(53.490952, 66.382661)">
        <path d="M 18.441406 0 L 18.441406 -23.339844 L 12.597656 -23.339844 L 12.597656 -5.320312 L 6.753906 -5.320312 L 6.753906 -23.339844 L 0.910156 -23.339844 L 0.910156 0 Z"/>
      </g>
      <g transform="translate(72.841625, 66.382661)">
        <path d="M 18.371094 -9.167969 L 18.371094 -14.3125 L 6.753906 -14.3125 L 6.753906 -17.984375 L 18.371094 -17.984375 L 18.371094 -23.339844 L 0.910156 -23.339844 L 0.910156 0 L 6.753906 0 L 6.753906 -9.167969 Z"/>
      </g>
      <g transform="translate(92.122313, 66.382661)">
        <path d="M 18.371094 -9.167969 L 18.371094 -14.3125 L 6.753906 -14.3125 L 6.753906 -17.984375 L 18.371094 -17.984375 L 18.371094 -23.339844 L 0.910156 -23.339844 L 0.910156 0 L 6.753906 0 L 6.753906 -9.167969 Z"/>
      </g>
    </g>
  </svg>
</Link>
          {/* Mobil sağ blok */}
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
                onClick={() => signIn('google', { callbackUrl: '/', prompt: 'select_account' })}
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

        {/* Desktop: arama + sıralama ortada */}
        {controls && (
          <div className="hidden md:flex mx-auto items-center gap-2 w-full max-w-xl">
            <div className="relative flex-1">
              <input
                value={controls.q}
                onChange={(e) => controls.onQ(e.target.value)}
                placeholder="ara ( / )"
                className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
              />
              {!!controls.q && (
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

            {/* ⭐️ Yıldız filtresi (dropdown, çoklu seçim) */}
            <StarFilter value={controls.starBuckets} onChange={controls.onStarBuckets} />

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
              onClick={() => signIn('google', { callbackUrl: '/', prompt: 'select_account' })}
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
        </nav>

        {/* Mobil: arama + sıralama ikinci satır */}
        {controls && (
          <div className="md:hidden flex items-center gap-2">
            <div className="relative flex-1">
              <input
                value={controls.q}
                onChange={(e) => controls.onQ(e.target.value)}
                placeholder="ara ( / )"
                className="w-full border rounded-xl px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
              />
              {!!controls.q && (
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

            {/* ⭐️ Yıldız filtresi (dropdown, çoklu seçim) */}
            <StarFilter value={controls.starBuckets} onChange={controls.onStarBuckets} />

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
