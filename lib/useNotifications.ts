"use client";
import { useEffect, useState, useCallback } from "react";

export type Notif = {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  image?: string | null;
  data?: any;
  readAt?: string | null;
  createdAt: string;
};

export function useNotifications(initialStatus: "all" | "unread" = "all", pageSize = 20) {
  const [items, setItems] = useState<Notif[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"all" | "unread">(initialStatus);

  const load = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set("limit", String(pageSize));
    qs.set("status", status);
    if (!reset && cursor) qs.set("cursor", cursor);
    const r = await fetch(`/api/notifications/list?${qs}`, { cache: "no-store" });
    const j = await r.json();
    if (j.ok) {
      const nextCur = j.nextCursor as string | null;
      setUnreadCount(j.unreadCount ?? 0);
      setTotal(j.total ?? 0);
      setHasMore(Boolean(nextCur));
      setCursor(nextCur);
      setItems((prev) => (reset ? j.items : [...prev, ...j.items]));
    }
    setLoading(false);
  }, [cursor, pageSize, status, loading]);

  const refresh = useCallback(() => { setCursor(null); load(true); }, [load]);

  const markRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    const r = await fetch("/api/notifications/read", { method: "POST", body: JSON.stringify({ ids }) });
    const j = await r.json();
    if (j.ok) {
      setUnreadCount(j.unreadCount ?? 0);
      setItems((prev) => prev.map(n => ids.includes(n.id) ? { ...n, readAt: new Date().toISOString() } : n));
    }
  }, []);

  const markAll = useCallback(async () => {
    const r = await fetch("/api/notifications/read-all", { method: "POST" });
    const j = await r.json();
    if (j.ok) {
      setUnreadCount(0);
      setItems((prev) => prev.map(n => ({ ...n, readAt: new Date().toISOString() })));
    }
  }, []);

  useEffect(() => { load(true); }, [status]); // status değişince reset
  return { items, unreadCount, total, hasMore, loading, load, refresh, markRead, markAll, status, setStatus };
}