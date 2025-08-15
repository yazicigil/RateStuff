'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signIn, signOut } from 'next-auth/react';
import { applyTheme, readTheme, type ThemePref } from '@/lib/theme';

type Me = { id: string; name: string | null; avatarUrl?: string | null; isAdmin?: boolean };

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

const USE_CURRENTCOLOR = false;

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

  // suggestions dropdown open/close control (closes on outside click)
  const [suggOpen, setSuggOpen] = useState(false);
  const suggWrapRefDesktop = useRef<HTMLDivElement|null>(null);
  const suggWrapRefMobile = useRef<HTMLDivElement|null>(null);
  // Keyboard navigation for suggestions
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const suggListRef = useRef<HTMLUListElement|null>(null);
  // hashtag composing (keeps text out of the input; renders as a pill)
  const [compActive, setCompActive] = useState(false);
  const [compTag, setCompTag] = useState<string>('');
  // Local mirror for selected tag pills (keeps pills visible even if parent doesn't pass selectedTags)
  // components/Header.tsx, Header() içinde
const [localPills, setLocalPills] = useState<string[]>([]);
const parentPills = Array.isArray(controls?.selectedTags) ? controls!.selectedTags! : [];
const renderPills = Array.from(new Set<string>([...parentPills, ...localPills]));

useEffect(() => {
  if (Array.isArray(controls?.selectedTags)) {
    setLocalPills(prev => Array.from(new Set([...prev, ...controls!.selectedTags!])));
  }
}, [controls?.selectedTags]);

  // keep local open state in sync with external showSuggestions (don't force-close)
  useEffect(() => {
    if (controls?.showSuggestions) setSuggOpen(true);
    // else: do not auto-close; manual handlers (#, Escape, selections) control it
  }, [controls?.showSuggestions]);

  // Reset activeIdx when query, suggestions, or dropdown closes
  useEffect(() => {
    if (!suggOpen) { setActiveIdx(-1); return; }
    setActiveIdx(-1);
  }, [controls?.q, controls?.suggestions, suggOpen]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node | null;
      const inDesktop = !!suggWrapRefDesktop.current && suggWrapRefDesktop.current.contains(t as Node);
      const inMobile = !!suggWrapRefMobile.current && suggWrapRefMobile.current.contains(t as Node);
      if (!inDesktop && !inMobile) setSuggOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Ensure active suggestion stays in view
  useEffect(() => {
    if (activeIdx < 0 || !suggListRef.current) return;
    const li = suggListRef.current.querySelector<HTMLLIElement>(`li[data-idx="${activeIdx}"]`);
    if (li) {
      const list = suggListRef.current;
      const liTop = li.offsetTop;
      const liBottom = liTop + li.offsetHeight;
      const viewTop = list.scrollTop;
      const viewBottom = viewTop + list.clientHeight;
      if (liTop < viewTop) list.scrollTop = liTop;
      else if (liBottom > viewBottom) list.scrollTop = liBottom - list.clientHeight;
    }
  }, [activeIdx]);
  // Shared search input keydown handler for suggestions navigation
  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // START a composing tag with '#'
   if (e.key === '#') {
  e.preventDefault();
  setCompActive(true);
  setCompTag((t) => t || '');
  setSuggOpen(false); // hashtag modunda dropdown açma
  return;
}

    // If we are composing a tag, swallow characters and build the pill
    if (compActive) {
      const allowed = /^[a-z0-9ğüşöçı\-\._]$/i;
     if (e.key.length === 1 && allowed.test(e.key)) {
  e.preventDefault();
  setCompTag((t) => (t + e.key).toLowerCase());
  setSuggOpen(false); // hashtag modunda dropdown kapalı
  return;
}
      if (e.key === 'Backspace') {
        e.preventDefault();
        setCompTag((t) => {
          const next = t.slice(0, -1);
          if (next.length === 0) setCompActive(false);
          return next;
        });
        return;
      }
      // COMMIT current composing tag and keep typing another immediately with comma
      if (e.key === ',') {
        e.preventDefault();
        const tag = normalizeTag(compTag);
        if (tag) {
          controls?.onClickTagMatch?.(tag);
          setLocalPills((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
        }
        // continue composing a new tag (empty pill stays visible)
        setCompTag('');
        setCompActive(true);
        setSuggOpen(false);
        setActiveIdx(-1);
        return;
      }
      // COMMIT and switch to free-text with SPACE (adds a space to input)
      if (e.key === ' ') {
        const tag = normalizeTag(compTag);
        if (tag) {
          controls?.onClickTagMatch?.(tag);
          setLocalPills((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
        }
        setCompActive(false);
        setCompTag('');
        setSuggOpen(false); // do not show results on space
        return; // do not preventDefault so space goes into the input
      }
      // COMMIT and run search with ENTER (do not clear q)
      if (e.key === 'Enter') {
        e.preventDefault();
        const tag = normalizeTag(compTag);
        if (tag) {
          controls?.onClickTagMatch?.(tag);
          setLocalPills((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
        }
        setCompActive(false);
        setCompTag('');
        controls?.onCommit?.();
        return;
      }
      // ESC cancels composing
      if (e.key === 'Escape') {
        e.preventDefault();
        setCompActive(false);
        setCompTag('');
        setSuggOpen(false);
        return;
      }
      // Let arrows/tab/home/end behave normally
    }

    // If not composing and caret is at the start of the input, Backspace should remove the last pill
    if (!compActive && e.key === 'Backspace') {
      const el = e.currentTarget as HTMLInputElement;
      const selStart = (el.selectionStart ?? 0);
      const selEnd = (el.selectionEnd ?? 0);
      const atStart = selStart === 0 && selEnd === 0;
      // When input is empty or caret is at the very start, delete the last pill
      if (atStart || (controls?.q ?? '') === '') {
        const pills = renderPills;
        if (pills.length > 0) {
          e.preventDefault();
          const last = pills[pills.length - 1];
          if (controls?.onClickTagRemove) {
            controls.onClickTagRemove(last); // remove from parent filters
          }
          // always update local pills for instant UI feedback
          setLocalPills(prev => prev.filter(x => x !== last));
          // keep suggestions state as-is; focus remains in input
          return;
        }
      }
    }

    // Suggestions keyboard navigation (when not composing)
    const len = controls?.suggestions?.length ?? 0;
    if (!len) {
      if (e.key === 'Enter') { e.preventDefault(); controls?.onCommit?.(); }
      if (e.key === 'Escape') { setSuggOpen(false); }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggOpen(true);
      setActiveIdx((i) => (i + 1) % len);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggOpen(true);
      setActiveIdx((i) => (i <= 0 ? len - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggOpen && activeIdx >= 0 && activeIdx < len) {
        const val = controls!.suggestions![activeIdx];
        setSuggOpen(false);
        controls?.onClickSuggestion?.(val);
      } else {
        controls?.onCommit?.();
      }
    } else if (e.key === 'Escape') {
      setSuggOpen(false);
      setActiveIdx(-1);
    }
  }

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

  // Helper to highlight query in suggestions
  const renderHighlighted = (text: string, q: string) => {
    const needle = (q || '').trim().toLowerCase();
    if (!needle) return text;
    const hay = text || '';
    const i = hay.toLowerCase().indexOf(needle);
    if (i === -1) return hay;
    return (
      <>
        {hay.slice(0, i)}
        <mark className="px-0.5 rounded bg-amber-200/70 dark:bg-amber-600/40">{hay.slice(i, i + needle.length)}</mark>
        {hay.slice(i + needle.length)}
      </>
    );
  };
// Tag helpers
// components/Header.tsx
function normalizeTag(s: string) {
  return (s || '')
    .toLowerCase()
    .replace(/#/g, '')          // <<< tüm # karakterlerini at
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9ğüşöçı\-_.]/g, '');
}
function currentHashChunk(q: string) {
  const parts = (q || '').split(',');
  const last = (parts[parts.length - 1] || '').trim();
  return last.startsWith('#') ? last : '';
}
  return (
    <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/70 dark:bg-gray-900/65 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 md:py-2.5 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
        {/* Sol: Logo + (mobil) tema & auth */}
        <div className="flex items-center justify-between md:justify-start gap-2">
          <Link
            href="/"
            className="shrink-0"
            title="Anasayfa"
            onClick={(e) => { e.preventDefault(); window.location.href = '/' }}
          >
            <img src="/logo.svg" alt="RateStuff" className={logoClass} />
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
                  <span className="hidden sm:flex items-center gap-1">
  {me.name ?? 'Ben'}
  {me.isAdmin && <img src="/verified.svg" alt="verified" className="w-3.5 h-3.5 opacity-90" />}
</span>
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
            <div className="relative flex-1" ref={suggWrapRefDesktop}>
              {/* Faux input container: pills + text input */}
              <div className="w-full border rounded-xl px-2 py-1.5 text-sm flex flex-wrap items-center gap-1 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
                {/* Selected tag pills (left-aligned) */}
                {renderPills.map((t) => (
                  <span
                    key={'sel-' + t}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border border-gray-300 text-gray-700 bg-transparent dark:border-gray-700 dark:text-gray-200"
                    title={`#${t}`}
                  >
                    <span className="opacity-70">#</span>
                    <span>{t}</span>
                    <button
                      type="button"
                      onClick={() => {
  if (controls?.onClickTagRemove) controls.onClickTagRemove(t);
  else setLocalPills(prev => prev.filter(x => x !== t));
  // filtre değişikliğini hemen uygula
  controls?.onCommit?.();
}}
                      className="ml-0.5 -mr-0.5 px-1 hover:opacity-80"
                      aria-label={`#${t} filtresini kaldır`}
                      title={`#${t} filtresini kaldır`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {/* Composing hashtag pill (until Enter/Comma) */}
                {compActive && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border border-gray-300 text-gray-700 bg-transparent dark:border-gray-700 dark:text-gray-200">
                    <span className="opacity-70">#</span>
                    <span className="truncate max-w-[10rem]">{compTag || '\u00A0'}</span>
                  </span>
                )}
                {/* Real input */}
               <input
  onFocus={() => { /* focus'ta açma */ }}
  value={controls.q}
  onChange={(e) => {
    const v = e.target.value;
    controls.onQ(v);
    // sadece hashtag HARİCİ metin yazarken aç
    if (!compActive && v.trim().length > 0) setSuggOpen(true);
    else if (!compActive) setSuggOpen(false);
  }}
  onKeyDown={handleSearchKeyDown}
  placeholder="ara ( / )"
  className="flex-1 min-w-[8rem] bg-transparent outline-none border-0 px-1 py-1 text-base md:text-sm dark:text-gray-100 dark:placeholder-gray-400"
/>
              </div>
              {!!controls.q && (
                <button
                  type="button"
                  onClick={() => controls.onQ('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  aria-label="Temizle"
                  title="Temizle"
                >
                  ×
                </button>
              )}
              {suggOpen && (
                <div
                  className="absolute left-0 right-0 top-full mt-2 z-40 overflow-hidden rounded-2xl border bg-white/95 dark:bg-gray-900/95 dark:border-gray-800 shadow-xl ring-1 ring-black/5 dark:ring-white/5 backdrop-blur"
                  role="listbox"
                  aria-label="İlgili Sonuçlar"
                >
                  <div className="px-3 py-2 space-y-1">
                   {(Array.isArray(controls?.tagMatches) || Array.isArray(controls?.trendingTags) || compActive || (controls?.q || '').includes('#')) && (
  (() => {
    const pool = controls.tagMatches || [];
    const trendingSrc = Array.isArray(controls?.trendingTags) ? controls!.trendingTags! : [];
    // prefer composing text as needle; else derive from query
    const chunk = currentHashChunk(controls?.q || '');
    const typedNeedle = normalizeTag(chunk);
    const needle = compActive ? normalizeTag(compTag) : typedNeedle;
    const onlyHashInQ = ((controls?.q || '').trim().split(',').pop() || '').trim() === '#';
    const isOnlyHash = compActive ? (compTag === '') : onlyHashInQ;
    // search pool = union of tagMatches + trending (homepage source parity)
    const searchPool = Array.from(new Set<string>([...pool, ...trendingSrc]));
    let filtered: string[] = [];
    if (needle) {
      filtered = searchPool.filter(t => t.toLowerCase().includes(needle));
    } else if (isOnlyHash) {
      // only `#` typed: show trending if present, else fall back to pool
      filtered = (trendingSrc.length ? trendingSrc : searchPool).slice(0, 5);
    } else {
      filtered = searchPool.slice(0, 5);
    }
    // limit to max 5 tags always in this section
    filtered = filtered.slice(0, 5);
    const show = filtered.length > 0 || isOnlyHash || !!needle;
    if (!show) return null;
    return (
      <>
        <div className="text-[11px] font-medium tracking-wide text-gray-500 dark:text-gray-400">
          İlgili Etiketler
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-1 -mb-1 pr-1">
          {filtered.map((t, i) => {
            const isTrending = Array.isArray(controls?.trendingTags) && controls!.trendingTags!.includes(t);
            const trendingClasses = isTrending
              ? 'bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-100'
              : '';
            return (
              <button
                key={t + i}
                type="button"
                onClick={() => {
                  setSuggOpen(false);
                  controls.onClickTagMatch?.(t);
                  setLocalPills((prev) => (prev.includes(t) ? prev : [...prev, t]));
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-800/70 ${trendingClasses}`}
                title={`#${t}`}
              >
                <span className="opacity-70">#</span>
                <span className="truncate max-w-[10rem]">{t}</span>
              </button>
            );
          })}
          {filtered.length === 0 && needle && (
            <span className="text-xs opacity-70 px-2 py-1">#{needle}</span>
          )}
        </div>
        <div className="h-px bg-gray-100 dark:bg-gray-800" />
      </>
    );
  })()
)}
                    <div className="text-[11px] font-medium tracking-wide text-gray-500 dark:text-gray-400">
                      İlgili Sonuçlar
                    </div>
                  </div>
                  <ul ref={suggListRef} className="max-h-80 overflow-auto overscroll-contain divide-y dark:divide-gray-800">
                    {controls.suggestions!.map((s, i) => (
                      <li key={i} role="option" data-idx={i} aria-selected={i === activeIdx}>
                        <button
                          type="button"
                          onClick={() => { setSuggOpen(false); controls.onClickSuggestion?.(s); }}
                          className={`w-full flex items-center gap-2 px-3 py-3 text-sm ${i === activeIdx ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-800/70'}`}
                          title={s}
                          onMouseEnter={() => setActiveIdx(i)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0 opacity-60">
                            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
                            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" />
                          </svg>
                          <span className="truncate flex-1">{renderHighlighted(s, controls.q)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="px-3 py-2 text-[11px] text-gray-500/80 dark:text-gray-400/80 flex items-center justify-between">
                    <span className="hidden sm:inline">Enter ile seç</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="rounded border px-1 py-0.5 text-[10px] dark:border-gray-700">↑</span>
                      <span className="rounded border px-1 py-0.5 text-[10px] dark:border-gray-700">↓</span>
                      <span className="opacity-70">ile gez</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
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
                <span className="hidden sm:flex items-center gap-1">
  {me.name ?? 'Ben'}
  {me.isAdmin && <img src="/verified.svg" alt="verified" className="w-3.5 h-3.5 opacity-90" />}
</span>
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
            <div className="relative flex-1" ref={suggWrapRefMobile}>
              <div className="w-full border rounded-xl px-2 py-1.5 text-sm flex flex-wrap items-center gap-1 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
                {renderPills.map((t) => (
                  <span
                    key={'m-sel-' + t}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border border-gray-300 text-gray-700 bg-transparent dark:border-gray-700 dark:text-gray-200"
                    title={`#${t}`}
                  >
                    <span className="opacity-70">#</span>
                    <span>{t}</span>
                    <button
                      type="button"
                     onClick={() => {
  if (controls?.onClickTagRemove) controls.onClickTagRemove(t);
  else setLocalPills(prev => prev.filter(x => x !== t));
  // filtre değişikliğini hemen uygula
  controls?.onCommit?.();
}}
                      className="ml-0.5 -mr-0.5 px-1 hover:opacity-80"
                      aria-label={`#${t} filtresini kaldır`}
                      title={`#${t} filtresini kaldır`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {compActive && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border border-gray-300 text-gray-700 bg-transparent dark:border-gray-700 dark:text-gray-200">
                    <span className="opacity-70">#</span>
                    <span className="truncate max-w-[10rem]">{compTag || '\u00A0'}</span>
                  </span>
                )}
                <input
  onFocus={() => { /* focus'ta açma */ }}
  value={controls.q}
  onChange={(e) => {
    const v = e.target.value;
    controls.onQ(v);
    // sadece hashtag HARİCİ metin yazarken aç
    if (!compActive && v.trim().length > 0) setSuggOpen(true);
    else if (!compActive) setSuggOpen(false);
  }}
  onKeyDown={handleSearchKeyDown}
  placeholder="ara ( / )"
  className="flex-1 min-w-[8rem] bg-transparent outline-none border-0 px-1 py-1 text-base md:text-sm dark:text-gray-100 dark:placeholder-gray-400"
/>
              </div>
              {!!controls.q && (
                <button
                  type="button"
                  onClick={() => controls.onQ('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  aria-label="Temizle"
                  title="Temizle"
                >
                  ×
                </button>
              )}
              {suggOpen && (
                <div
                  className="absolute left-0 right-0 top-full mt-2 z-40 overflow-hidden rounded-2xl border bg-white/95 dark:bg-gray-900/95 dark:border-gray-800 shadow-xl ring-1 ring-black/5 dark:ring-white/5 backdrop-blur"
                  role="listbox"
                  aria-label="İlgili Sonuçlar"
                >
                  <div className="px-3 py-2 space-y-1">
                    {(Array.isArray(controls?.tagMatches) || Array.isArray(controls?.trendingTags) || compActive || (controls?.q || '').includes('#')) && (
  (() => {
    const pool = controls.tagMatches || [];
    const trendingSrc = Array.isArray(controls?.trendingTags) ? controls!.trendingTags! : [];
    // prefer composing text as needle; else derive from query
    const chunk = currentHashChunk(controls?.q || '');
    const typedNeedle = normalizeTag(chunk);
    const needle = compActive ? normalizeTag(compTag) : typedNeedle;
    const onlyHashInQ = ((controls?.q || '').trim().split(',').pop() || '').trim() === '#';
    const isOnlyHash = compActive ? (compTag === '') : onlyHashInQ;
    const searchPool = Array.from(new Set<string>([...pool, ...trendingSrc]));
    let filtered: string[] = [];
    if (needle) {
      filtered = searchPool.filter(t => t.toLowerCase().includes(needle));
    } else if (isOnlyHash) {
      filtered = (trendingSrc.length ? trendingSrc : searchPool).slice(0, 5);
    } else {
      filtered = searchPool.slice(0, 5);
    }
    filtered = filtered.slice(0, 5);
    const show = filtered.length > 0 || isOnlyHash || !!needle;
    if (!show) return null;
    return (
      <>
        <div className="text-[11px] font-medium tracking-wide text-gray-500 dark:text-gray-400">
          İlgili Etiketler
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-1 -mb-1 pr-1">
          {filtered.map((t, i) => {
            const isTrending = Array.isArray(controls?.trendingTags) && controls!.trendingTags!.includes(t);
            const trendingClasses = isTrending
              ? 'bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-100'
              : '';
            return (
              <button
                key={t + i}
                type="button"
                onClick={() => {
                  setSuggOpen(false);
                  controls.onClickTagMatch?.(t);
                  setLocalPills((prev) => (prev.includes(t) ? prev : [...prev, t]));
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-800/70 ${trendingClasses}`}
                title={`#${t}`}
              >
                <span className="opacity-70">#</span>
                <span className="truncate max-w-[10rem]">{t}</span>
              </button>
            );
          })}
          {filtered.length === 0 && needle && (
            <span className="text-xs opacity-70 px-2 py-1">#{needle}</span>
          )}
        </div>
        <div className="h-px bg-gray-100 dark:bg-gray-800" />
      </>
    );
  })()
)}
                    <div className="text-[11px] font-medium tracking-wide text-gray-500 dark:text-gray-400">
                      İlgili Sonuçlar
                    </div>
                  </div>
                  <ul ref={suggListRef} className="max-h-80 overflow-auto overscroll-contain divide-y dark:divide-gray-800">
                    {controls.suggestions!.map((s, i) => (
                      <li key={i} role="option" data-idx={i} aria-selected={i === activeIdx}>
                        <button
                          type="button"
                          onClick={() => { setSuggOpen(false); controls.onClickSuggestion?.(s); }}
                          className={`w-full flex items-center gap-2 px-3 py-3 text-sm ${i === activeIdx ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-800/70'}`}
                          title={s}
                          onMouseEnter={() => setActiveIdx(i)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0 opacity-60">
                            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
                            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" />
                          </svg>
                          <span className="truncate flex-1">{renderHighlighted(s, controls.q)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="px-3 py-2 text-[11px] text-gray-500/80 dark:text-gray-400/80 flex items-center justify-between">
                    <span className="hidden sm:inline">Enter ile seç</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="rounded border px-1 py-0.5 text-[10px] dark:border-gray-700">↑</span>
                      <span className="rounded border px-1 py-0.5 text-[10px] dark:border-gray-700">↓</span>
                      <span className="opacity-70">ile gez</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
