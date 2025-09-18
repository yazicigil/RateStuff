'use client';

import { useState, useEffect, useRef } from "react";
import { PhotoIcon } from "@heroicons/react/24/solid";
import LightboxGallery from '@/components/items/LightboxGallery';
import ImageUploader from "@/components/common/ImageUploader";
import { useSession, signIn } from "next-auth/react";
import Stars from "../common/Stars";
import { containsBannedWord } from "@/lib/bannedWords";
import { MentionTextArea } from "@/components/common/MentionTextArea";
import { linkifyMentions } from "@/lib/text/linkifyMentions";
function maskName(s?: string | null) {
  if (!s) return 'Anonim';
  const raw = String(s).trim();
  if (!raw) return 'Anonim';
  const parts = raw.split(/\s+/).filter(Boolean);
  return parts.map((p) => p.charAt(0).toUpperCase() + '*'.repeat(Math.max(1, p.length - 1))).join(' ');
}

export default function CommentBox({
  itemId,
  onDone,
  initialRating = 0,
  myComment,
}: {
  itemId: string;
  onDone?: () => void;
  initialRating?: number;
  myComment?: {
    id: string;
    text: string;
    rating?: number | null;
    edited?: boolean;
    user?: { id?: string; name?: string | null; avatarUrl?: string | null; verified?: boolean } | null;
    votes?: { value: number }[] | null;
    upCount?: number;
    downCount?: number;
    images?: Array<{ id?: string; url: string; width?: number; height?: number; blurDataUrl?: string; order?: number }>;
  };
}) {
  const { data: session } = useSession();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState<number>(initialRating || 0);
  const [editMode, setEditMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLDivElement | null>(null);
  const upVotes = myComment?.upCount ?? (Array.isArray(myComment?.votes) ? myComment!.votes!.filter(v => v?.value === 1).length : 0);
  const downVotes = myComment?.downCount ?? (Array.isArray(myComment?.votes) ? myComment!.votes!.filter(v => v?.value === -1).length : 0);
  const isMac = typeof window !== 'undefined' && /(Mac|iPhone|iPad|Macintosh)/.test(navigator.userAgent || '');
  const maxLen = 240;
  const hasBanned = containsBannedWord(text);
  const canSend = !busy && rating > 0 && !hasBanned;
  const ratingText = ['', 'Çok kötü', 'Kötü', 'Orta', 'İyi', 'Mükemmel'][rating] ?? '';
  const counterId = `cb-count-${itemId}`;

  const [images, setImages] = useState<Array<{ url: string; width?: number; height?: number; blurDataUrl?: string }>>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [showEditUploader, setShowEditUploader] = useState(false);

  // --- Hydrate myComment.images if parent dropped them ---
  const [myImages, setMyImages] = useState<Array<{ id?: string; url: string; width?: number; height?: number; blurDataUrl?: string; order?: number }>>(
    Array.isArray(myComment?.images) ? (myComment!.images as any) : []
  );
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<Array<{ url: string; width?: number; height?: number; blurDataUrl?: string }>>([]);

  // Lightbox state for "Senin yorumun" görselleri
  const [lbOpen, setLbOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);
  const [lbImages, setLbImages] = useState<Array<{
    id?: string;
    url: string;
    width?: number;
    height?: number;
    blurDataUrl?: string | null;
    order?: number;
    commentId?: string;
    commentUser?: { maskedName?: string | null; name?: string | null; avatarUrl?: string | null } | null;
    commentRating?: number | null;
    commentText?: string | null;
  }>>([]);

  // Keep local copy in sync with incoming prop
  useEffect(() => {
    setMyImages(Array.isArray(myComment?.images) ? (myComment!.images as any) : []);
    setRemovedImageIds([]);
    setNewImages([]);
  }, [myComment?.id]);

  // If my comment has no images but server has them, self-fetch and merge by id
  useEffect(() => {
    // Do not auto-hydrate while editing or when there are local deletions Pending
    if (editMode) return;
    if (removedImageIds.length > 0) return;

    const needsHydrate = !!myComment?.id && (!Array.isArray(myImages) || myImages.length === 0);
    if (!needsHydrate) return;

    let cancelled = false;
    (async () => {
      try {
        // Try the comments list for the item
        let list: any[] | null = null;
        if (itemId) {
          const r = await fetch(`/api/items/${encodeURIComponent(itemId)}/comments`, { cache: 'no-store' });
          if (r.ok) {
            const j = await r.json().catch(() => null);
            if (Array.isArray(j?.comments)) list = j.comments as any[];
          }
        }
        // Fallback: fetch the single comment if list failed
        if (!Array.isArray(list)) {
          const r2 = await fetch(`/api/comments/${encodeURIComponent(myComment!.id)}`, { cache: 'no-store' });
          if (r2.ok) {
            const j2 = await r2.json().catch(() => null);
            if (j2?.comment) list = [j2.comment];
          }
        }
        if (!Array.isArray(list)) return;
        const found = list.find((c: any) => c?.id === myComment!.id);
        let fresh: any[] = Array.isArray(found?.images) ? found.images : [];
        // Never re-add locally removed images while editing
        if (removedImageIds.length > 0) {
          fresh = fresh.filter((im: any) => !im?.id || !removedImageIds.includes(im.id));
        }
        if (!cancelled && fresh.length > 0) setMyImages(fresh);
      } catch {
        // ignore
      }
    })();

    return () => { cancelled = true; };
  }, [itemId, myComment?.id, editMode]);

  // Silme onayı 3 sn sonra sıfırlansın
  if (typeof window !== 'undefined') {
    // no-op on SSR
  }

  // onay bekleme süresi (3s)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  useEffect(() => {
    // Ölç: iki satır klamp ile taşma var mı?
    const el = textRef.current;
    if (!el) { setIsTruncated(false); return; }
    // Ölçümü güvenilir kılmak için bir sonraki frame'de yap
    const r = requestAnimationFrame(() => {
      const truncated = el.scrollHeight > (el.clientHeight + 1);
      setIsTruncated(truncated);
    });
    return () => cancelAnimationFrame(r);
  }, [myComment?.text, editMode, expanded]);

  async function updateMyComment() {
    if (!session) {
      await signIn('google');
      return;
    }
    if (!myComment) return;
    if (hasBanned) {
      alert("Yorumunuzda yasaklı kelime bulunuyor.");
      return;
    }
    setBusy(true);
    try {
      // 1) Primary route
      let res = await fetch(`/api/comments/${myComment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, rating, imagesDelete: removedImageIds, imagesAdd: newImages }),
      });
      if (!res.ok && res.status !== 200) {
        // 2) Fallback route
        res = await fetch(`/api/items/${itemId}/comments`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commentId: myComment.id, text, rating, imagesDelete: removedImageIds, imagesAdd: newImages }),
        });
      }
      if (!res.ok) throw new Error(`Güncellenemedi (${res.status})`);
      // Optimistically apply deletions locally so UI reflects immediately
      if (removedImageIds.length > 0) {
        setMyImages(prev => prev.filter(img => !img.id || !removedImageIds.includes(img.id)));
      }
      setRemovedImageIds([]);
      setNewImages([]);
      setShowEditUploader(false);
      setEditMode(false);
      onDone?.();
    } catch (err: any) {
      alert('Hata: ' + (err?.message || 'Güncellenemedi'));
    } finally {
      setBusy(false);
    }
  }
  async function deleteMyComment() {
    if (!session) {
      await signIn('google');
      return;
    }
    if (!myComment) return;
    setBusy(true);
    try {
      // 1) Primary route
      let res = await fetch(`/api/comments/${myComment.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 200) {
        // 2) Fallback route
        res = await fetch(`/api/comment/${myComment.id}`, { method: 'DELETE' });
      }
      if (!res.ok) throw new Error(`Silinemedi (${res.status})`);
      onDone?.();
    } catch (err: any) {
      alert('Hata: ' + (err?.message || 'Silinemedi'));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (hasBanned) {
      alert("Yorumunuzda yasaklı kelime bulunuyor.");
      return;
    }
    if (!session) {
      await signIn('google');
      return;
    }
    if (rating === 0) return;
    setBusy(true);
    const r = await fetch(`/api/items/${itemId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, rating, images }),
    });
    const j = await r.json().catch(() => null);
    setBusy(false);
    if (r.ok && (j?.comment || j?.id || j?.success === true)) {
      setText("");
      setRating(initialRating || 0);
      setImages([]);
      setShowUploader(false);
      onDone?.();
    } else {
      alert('Hata: ' + (j?.error || `${r.status} ${r.statusText}`));
    }
  }

  if (myComment) {
    if (editMode) {
      return (
        <form
          className="flex flex-col gap-3 mt-2"
          onSubmit={(e) => { e.preventDefault(); updateMyComment(); }}
        >
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Puan<span className="text-red-500">*</span>
              </label>
              {rating > 0 && (
                <span className="text-xs rounded-full px-2 py-0.5 border border-emerald-300/60 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-900/20">
                  {(['','Çok kötü','Kötü','Orta','İyi','Mükemmel'][rating] ?? '')}
                </span>
              )}
            </div>
            <Stars rating={rating} onRatingChange={setRating} />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              {/* Mevcut görseller (düzenleme sırasında) */}
              {Array.isArray(myImages) && myImages.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {myImages.map((img, i) => (
                    <div key={img.id || i} className="relative">
                      <img src={img.url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setMyImages(prev => prev.filter((_, idx) => idx !== i));
                          if (img.id) {
                            setRemovedImageIds(prev => prev.includes(img.id!) ? prev : [...prev, img.id!]);
                          } else {
                            // newly added image (no id): also remove from newImages list
                            setNewImages(prev => prev.filter((ni) => !(ni.url === img.url && ni.width === img.width && ni.height === img.height && ni.blurDataUrl === img.blurDataUrl)));
                          }
                        }}
                        className="absolute -right-1 -top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white"
                        aria-label="Kaldır"
                        title="Kaldır"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {(myImages.length + newImages.length) < 4 && (myImages.length + newImages.length) > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowEditUploader(v => !v)}
                      className="h-20 w-20 rounded-lg border border-dashed border-neutral-300/70 dark:border-white/20 grid place-items-center hover:bg-white/60 dark:hover:bg-white/10"
                      title="Görsel ekle"
                      aria-label="Görsel ekle"
                    >
                      <span className="text-2xl leading-none">+</span>
                    </button>
                  )}
                </div>
              )}
              {/* Yeni görsel ekleme (düzenleme sırasında) */}
              {showEditUploader && (myImages.length + newImages.length) < 4 && (
                <div className="mb-2 rounded-xl border border-dashed border-neutral-300/70 bg-neutral-50/60 p-2 dark:border-white/15 dark:bg-white/5">
                  <ImageUploader
                    multiple
                    maxFiles={Math.max(0, 4 - (myImages.length + newImages.length))}
                    accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
                    onUploaded={(files: Array<{ url: string; width?: number; height?: number; blurDataUrl?: string }>) => {
                      const next = files.map(f => ({ url: f.url, width: f.width, height: f.height, blurDataUrl: f.blurDataUrl }));
                      setMyImages(prev => [...prev, ...next].slice(0, 4));
                      setNewImages(prev => [...prev, ...next].slice(0, 4));
                      // close panel if quota filled
                      const willCount = Math.min(4, myImages.length + newImages.length + next.length);
                      if (willCount >= 4) setShowEditUploader(false);
                    }}
                    className="text-[13px]"
                  />
                  <div className="mt-2 flex items-center justify-between text-[11px] opacity-70">
                    <span>Toplam 4 görsel ekleyebilirsin</span>
                    <span>{Math.min(4, myImages.length + newImages.length)}/4</span>
                  </div>
                </div>
              )}
              <div className="relative">
                <MentionTextArea
                  className={
                  "w-full rounded-xl border transition-colors bg-white/70 dark:bg-white/5 backdrop-blur-sm " +
                  "text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 " +
                  "[&_.rs-mention__ta]:!m-0 [&_.rs-mention__ta]:!p-0 [&_.rs-mention__ta]:!border-none [&_.rs-mention__ta]:!bg-transparent " +
                  "[&_.rs-mention__ta]:!pl-12 [&_.rs-mention__ta]:!pr-10 [&_.rs-mention__ta]:!pt-0 [&_.rs-mention__ta]:!pb-0 " +
                  "[&_.rs-mention__ta]:!h-[44px] [&_.rs-mention__ta]:!text-[14px] [&_.rs-mention__ta]:!leading-[44px] " +
                  "focus-within:ring-2 " +
                  (hasBanned
                    ? "border-red-500 focus-within:ring-red-500 dark:border-red-600"
                    : "border-gray-200 dark:border-white/10 focus-within:ring-emerald-400 focus-within:border-transparent")
                  }
                  value={text}
                  onChange={(v) => setText(v)}
                  rows={2}
                  placeholder={"Yorum yaz..."}
                />
                {session && (myImages.length + newImages.length) === 0 && (
                  <button
                    type="button"
                    aria-label="Fotoğraf ekle"
                    title="Fotoğraf ekle"
                    onClick={() => setShowEditUploader(v => !v)}
                    className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md border border-black/10 bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white/95 dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <PhotoIcon className="h-5 w-5 opacity-80" />
                  </button>
                )}
              </div>
              {hasBanned && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-500">
                  Yorumunuzda yasaklı kelime bulunuyor.
                </p>
              )}
              <div className="mt-1 flex items-center justify-end">
                <span id={counterId} className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                  {text.length}/{maxLen}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="px-3 h-10 rounded-full border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200"
              >
                İptal
              </button>
              <button
                type="submit"
                className={"px-3 h-10 rounded-full " + (hasBanned ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700")}
                disabled={hasBanned || busy}
              >
                Kaydet
              </button>
            </div>
          </div>
        </form>
      );
    }
    return (
      <div className="pt-3">
        <div className="flex items-start gap-2 justify-between rounded-lg border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-900/20 p-2">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            {myComment.user?.avatarUrl ? (
              <img src={myComment.user.avatarUrl} alt={maskName(myComment.user?.name)} className="w-5 h-5 rounded-full object-cover mt-0.5" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 grid place-items-center text-[10px] mt-0.5">
                {(maskName(myComment.user?.name) || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs opacity-70 flex flex-wrap items-center gap-2">
                <span>Senin yorumun</span>
                {typeof myComment.rating === 'number' && myComment.rating > 0 ? (
                  <span className="inline-block bg-emerald-200 text-emerald-900 text-[11px] px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">{myComment.rating}★</span>
                ) : null}
                {Array.isArray(myImages) && myImages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const imgs = Array.isArray(myImages) ? [...myImages] : [];
                      imgs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                      const enriched = imgs.map((im) => ({
                        ...im,
                        blurDataUrl: im.blurDataUrl ?? null,
                        commentId: myComment.id,
                        commentUser: {
                          maskedName: myComment.user?.name ? maskName(myComment.user?.name) : (myComment.user as any)?.maskedName ?? null,
                          name: myComment.user?.name ?? null,
                          avatarUrl: myComment.user?.avatarUrl ?? null,
                        },
                        commentRating: typeof myComment.rating === 'number' ? myComment.rating : null,
                        commentText: typeof myComment.text === 'string' ? myComment.text : null,
                      }));
                      setLbImages(enriched as any);
                      setLbIndex(0);
                      setLbOpen(true);
                    }}
                    className="inline-flex items-center gap-1 ml-0.5 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 text-[11px] px-1.5 py-0.5 rounded-full ring-1 ring-black/5 dark:ring-white/10 shrink-0 hover:bg-gray-300/80 dark:hover:bg-gray-600/80 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    title="Görselleri aç"
                    aria-label={`Bu yorumda ${myImages.length} fotoğraf var`}
                  >
                    <span className="tabular-nums leading-none">{myImages.length}</span>
                    <PhotoIcon className="h-4 w-4 opacity-90" />
                  </button>
                )}
                <span className="flex items-center gap-1.5 text-[12px] text-emerald-900/80 dark:text-emerald-200/80">
                  <span aria-label={`Upvotes: ${upVotes}`} title={`Upvotes: ${upVotes}`} className="leading-none select-none">▲</span>
                  <span className="tabular-nums leading-none select-none">{upVotes - downVotes}</span>
                  <span aria-label={`Downvotes: ${downVotes}`} title={`Downvotes: ${downVotes}`} className="leading-none select-none">▼</span>
                </span>
              </div>
              <div className="w-full flex items-start gap-2 min-w-0">
                <div
                  ref={textRef}
                  className={
                    "flex-1 min-w-0 " +
                    (!expanded ? "line-clamp-2 " : "")
                  }
                >
                  {linkifyMentions(myComment.text)} {myComment.edited && <em className="opacity-60">(düzenlendi)</em>}
                </div>
              </div>
              {isTruncated && (
                <button
                  type="button"
                  className="mt-1 text-xs text-emerald-700 dark:text-emerald-300 hover:underline"
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded ? 'Gizle' : 'Devamını gör'}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            <button
              type="button"
              onClick={() => { setText(myComment.text || ""); setRating(myComment.rating || 0); setEditMode(true); }}
              className="w-8 h-8 grid place-items-center rounded-md hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
              title="Yorumu düzenle"
              aria-label="Yorumu düzenle"
            >
              {/* pencil icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 20l4.5-1 10-10-3.5-3.5-10 10L4 20z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!confirmDelete) { setConfirmDelete(true); return; }
                deleteMyComment();
              }}
              className={
                "w-8 h-8 grid place-items-center rounded-md transition-colors " +
                (confirmDelete
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "hover:bg-red-100/60 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400")
              }
              title={confirmDelete ? "Silmeyi onayla" : "Yorumu sil"}
              aria-label={confirmDelete ? "Silmeyi onayla" : "Yorumu sil"}
            >
              {confirmDelete ? (
                // check icon
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                // trash icon
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7l1-2h4l1 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>
        {/* Lightbox: sadece bu yorumun görselleri */}
        <LightboxGallery
          commentImages={lbImages}
          isOpen={lbOpen}
          onClose={() => setLbOpen(false)}
          index={lbIndex}
          onIndexChange={setLbIndex}
        />
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 mt-2"
      onSubmit={e => {
        e.preventDefault();
        submit();
      }}
      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (canSend) submit(); } }}
    >
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Puan<span className="text-red-500">*</span>
          </label>
          {rating > 0 && (
            <span className="text-xs rounded-full px-2 py-0.5 border border-emerald-300/60 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-900/20">
              {ratingText}
            </span>
          )}
        </div>
        <Stars rating={rating} onRatingChange={setRating} />
      </div>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className="relative">
            <MentionTextArea
              className={
                "w-full rounded-xl border transition-colors bg-white/70 dark:bg-white/5 backdrop-blur-sm " +
                "text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 " +
                "[&_.rs-mention__ta]:!m-0 [&_.rs-mention__ta]:!p-0 [&_.rs-mention__ta]:!border-none [&_.rs-mention__ta]:!bg-transparent " +
                "[&_.rs-mention__ta]:!pl-12 [&_.rs-mention__ta]:!pr-10 [&_.rs-mention__ta]:!pt-0 [&_.rs-mention__ta]:!pb-0 [&_.rs-mention__ta]:!resize-none " +
                "[&_.rs-mention__ta]:!h-[44px] [&_.rs-mention__ta]:!text-[14px] [&_.rs-mention__ta]:!leading-[44px] " +
                "focus-within:ring-2 " +
                (hasBanned
                  ? "border-red-500 focus-within:ring-red-500 dark:border-red-600"
                  : "border-gray-200 dark:border-white/10 focus-within:ring-emerald-400 focus-within:border-transparent")
              }
              value={text}
              onChange={(v) => setText(v)}
              rows={1}
              placeholder={session ? 'Yorum yaz…' : 'Yorum için giriş yap'}
              style={{
                // these CSS vars are consumed by MentionTextArea’s global style for perfect vertical centering
                ['--rs-mention-height' as any]: '44px',
                ['--rs-mention-line-height' as any]: '44px',
              }}
            />
            {session && (
              <button
                type="button"
                aria-label="Fotoğraf ekle"
                title="Fotoğraf ekle"
                onClick={() => setShowUploader(v => !v)}
                className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md border border-black/10 bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white/95 dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <PhotoIcon className="h-5 w-5 opacity-80" />
              </button>
            )}
          </div>
          {hasBanned && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-500">
              Yorumunuzda yasaklı kelime bulunuyor.
            </p>
          )}
          <div className="mt-0.5 flex items-center justify-end">
            <span id={counterId} className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
              {text.length}/{maxLen}
            </span>
          </div>

          {/* seçilmiş görsellerin küçük önizlemesi */}
          {images.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative">
                  <img src={img.url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute -right-1 -top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white"
                    aria-label="Kaldır"
                    title="Kaldır"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* uploader paneli */}
          {showUploader && (
            <div className="mt-2 rounded-xl border border-dashed border-neutral-300/70 bg-neutral-50/60 p-2 dark:border-white/15 dark:bg-white/5">
              <ImageUploader
                multiple
                maxFiles={Math.max(0, 4 - images.length)}
                accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
                onUploaded={(files: Array<{ url: string; width?: number; height?: number; blurDataUrl?: string }>) => {
                  const next = files.map(f => ({ url: f.url, width: f.width, height: f.height, blurDataUrl: f.blurDataUrl }));
                  setImages(prev => [...prev, ...next].slice(0, 4));
                  // close uploader after successful add
                  setShowUploader(false);
                }}
                className="text-[13px]"
              />
              <div className="mt-2 flex items-center justify-between text-[11px] opacity-70">
                <span>En fazla 4 görsel ekleyebilirsin</span>
                <span>{images.length}/4</span>
              </div>
            </div>
          )}
        </div>
        {session ? (
          <button
            type="submit"
            aria-label="Gönder"
            title="Gönder"
            className={
              "mt-1 grid place-items-center w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 " +
              (canSend
                ? "bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                : "bg-white/80 dark:bg-gray-800/80 text-gray-400 cursor-not-allowed")
            }
            disabled={!canSend}
          >
            {/* paper plane icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3.5 12L20.5 3.5 16 20.5l-4.5-5-5-3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M11.5 15.5L20.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => signIn('google')}
            className="mt-1 grid place-items-center w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            title="Giriş yap"
            aria-label="Giriş yap"
          >
            {/* login icon (arrow into door) */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 12h11M10 9l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}
