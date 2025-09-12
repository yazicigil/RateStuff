"use client";
import { useCallback, useState } from "react";
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
    <div className="flex items-center gap-2 px-2 py-1.5">
      {opt.avatarUrl
        ? <img src={opt.avatarUrl!} alt={opt.slug} className="w-6 h-6 rounded-full" />
        : <div className="w-6 h-6 rounded-full bg-gray-300" />}
      <div className="leading-tight">
        <div className="text-sm font-semibold">{opt.name}</div>
        <div className="text-xs text-gray-500">@{opt.slug}</div>
      </div>
    </div>
  ), []);

  return (
    <Mention
      className={className}
      inputClassName="rs-mention-input"
      value={value}
      onChange={(e) => onChange((e.target as HTMLTextAreaElement).value)}
      placeholder={placeholder}
      suggestions={suggestions}
      onSearch={onSearch}
      field="slug"
      trigger="@"
      panelClassName="rs-mention-panel z-[9999]"
      // @ts-ignore  (bazı sürümlerde type yok ama runtime'da çalışıyor)
      appendTo={typeof window !== 'undefined' ? document.body : undefined}
      onSelect={() => {
        setTimeout(() => {
          if (typeof value === 'string' && !value.endsWith(' ')) {
            onChange(value + ' ');
          }
        }, 0);
      }}
      panelStyle={{ maxHeight: 320, overflowY: 'auto' }}
      rows={rows}
      autoResize
      style={{ minHeight: "35px" }}
      itemTemplate={itemTemplate}
    />
  );
}