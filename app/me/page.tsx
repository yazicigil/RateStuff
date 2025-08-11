'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Stars from "@/components/Stars";
import { signOut } from "next-auth/react";
import ImageUploader from "@/components/ImageUploader";
import { useSession } from "next-auth/react";

type MyItem = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  avg: number | null;
  edited?: boolean;
  tags?: string[]; // saved filtre + kartlarda gösterim
};
type MyRating  = { id: string; itemId: string; itemName: string; value: number };
type MyComment = { id: string; itemId: string; itemName: string; text: string; edited?: boolean };

export default function MePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [me, setMe]           = useState<{ id:string; name?:string|null; avatarUrl?:string|null }|null>(null);
  const [items, setItems]     = useState<MyItem[]>([]);
  const [saved, setSaved]     = useState<MyItem[]>([]);
  const [ratings, setRatings] = useState<MyRating[]>([]);
  const [comments, setComments] = useState<MyComment[]>([]);

  // Eklediklerimi düzenleme
  const [editingItem, setEditingItem] = useState<string|null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editImg,  setEditImg]  = useState<string|null>(null);

  // Kaydedilenler filtre (tag)
  const [savedTag, setSavedTag] = useState<string | null>(null);

  // Yorumlar: kaç adet görünüyor
  const [commentsLimit, setCommentsLimit] = useState(5);

  // giriş kontrolü
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      const back = encodeURIComponent(window.location.href);
      window.location.href = `/api/auth/signin?callbackUrl=${back}`;
    }
  }, [status]);

  // buradan sonra load fonksiyonun geliyor

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/me", { cache: "no-store" });
      if (r.status === 401) { window.location.href = "/"; return; }
      const text = await r.text();
      const data = text ? JSON.parse(text) : null;
      if (!r.ok || !data?.ok) throw new Error(data?.error || `status ${r.status}`);

      setMe(data.me || null);
      setItems(data.items || []);
      setSaved(data.saved || []);       // saved[i].tags varsa filtre ve rozetler çalışır
      setRatings(data.ratings || []);
      setComments(data.comments || []);
    } catch (e:any) {
      setError(`Hata: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }
  useEffect(()=>{ load(); }, []);

  // Kaydedilenler için mevcut tag’lar (sadece saved içinden)
  const savedTags = useMemo(() => {
    const s = new Set<string>();
    for (const it of saved) (it.tags || []).forEach(t => s.add(t));
    return Array.from(s).sort();
  }, [saved]);

  const filteredSaved = useMemo(() => {
    if (!savedTag) return saved;
    return saved.filter(it => (it.tags || []).includes(savedTag));
  }, [saved, savedTag]);

  async function saveItem(id:string) {
    const body:any = { description: editDesc, imageUrl: editImg ?? null };
    const r = await fetch(`/api/items/${id}/edit`, {
      method: "PATCH", headers: { "Content-Type":"application/json" }, body: JSON.stringify(body)
    });
    const j = await r.json().catch(()=>null);
    if (j?.ok) { setEditingItem(null); await load(); } else alert("Hata: " + (j?.error || r.status));
  }

  async function changeRating(itemId: string, value:number) {
    const r = await fetch(`/api/items/${itemId}/rate`, {
      method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ value })
    });
    const j = await r.json().catch(()=>null);
    if (j?.ok) await load(); else alert("Hata: " + (j?.error || r.status));
  }

  async function saveComment(commentId: string, nextText: string) {
    const r = await fetch(`/api/comments/${commentId}`, {
      method:"PATCH", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ text: nextText })
    });
    const j = await r.json().catch(()=>null);
    if (j?.ok) await load(); else alert("Hata: " + (j?.error || r.status));
  }

  async function deleteComment(commentId: string) {
    const r = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    const j = await r.json().catch(()=>null);
    if (j?.ok) {
      setComments(prev => prev.filter(c => c.id !== commentId));
    } else {
      alert("Hata: " + (j?.error || r.status));
    }
  }

  async function removeSaved(itemId: string) {
    const r = await fetch(`/api/items/${itemId}/save`, { method: "DELETE" });
    const j = await r.json().catch(()=>null);
    if (j?.ok) {
      setSaved(prev => prev.filter(x => x.id !== itemId));
    } else {
      alert("Hata: " + (j?.error || r.status));
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur border-b bg-white/80 dark:bg-gray-900/70 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link href="/" className="px-2 py-1 rounded-xl border dark:border-gray-700">← Anasayfa</Link>
            <span className="text-lg font-semibold">Profil</span>
          </div>
          <button
            onClick={()=>signOut({ callbackUrl: "/" })}
            className="px-3 py-2 rounded-xl border text-sm dark:border-gray-700"
          >
            Çıkış
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Profil kartı */}
        <section className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800 flex items-center gap-3">
          {me?.avatarUrl ? (
            <img src={me.avatarUrl} alt="me" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-200" />
          )}
          <div>
            <div className="text-base font-medium">{me?.name || "Profilim"}</div>
            <div className="text-xs opacity-70">Yalnızca burada gerçek adın gösterilir</div>
          </div>
        </section>

        {/* 1) KAYDEDİLENLER — en üstte, default açık, etiket filtreli */}
        <Section title="Kaydedilenler" defaultOpen>
          {loading ? (
            <Box>Yükleniyor…</Box>
          ) : saved.length === 0 ? (
            <Box>Henüz yok.</Box>
          ) : (
            <>
              {/* Etiket filtresi (sadece saved içinde etiket varsa görünür) */}
              {savedTags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  <button
                    className={`px-2 py-1 rounded-full border text-xs ${
                      !savedTag ? 'bg-black text-white border-black' : 'bg-white dark:bg-gray-900 dark:border-gray-800'
                    }`}
                    onClick={() => setSavedTag(null)}
                  >
                    Hepsi
                  </button>
                  {savedTags.map(t => (
                    <button
                      key={t}
                      className={`px-2 py-1 rounded-full border text-xs ${
                        savedTag === t
                          ? 'bg-black text-white border-black'
                          : 'bg-white dark:bg-gray-900 dark:border-gray-800'
                      }`}
                      onClick={() => setSavedTag(t)}
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {filteredSaved.map(it => (
                  <div key={it.id} className="rounded-xl border p-4 bg-white dark:bg-gray-900 dark:border-gray-800">
                    <div className="flex items-start gap-3">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 grid place-items-center">
                        {it.imageUrl ? (
                          <img src={it.imageUrl} alt={it.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs opacity-60">no img</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-base font-medium truncate">{it.name}</div>
                          <button
                            onClick={() => removeSaved(it.id)}
                            className="text-xs px-2 py-1 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800"
                            title="Kaydedilenlerden kaldır"
                          >
                            Kaldır
                          </button>
                        </div>
                        <div className="text-xs opacity-70">{it.avg ? `${it.avg.toFixed(2)} ★` : "—"}</div>
                        <p className="text-sm opacity-80 mt-1 line-clamp-3">{it.description}</p>

                        {/* Etiket rozetleri (varsa) */}
                        {!!(it.tags && it.tags.length) && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {it.tags.slice(0, 10).map(t => (
                              <span
                                key={t}
                                className="px-2 py-0.5 rounded-full text-xs border bg-white dark:bg-gray-800 dark:border-gray-700"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}

                        {it.edited && (
                          <span className="mt-2 inline-block text-[11px] px-2 py-0.5 rounded-full border bg-white dark:bg-gray-800 dark:border-gray-700">
                            düzenlendi
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>

        {/* 2) EKLEDİKLERİM — collapsible, içinde ImageUploader ile düzenleme */}
        <Section title="Eklediklerim">
          {loading ? (
            <Box>Yükleniyor…</Box>
          ) : items.length === 0 ? (
            <Box>Henüz yok.</Box>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {items.map(it => (
                <ItemEditor
                  key={it.id}
                  it={it}
                  editingItem={editingItem}
                  setEditingItem={(id) => {
                    setEditingItem(id);
                    if (id === it.id) {
                      setEditDesc(it.description || "");
                      setEditImg(it.imageUrl ?? null);
                    }
                  }}
                  editDesc={editDesc}
                  setEditDesc={setEditDesc}
                  editImg={editImg}
                  setEditImg={setEditImg}
                  onSave={() => saveItem(it.id)}
                />
              ))}
            </div>
          )}
        </Section>

        {/* 3) PUANLARIM — collapsible */}
        <Section title="Puanlarım">
          {loading ? (
            <Box>Yükleniyor…</Box>
          ) : ratings.length === 0 ? (
            <Box>Puan vermemişsin.</Box>
          ) : (
            <div className="space-y-2">
              {ratings.map(r => (
                <div key={r.id} className="rounded-xl border p-3 flex items-center justify-between">
                  <div className="truncate">{r.itemName}</div>
                  <Stars value={r.value} onRate={(n)=>changeRating(r.itemId, n)} />
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* 4) YORUMLARIM — collapsible, 2 sütun, son 5 + daha fazla */}
        <Section title="Yorumlarım">
          {loading ? (
            <Box>Yükleniyor…</Box>
          ) : comments.length === 0 ? (
            <Box>Yorumun yok.</Box>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-3">
                {comments.slice(0, commentsLimit).map(c => (
                  <CommentRow
                    key={c.id}
                    c={c}
                    onSave={saveComment}
                    onDelete={deleteComment}
                  />
                ))}
              </div>
              {comments.length > commentsLimit && (
                <div className="pt-2">
                  <button
                    className="px-3 py-2 rounded-xl border text-sm dark:border-gray-700"
                    onClick={() => setCommentsLimit(l => l + 5)}
                  >
                    Daha fazla göster
                  </button>
                </div>
              )}
            </>
          )}
        </Section>
      </main>
    </div>
  );
}

/* — Collapsible Section (+/- ikonlu) — */
function Section({
  title,
  defaultOpen = false,
  children,
}: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl border dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full cursor-pointer select-none px-4 py-3 text-lg font-semibold flex items-center justify-between"
      >
        <span>{title}</span>
        <span className="text-sm opacity-60">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </section>
  );
}

function Box({ children }:{children:any}) {
  return <div className="rounded-xl border dark:border-gray-800 p-3 bg-white dark:bg-gray-900">{children}</div>;
}

/* — Editor kartı (ImageUploader entegre) — */
function ItemEditor(props: {
  it: MyItem;
  editingItem: string|null; setEditingItem: (id:string|null)=>void;
  editDesc: string; setEditDesc: (s:string)=>void;
  editImg: string|null; setEditImg: (s:string|null)=>void;
  onSave: ()=>Promise<void>|void;
}) {
  const { it, editingItem, setEditingItem, editDesc, setEditDesc, editImg, setEditImg, onSave } = props;
  const isEditing = editingItem === it.id;

  return (
    <div className="rounded-xl border p-4 bg-white dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-start gap-3">
        {it.imageUrl ? (
          <img src={it.imageUrl} className="w-20 h-20 rounded-lg object-cover" alt={it.name} />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-gray-200 grid place-items-center text-xs">no img</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-base font-medium truncate">{it.name}</div>
            {it.edited && (
              <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white dark:bg-gray-800 dark:border-gray-700">düzenlendi</span>
            )}
          </div>
          <div className="text-xs opacity-70">{it.avg ? `${it.avg.toFixed(2)} ★` : "—"}</div>

          {isEditing ? (
            <div className="mt-3 space-y-3">
              <label className="block text-sm font-medium">Açıklama</label>
              <textarea
                className="w-full border rounded-lg p-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                rows={3}
                value={editDesc}
                onChange={(e)=>setEditDesc(e.target.value)}
                placeholder="açıklama"
              />

              <div>
                <div className="text-sm font-medium mb-1">Görsel</div>
                <ImageUploader value={editImg ?? null} onChange={setEditImg} />
              </div>

              <div className="flex gap-2">
                <button onClick={()=>onSave()} className="px-3 py-1.5 rounded-lg border text-sm bg-black text-white">Kaydet</button>
                <button onClick={()=>setEditingItem(null)} className="px-3 py-1.5 rounded-lg border text-sm">Vazgeç</button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm opacity-80 mt-1">{it.description}</p>
              <div className="mt-2">
                <button
                  className="px-3 py-1.5 rounded-lg border text-sm"
                  onClick={()=>{
                    setEditingItem(it.id);
                    setEditDesc(it.description || "");
                    setEditImg(it.imageUrl ?? null);
                  }}
                >
                  Düzenle (başlık hariç)
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* — Yorum satırı, kaldırma butonlu — */
function CommentRow({
  c,
  onSave,
  onDelete,
}: {
  c: MyComment;
  onSave: (id:string, t:string)=>Promise<void>;
  onDelete: (id:string)=>Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(c.text);
  return (
    <div className="rounded-xl border dark:border-gray-800 p-3 bg-white dark:bg-gray-900">
      <div className="text-sm opacity-70">{c.itemName}</div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <textarea
            value={val}
            onChange={(e)=>setVal(e.target.value)}
            rows={3}
            className="w-full border rounded-lg p-2 text-sm dark:bg-gray-800 dark:border-gray-700"
          />
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded-lg border text-sm bg-black text-white"
              onClick={()=>onSave(c.id, val).then(()=>setEditing(false))}
            >
              Kaydet
            </button>
            <button
              className="px-3 py-1.5 rounded-lg border text-sm"
              onClick={()=>{ setEditing(false); setVal(c.text); }}
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-1 text-sm">
          “{c.text}” {c.edited && <em className="opacity-60">(düzenlendi)</em>}
          <div className="mt-2 flex gap-2">
            <button className="px-3 py-1.5 rounded-lg border text-sm" onClick={()=>setEditing(true)}>
              Düzenle
            </button>
            <button
              className="px-3 py-1.5 rounded-lg border text-sm hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={()=>onDelete(c.id)}
              title="Yorumu kaldır"
            >
              Kaldır
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
