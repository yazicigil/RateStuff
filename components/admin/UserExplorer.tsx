"use client";
import { useEffect, useMemo, useState } from "react";

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
  items: { id: string; name: string; imageUrl?: string | null; createdAt: string }[];
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
        <div className="rounded-xl border">
          <div className="px-3 py-2 text-sm font-medium">Kullanıcılar</div>
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
              <div className="flex items-center gap-3 mb-3">
                <img src={avatarFor(actUser)} alt="" className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <div className="font-medium">{actUser.name || actUser.email || actUser.id}</div>
                  {actUser.email && <div className="text-xs opacity-70">{actUser.email}</div>}
                </div>
              </div>

              <div className="grid gap-4">
                {/* Items */}
                <div>
                  <div className="text-sm font-medium mb-2">Paylaştığı Gönderiler</div>
                  <ul className="space-y-2">
                    {activity!.items.map(it => (
                      <li key={it.id} className="flex items-center gap-3 rounded-lg border p-2">
                        {it.imageUrl
                          ? <img src={it.imageUrl} className="w-14 h-14 rounded object-cover" alt="" />
                          : <div className="w-14 h-14 rounded bg-neutral-200 dark:bg-neutral-800" />
                        }
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{it.name}</div>
                          <div className="text-xs opacity-60">{new Date(it.createdAt).toLocaleString()}</div>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}