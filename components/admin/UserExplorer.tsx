"use client";

import { useEffect, useMemo, useState } from "react";
import ImageUploader from "@/components/ImageUploader";

type UserLite = {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl?: string | null;
  image?: string | null;
  _count?: { items: number; comments: number };
};

type Activity = {
  user: UserLite;
  items: { id: string; name: string; imageUrl?: string | null; createdAt: string; _count?: { reports: number } }[];
  comments: { id: string; createdAt: string; text?: string | null; stars?: number | null; item?: { id: string; name: string } | null }[];
};

export default function UserExplorer() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loadingAct, setLoadingAct] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [showSend, setShowSend] = useState(false);
  const [sendTitle, setSendTitle] = useState("");
  const [sendBody, setSendBody] = useState("");
  const [sendImage, setSendImage] = useState<string | null>(null);
  const [sendLink, setSendLink] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);
  const [sendErr, setSendErr] = useState<string | null>(null);

  const [showDelete, setShowDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string|null>(null);

  async function search() {
    setErr(null);
    setLoading(true);
    const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
    const j = await res.json();
    setLoading(false);
    if (res.ok && j.ok) setUsers(j.users as UserLite[]);
    else setErr(j.error || "Hata");
  }

  useEffect(() => {
    // açılışta son kullanıcılar
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openUser(userId: string) {
    if (active === userId) { setActive(null); setActivity(null); return; } // toggle
    setActive(userId);
    setLoadingAct(true);
    const res = await fetch(`/api/admin/users/${userId}/activity`, { cache: "no-store" });
    const j = await res.json();
    setLoadingAct(false);
    if (res.ok && j.ok) setActivity(j as Activity);
  }

  const avatarFor = (u: UserLite) => u.avatarUrl || u.image || "/badges/tag.svg";

  const actUser = activity?.user ?? null;

  async function sendToUser() {
    if (!actUser) return;
    setSendErr(null); setSendMsg(null); setSendLoading(true);
    const res = await fetch("/api/admin/notifications/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId: actUser.id,
        title: sendTitle,
        body: sendBody,
        image: sendImage || undefined,
        link: sendLink || undefined,
      }),
    });
    const j = await res.json();
    setSendLoading(false);
    if (res.ok && j.ok) {
      setSendMsg("Gönderildi.");
      setSendTitle(""); setSendBody(""); setSendImage(null); setSendLink("");
      setTimeout(() => { setShowSend(false); setSendMsg(null); }, 800);
    } else {
      setSendErr(j.error || "Hata");
    }
  }

  async function deleteUser() {
    if (!actUser) return;
    setDeleteErr(null);
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${actUser.id}/delete`, { method: "DELETE" });
      let j: any = null;
      try {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) j = await res.json();
      } catch (_) {}

      if (res.ok && (j?.ok ?? true)) {
        // Başarılı: modal kapat, seçimi temizle, listeden kaldır
        setShowDelete(false);
        setActivity(null);
        setActive(null);
        setUsers(prev => prev.filter(u => u.id !== actUser.id));
        // Listeyi tazele (opsiyonel, güvence için)
        search();
      } else {
        setDeleteErr(j?.error || `Hata: ${res.status}`);
      }
    } catch (e: any) {
      setDeleteErr(e?.message || "Hata");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border p-4 bg-white dark:bg-neutral-900">
      <h3 className="text-base font-semibold mb-3">Kullanıcı Gezgini</h3>

      <div className="flex gap-2 mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") search(); }}
          placeholder="İsim veya e-posta ile ara"
          className="flex-1 border rounded-lg px-3 py-2 bg-transparent"
        />
        <button onClick={search} className="h-9 px-4 rounded-lg border bg-black text-white">Ara</button>
      </div>

      {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
      {loading && <div className="text-sm opacity-70 mb-2">Yükleniyor…</div>}

      <div className="grid md:grid-cols-2 gap-3">
        {/* Sol: kullanıcı listesi */}
        <div className="rounded-xl border max-h-96 overflow-y-auto">
          <div className="px-3 py-2 text-sm font-medium sticky top-0 bg-white dark:bg-neutral-900 z-10">Kullanıcılar</div>
          <ul className="divide-y">
            {users.map(u => (
              <li key={u.id}
                  className={`px-3 py-2 flex items-center gap-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 ${active===u.id ? "bg-neutral-50 dark:bg-neutral-800" : ""}`}
                  onClick={() => openUser(u.id)}>
                <img src={avatarFor(u)} alt="" className="w-8 h-8 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="truncate">{u.name || u.email || u.id}</div>
                  <div className="text-xs opacity-60">
                    {typeof u._count?.items === "number" ? `${u._count.items} item` : ""} {typeof u._count?.comments === "number" ? `• ${u._count.comments} yorum` : ""}
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-md border">Detay</span>
              </li>
            ))}
            {!users.length && !loading && <li className="px-3 py-3 text-sm opacity-70">Sonuç yok.</li>}
          </ul>
        </div>

        {/* Sağ: seçilen kullanıcının activity'si */}
        <div className="rounded-xl border p-3">
          {!actUser && <div className="text-sm opacity-70">Bir kullanıcı seç.</div>}
          {loadingAct && <div className="text-sm opacity-70">Detaylar yükleniyor…</div>}
          {actUser && !loadingAct && (
            <>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <img src={avatarFor(actUser)} alt="" className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <div className="font-medium">{actUser.name || actUser.email || actUser.id}</div>
                    {actUser.email && <div className="text-xs opacity-70">{actUser.email}</div>}
                  </div>
                </div>
                <button onClick={() => setShowSend(true)}
                        className="inline-flex items-center gap-1 h-8 px-3 rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-800"
                        title="Bildirim gönder">
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm6-6v-5a6 6 0 0 0-5-5.91V4a1 1 0 1 0-2 0v1.09A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2Z" fill="currentColor"/></svg>
                  <span className="text-sm">Bildirim</span>
                </button>
              </div>

              <div className="grid gap-4">
                {/* Items */}
                <div>
                  <div className="text-sm font-medium mb-2">Paylaştığı Gönderiler</div>
                  <ul className="space-y-2">
                    {activity!.items.map(it => (
                      <li
                        key={it.id}
                        className={`flex items-center gap-3 rounded-lg border p-2 ${
                          (it._count?.reports ?? 0) >= 10
                            ? 'border-red-300 bg-red-50/60 dark:border-red-900/40 dark:bg-red-900/20'
                            : ''
                        }`}
                      >
                        {it.imageUrl
                          ? <img src={it.imageUrl} className="w-14 h-14 rounded object-cover" alt="" />
                          : <div className="w-14 h-14 rounded bg-neutral-200 dark:bg-neutral-800" />
                        }
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{it.name}</div>
                          <div className="text-xs opacity-60">
                            {new Date(it.createdAt).toLocaleString()}
                            {typeof it._count?.reports === 'number' && (
                              <> {' \u2022 '} {it._count.reports} report</>
                            )}
                          </div>
                        </div>
                        <a href={`/share/${it.id}`} target="_blank" className="text-xs px-2 h-7 rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-800">Gönderiye git</a>
                      </li>
                    ))}
                    {!activity!.items.length && <li className="text-sm opacity-70">Paylaşım yok.</li>}
                  </ul>
                </div>

                {/* Comments & Ratings */}
                <div>
                  <div className="text-sm font-medium mb-2">Yorum / Puanlar</div>
                  <ul className="space-y-2">
                    {activity!.comments.map(c => (
                      <li key={c.id} className="rounded-lg border p-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{c.item?.name || "—"}</div>
                          <div className="text-xs opacity-60">{new Date(c.createdAt).toLocaleString()}</div>
                        </div>
                        {c.stars != null && (
                          <div className="text-xs opacity-80 mt-1">⭐ {c.stars}</div>
                        )}
                        {c.text && <div className="mt-1 text-sm">{c.text}</div>}
                        {c.item?.id && (
                          <a href={`/share/${c.item.id}`} target="_blank" className="mt-2 inline-block text-xs px-2 h-7 rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-800">
                            Gönderiye git
                          </a>
                        )}
                      </li>
                    ))}
                    {!activity!.comments.length && <li className="text-sm opacity-70">Yorum/puan yok.</li>}
                  </ul>
                </div>
              </div>

              {showSend && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setShowSend(false)} />
                  <div className="relative z-[101] w-full max-w-md rounded-xl border bg-white dark:bg-neutral-900 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">Kullanıcıya Bildirim Gönder</div>
                      <button onClick={() => setShowSend(false)} className="text-sm opacity-70">Kapat</button>
                    </div>

                    {sendMsg && <div className="mb-2 text-sm text-emerald-600">{sendMsg}</div>}
                    {sendErr && <div className="mb-2 text-sm text-red-600">{sendErr}</div>}

                    <div className="grid gap-2">
                      <input
                        value={sendTitle}
                        onChange={(e) => setSendTitle(e.target.value)}
                        placeholder="Başlık"
                        className="border rounded-lg px-3 py-2 bg-transparent"
                      />
                      <textarea
                        value={sendBody}
                        onChange={(e) => setSendBody(e.target.value)}
                        placeholder="Açıklama"
                        rows={3}
                        className="border rounded-lg px-3 py-2 bg-transparent"
                      />
                      <div>
                        <div className="text-xs mb-1 opacity-70">Görsel (opsiyonel)</div>
                        <ImageUploader value={sendImage} onChange={setSendImage} />
                      </div>
                      <input
                        value={sendLink}
                        onChange={(e) => setSendLink(e.target.value)}
                        placeholder="Tıklanınca gidilecek link (opsiyonel)"
                        className="border rounded-lg px-3 py-2 bg-transparent"
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          disabled={sendLoading || !sendTitle || !sendBody}
                          onClick={sendToUser}
                          className="h-9 px-4 rounded-lg bg-black text-white disabled:opacity-50"
                        >
                          {sendLoading ? "Gönderiliyor…" : "Gönder"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {actUser && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowDelete(true)}
                    className="text-xs px-3 h-8 rounded-md border border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                  >
                    Kullanıcıyı Sil
                  </button>
                </div>
              )}

              {showDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setShowDelete(false)} />
                  <div className="relative z-[101] w-full max-w-sm rounded-xl border bg-white dark:bg-neutral-900 p-4">
                    <div className="font-semibold mb-2">Kullanıcıyı sil</div>
                    <p className="text-sm mb-3">Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowDelete(false)} className="h-8 px-3 rounded-md border">Vazgeç</button>
                      <button
                        onClick={deleteUser}
                        disabled={deleteLoading}
                        className="h-8 px-3 rounded-md border border-red-500 bg-red-600 text-white disabled:opacity-50"
                      >
                        {deleteLoading ? "Siliniyor…" : "Sil"}
                      </button>
                    </div>
                    {deleteErr && <div className="mt-2 text-sm text-red-600">{deleteErr}</div>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}