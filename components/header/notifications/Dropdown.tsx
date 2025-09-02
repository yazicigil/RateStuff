"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNotifications, type Notif } from "@/lib/useNotifications";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";

import bellAnim from "@/assets/animations/bell.json";

import bellSolidAnim from "@/assets/animations/bell-solid.json";

import refreshAnim from "@/assets/animations/refresh.json";
import dotsAnim from "@/assets/animations/dots-loader.json";

export default function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const { items, unreadCount, hasMore, loading, load, refresh, markRead, markAll, status, setStatus } =
    useNotifications("all", 5);
  const visibleItems: Notif[] = items.filter(n => !hiddenIds.has(n.id));

  async function deleteNotification(id: string) {
    try {
      const res = await fetch(`/api/notifications/${id}/delete`, { method: "POST" });
      if (!res.ok) throw new Error("delete-failed");
      setHiddenIds((prev) => new Set(prev).add(id));
    } catch (e) {
      console.error("Failed to delete notification", e);
    }
  }

  function relativeTime(iso: string) {
    try {
      const d = new Date(iso);
      const diff = Date.now() - d.getTime();
      const sec = Math.round(diff / 1000);
      const units: [Intl.RelativeTimeFormatUnit, number][] = [
        ["year", 60 * 60 * 24 * 365],
        ["month", 60 * 60 * 24 * 30],
        ["week", 60 * 60 * 24 * 7],
        ["day", 60 * 60 * 24],
        ["hour", 60 * 60],
        ["minute", 60],
      ];
      const rtf = new Intl.RelativeTimeFormat("tr", { numeric: "auto" });
      for (const [unit, inSec] of units) {
        if (Math.abs(sec) >= inSec) return rtf.format(-Math.round(sec / inSec), unit);
      }
      return "şimdi";
    } catch {
      return "";
    }
  }

  const dropdownRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  // lottie refs for hover-triggered animation
  const bellRef = useRef<LottieRefCurrentProps | null>(null);
  const bellSolidRef = useRef<LottieRefCurrentProps | null>(null);
  const refreshRef = useRef<LottieRefCurrentProps | null>(null);
  const dotsRef = useRef<LottieRefCurrentProps | null>(null);
  useEffect(() => {
    const r = dotsRef.current;
    if (!r) return;
    // When loading: play dots; when idle: reset to first frame (stopped).
    if (loading) {
      r.stop();
      r.goToAndStop?.(0, true);
      r.play();
    } else {
      r.stop();
      r.goToAndStop?.(0, true);
    }
  }, [loading]);
  // block bell hover animation briefly after click
  const bellHoverBlockUntilRef = useRef<number>(0);

  function positionPanel() {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const top = Math.round(r.bottom + 8); // 8px offset
    const right = Math.round(Math.max(8, window.innerWidth - r.right)); // at least 8px from edge
    setPos({ top, right });
  }

  const panelRef = useRef<HTMLDivElement>(null);
  const [shadowTop, setShadowTop] = useState(false);
  const [shadowBottom, setShadowBottom] = useState(false);

  useEffect(() => {
    const el = panelRef.current;
    if (!el || !open) return;

    const onScroll = () => {
      const st = el.scrollTop;
      const max = el.scrollHeight - el.clientHeight;
      setShadowTop(st > 0);
      setShadowBottom(st < max - 1);
    };

    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [open]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const t = event.target as Node;
      const inButton = dropdownRef.current?.contains(t);
      const inPanel = panelRef.current?.contains(t);
      if (!inButton && !inPanel) setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    positionPanel();
    const onResize = () => positionPanel();
    const onScroll = () => positionPanel();
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [open]);

  // show TOTAL notifications (including not-yet-loaded)
  const totalCount = Number((status as any)?.total ?? 0);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={btnRef}
        aria-label="Bildirimler"
        aria-expanded={open}
        aria-controls="notif-panel"
        className="relative h-9 flex items-center gap-2 px-3 rounded-xl border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 dark:focus-visible:ring-white/10"
        onClick={() => {
          // block hover animation for 2s after click
          bellHoverBlockUntilRef.current = Date.now() + 2000;
          setOpen((o) => !o);
          if (!open) {
            refresh();
            markAll();
          }
        }}
      >
        <span
          className="inline-flex items-center justify-center"
          onMouseEnter={() => {
            // if within block window, skip hover animation
            if (Date.now() < bellHoverBlockUntilRef.current) return;
            const ref = open ? bellSolidRef.current : bellRef.current;
            ref?.stop();
            ref?.goToAndStop?.(0, true);
            ref?.play();
          }}
        >
          {open ? (
            <Lottie
              lottieRef={bellSolidRef as any}
              animationData={bellSolidAnim}
              autoplay={false}
              loop={false}
              style={{ width: 20, height: 20 }}
              className="bell-lottie"
              rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
            />
          ) : (
            <Lottie
              lottieRef={bellRef as any}
              animationData={bellAnim}
              autoplay={false}
              loop={false}
              style={{ width: 20, height: 20 }}
              className="bell-lottie"
              rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
            />
          )}
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] leading-5 text-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && typeof window !== "undefined" &&
        createPortal(
          <div
            id="notif-panel"
            aria-label="Bildirimler"
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, right: pos.right }}
            className="w-[380px] max-h-[70vh] overflow-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl pb-2 pt-0 z-[60] relative"
          >
            {/* Scroll shadows */}
            {shadowTop && (
              <div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-black/10 to-transparent dark:from-white/10" />
            )}
            <div className="sticky top-0 z-20 bg-white dark:bg-neutral-900 px-2 pt-2 pb-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>Bildirimler</span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">({totalCount})</span>
                  <button
                    type="button"
                    aria-label="Yenile"
                    className="ml-0.5 p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    onClick={() => {
                      const r = refreshRef.current;
                      r?.stop();
                      r?.goToAndStop?.(0, true);
                      r?.play();
                      refresh();
                    }}
                    title="Yenile"
                  >
                    <Lottie
                      lottieRef={refreshRef as any}
                      animationData={refreshAnim}
                      autoplay={false}
                      loop={false}
                      style={{ width: 18, height: 18 }}
                      className="refresh-lottie refresh-lottie--muted"
                    />
                  </button>
                  {unreadCount > 0 && (
                    <span className="inline-flex min-w-5 h-5 px-1 rounded-full bg-blue-600 text-white text-[10px] leading-5 text-center">{unreadCount > 9 ? "9+" : unreadCount}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="h-7 px-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    onClick={async () => {
                      await fetch("/api/notifications/read-all?mode=delete", { method: "POST" });
                      setHiddenIds((prev) => {
                        const next = new Set(prev);
                        for (const it of items) next.add(it.id);
                        return next;
                      });
                      refresh();
                    }}
                    title="Temizle"
                    aria-label="Temizle"
                  >
                    Temizle
                  </button>
                </div>
              </div>
              <div className="mt-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            </div>

            <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {visibleItems.map((n: Notif) => (
                <li
                  key={n.id}
                  className={`flex group gap-2 p-2 rounded cursor-pointer border-0 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 ${
                    n.type?.startsWith("REPORT")
                      ? "bg-red-50/60 dark:bg-red-900/25"
                      : (!n.readAt ? "bg-blue-50/40 dark:bg-blue-900/20" : "hover:bg-neutral-50 dark:hover:bg-neutral-800")
                  }`}
                  onClick={() => {
                    if (n.link) window.location.href = n.link;
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && n.link) {
                      e.preventDefault();
                      window.location.href = n.link;
                    }
                    if (e.key === "Delete" || e.key === "Backspace") {
                      e.preventDefault();
                      deleteNotification(n.id);
                    }
                  }}
                >
                  {n.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={n.image}
                      alt=""
                      className="w-14 h-14 rounded object-cover transition-transform duration-150 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded bg-neutral-200 dark:bg-neutral-800" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium whitespace-normal break-words leading-snug">
                      {n.type === "COMMENT_ON_OWN_ITEM" && n.data?.actorMaskedName && n.data?.rating ? (
                        <>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-neutral-200 bg-neutral-100 text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
                            {n.data.actorMaskedName}
                          </span>
                          <span className="ml-1 whitespace-nowrap">{n.data.rating}★ verdi ve yorum yaptı</span>
                        </>
                      ) : (
                        n.title
                      )}
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">{n.body}</div>
                    <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{relativeTime(n.createdAt)}</div>
                  </div>
                  {!n.readAt && <span className="mt-1 h-2 w-2 rounded-full bg-blue-600 self-start" />}
                  <button
                    className="self-start ml-2 mt-1 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-red-600"
                    aria-label="Bildirimi sil"
                    title="Bildirimi sil"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(n.id);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>

            <div className="p-2">
              {hasMore && (
                <button
                  className="w-full text-sm py-2 rounded-md border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center justify-center"
                  disabled={loading}
                  onClick={() => load()}
                  aria-label={loading ? "Yükleniyor" : "Daha fazla"}
                  title={loading ? "Yükleniyor" : "Daha fazla"}
                >
                  <Lottie
                    lottieRef={dotsRef as any}
                    animationData={dotsAnim}
                    autoplay={false}
                    loop={true}
                    style={{ width: 32, height: 12 }}
                    className="dots-lottie"
                  />
                </button>
              )}
              {!visibleItems.length && !loading && (
                <div className="text-center text-sm py-8 text-neutral-500">
                  <svg width="28" height="28" viewBox="0 0 24 24" className="mx-auto mb-2 opacity-60" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Z"/><path d="M18 16V11a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2Z"/></svg>
                  Bildirim yok
                </div>
              )}
            </div>
            <style jsx>{`
              /* Bell icons: ensure visibility in dark mode by filtering the actual SVG */
              .bell-lottie { opacity: 0.95; }
              .bell-lottie :global(svg) { display: block; }
              :global(.dark) .bell-lottie :global(svg) {
                filter: invert(1) brightness(1.25) contrast(1.05);
              }

              .refresh-lottie { opacity: 0.9; }
              .refresh-lottie :global(svg) { filter: grayscale(1) brightness(0.75); }
              :global(.dark) .refresh-lottie :global(svg) { filter: grayscale(1) brightness(1.1); }

              /* More muted refresh icon when placed in title */
              .refresh-lottie--muted { opacity: 0.7; }
              .refresh-lottie--muted :global(svg) { filter: grayscale(1) brightness(0.6); }
              :global(.dark) .refresh-lottie--muted :global(svg) { filter: grayscale(1) brightness(0.95); }

              .dots-lottie { opacity: 0.9; }
              .dots-lottie :global(svg) { filter: grayscale(1) brightness(0.55); }
              :global(.dark) .dots-lottie :global(svg) { filter: grayscale(1) brightness(1.2); opacity: 0.95; }
            `}</style>
          </div>,
          document.body
        )
      }
    </div>
  );
}