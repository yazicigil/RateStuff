'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import Stars from "@/components/Stars";
import { signOut } from "next-auth/react";

type MyItem   = { id:string; name:string; description:string; imageUrl?:string|null; avg:number|null; edited?:boolean };
type MyRating = { id:string; itemId:string; itemName:string; value:number };
type MyComment= { id:string; itemId:string; itemName:string; text:string; edited?:boolean };

export default function MePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [me, setMe]           = useState<{ id:string; name?:string|null; avatarUrl?:string|null }|null>(null);
  const [items, setItems]     = useState<MyItem[]>([]);
  const [saved, setSaved]     = useState<MyItem[]>([]);
  const [ratings, setRatings] = useState<MyRating[]>([]);
  const [comments, setComments]=useState<MyComment[]>([]);
  const [editingItem, setEditingItem] = useState<string|null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editImg,  setEditImg]  = useState<string|null>("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/me", { cache: "no-store" });
      if (r.status === 401) { window.location.href = "/"; return; }

      // Güvenli JSON parse
      let data: any = null;
      const text = await r.text();
      try { data = text ? JSON.parse(text) : null; }
      catch { throw new Error(`/api/me JSON parse failed (status ${r.status})`); }

      if (!r.ok || !data?.ok) {
        throw new Error(data?.error || `status ${r.status}`);
      }

      setMe(data.me || null);
      setItems(data.items || []);
      setSaved(data.saved || []);
      setRatings(data.ratings || []);
      setComments(data.comments || []);
    } catch (e:any) {
      setError(`Hata: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }
  useEffect(()=>{ load(); }, []);

  async function saveItem(id:string) {
    const body:any = { description: editDesc, imageUrl: editImg === "" ? null : editImg };
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
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

        {/* Eklediklerim */}
        <Section title="Eklediklerim">
          {loading ? <Box>Yükleniyor…</Box> :
           ( (items.length===0) ? <Box>Henüz yok.</Box> :
              <div className="grid md:grid-cols-2 gap-4">
                {items.map(it => (
                  <ItemEditor key={it.id} it={it}
                    editingItem={editingItem}
                    setEditingItem={setEditingItem}
                    editDesc={editDesc} setEditDesc={setEditDesc}
                    editImg={editImg} setEditImg={setEditImg}
                    onSave={()=>saveItem(it.id)}
                  />
                ))}
              </div>
           )
          }
        </Section>

        {/* Kaydedilenler */}
        <Section title="Kaydedilenler">
          {loading ? <Box>Yükleniyor…</Box> :
           (saved.length===0 ? <Box>Henüz yok.</Box> :
            <div className="grid md:grid-cols-2 gap-4">
              {saved.map(it => (
                <div key={it.id} className="rounded-xl border p-4 bg-white dark:bg-gray-900 dark:border-gray-800">
                  <div className="text-base font-medium truncate">{it.name}</div>
                  <div className="text-xs opacity-70">{it.avg ? `${it.avg.toFixed(2)} ★` : "—"}</div>
                  <p className="text-sm opacity-80 mt-1">{it.description}</p>
                </div>
              ))}
            </div>
           )}
        </Section>

        {/* Puanlarım */}
        <Section title="Puanlarım">
          {loading ? <Box>Yükleniyor…</Box> :
           (ratings.length===0 ? <Box>Puan vermemişsin.</Box> :
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

        {/* Yorumlarım */}
        <Section title="Yorumlarım">
          {loading ? <Box>Yükleniyor…</Box> :
           (comments.length===0 ? <Box>Yorumun yok.</Box> :
            <div className="space-y-2">
              {comments.map(c => (
                <CommentRow key={c.id} c={c} onSave={saveComment} />
              ))}
            </div>
           )}
        </Section>
      </main>
    </div>
  );
}

// — küçük yardımcılar —
function Section({ title, children }:{title:string; children:any}) {
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      {children}
    </section>
  );
}
function Box({ children }:{children:any}) {
  return <div className="rounded-xl border p-3">{children}</div>;
}

function ItemEditor(props: {
  it: MyItem;
  editingItem: string|null; setEditingItem: (id:string|null)=>void;
  editDesc: string; setEditDesc: (s:string)=>void;
  editImg: string|null; setEditImg: (s:string|null)=>void;
  onSave: ()=>Promise<void>|void;
}) {
  const { it, editingItem, setEditingItem, editDesc, setEditDesc, editImg, setEditImg, onSave } = props;
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

          {editingItem === it.id ? (
            <div className="mt-2 space-y-2">
              <textarea
                className="w-full border rounded-lg p-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                rows={3}
                value={editDesc}
                onChange={(e)=>setEditDesc(e.target.value)}
                placeholder="açıklama"
              />
              <input
                className="w-full border rounded-lg p-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                value={editImg ?? ""}
                onChange={(e)=>setEditImg(e.target.value)}
                placeholder="görsel URL (boş bırakırsan kaldırılır)"
              />
              <div className="flex gap-2">
                <button onClick={()=>onSave()} className="px-3 py-1 rounded-lg border text-sm bg-black text-white">Kaydet</button>
                <button onClick={()=>setEditingItem(null)} className="px-3 py-1 rounded-lg border text-sm">Vazgeç</button>
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
