'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import Stars from "@/components/Stars";
import { signOut } from "next-auth/react";

type MyItem = { id:string; name:string; description:string; imageUrl?:string|null; avg:number|null; edited?:boolean };
type MyRating = { id:string; itemId:string; itemName:string; value:number };
type MyComment = { id:string; itemId:string; itemName:string; text:string; edited?:boolean };

export default function MePage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ id:string; name?:string|null; avatarUrl?:string|null }|null>(null);
  const [items, setItems] = useState<MyItem[]>([]);
  const [ratings, setRatings] = useState<MyRating[]>([]);
  const [comments, setComments] = useState<MyComment[]>([]);
  const [editingItem, setEditingItem] = useState<string|null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editImg, setEditImg] = useState<string|null>("");

  // upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/me");
    if (r.status === 401) { window.location.href = "/"; return; }
    const j = await r.json();
    setMe(j.me || null);
    setItems(j.items || []);
    setRatings(j.ratings || []);
    setComments(j.comments || []);
    setLoading(false);
  }
  useEffect(()=>{ load(); }, []);

  async function saveItem(id:string) {
    const body: any = {};
    body.description = editDesc;
    // string "" veya null => DB'de kaldır
    body.imageUrl = editImg ? editImg : null;

    const r = await fetch(`/api/items/${id}/edit`, {
      method: "PATCH",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    if (j.ok) { setEditingItem(null); await load(); }
    else alert("Hata: " + j.error);
  }

  async function changeRating(itemId: string, value:number) {
    const r = await fetch(`/api/items/${itemId}/rate`, {
      method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ value })
    });
    const j = await r.json();
    if (j.ok) await load(); else alert("Hata: " + j.error);
  }

  async function saveComment(commentId: string, nextText: string) {
    const r = await fetch(`/api/comments/${commentId}`, {
      method:"PATCH", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ text: nextText })
    });
    const j = await r.json();
    if (j.ok) await load(); else alert("Hata: " + j.error);
  }

  async function handleFileSelect(file: File) {
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      // sunucudaki route bunu 'file' ismiyle bekliyor
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Yükleme başarısız");
      const data = await res.json(); // { url }
      if (!data?.url) throw new Error("URL alınamadı");
      setEditImg(data.url);
    } catch (e:any) {
      setUploadError(e?.message || "Yükleme hatası");
    } finally {
      setUploading(false);
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

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
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

        {/* Benim eklediklerim */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Eklediklerim</h3>
          {loading ? (
            <div className="rounded-xl border p-3">Yükleniyor…</div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border p-3">Henüz item eklememişsin.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {items.map(it => (
                <div key={it.id} className="rounded-xl border p-4 bg-white dark:bg-gray-900 dark:border-gray-800">
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
                      <div className="text-xs opacity-70">{it.avg ? `${it.avg.toFixed(1)} ★` : "—"}</div>

                      {editingItem === it.id ? (
                        <div className="mt-3 space-y-3">
                          {/* Açıklama */}
                          <textarea
                            className="w-full border rounded-lg p-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                            rows={3}
                            value={editDesc}
                            onChange={(e)=>setEditDesc(e.target.value)}
                            placeholder="açıklama"
                          />

                          {/* URL ile görsel düzenleme */}
                          <input
                            className="w-full border rounded-lg p-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                            value={editImg ?? ""}
                            onChange={(e)=>setEditImg(e.target.value)}
                            placeholder="görsel URL (boş bırakırsan kaldırılır)"
                          />

                          {/* VEYA: Dosya yükle */}
                          <div className="flex items-center gap-2">
                            <label className="px-3 py-2 rounded-lg border text-sm cursor-pointer dark:border-gray-700">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e)=>{
                                  const f = e.target.files?.[0];
                                  if (f) handleFileSelect(f);
                                }}
                              />
                              Dosya seç
                            </label>
                            {uploading && <span className="text-xs opacity-70">Yükleniyor…</span>}
                            {uploadError && <span className="text-xs text-red-600">{uploadError}</span>}
                            {editImg && (
                              <button
                                type="button"
                                className="px-3 py-2 rounded-lg border text-sm dark:border-gray-700"
                                onClick={()=>setEditImg(null)}
                              >
                                Görseli kaldır
                              </button>
                            )}
                          </div>

                          {/* Önizleme */}
                          {editImg && (
                            <div className="mt-2">
                              <img
                                src={editImg}
                                alt="preview"
                                className="max-h-40 rounded-md border dark:border-gray-800 object-contain"
                              />
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={()=>saveItem(it.id)}
                              className="px-3 py-1 rounded-lg border text-sm bg-black text-white disabled:opacity-60"
                              disabled={uploading}
                            >
                              Kaydet
                            </button>
                            <button
                              onClick={()=>{ setEditingItem(null); setUploadError(null); setUploading(false); }}
                              className="px-3 py-1 rounded-lg border text-sm"
                            >
                              Vazgeç
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm opacity-80 mt-1">{it.description}</p>
                          <div className="mt-2">
                            <button
                              className="px-3 py-1 rounded-lg border text-sm"
                              onClick={()=>{
                                setEditingItem(it.id);
                                setEditDesc(it.description || "");
                                setEditImg(it.imageUrl ?? "");
                                setUploadError(null);
                                setUploading(false);
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
              ))}
            </div>
          )}
        </section>

        {/* Puanlarım */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Puanlarım</h3>
          {loading ? (
            <div className="rounded-xl border p-3">Yükleniyor…</div>
          ) : ratings.length === 0 ? (
            <div className="rounded-xl border p-3">Puan vermemişsin.</div>
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
        </section>

        {/* Yorumlarım */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Yorumlarım</h3>
          {loading ? (
            <div className="rounded-xl border p-3">Yükleniyor…</div>
          ) : comments.length === 0 ? (
            <div className="rounded-xl border p-3">Yorumun yok.</div>
          ) : (
            <div className="space-y-2">
              {comments.map(c => (
                <CommentRow key={c.id} c={c} onSave={saveComment} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function CommentRow({ c, onSave }: { c: MyComment; onSave: (id:string, t:string)=>Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(c.text);
  return (
    <div className="rounded-xl border p-3">
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
            <button className="px-3 py-1 rounded-lg border text-sm bg-black text-white" onClick={()=>onSave(c.id, val).then(()=>setEditing(false))}>Kaydet</button>
            <button className="px-3 py-1 rounded-lg border text-sm" onClick={()=>{ setEditing(false); setVal(c.text); }}>Vazgeç</button>
          </div>
        </div>
      ) : (
        <div className="mt-1 text-sm">
          “{c.text}” {c.edited && <em className="opacity-60">(düzenlendi)</em>}
          <div className="mt-2">
            <button className="px-3 py-1 rounded-lg border text-sm" onClick={()=>setEditing(true)}>Düzenle</button>
          </div>
        </div>
      )}
    </div>
  );
}
