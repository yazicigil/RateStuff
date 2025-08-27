"use client";
import { useState } from "react";
import { useNotifications, type Notif } from "@/lib/useNotifications";

export default function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const { items, unreadCount, hasMore, loading, load, refresh, markRead, markAll, status, setStatus } =
    useNotifications("all", 5);
  const visibleItems: Notif[] = items.filter(n => !hiddenIds.has(n.id));

  return (
    <div className="relative">
      <button
        aria-label="Bildirimler"
        className="relative h-9 flex items-center gap-2 px-3 rounded-xl border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 dark:focus-visible:ring-white/10"
        onClick={() => { 
          setOpen((o) => !o); 
          if (!open) { 
            refresh(); 
            markAll(); 
          } 
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22c1.1 0 2-.9 2-2H10a2 2 0 0 0 2 2Z" />
          <path d="M18 16V11a6 6 0 1 0-12 0v5l-2 2h16l-2-2Z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] leading-5 text-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-h-[70vh] overflow-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg p-2 z-[60]">
          <div className="flex items-center justify-between px-1 py-1">
            <div className="flex gap-1 text-xs">
              <button
                className={`px-2 py-1 rounded ${status==="all"?"bg-neutral-200 dark:bg-neutral-800":""}`}
                onClick={() => setStatus("all")}
              >Tümü</button>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="text-xs underline"
                onClick={async () => {
                  await markAll();
                  // mevcut listeyi görünümden temizle
                  setHiddenIds((prev) => {
                    const next = new Set(prev);
                    for (const it of items) next.add(it.id);
                    return next;
                  });
                }}
              >
                Bildirimleri temizle
              </button>
              <button className="text-xs underline" onClick={() => refresh()}>Yenile</button>
            </div>
          </div>

          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {visibleItems.map((n: Notif) => (
              <li
                key={n.id}
                className="flex gap-2 p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded cursor-pointer"
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
                }}
              >
                {n.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.image} alt="" className="w-10 h-10 rounded object-cover" loading="lazy" />
                ) : (
                  <div className="w-10 h-10 rounded bg-neutral-200 dark:bg-neutral-800" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{n.title}</div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">{n.body}</div>
                </div>
                {!n.readAt && <span className="mt-1 h-2 w-2 rounded-full bg-blue-600 self-start" />}
              </li>
            ))}
          </ul>

          <div className="p-2">
            {hasMore && (
              <button
                className="w-full text-sm py-2 rounded-md border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                disabled={loading}
                onClick={() => load()}
              >Daha fazla</button>
            )}
            {!visibleItems.length && !loading && <div className="text-center text-sm py-4 text-neutral-500">Bildirim yok</div>}
          </div>
        </div>
      )}
    </div>
  );
}