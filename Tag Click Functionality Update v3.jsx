import React, { useEffect, useMemo, useRef, useState } from "react";

// NOTE: To fully apply the Dumero Rounded logo font, include the font source in your app (e.g., @font-face or a <link> in index.html).
// Logo texts use inline style { fontFamily: 'Dumero Rounded', ui-sans-serif } so the font will take effect once it's loaded.

/* ===== utils ===== */
const uid =
  typeof crypto !== "undefined" && crypto.randomUUID
    ? () => crypto.randomUUID()
    : () => Math.random().toString(36).slice(2);

const clamp = (n, min = 1, max = 5) => Math.max(min, Math.min(max, n));

const maskName = (fullName) =>
  fullName
    .trim()
    .split(/\s+/)
    .map((s) =>
      s ? s[0].toLocaleUpperCase("tr-TR") + "*".repeat(Math.max(1, Math.min(10, s.length - 1))) : ""
    )
    .join(" ");

const avgRating = (item) => {
  const arr = item.ratings || [];
  return arr.length ? arr.reduce((a, r) => a + Number(r.value || 0), 0) / arr.length : 0;
};

const wilsonFromMean = (mean, n, z = 1.96) => {
  if (!n) return 0;
  const p = mean / 5;
  const denom = 1 + (z * z) / n;
  const centreAdj = p + (z * z) / (2 * n);
  const adjStdErr = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  return ((centreAdj - adjStdErr) / denom) * 5;
};

const save = (k, d) => {
  try { if (typeof window === "undefined") return; localStorage.setItem(k, JSON.stringify(d)); } catch {}
};
const load = (k, f) => {
  try { if (typeof window === "undefined") return f; const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : f; } catch { return f; }
};

/* ===== storage keys ===== */
const STORAGE_KEY = "ratestuff_mvp_v35"; // bump key for new fields
const USER_KEY = "ratestuff_user_v1";
const THEME_KEY = "ratestuff_theme_v1"; // 'light' | 'dark' | 'auto'
const SORT_KEY = "ratestuff_sort_v1";

/* ===== small helpers ===== */
const inputBase = (isDark) =>
  `border rounded-xl px-3 py-2 text-sm ${isDark ? "bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-400" : ""}`;

const cardBase = (isDark) =>
  `rounded-2xl border p-4 shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white"}`;

const sectionBase = cardBase;

/* ===== Toast ===== */
function useToast() {
  const [toast, setToast] = useState(null); // { id, text }
  function notify(text) {
    const t = { id: uid(), text };
    setToast(t);
    setTimeout(() => setToast((cur) => (cur && cur.id === t.id ? null : cur)), 1800);
  }
  const node = toast ? (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100]">
      <div className="px-3 py-2 rounded-xl text-sm bg-black text-white shadow-lg">{toast.text}</div>
    </div>
  ) : null;
  return { notify, toastNode: node };
}

/* ===== UI bits ===== */
function Star({ filled, onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-6 h-6 inline-flex items-center justify-center transition-transform hover:scale-110" title={filled ? "Rated" : "Rate"}>
      <svg viewBox="0 0 24 24" className={`w-5 h-5 ${filled ? "fill-yellow-400" : "fill-gray-300"}`}>
        <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.401 8.168L12 18.897l-7.335 3.868 1.401-8.168L.132 9.21l8.2-1.192z" />
      </svg>
    </button>
  );
}
function Stars({ value, onRate }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= Math.round(value)} onClick={() => onRate?.(n)} />
      ))}
    </div>
  );
}
function Tag({ label, active, onClick, isDark }) {
  const base = `px-2 py-1 rounded-full text-sm border ${active ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"}`;
  const darkExtra = active ? "" : "dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700";
  return (
    <button type="button" onClick={onClick} className={`${base} ${isDark ? darkExtra : ""}`}>#{label}</button>
  );
}
function Pill({ children }) {
  return (
    <span className="inline-block text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">{children}</span>
  );
}
function AvatarButton({ name, onClick, isDark }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toLocaleUpperCase("tr-TR") ?? "?").join("");
  return (
    <button type="button" onClick={onClick} title="Profilim" className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-semibold ${isDark ? "border-gray-700 hover:bg-gray-800" : "hover:bg-gray-50"}`}>
      {initials || "?"}
    </button>
  );
}
function ThemeToggle({ theme, onToggle }) {
  // cycles: light -> dark -> auto -> light
  const label = theme === "dark" ? "🌙 Dark" : theme === "auto" ? "🖥️ Auto" : "☀️ Light";
  const title = theme === "dark" ? "Aydınlık moda geç" : theme === "auto" ? "Karanlık moda geç" : "Otomatik moda geç";
  return (
    <button type="button" onClick={onToggle} className={`px-2 py-1 rounded-lg text-xs border hover:bg-gray-50 dark:hover:bg-gray-800`} title={title}>
      {label}
    </button>
  );
}

/* ===== Login Screen ===== */
function LoginScreen({ onLogin, isDark }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const canSubmit = name.trim().length >= 2;
  return (
    <div className={`min-h-screen grid place-items-center ${isDark ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"}`}>
      <div className={`${cardBase(isDark)} w/full max-w-sm`.replace('/','-')}>
        <h1 className="text-xl font-bold" style={{ fontFamily: "'Dumero Rounded', ui-sans-serif" }}>RateStuff</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">local demo oturum açma</p>
        <div className="mt-4 space-y-2">
          <input className={inputBase(isDark)} placeholder="adınız" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={inputBase(isDark)} placeholder="e‑posta (opsiyonel)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className={`w-full px-4 py-2 rounded-xl text-sm ${canSubmit ? "bg-black text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"}`} disabled={!canSubmit} onClick={() => onLogin({ name: name.trim(), email: email.trim() || undefined })}>Giriş yap</button>
          <button className={`w-full px-4 py-2 rounded-xl text-sm border ${isDark ? "border-gray-700" : ""}`} onClick={() => onLogin({ name: "Demo Kullanıcı" })}>Demo ile devam et</button>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-3">Not: Gerçek kimlik doğrulama değildir; bilgiler cihazında saklanır (localStorage). İsim yorumlarda maskelenir.</p>
      </div>
    </div>
  );
}

/* ===== Item Card ===== */
function ItemCard({ item, activeTag, onTagClick, onRate, onAddComment, onEditComment, currentUserName, onEditItem, onAddImageLater, onReport, isDark }) {
  const userRating = (item.ratings || []).find((r) => r.author === currentUserName)?.value || 0;
  const [comment, setComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  const canEditItem = item.createdBy === currentUserName;
  const alreadyReported = (item.reports?.reporters || []).includes(currentUserName);

  return (
    <div className={cardBase(isDark)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-4">
          {item.image && (
            <img src={item.image} alt={item.name} className="w-24 h-24 object-cover rounded-xl border dark:border-gray-700" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{item.name}</h3>
              {item.editedAt && <Pill>düzenlendi</Pill>}
            </div>
            {item.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{item.description}</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              {item.tags.map((t) => (
                <Tag key={t} label={t} active={activeTag === t} onClick={() => onTagClick?.(t)} isDark={isDark} />
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Ekleyen: <span className="font-medium">{item.createdByMasked || maskName(item.createdBy || "Anon")}</span>
              {item.image && item.imageAddedByMasked && (
                <>
                  <span className="mx-1">•</span> Foto: <span className="font-medium">{item.imageAddedByMasked}</span>
                </>
              )}
            </div>
            <div className="mt-2 flex items-center gap-3">
              {canEditItem && (
                <button className="text-xs underline" onClick={() => onEditItem(item)} title="Bu item'ı düzenle (isim hariç)">düzenle</button>
              )}
              {!item.image && (
                <button className="text-xs underline" onClick={() => onAddImageLater(item)}>foto ekle</button>
              )}
              <button className={`text-xs underline ${alreadyReported ? "opacity-50 cursor-not-allowed" : ""}`} disabled={alreadyReported} onClick={() => onReport(item)}>{alreadyReported ? "rapor edildi" : "rapor et"}</button>
              {item.reports?.count > 0 && <span className="text-[11px] text-gray-500">Raporlar: {item.reports.count}</span>}
            </div>
          </div>
        </div>
        <div className="text-right min-w-[220px]">
          <div className="text-xs text-gray-500 dark:text-gray-400">Toplam ortalama</div>
          <div className="font-medium">{item._avg.toFixed(2)} / 5</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{item.ratings.length} oy · LB {item._wilson.toFixed(2)}</div>
          <div className="h-2" />
          <div className="flex items-center justify-end gap-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Senin puanın {item.ratings.find((r) => r.author === currentUserName && r.editedAt) && (<span className="ml-1"><Pill>düzenlendi</Pill></span>)}
            </div>
            <Stars value={userRating} onRate={(n) => onRate?.(item.id, n)} />
          </div>
        </div>
      </div>

      {item.comments.length > 0 && (
        <ul className="mt-3 space-y-2">
          {item.comments.map((c) => {
            const isMine = c.authorName === currentUserName;
            const ts = new Date(c.createdAt).toLocaleString();
            return (
              <li key={c.id} className={`text-sm ${isDark ? "text-gray-200" : "text-gray-700"} border rounded-lg px-3 py-2 ${isDark ? "border-gray-700" : ""}`}>
                <div className={`flex items-center gap-2 text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  <span>{c.authorMasked ?? "Anon"}</span>
                  <span>•</span>
                  <span>{ts}</span>
                  {c.editedAt && (<><span>•</span><Pill>düzenlendi</Pill></>)}
                </div>
                {editingCommentId === c.id ? (
                  <div className="mt-2 flex gap-2">
                    <input className={`${inputBase(isDark)} flex-1`} value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} />
                    <button className="px-3 py-2 rounded-xl text-sm bg-black text-white" onClick={() => { onEditComment?.(item.id, c.id, editingCommentText.trim()); setEditingCommentId(null); setEditingCommentText(""); }}>Kaydet</button>
                    <button className={`px-3 py-2 rounded-xl text-sm border ${isDark ? "border-gray-700" : ""}`} onClick={() => { setEditingCommentId(null); setEditingCommentText(""); }}>Vazgeç</button>
                  </div>
                ) : (
                  <div className="mt-1 flex items-start justify-between gap-2">
                    <div>{c.text}</div>
                    {isMine && (<button className="text-xs underline shrink-0" onClick={() => { setEditingCommentId(c.id); setEditingCommentText(c.text); }}>düzenle</button>)}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        <input className={`${inputBase(isDark)} flex-1`} placeholder="yorum yaz" value={comment} onChange={(e) => setComment(e.target.value)} />
        <button type="button" className={`px-3 py-2 rounded-xl text-sm ${comment.trim() ? "bg-black text-white" : `bg-gray-200 text-gray-500 ${isDark ? 'dark:bg-gray-700 dark:text-gray-400' : ''}`}`} disabled={!comment.trim()} onClick={() => { onAddComment?.(item.id, comment.trim()); setComment(""); }}>Gönder</button>
      </div>
    </div>
  );
}

/* ===== Item Edit Modal (inline) ===== */
function EditItemInline({ item, onSave, onCancel, isDark }) {
  const [desc, setDesc] = useState(item.description || "");
  const [tagsCsv, setTagsCsv] = useState(item.tags.join(", "));
  const [image, setImage] = useState(item.image || "");

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm grid place-items-center p-4 z-50">
      <div className={`${cardBase(isDark)} w-full max-w-lg`}>
        <h3 className="text-lg font-semibold">{item.name} <span className="text-gray-400 text-xs">(adı değiştirilemez)</span></h3>
        <div className="mt-3 space-y-2">
          <input className={inputBase(isDark)} placeholder="açıklama" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <input className={inputBase(isDark)} placeholder="etiketler (virgülle)" value={tagsCsv} onChange={(e) => setTagsCsv(e.target.value)} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
            <input className={`${inputBase(isDark)} md:col-span-2`} placeholder="resim URL'si" value={image} onChange={(e) => setImage(e.target.value)} />
            <div>
              <input id="edit-file-input" type="file" accept="image/*" onChange={handleFile} className="hidden" />
              <label htmlFor="edit-file-input" className={`cursor-pointer px-3 py-2 rounded-xl border text-sm inline-block ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700" : "bg-white hover:bg-gray-100"}`}>Dosya Seç</label>
            </div>
          </div>
          {image && (<img src={image} alt="önizleme" className="w-24 h-24 object-cover rounded-xl border dark:border-gray-700" />)}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className={`px-3 py-2 rounded-xl text-sm border ${isDark ? "border-gray-700" : ""}`} onClick={onCancel}>Vazgeç</button>
          <button className="px-3 py-2 rounded-xl text-sm bg-black text-white" onClick={() => onSave({ description: desc.trim() || undefined, tags: tagsCsv.split(",").map((t)=>t.trim()).filter(Boolean), image: image.trim ? image.trim() : image })}>Kaydet</button>
        </div>
      </div>
    </div>
  );
}

/* ===== Add Image Modal (for items without image) ===== */
function AddImageModal({ item, onSave, onCancel, isDark }) {
  const [image, setImage] = useState("");
  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  }
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm grid place-items-center p-4 z-50">
      <div className={`${cardBase(isDark)} w-full max-w-md`}>
        <h3 className="text-lg font-semibold">{item.name} için fotoğraf ekle</h3>
        <div className="mt-3 space-y-2">
          <input className={inputBase(isDark)} placeholder="resim URL'si (opsiyonel)" value={image} onChange={(e)=>setImage(e.target.value)} />
          <div>
            <input id="addimg-file-input" type="file" accept="image/*" onChange={handleFile} className="hidden" />
            <label htmlFor="addimg-file-input" className={`cursor-pointer px-3 py-2 rounded-xl border text-sm inline-block ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700" : "bg-white hover:bg-gray-100"}`}>Dosya Seç</label>
          </div>
          {image && (<img src={image} alt="önizleme" className="w-24 h-24 object-cover rounded-xl border dark:border-gray-700" />)}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className={`px-3 py-2 rounded-xl text-sm border ${isDark ? "border-gray-700" : ""}`} onClick={onCancel}>Vazgeç</button>
          <button className="px-3 py-2 rounded-xl text-sm bg-black text-white" disabled={!image.trim()} onClick={() => onSave(image.trim())}>Kaydet</button>
        </div>
      </div>
    </div>
  );
}

/* ===== Profile view ===== */
function ProfileView({ user, items, onRate, onEditComment, onEditItemRequest, isDark }) {
  const myComments = []; const myRatings = []; const myItems = [];
  items.forEach((it) => {
    if (it.createdBy === user.name) myItems.push(it);
    (it.comments || []).forEach((c) => { if (c.authorName === user.name) myComments.push({ item: it, comment: c }); });
    (it.ratings || []).forEach((r) => { if (r.author === user.name) myRatings.push({ item: it, rating: r }); });
  });

  const [editingComment, setEditingComment] = useState(null);
  const [editingText, setEditingText] = useState("");

  return (
    <div className="space-y-6">
      <section className={sectionBase(isDark)}>
        <h2 className="font-semibold text-lg flex items-center gap-2">Yorumlarım <span className="text-xs text-gray-500 dark:text-gray-400">({myComments.length})</span></h2>
        {myComments.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Henüz yorum yok.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {myComments.map(({ item, comment }) => (
              <li key={comment.id} className={`border rounded-xl p-3 text-sm ${isDark ? "border-gray-700" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-gray-500 dark:text-gray-400 text-xs">{item.name} • {new Date(comment.createdAt).toLocaleString()} {comment.editedAt && <span className="ml-2"><Pill>düzenlendi</Pill></span>}</div>
                  {editingComment?.id === comment.id ? (
                    <div className="flex gap-2">
                      <button className="text-xs underline" onClick={() => { onEditComment(item.id, comment.id, editingText.trim()); setEditingComment(null); setEditingText(""); }}>Kaydet</button>
                      <button className="text-xs underline" onClick={() => { setEditingComment(null); setEditingText(""); }}>Vazgeç</button>
                    </div>
                  ) : (
                    <button className="text-xs underline" onClick={() => { setEditingComment(comment); setEditingText(comment.text); }}>düzenle</button>
                  )}
                </div>
                {editingComment?.id === comment.id ? (
                  <textarea className={`${inputBase(isDark)} w-full mt-2`} rows={2} value={editingText} onChange={(e)=>setEditingText(e.target.value)} />
                ) : (
                  <div className="mt-2">{comment.text}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={sectionBase(isDark)}>
        <h2 className="font-semibold text-lg flex items-center gap-2">Puanlarım <span className="text-xs text-gray-500 dark:text-gray-400">({myRatings.length})</span></h2>
        {myRatings.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Henüz puan yok.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {myRatings.map(({ item, rating }) => (
              <li key={rating.id} className={`border rounded-2xl p-3 text-sm flex items-center justify-between gap-3 ${isDark ? "border-gray-700" : ""}`}>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{item.name} {rating.editedAt && <span className="ml-2"><Pill>düzenlendi</Pill></span>}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Stars value={rating.value} onRate={(n)=>onRate(item.id, n)} />
                    <div className="text-xs text-gray-500 dark:text-gray-400">{rating.value} / 5</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={sectionBase(isDark)}>
        <h2 className="font-semibold text-lg flex items-center gap-2">Eklediklerim <span className="text-xs text-gray-500 dark:text-gray-400">({myItems.length})</span></h2>
        {myItems.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Henüz eklediğin item yok.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {myItems.map((it) => (
              <li key={it.id} className={`border rounded-2xl p-3 text-sm flex items-center justify-between gap-3 ${isDark ? "border-gray-700" : ""}`}>
                <div>
                  <div className="font-medium flex items-center gap-2">{it.name} {it.editedAt && <Pill>düzenlendi</Pill>}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{(it.tags||[]).join(", ")} {(it.description)? `• ${it.description}`: ""}</div>
                </div>
                <button className="text-xs underline" onClick={()=>onEditItemRequest(it)}>düzenle</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ===== App ===== */
export default function RateStuffApp() {
  const searchRef = useRef(null);
  const [user, setUser] = useState(() => load(USER_KEY, null));
  const [theme, setTheme] = useState(() => load(THEME_KEY, (window?.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'auto' : 'light'));
  const [items, setItems] = useState(() => load(STORAGE_KEY, [
    { id: uid(), name: "Türk kahvesi", description: "bol köpüklü, orta şekerli", tags: ["içecek", "kahve"], image: undefined, ratings: [ { id: uid(), value: 5, createdAt: Date.now()-1000*60*60*48, author: "Seed" }, { id: uid(), value: 4, createdAt: Date.now()-1000*60*60*20, author: "Seed" } ], comments: [ { id: uid(), text: "bakır cezve candır", createdAt: Date.now()-1000*60*60*12, authorMasked: maskName("Demo Kullanıcı"), authorName: "Demo Kullanıcı" } ], createdAt: Date.now()-1000*60*60*36, createdBy: "Seed", createdByMasked: maskName("Seed"), reports: { count: 0, reporters: [] } },
  ]));
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [sort, setSort] = useState(() => load(SORT_KEY, "trending"));
  const [view, setView] = useState("home"); // home | profile
  const [editItemTarget, setEditItemTarget] = useState(null);
  const [addImageTarget, setAddImageTarget] = useState(null);
  const { notify, toastNode } = useToast();

  const systemPrefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = theme === 'dark' || (theme === 'auto' && systemPrefersDark?.matches);

  useEffect(() => { save(USER_KEY, user); }, [user]);
  useEffect(() => { save(THEME_KEY, theme); }, [theme]);
  useEffect(() => { save(STORAGE_KEY, items); }, [items]);
  useEffect(() => { save(SORT_KEY, sort); }, [sort]);

  // listen to system theme changes in auto
  useEffect(() => {
    if (!systemPrefersDark) return;
    const handler = () => { if (theme === 'auto') { /* trigger re-render */ setQuery((q)=>q); } };
    systemPrefersDark.addEventListener('change', handler);
    return () => systemPrefersDark.removeEventListener('change', handler);
  }, [theme]);

  // keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'Escape') { setQuery(""); }
      if ((e.key === 'h' || e.key === 'H') && e.shiftKey === false && e.ctrlKey === false && e.altKey === false && e.metaKey === false && (window.__last_g || '') === 'g') { setView('home'); window.__last_g = null; }
      else if ((e.key === 'p' || e.key === 'P') && e.shiftKey === false && e.ctrlKey === false && e.altKey === false && e.metaKey === false && (window.__last_g || '') === 'g') { setView('profile'); window.__last_g = null; }
      else if (e.key.toLowerCase() === 'g') { window.__last_g = 'g'; setTimeout(()=>{ window.__last_g = null; }, 600); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // computed
  const itemsWithMeta = useMemo(() => items.map((i) => ({ ...i, _avg: avgRating(i), _wilson: wilsonFromMean(avgRating(i), i.ratings.length) })), [items]);
  const allTags = useMemo(() => { const s = new Set(); items.forEach((i) => i.tags.forEach((t) => s.add(t))); return Array.from(s).sort((a,b)=>a.localeCompare(b)); }, [items]);
  const filtered = useMemo(() => {
    let out = itemsWithMeta.filter((i) => {
      const matchesQ = `${i.name} ${i.description ?? ""} ${i.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase());
      const matchesTag = activeTag ? i.tags.includes(activeTag) : true;
      return matchesQ && matchesTag;
    });
    if (sort === "trending") out.sort((a, b) => b._wilson - a._wilson);
    else if (sort === "top") out.sort((a, b) => b._avg - a._avg);
    else if (sort === "most") out.sort((a, b) => b.ratings.length - a.ratings.length);
    else if (sort === "new") out.sort((a, b) => b.createdAt - a.createdAt);
    return out;
  }, [itemsWithMeta, query, activeTag, sort]);

  // actions
  function addItem(name, description, tagsCsv, ratingValue, commentText, imageDataUrl) {
    const tags = tagsCsv.split(",").map((t) => t.trim()).filter(Boolean);
    const now = Date.now();
    const displayName = user?.name || "Demo Kullanıcı";
    const item = {
      id: uid(),
      name: name.trim(),
      description: description.trim() || undefined,
      tags,
      image: imageDataUrl || undefined,
      ratings: [ { id: uid(), value: clamp(Number(ratingValue) || 0), createdAt: now, author: displayName } ],
      comments: [ { id: uid(), text: commentText.trim(), createdAt: now, authorMasked: maskName(displayName), authorName: displayName } ],
      createdAt: now,
      createdBy: displayName,
      createdByMasked: maskName(displayName),
      reports: { count: 0, reporters: [] },
    };
    setItems((prev) => [item, ...prev]);
    notify('Item eklendi');
  }
  function rateItem(itemId, value) {
    const displayName = user?.name || "Demo Kullanıcı";
    setItems((prev) => prev.map((i) => {
      if (i.id !== itemId) return i;
      const now = Date.now();
      const arr = i.ratings || [];
      const idx = arr.findIndex((r) => r.author === displayName);
      let ratings;
      if (idx >= 0) ratings = arr.map((r, k) => (k === idx ? { ...r, value: clamp(value), editedAt: now } : r));
      else ratings = [...arr, { id: uid(), value: clamp(value), createdAt: now, author: displayName }];
      return { ...i, ratings };
    }));
    notify('Puan kaydedildi');
  }
  function addComment(itemId, text) {
    const displayName = user?.name || "Demo Kullanıcı";
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, comments: [ ...i.comments, { id: uid(), text, createdAt: Date.now(), authorMasked: maskName(displayName), authorName: displayName } ] } : i));
    notify('Yorum eklendi');
  }
  function editComment(itemId, commentId, newText) {
    setItems((prev) => prev.map((i) => {
      if (i.id !== itemId) return i;
      const comments = i.comments.map((c) => (c.id === commentId ? { ...c, text: newText, editedAt: Date.now() } : c));
      return { ...i, comments };
    }));
    notify('Yorum güncellendi');
  }
  function requestEditItem(item) { setEditItemTarget(item); }
  function saveEditedItem(patch) {
    const id = editItemTarget.id; const displayName = user?.name || "Demo Kullanıcı";
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, ...patch, editedAt: Date.now() } : i));
    setEditItemTarget(null);
    notify('Item güncellendi');
  }
  function requestAddImage(item) { setAddImageTarget(item); }
  function saveAddedImage(imageUrl) {
    const id = addImageTarget.id; const displayName = user?.name || "Demo Kullanıcı";
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, image: imageUrl, imageAddedAt: Date.now(), imageAddedByName: displayName, imageAddedByMasked: maskName(displayName), editedAt: Date.now() } : i));
    setAddImageTarget(null);
    notify('Foto eklendi');
  }
  function reportItem(item) {
    const displayName = user?.name || "Demo Kullanıcı";
    setItems((prev) => prev.map((i) => {
      if (i.id !== item.id) return i;
      const reporters = new Set(i.reports?.reporters || []); reporters.add(displayName);
      return { ...i, reports: { count: reporters.size, reporters: Array.from(reporters) } };
    }));
    notify('Rapor edildi');
  }

  if (!user) return <LoginScreen onLogin={setUser} isDark={isDark} />;

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"}`}>
      <header className={`sticky top-0 backdrop-blur border-b z-40 ${isDark ? "bg-gray-900/70 border-gray-800" : "bg-white/80"}`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button className="text-xl font-bold" style={{ fontFamily: "'Dumero Rounded', ui-sans-serif" }} onClick={() => setView("home")} title="Ana sayfa">RateStuff</button>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <input ref={searchRef} className={`${inputBase(isDark)} w-56 pr-7`} placeholder="ara ( / )" value={query} onChange={(e) => { setQuery(e.target.value); if (view !== 'home') setView('home'); }} />
              {query && (
                <button aria-label="temizle" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm" onClick={() => setQuery("")}>×</button>
              )}
            </div>
            <select className={inputBase(isDark)} value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="trending">Trendler</option>
              <option value="top">En yüksek ort.</option>
              <option value="most">En çok oy</option>
              <option value="new">En yeni</option>
            </select>
            <ThemeToggle theme={theme} onToggle={() => setTheme((t) => (t === 'light' ? 'dark' : t === 'dark' ? 'auto' : 'light'))} />
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1" />
            <span className="text-xs text-gray-600 dark:text-gray-300">{maskName(user.name)}</span>
            <AvatarButton name={user.name} onClick={() => setView("profile")} isDark={isDark} />
            <button className="text-xs underline ml-2" onClick={() => { if (confirm('Çıkış yapmak istediğine emin misin?')) setUser(null); }}>çıkış</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {view === "home" ? (
          <>
            <AddItemCard onAdd={addItem} isDark={isDark} />

            {allTags.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                <Tag label="tümü" active={!activeTag} onClick={() => setActiveTag(null)} isDark={isDark} />
                {allTags.map((t) => (<Tag key={t} label={t} active={activeTag === t} onClick={() => setActiveTag(t)} isDark={isDark} />))}
              </div>
            )}

            <div className="space-y-4">
              {filtered.map((item) => (
                <ItemCard key={item.id} item={item} activeTag={activeTag} onTagClick={setActiveTag} onRate={rateItem} onAddComment={addComment} onEditComment={editComment} currentUserName={user.name} onEditItem={requestEditItem} onAddImageLater={requestAddImage} onReport={reportItem} isDark={isDark} />
              ))}
              {filtered.length === 0 && (
                <div className={`text-sm border rounded-xl p-6 text-center ${isDark ? "text-gray-400 border-gray-800" : "text-gray-500"}`}>
                  sonuç yok
                  <div className="mt-2 flex items-center justify-center gap-3">
                    <button className="text-xs underline" onClick={() => setQuery("")}>aramayı temizle</button>
                    <span className="text-gray-300">|</span>
                    <button className="text-xs underline" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>yeni item ekle</button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <ProfileView user={user} items={itemsWithMeta} onRate={rateItem} onEditComment={editComment} onEditItemRequest={requestEditItem} isDark={isDark} />
        )}
      </main>

      {editItemTarget && (<EditItemInline item={editItemTarget} onCancel={() => setEditItemTarget(null)} onSave={saveEditedItem} isDark={isDark} />)}
      {addImageTarget && (<AddImageModal item={addImageTarget} onCancel={() => setAddImageTarget(null)} onSave={saveAddedImage} isDark={isDark} />)}

      {toastNode}
      <footer className="py-10" />
    </div>
  );
}

/* ===== Add form (file button + URL) ===== */
function AddItemCard({ onAdd, isDark }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState("");
  const [ratingValue, setRatingValue] = useState(5);
  const [commentText, setCommentText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");

  const canSubmit = name.trim() && commentText.trim();

  function handleFile(e) {
    const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setImageDataUrl(reader.result); reader.readAsDataURL(file);
  }

  return (
    <div className={cardBase(isDark)}>
      <h2 className="font-semibold mb-2">Yeni şey ekle</h2>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <input className={inputBase(isDark)} placeholder="adı" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inputBase(isDark)} placeholder="kısa açıklama" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <input className={inputBase(isDark)} placeholder="etiketler (virgülle)" value={tags} onChange={(e) => setTags(e.target.value)} />
        <select className={inputBase(isDark)} value={ratingValue} onChange={(e) => setRatingValue(Number(e.target.value))}>{[1,2,3,4,5].map((n)=>(<option key={n} value={n}>{n} yıldız</option>))}</select>
        <input className={inputBase(isDark)} placeholder="yorum" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
        <div className="text-sm text-gray-700 dark:text-gray-300">Görsel (opsiyonel):</div>
        <div>
          <input id="file-input" type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <label htmlFor="file-input" className={`cursor-pointer px-3 py-2 rounded-xl border text-sm inline-block ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700" : "bg-white hover:bg-gray-100"}`}>Dosya Seç</label>
          {(imageDataUrl || imageUrl) && (<span className="ml-2 text-xs text-gray-500 dark:text-gray-400 align-middle">seçildi</span>)}
        </div>
        <input className={inputBase(isDark)} placeholder="veya resim URL'si" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
      </div>

      {(imageDataUrl || imageUrl) && (
        <div className="mt-2 flex items-center gap-3">
          <img src={imageDataUrl || imageUrl} alt="önizleme" className="w-20 h-20 object-cover rounded-lg border dark:border-gray-700" />
          <button type="button" className="text-xs underline" onClick={() => { setImageDataUrl(""); setImageUrl(""); }}>Kaldır</button>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button type="button" className={`px-4 py-2 rounded-xl text-sm ${canSubmit ? "bg-black text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"}`} disabled={!canSubmit} onClick={() => { if (!canSubmit) return; onAdd(name, desc, tags, ratingValue, commentText, imageDataUrl || imageUrl); setName(""); setDesc(""); setTags(""); setRatingValue(5); setCommentText(""); setImageUrl(""); setImageDataUrl(""); }}>Ekle</button>
        <button type="button" className={`px-3 py-2 rounded-xl border text-sm ${isDark ? "border-gray-700" : ""}`} onClick={() => { setName(""); setDesc(""); setTags(""); setRatingValue(5); setCommentText(""); setImageUrl(""); setImageDataUrl(""); }}>Temizle</button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Not: İlk eklemede puan ve yorum zorunlu. Görsel dosya yükleyebilir veya URL girebilirsin. Foto eklemediysen, sonradan herkes foto ekleyebilir; ekleyenin adı maskeli görünür.</p>
    </div>
  );
}
