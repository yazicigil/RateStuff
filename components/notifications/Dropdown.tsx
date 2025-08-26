"use client";
import { useState } from "react";
import { useNotifications } from "@/lib/useNotifications";

export default function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const { items, unreadCount, hasMore, loading, load, refresh, markRead, markAll, status, setStatus } =
    useNotifications("all", 20);

  return (
    <div className="relative">
      <button
        aria-label="Bildirimler"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
        onClick={() => { setOpen((o) => !o); if (!open) refresh(); }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm6-6V11a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2Z"/></svg>
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
              <button
                className={`px-2 py-1 rounded ${status==="unread"?"bg-neutral-200 dark:bg-neutral-800":""}`}
                onClick={() => setStatus("unread")}
              >Okunmamış</button>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-xs underline" onClick={() => markAll()}>Tümünü oku</button>
              <button className="text-xs underline" onClick={() => refresh()}>Yenile</button>
            </div>
          </div>

          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {items.map(n => (
              <li key={n.id} className="flex gap-2 p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded">
                {n.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.image} alt="" className="w-10 h-10 rounded object-cover" loading="lazy" />
                ) : (
                  <div className="w-10 h-10 rounded bg-neutral-200 dark:bg-neutral-800" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{n.title}</div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">{n.body}</div>
                  <div className="mt-1 flex items-center gap-2">
                    {n.link && (
                      <a href={n.link} className="text-xs underline">Git</a>
                    )}
                    {!n.readAt && (
                      <button className="text-xs underline" onClick={() => markRead([n.id])}>Okundu</button>
                    )}
                  </div>
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
            {!items.length && !loading && <div className="text-center text-sm py-4 text-neutral-500">Bildirim yok</div>}
          </div>
        </div>
      )}
    </div>
  );
}