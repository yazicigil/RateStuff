'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Tag from "@/components/Tag";
import Stars from "@/components/Stars";
import Header from "@/components/Header";

type ItemVM = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  avg: number | null;
  count: number;
  edited?: boolean;
  createdBy?: { id: string; name: string; avatarUrl?: string | null } | null;
  comments: {
    id: string;
    text: string;
    edited?: boolean;
    user?: { name?: string | null; avatarUrl?: string | null };
  }[];
  tags: string[];
};

export default function HomePage() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [order, setOrder] = useState<"new" | "top">("new");
  const [items, setItems] = useState<ItemVM[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    const [itemsRes, tagsRes, trendRes] = await Promise.all([
      fetch(`/api/items?q=${encodeURIComponent(q)}&order=${order}`).then((r) => r.json()),
      fetch("/api/tags").then((r) => r.json()),
      fetch("/api/tags/trending").then((r) => r.json()),
    ]);
    setItems(itemsRes);
    setAllTags(tagsRes);
    setTrending(trendRes);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [q, order]);

  const activeTag = useMemo(() => {
    const single = q.trim();
    if (single && !single.includes(" ") && allTags.includes(single)) return single;
    return undefined;
  }, [q, allTags]);

  async function addItem(form: FormData) {
    setAdding(true);
    try {
      const payload = {
        name: String(form.get("name") || ""),
        description: String(form.get("desc") || ""),
        tagsCsv: String(form.get("tags") || ""),
        rating: Number(form.get("rating") || "5"),
        comment: String(form.get("comment") || ""),
        imageUrl: String(form.get("imageUrl") || "") || null,
      };
      const r = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (j.ok) {
        setQ("");
        await load();
        alert("Eklendi");
      } else alert("Hata: " + j.error);
    } finally {
      setAdding(false);
    }
  }

  async function report(id: string) {
    const r = await fetch(`/api/items/${id}/report`, { method: "POST" });
    const j = await r.json();
    if (j.ok) alert(`Report alındı (${j.count})`);
    else alert("Hata: " + j.error);
  }

  async function rate(id: string, value: number) {
    const r = await fetch(`/api/items/${id}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    const j = await r.json();
    if (j.ok) await load();
    else alert("Hata: " + j.error);
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {/* Yeni header: arama + sıralama burada */}
      <Header controls={{ q, onQ: setQ, order, onOrder: setOrder }} />

      <main className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        <aside>
          <section className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800">
            <h3 className="text-lg mb-2">Trend Etiketler</h3>
            <div className="flex flex-wrap gap-2">
              {trending.map((t) => (
                <Tag key={t} label={t} onClick={(x) => setQ(x)} active={activeTag === t} />
              ))}
            </div>
          </section>
          <section className="rounded-2xl border p-4 shadow-sm mt-4 bg-white dark:bg-gray-900 dark:border-gray-800">
            <h3 className="text-lg mb-2">Tüm Etiketler</h3>
            <div className="flex flex-wrap gap-2 max-h-[50vh] overflow-auto pr-1">
              {allTags.map((t) => (
                <Tag key={t} label={t} onClick={(x) => setQ(x)} active={activeTag === t} />
              ))}
            </div>
          </section>
        </aside>

        <section className="space-y-4">
          {/* İstersen buradaki hızlı ekleme formunu tutabiliriz */}
          <form
            className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800 flex flex-wrap items-center gap-2"
            onSubmit={(e) => { e.preventDefault(); addItem(new FormData(e.currentTarget)); }}
          >
            <input name="name" className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[160px] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" placeholder="adı" required />
            <input name="desc" className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[160px] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" placeholder="kısa açıklama" required />
            <input name="tags" className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[160px] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" placeholder="etiketler (virgülle)" required />
            <select name="rating" defaultValue="5" className="border rounded-xl px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} yıldız</option>)}
            </select>
            <input name="comment" className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[160px] dark:bg-gray-
