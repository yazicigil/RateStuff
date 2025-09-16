'use client';

import { useEffect, useRef, useState, createContext, useContext } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { signIn, signOut } from 'next-auth/react';
import { applyTheme, readTheme, type ThemePref } from '@/lib/theme';
import NotificationsDropdown from '@/components/header/notifications/Dropdown';
import SearchWithSuggestions from '@/components/header/search/SearchWithSuggestions';

type Me = {
  id: string;
  name: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  kind?: "REGULAR" | "BRAND" | string | null;
};

type Controls = {
  q: string;
  onQ: (v: string) => void;
  order: 'new' | 'top';
  onOrder: (v: 'new' | 'top') => void;
  starBuckets: number[];
  onStarBuckets: (v: number[]) => void;
  // NEW (optional) controls for enter-to-commit & suggestion list
  onCommit?: () => void;
  suggestions?: string[];
  onClickSuggestion?: (s: string) => void;
  showSuggestions?: boolean;
  tagMatches?: string[];
  onClickTagMatch?: (t: string) => void;
  // Trending tags source for suggestions (optional)
  trendingTags?: string[];
  // Optional pills (parent can provide)
  selectedTags?: string[];
  onClickTagRemove?: (t: string) => void;
};

// ---- Header Controls Context (co-located) ----
export const HeaderControlsContext = createContext<Controls | null>(null);

export function HeaderControlsProvider({
  value,
  children,
}: {
  value: Controls;
  children: React.ReactNode;
}) {
  return (
    <HeaderControlsContext.Provider value={value}>
      {children}
    </HeaderControlsContext.Provider>
  );
}

export function useHeaderControls() {
  return useContext(HeaderControlsContext);
}
// ---------------------------------------------

const USE_CURRENTCOLOR = false;

function ProfileDropdown({ me, theme, onCycleTheme }: { me: Me; theme: ThemePref; onCycleTheme: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="h-9 flex items-center gap-2 px-3 rounded-xl border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 dark:focus-visible:ring-white/10 pointer-events-auto touch-manipulation"
        title="Hesabım"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {me.avatarUrl ? (
          <img src={me.avatarUrl} alt="me" className="w-6 h-6 rounded-full object-cover" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-gray-200 grid place-items-center text-xs text-gray-700">
            {(me.name ?? 'U')[0]?.toUpperCase()}
          </div>
        )}
        <span className="hidden sm:flex items-center gap-1">
          {me.name ?? 'Ben'}
          {(me.isAdmin || String(me?.kind || "").toUpperCase() === "BRAND") && (
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="inline-block ml-1 w-4 h-4 align-middle">
              <circle cx="12" cy="12" r="9" fill="#3B82F6" />
              <path d="M8.5 12.5l2 2 4-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" className="opacity-70"><polyline fill="none" stroke="currentColor" strokeWidth="2" points="6 9 12 15 18 9" /></svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-48 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-lg p-1 z-[80]"
        >
          {String(me?.kind || "").toUpperCase() === "BRAND" ? (
            <Link
              href="/brand/me"
              prefetch
              role="menuitem"
              className="block w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
              onClick={() => setOpen(false)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
                <path fill="currentColor" d="M12 17.27l-5.18 3.04 1.27-5.45L3 10.24l5.53-.48L12 4.5l3.47 5.26 5.53.48-5.09 4.62 1.27 5.45z"/>
              </svg>
              Marka profili
            </Link>
          ) : (
            <Link
              href="/me"
              prefetch
              role="menuitem"
              className="block w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
              onClick={() => setOpen(false)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
                <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Profilim
            </Link>
          )}
          <button
            role="menuitem"
            type="button"
            className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => { onCycleTheme(); }}
          >
            <span className="shrink-0" aria-hidden="true">{theme === 'dark' ? '🌙' : (theme === 'light' ? '🌞' : '🖥️')}</span>
            <span>Tema: {theme === 'dark' ? 'Koyu' : (theme === 'light' ? 'Açık' : 'Otomatik')}</span>
          </button>
          <button
            role="menuitem"
            className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => { setOpen(false); signOut({ callbackUrl: '/' }); }}
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
              <path d="M10 17l-1.41-1.41L12.17 12 8.59 8.41 10 7l5 5-5 5z" fill="currentColor"/>
              <path d="M13 3H6a2 2 0 0 0-2 2v4h2V5h7V3zm-7 16v-4H4v4a2 2 0 0 0 2 2h7v-2H6z" fill="currentColor"/>
            </svg>
            Çıkış
          </button>
        </div>
      )}
    </div>
  );
}

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
  const router = useRouter();
  const pathname = usePathname();
  const cleanPath = (pathname || '').split('?')[0];
  const isProfile = /^\/(?:me|brand(?:\/me|\/[^\/]+))$/.test(cleanPath);
  const isBrandProfile = /^\/brand(?:\/me|\/[^\/]+)$/.test(cleanPath);
  const isBrandMe = cleanPath === '/brand/me';
  const isHome = cleanPath === '/';

  // Prefer context-provided controls; fall back to props for backward compatibility
  const ctxControls = useHeaderControls();
  const effectiveControls = ctxControls ?? controls;

  // Show search on home and spotlight (/?item=...) pages, and provide a minimal fallback controls when context/props are absent
  const showSearch = isHome || cleanPath.startsWith('/share');
  const [fallbackQ, setFallbackQ] = useState('');
  const fallbackControls: Controls = {
    q: fallbackQ,
    onQ: setFallbackQ,
    order: 'new',
    onOrder: () => {},
    starBuckets: [],
    onStarBuckets: () => {},
  };


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
  // Prefetch profile page to make first click instant
  useEffect(() => {
    router.prefetch('/me');
  }, [router]);
  function changeTheme(next: ThemePref) { setTheme(next); applyTheme(next); }
  function cycleTheme() {
    const next = theme === 'system' ? 'dark' : (theme === 'dark' ? 'light' : 'system');
    setTheme(next);
    applyTheme(next);
  }

  const logoClassDefault = USE_CURRENTCOLOR
    ? 'h-auto max-h-16 w-auto object-contain text-gray-900 dark:text-gray-100'
    : 'h-auto max-h-16 w-auto object-contain dark:invert';
  const logoClassBrand = USE_CURRENTCOLOR
    ? 'h-auto w-auto object-contain text-gray-900 dark:text-gray-100 max-h-10 max-w-[45vw] sm:max-h-12 sm:max-w-[280px] md:max-h-12 md:max-w-none'
    : 'h-auto w-auto object-contain dark:invert dark:brightness-0 max-h-10 max-w-[45vw] sm:max-h-12 sm:max-w-[280px] md:max-h-12 md:max-w-none';

  

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-lg bg-white/70 dark:bg-gray-900/65 border-b border-gray-200 dark:border-gray-800"

    >
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 md:py-2.5 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
        {/* Sol: Logo + (mobil) tema & auth */}
        <div className="flex items-center gap-2">
          {isProfile && (
            <button
              type="button"
              onClick={() => { if (window.history.length > 1) { router.back(); } else { router.push('/'); } }}
              title="Geri"
              aria-label="Geri"
              className="shrink-0 h-9 w-9 grid place-items-center rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 dark:focus-visible:ring-white/10"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <polyline fill="none" stroke="currentColor" strokeWidth="2" points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          <Link
            href="/"
            className="shrink-0"
            title="Anasayfa"
            onClick={(e) => { e.preventDefault(); window.location.href = '/' }}
          >
            <img src={isBrandMe ? "/forbrandslogo.svg" : "/logo.svg"} alt="RateStuff" className={isBrandMe ? logoClassBrand : logoClassDefault} />
          </Link>
          {/* Mobil sağ blok */}
          <div className="flex items-center gap-2 md:hidden ml-auto">
            {!loading && !me && (
              <button
                onClick={() => signIn('google', { callbackUrl: '/', prompt: 'select_account' })}
                className="h-9 flex items-center gap-2 px-3 rounded-xl border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 dark:focus-visible:ring-white/10 pointer-events-auto"
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
              <ProfileDropdown me={me} theme={theme} onCycleTheme={cycleTheme} />
            )}
            {me && <NotificationsDropdown />}
          </div>
        </div>

        {/* Desktop: arama + sıralama ana sayfada ve spotlight görünümünde */}
        {showSearch && (
          <SearchWithSuggestions controls={effectiveControls ?? fallbackControls} />
        )}

        {/* Desktop sağ: tema + auth */}
        <nav className="hidden md:flex ml-auto items-center gap-2.5 relative z-50">
          {!loading && !me && (
            <button
              onClick={() => signIn('google', { callbackUrl: '/', prompt: 'select_account' })}
              className="h-9 flex items-center gap-2 px-3 rounded-xl border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 dark:focus-visible:ring-white/10 pointer-events-auto"
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
            <ProfileDropdown me={me} theme={theme} onCycleTheme={cycleTheme} />
          )}
          {me && <NotificationsDropdown />}
        </nav>

        {/* Mobil: arama + sıralama ikinci satır */}
      </div>
      <Link href="/me" prefetch className="sr-only" aria-hidden="true" tabIndex={-1} />
    </header>
  );
}
