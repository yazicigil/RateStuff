"use client";
import { useCallback, useRef, useState } from "react";
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

  return (
    <div ref={rootRef} className="relative">
      <Mention
        className={`${className ?? ''} rs-mention [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:pr-12 [&_textarea]:leading-[1.4]`}
        inputClassName="rs-mention-input px-3 py-2 pr-12 leading-[1.4]"
        inputStyle={{ paddingTop: 8, paddingBottom: 8, paddingLeft: 12, paddingRight: 48, lineHeight: 1.4 }}
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
        autoResize
        style={{ minHeight: "35px" }}
        itemTemplate={itemTemplate}
      />
    </div>
  );
}