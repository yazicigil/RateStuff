"use client";
import { useCallback, useRef, useState, useEffect } from "react";
import { Mention } from "primereact/mention";

type BrandOpt = { slug: string; name: string; avatarUrl?: string | null };

export function MentionTextArea({
  value,
  onChange,
  placeholder = "Bir şeyler yaz... (@slug ile marka etiketle)",
  className,
  minLengthToTrigger = 0,
  rows = 1,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  minLengthToTrigger?: number;
  rows?: number;
}) {
  const [suggestions, setSuggestions] = useState<BrandOpt[]>([]);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < minLengthToTrigger) return setSuggestions([]);
    try {
      const res = await fetch(`/api/brand/mention?q=${encodeURIComponent(q)}&take=200`);
      const data: BrandOpt[] = await res.json();
      setSuggestions(data);
    } catch {
      setSuggestions([]);
    }
  }, [minLengthToTrigger]);

  const onSearch = useCallback((e: { trigger: string; query: string }) => {
    if (e.trigger === "@") fetchSuggestions(e.query);
  }, [fetchSuggestions]);

  const itemTemplate = useCallback((opt: BrandOpt) => (
    <button type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); pick(opt); }} className="flex w-full items-center gap-2 px-2 py-1.5 text-left focus:outline-none">
      {opt.avatarUrl
        ? <img src={opt.avatarUrl!} alt={opt.slug} className="w-6 h-6 rounded-full" />
        : <div className="w-6 h-6 rounded-full bg-gray-300" />}
      <div className="leading-tight">
        <div className="text-sm font-semibold">{opt.name}</div>
        <div className="text-xs text-gray-500">@{opt.slug}</div>
      </div>
    </button>
  ), []);

  const pick = useCallback((opt: BrandOpt) => {
    const ta = rootRef.current?.querySelector('textarea');
    if (!ta) return;
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    // find the last '@' before caret
    const at = before.lastIndexOf('@');
    if (at === -1) return; // safety
    // from '@' to caret, ensure no whitespace (still in mention token)
    const token = before.slice(at, before.length);
    if (/\s/.test(token)) return; // user moved out of token
    const inserted = before.slice(0, at) + '@' + opt.slug + ' ';
    const nextVal = inserted + after;
    onChange(nextVal);
    // move caret to end of inserted mention
    const newPos = inserted.length;
    requestAnimationFrame(() => {
      ta.focus();
      try {
        ta.setSelectionRange(newPos, newPos);
      } catch {}
    });
    setSuggestions([]);
  }, [onChange, setSuggestions, value]);

useEffect(() => {
  const ta = rootRef.current?.querySelector('textarea');
  if (ta && !ta.classList.contains('rs-mention__ta')) {
    ta.classList.add('rs-mention__ta');
  }
}, []);

// Keep the marker class even if re-rendered
useEffect(() => {
  const root = rootRef.current;
  if (!root) return;
  const ensure = () => {
    const ta = root.querySelector('textarea');
    if (ta && !ta.classList.contains('rs-mention__ta')) {
      ta.classList.add('rs-mention__ta');
    }
  };
  ensure();
  const mo = new MutationObserver(() => ensure());
  mo.observe(root, { childList: true, subtree: true });
  return () => mo.disconnect();
}, []);

// JS-driven single-line vertical centering (opt-in via .rs-center-single on wrapper)
useEffect(() => {
  const root = rootRef.current;
  if (!root || !root.classList.contains('rs-center-single')) return;
  const ta = root.querySelector('textarea') as HTMLTextAreaElement | null;
  if (!ta) return;
  const nudge = () => {
    const cs = getComputedStyle(ta);
    const h = ta.clientHeight; // excludes border
    const lh = parseFloat(cs.lineHeight || "0");
    if (!h || !lh) return;
    // remove existing vertical paddings then reapply balanced paddings
    ta.style.paddingTop = '0px';
    ta.style.paddingBottom = '0px';
    // macOS SF optical tweak +0.5px
    const isMac = typeof navigator !== 'undefined' && /(Mac|iPhone|iPad|Macintosh)/.test(navigator.userAgent || '');
    const extra = isMac ? 0.5 : 0;
    const pad = Math.max(0, (h - lh) / 2 + extra);
    ta.style.paddingTop = pad + 'px';
    ta.style.paddingBottom = pad + 'px';
  };
  nudge();
  const ro = new ResizeObserver(() => nudge());
  ro.observe(ta);
  // Recenter when fonts load or value changes size
  const mo = new MutationObserver(() => nudge());
  mo.observe(ta, { attributes: true, attributeFilter: ['style', 'class'], characterData: false, childList: false });
  window.addEventListener('resize', nudge);
  return () => {
    try { ro.disconnect(); } catch {}
    try { mo.disconnect(); } catch {}
    window.removeEventListener('resize', nudge);
  };
}, []);

  return (
    <div
      ref={rootRef}
      className={`relative rs-mention rs-mention__root ${className ?? ''}`}
    >
      <Mention
        value={value}
        onChange={(e) => onChange((e.target as HTMLTextAreaElement).value)}
        placeholder={placeholder}
        suggestions={suggestions}
        onSearch={onSearch}
        field="slug"
        trigger="@"
        panelClassName="rs-mention-panel z-[2147483000] pointer-events-auto [&_*]:pointer-events-auto"
        onHide={() => setSuggestions([])}
        // @ts-ignore  (bazı sürümlerde type yok ama runtime'da çalışıyor)
        appendTo={typeof window !== 'undefined' ? document.body : undefined}
        panelStyle={{ maxHeight: 320, overflowY: 'auto', pointerEvents: 'auto' }}
        rows={rows}
        autoResize={false}
        itemTemplate={itemTemplate}
      />
    </div>
  );
}