"use client";
import { useEffect, useState } from "react";

export default function Bell() {
  const [unread, setUnread] = useState(0);

  async function refresh() {
    try {
      const r = await fetch("/api/notifications", { cache: "no-store" });
      const j = await r.json();
      setUnread(j.unread ?? 0);
    } catch {}
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, []);

  return (
    <button
      aria-label="Bildirimler"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
      onClick={() => (window.location.href = "/notifications")}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm6-6V11a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2Z" />
      </svg>
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] leading-5 text-center">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}