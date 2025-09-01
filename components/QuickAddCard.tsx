'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ImageUploader from '@/components/ImageUploader';
import Stars from '@/components/Stars';
import { containsBannedWord } from '@/lib/bannedWords';

type QuickAddCardProps = {
  /** panel göstergesi – dışarıdan yönetebilirsin, istersen hep açık da bırakılabilir */
  open?: boolean;
  /** kapatma ikonu ve dış olaylar için */
  onClose?: () => void;
  /** submit’te çağrılır; true dönerse form sıfırlanır ve success toast oynar */
  onSubmit: (payload: {
    name: string;
    desc: string;
    tags: string[];
    rating: number;
    comment: string;
    imageUrl: string | null;
  }) => Promise<boolean> | boolean;

  /** etiket havuzları (trend + tüm etiketler); chip önerileri bunlardan gelir */
  trending?: string[];
  allTags?: string[];

  /** yerleşim: “compact” = tek kolon; “rich” = md+ iki kolon */
  variant?: 'compact' | 'rich';
};

export default function QuickAddCard({
  open = true,
  onClose,
  onSubmit,
  trending = [],
  allTags = [],
  variant = 'rich',
}: QuickAddCardProps) {
  // ---- state
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const leftHoldRef = useRef<number | null>(null);
  const rightHoldRef = useRef<number | null>(null);

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [showSug, setShowSug] = useState(false);
  const [sugPage, setSugPage] = useState(0); // öneri sayfalama (4'lü gruplar)
  const [sugDir, setSugDir] = useState<'left' | 'right' | null>(null); // sayfa geçiş yönü (animasyon)

  const [submitting, setSubmitting] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- rating pill text (same as CommentBox)
  const ratingPillText = ['', 'Çok kötü', 'Kötü', 'Orta', 'İyi', 'Mükemmel'][rating] ?? '';

  // ---- helpers
  function normalizeTag(s: string) {
    return s.trim().replace(/^#+/, '').toLowerCase();
  }
  function addTagsFromInput(src?: string) {
    const raw = typeof src === 'string' ? src : tagInput;
    const parts = raw.split(',').map(normalizeTag).filter(Boolean);
    if (!parts.length) return;
    let banned = false;
    setTags((prev) => {
      const set = new Set(prev);
      for (const p of parts) {
        if (set.size >= 3) break;
        if (containsBannedWord(p)) { banned = true; continue; }
        set.add(p);
      }
      return Array.from(set).slice(0, 3);
    });
    setTagInput('');
    if (banned) setError('Etikette yasaklı kelime kullanılamaz.');
  }

  const pool = useMemo(() => Array.from(new Set([...(trending || []), ...(allTags || [])])), [trending, allTags]);
  const suggestions = useMemo(() => {
    const already = new Set(tags.map(normalizeTag));
    const q = normalizeTag(tagInput);
    const base = q ? pool : trending;
    const list = (base || [])
      .map(String).map(normalizeTag)
      .filter(Boolean)
      .filter((t) => !already.has(t))
      .filter((t) => (q ? t.includes(q) : true));
    const dedup: string[] = [];
    for (const t of list) if (!dedup.includes(t)) dedup.push(t);
    return dedup.slice(0, 10);
  }, [pool, trending, tagInput, tags]);

  useEffect(() => { setSugPage(0); }, [tagInput, tags, suggestions.length]);
  useEffect(() => {
    if (!sugDir) return;
    const id = setTimeout(() => setSugDir(null), 240);
    return () => clearTimeout(id);
  }, [sugDir]);

  function pagePrev() {
    setSugDir('left');
    setSugPage((p) => p - 1);
  }
  function pageNext() {
    setSugDir('right');
    setSugPage((p) => p + 1);
  }
  function startHold(which: 'left' | 'right') {
    const ref = which === 'left' ? leftHoldRef : rightHoldRef;
    if (ref.current) window.clearInterval(ref.current);
    // first immediate tick
    which === 'left' ? pagePrev() : pageNext();
    // then repeat while holding
    ref.current = window.setInterval(() => {
      which === 'left' ? pagePrev() : pageNext();
    }, 220);
  }
  function stopHold(which: 'left' | 'right') {
    const ref = which === 'left' ? leftHoldRef : rightHoldRef;
    if (ref.current) {
      window.clearInterval(ref.current);
      ref.current = null;
    }
  }

  const blocked =
    containsBannedWord(name) ||
    containsBannedWord(comment) ||
    tags.some((t) => containsBannedWord(t));

  const valid = name.trim().length > 0 && tags.length > 0 && rating > 0 && !blocked;

  // autofocus
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => nameRef.current?.focus(), 120);
    return () => clearTimeout(id);
  }, [open]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault?.();
    setError(null);
    if (!valid) {
      setError('Zorunlu alanları doldurmalısın.');
      return;
    }
    try {
      setSubmitting(true);
      const ok = await onSubmit({ name: name.trim(), desc: desc.trim(), tags, rating, comment: comment.trim(), imageUrl });
      if (ok) {
        formRef.current?.reset();
        setName(''); setDesc(''); setComment(''); setRating(0); setImageUrl(null); setTags([]); setTagInput('');
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1600);
        onClose?.();
      }
    } finally { setSubmitting(false); }
  }

  // ---- layout helpers
  const wrapClass =
    variant === 'compact'
      ? 'grid grid-cols-1 gap-3'
      : 'grid grid-cols-1 md:grid-cols-2 md:gap-4 gap-3';

  if (!open) return null;

  return (
    <div className="relative rounded-2xl border p-4 shadow-sm bg-emerald-50/70 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-900/40 rs-quickadd">
      {/* Close */}
      {onClose && (
        <button
          className="rs-pop absolute top-3 right-3 z-30 w-8 h-8 grid place-items-center rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-300"
          onClick={onClose}
          aria-label="Kapat"
          title="Kapat"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      )}

      {/* Success toast */}
      {justAdded && (
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800 shadow-sm opacity-0 animate-[fadeInOut_1.6s_ease]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="text-sm font-medium">Eklendi</span>
          </div>
        </div>
      )}

      <div className="mb-2">
        <h3 className="text-base md:text-lg font-semibold">Hızlı ekle</h3>
        <p className="text-xs opacity-70">En fazla <b>3 etiket</b>. Görsel ekleyerek daha iyi sonuç alırsın.</p>
      </div>

      <form ref={formRef} onSubmit={submit} className={wrapClass}>
        {/* Sol blok: Ad, Açıklama, Resim */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Ad <span className="opacity-60">*</span></label>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
              className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none bg-transparent dark:bg-transparent ${containsBannedWord(name) ? 'border-red-500 focus:ring-red-500 dark:border-red-600' : 'focus:ring-2 focus:ring-emerald-400 dark:border-gray-700 dark:text-gray-100'}`}
              placeholder="örn. V60 02 filtre"
            />
            {containsBannedWord(name) && <span className="text-xs text-red-600">Item adında yasaklı kelime var.</span>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Kısa açıklama <span className="opacity-60">(opsiyonel)</span></label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-transparent dark:bg-transparent dark:border-gray-700 dark:text-gray-100"
              placeholder="kısa açıklama"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Görsel ekle <span className="opacity-60">(opsiyonel)</span></label>
            <ImageUploader value={imageUrl} onChange={setImageUrl} />
          </div>
        </div>

        {/* Sağ blok: Etiketler, Puan, Yorum */}
        <div className="space-y-3">
          {/* Etiketler */}
          <div>
            <label className="block text-sm font-medium mb-1">Etiketler <span className="opacity-60">*</span></label>
            {/* Öneriler: her zaman görünür; 4'lü sayfalama, sağ-sol oklarla gezinme */}
            {suggestions.length > 0 && tags.length < 3 && (
              <div className="mb-1 flex items-center gap-1 select-none">
                {(() => {
                  const pageSize = 4;
                  const pageCount = Math.max(1, Math.ceil(suggestions.length / pageSize));
                  const start = (sugPage % pageCount + pageCount) % pageCount * pageSize;
                  const visible = suggestions.slice(start, start + pageSize);
                  const canPage = pageCount > 1;
                  return (
                    <>
                      <button
                        type="button"
                        className="rs-sug-nav shrink-0 w-8 h-8 grid place-items-center rounded-full border bg-white/70 hover:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 transition
                                   enabled:active:scale-95 enabled:hover:-translate-x-0.5 disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        onMouseDown={(e) => { e.preventDefault(); if (!canPage) return; startHold('left'); }}
                        onMouseUp={() => stopHold('left')}
                        onMouseLeave={() => stopHold('left')}
                        onTouchStart={(e) => { if (!canPage) return; startHold('left'); }}
                        onTouchEnd={() => stopHold('left')}
                        onClick={(e) => { e.preventDefault(); if (!canPage) return; pagePrev(); }}
                        disabled={!canPage}
                        aria-label="Önceki öneriler"
                        title="Önceki (←)"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M15 19l-7-7 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>

                      <div className="relative mx-1 overflow-hidden">
                        <div className={`flex items-center gap-1 ${sugDir === 'left' ? 'sug-anim-left' : ''} ${sugDir === 'right' ? 'sug-anim-right' : ''}`}>
                          {visible.map((t) => (
                            <button
                              key={t}
                              type="button"
                              className="shrink-0 inline-flex items-center px-2 py-0.5 text-xs rounded-full border bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 dark:border-gray-700"
                              onMouseDown={(ev) => ev.preventDefault()}
                              onClick={() => { if (tags.length >= 3) return; setTags((prev) => Array.from(new Set([...prev, t])).slice(0, 3)); setTagInput(''); setShowSug(false); }}
                            >
                              <span>#{t}</span>
                              <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" className="ml-1 opacity-70">
                                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                            </button>
                          ))}
                        </div>
                        {/* sayfa göstergesi */}
                        {canPage && (
                          <div className="absolute -bottom-4 left-0 right-0 flex justify-center gap-1 pt-1 pointer-events-none">
                            {Array.from({ length: pageCount }).map((_, i) => {
                              const idx = ((sugPage % pageCount) + pageCount) % pageCount;
                              return (
                                <span
                                  key={i}
                                  className={`inline-block w-1.5 h-1.5 rounded-full ${i === idx ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        className="rs-sug-nav shrink-0 w-8 h-8 grid place-items-center rounded-full border bg-white/70 hover:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 transition
                                   enabled:active:scale-95 enabled:hover:translate-x-0.5 disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        onMouseDown={(e) => { e.preventDefault(); if (!canPage) return; startHold('right'); }}
                        onMouseUp={() => stopHold('right')}
                        onMouseLeave={() => stopHold('right')}
                        onTouchStart={(e) => { if (!canPage) return; startHold('right'); }}
                        onTouchEnd={() => stopHold('right')}
                        onClick={(e) => { e.preventDefault(); if (!canPage) return; pageNext(); }}
                        disabled={!canPage}
                        aria-label="Sonraki öneriler"
                        title="Sonraki (→)"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </>
                  );
                })()}
              </div>
            )}
            <div
              className={`relative border rounded-xl px-2 py-1.5 flex flex-wrap gap-1 focus-within:ring-2 ${tags.some(containsBannedWord) ? 'border-red-500 ring-red-500 dark:border-red-600' : 'focus-within:ring-emerald-400 dark:bg-gray-800 dark:border-gray-700'}`}
              onFocus={() => setShowSug(true)}
            >
              {tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
                  #{t}
                  <button
                    type="button"
                    className="ml-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                    onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                    aria-label={`#${t} etiketini kaldır`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => { setTagInput(e.target.value); setShowSug(true); if (error) setError(null); }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft' && suggestions.length > 0) {
                    e.preventDefault();
                    pagePrev();
                    return;
                  }
                  if (e.key === 'ArrowRight' && suggestions.length > 0) {
                    e.preventDefault();
                    pageNext();
                    return;
                  }
                  if ((e.key === 'Enter' || e.key === ',') && tags.length < 3) {
                    e.preventDefault();
                    addTagsFromInput();
                    setShowSug(false);
                  } else if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                  } else if (e.key === 'Escape') {
                    setShowSug(false);
                  } else if (e.key === 'Backspace' && tagInput.trim() === '' && tags.length > 0) {
                    // boşken backspace ile son etiketi kaldır
                    setTags((prev) => prev.slice(0, -1));
                    // girişte bir şey olmadığından default backspace davranışı gereksiz
                    e.preventDefault();
                  }
                }}
                onFocus={() => setShowSug(true)}
                placeholder={tags.length >= 3 ? 'En fazla 3 etiket' : (tags.length ? '' : 'kahve, ekipman')}
                className="flex-1 min-w-[120px] px-2 py-1 text-sm bg-transparent outline-none"
                disabled={tags.length >= 3}
              />
            </div>
            {tags.some(containsBannedWord) && <span className="text-xs text-red-600">Etiketlerde yasaklı kelime var.</span>}
          </div>

          {/* Puan */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Puanın <span className="opacity-60">*</span>:</label>
            <Stars value={rating} onRate={(n) => setRating(n)} />
            {rating > 0 && (
              <span className="inline-block text-xs rounded-full px-2 py-0.5 border border-emerald-300/60 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-900/20">
                {ratingPillText}
              </span>
            )}
          </div>

          {/* Yorum */}
          <div>
            <label className="block text-sm font-medium mb-1">Yorum <span className="opacity-60">(opsiyonel)</span></label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={240}
              className={`w-full border rounded-xl px-3 py-2 text-sm resize-y focus:outline-none bg-transparent dark:bg-transparent ${containsBannedWord(comment) ? 'border-red-500 focus:ring-red-500 dark:border-red-600' : 'focus:ring-2 focus:ring-emerald-400 dark:border-gray-700 dark:text-gray-100'}`}
              placeholder="Kısa görüşün…"
            />
            <div className="mt-1 text-[11px] opacity-60">{comment.length}/240</div>
          </div>
        </div>

        {/* CTA (tek satır, sağ-alt) */}
        <div className={`md:col-span-2 flex items-center justify-end ${variant === 'compact' ? 'pt-1' : 'pt-2'}`}>
          {error && <span className="mr-3 text-sm text-red-600">{error}</span>}
          <button
            type="submit"
            disabled={submitting || !valid}
            title={blocked ? 'Yasaklı kelime içeriyor' : undefined}
            className="px-4 py-2.5 rounded-xl text-sm md:text-base bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/><path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" fill="none"/></svg>
                Ekleniyor…
              </span>
            ) : 'Ekle'}
          </button>
        </div>
      </form>
      <style jsx>{`
        @keyframes sugInLeft {
          from { transform: translateX(-14px); opacity: .0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes sugInRight {
          from { transform: translateX(14px); opacity: .0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .sug-anim-left { animation: sugInLeft .22s ease; }
        .sug-anim-right { animation: sugInRight .22s ease; }
        .rs-sug-nav { will-change: transform; }
        .rs-quickadd .rs-sug-nav:active { transform: scale(0.97); }
      `}</style>
    </div>
  );
}