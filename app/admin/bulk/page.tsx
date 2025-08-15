'use client';

import { useMemo, useState } from 'react';
import type { SeedItem } from '@/data/realItems';
import { REAL_ITEMS } from '@/data/realItems';
import { useSession, signIn } from 'next-auth/react';

// Dizi karıştırma (Fisher–Yates)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Kategori etiketini çıkar (yoksa 'genel')
function pickCategory(it: SeedItem): string {
  const tags = it.tags || [];
  // kendi tag mantığına göre öncelik: film/dizi, gıda, mekan, uygulama, gadget, kahve, oyun, kitap, seyahat...
  const order = ['film','dizi','gıda','atıştırmalık','mekan','bar','kafe','uygulama','gadget','kahve','oyun','kitap','seyahat','deneyim','spesifik'];
  for (const key of order) {
    if (tags.includes(key)) return key;
  }
  return 'genel';
}

// Kategorileri dengeli sıraya dizer: round-robin + shuffle
function interleaveByCategory(list: SeedItem[]): SeedItem[] {
  const groups = new Map<string, SeedItem[]>();
  for (const it of list) {
    const k = pickCategory(it);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(it);
  }
  // her kategoriyi kendi içinde karıştır
  for (const [k, arr] of groups) groups.set(k, shuffle(arr));

  const keys = shuffle(Array.from(groups.keys()));
  const out: SeedItem[] = [];
  let pushed = true;

  while (pushed) {
    pushed = false;
    for (const k of keys) {
      const arr = groups.get(k)!;
      if (arr.length) {
        out.push(arr.shift()!);
        pushed = true;
      }
    }
  }
  return out;
}
const COMMENTS_POS = [
  'Kesinlikle tavsiye ederim, beklentimi aştı.',
  'Fiyat/performans gayet iyi, tekrar alırım.',
  'Uzun zamandır kullandığım ve memnun kaldığım bir şey.',
  'Detaylarda özen var, denemeye değer.',
  'Harika bir deneyimdi, tekrar yaşamak isterim.',
  'Beklediğimden çok daha iyiydi.',
  'Her yönüyle memnun kaldım.',
  'Kalitesi kendini belli ediyor.',
  'Arkadaşlarıma da tavsiye ettim, onlar da memnun.',
  'Tek kelimeyle mükemmel.'
];

const COMMENTS_NEU = [
  'Ne iyi ne kötü, ortalama diyebilirim.',
  'Bazı yerleri güzel, bazıları geliştirilebilir.',
  'İlk izlenim nötr, biraz daha deneyip karar vereceğim.',
  'Beklentiyi tam karşılamadı ama iş görüyor.',
  'Ne çok sevdim ne de nefret ettim.',
  'Beni çok etkilemedi ama kötü de diyemem.',
  'Daha iyi olabilir ama idare eder.',
  'Ortalama bir deneyimdi.',
  'Ne eksik ne fazla.',
  'Kararsız kaldım, emin değilim.'
];

const COMMENTS_NEG = [
  'Abartıldığı kadar değil, hayal kırıklığı yaşadım.',
  'Fiyatına göre zayıf, önermem.',
  'Deneyimim pek iyi değildi, daha iyi alternatif var.',
  'Tekrar tercih etmem.',
  'Hiç memnun kalmadım.',
  'Kalitesi beklentimin çok altındaydı.',
  'Parasını hak etmiyor.',
  'Zaman kaybı oldu.',
  'Tek artısı hızlı bitmesiydi.',
  'Bir daha asla almam/kullanmam.'
];

// 1: düşük, 5: yüksek — gerçekçi dağılım
function sampleRating(): number {
  const r = Math.random();
  if (r < 0.05) return 1;        // %5
  if (r < 0.20) return 2;        // %15
  if (r < 0.65) return 4;        // %45
  if (r < 0.90) return 3;        // %25
  return 5;                      // %10
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function commentForRating(n: number): string {
  if (n <= 2) return pick(COMMENTS_NEG);
  if (n === 3) return pick(COMMENTS_NEU);
  return pick(COMMENTS_POS);
}

async function fetchFirstImageViaAPI(q: string): Promise<string | null> {
  // kendi küçük API route'umuzu çağıracağız ki .env server tarafında kalsın
  try {
    const r = await fetch(`/api/seed/image?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
    const j = await r.json().catch(() => null);
    const url = j?.url;
    if (typeof url === 'string' && url.startsWith('http')) return url;
  } catch {}
  return null;
}

async function createOneItem(i: number, item: SeedItem) {
  const name = item.name.trim();
  const rating = sampleRating();
  const comment = commentForRating(rating);
  const tagsCsv = (item.tags || []).join(',');

  // Görsel: Google → yoksa Picsum fallback
  const gImg = await fetchFirstImageViaAPI(name);
  const imageUrl = gImg || `https://picsum.photos/seed/rs-${i}-${Date.now()}/512/512`;

  const payload = { name, description: '', tagsCsv, rating, comment, imageUrl };

  const res = await fetch('/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const j = await res.json().catch(() => null);
  if (!res.ok || !(j?.ok ?? true)) {
    throw new Error(j?.error || `HTTP ${res.status}`);
  }
}

export default function AdminBulk() {
    const { status } = useSession();
  const [count, setCount] = useState(100); // hedef sayı
const pool = useMemo(() => {
  // isimlere göre tekrarı at
  const seen = new Set<string>();
  const uniq: SeedItem[] = [];
  for (const it of REAL_ITEMS) {
    const key = it.name.trim().toLowerCase();
    if (!seen.has(key)) { seen.add(key); uniq.push(it); }
  }
  // kategorilere göre dengeli karışım
  const interleaved = interleaveByCategory(uniq);
  // final sırayı bir tık daha rastgeleleştir (çok hafif)
  const final = shuffle(interleaved);
  return final;
}, []);
 if (status !== 'authenticated') {
    return (
      <div className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-3">Admin – Bulk Real Items</h1>
        <p className="mb-4 opacity-80">
          Devam etmek için giriş yapmalısın. Tüm eklemeler oturumdaki hesap adına yapılır.
        </p>
        <button
          className="px-4 py-2 rounded-xl text-sm bg-emerald-600 text-white"
          onClick={() => signIn()} // veya signIn('google') gibi
        >
          Giriş Yap
        </button>
      </div>
    );
  }
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [err, setErr] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  const total = Math.min(count, pool.length);

  async function run() {
    setRunning(true); setDone(0); setErr(0); setLog([]);
    // çok paralel gitmeyelim; CSE kotasını üzmeyelim
    const concurrency = 3;
    const work = pool.slice(0, total);

    let d = 0, e = 0;

    async function worker(startIndex: number) {
      for (let i = startIndex; i < work.length; i += concurrency) {
        const it = work[i];
        try {
          await createOneItem(i, it);
          d++; setDone(d);
          if (d % 10 === 0) setLog(l => [`✅ ${d}/${total} eklendi`, ...l].slice(0, 10));
        } catch (ex: any) {
          e++; setErr(e);
          setLog(l => [`❌ ${i+1}. "${it.name}": ${ex?.message || ex}`, ...l].slice(0, 10));
          await new Promise(r => setTimeout(r, 200));
        }
        await new Promise(r => setTimeout(r, 120)); // nazik throttling
      }
    }

    await Promise.all(Array.from({ length: concurrency }, (_, k) => worker(k)));
    setRunning(false);
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Admin – Bulk Real Items</h1>
      <p className="opacity-80 mb-4">
        Google Custom Search ile ilk görseli alır, item’ı puan+yorumla oluşturur. Çalışması için
        <code className="mx-1 px-1 rounded bg-gray-100 dark:bg-gray-800">GOOGLE_CSE_ID</code> ve
        <code className="ml-1 px-1 rounded bg-gray-100 dark:bg-gray-800">GOOGLE_CSE_KEY</code> gerekli.
      </p>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm">Adet (max {pool.length}):</label>
        <input
          type="number"
          min={1}
          max={pool.length}
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(pool.length, Number(e.target.value || 1))))}
          className="border rounded-lg px-3 py-2 text-sm w-24 dark:bg-gray-900"
          disabled={running}
        />
        <button
          className="px-4 py-2 rounded-xl text-sm bg-emerald-600 text-white disabled:opacity-60"
          onClick={run}
          disabled={running}
        >
          {running ? 'Çalışıyor…' : 'Başlat'}
        </button>
      </div>

      <div className="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-emerald-500"
          style={{ width: `${(done + err) / (total || 1) * 100}%` }}
        />
      </div>
      <div className="text-sm mb-4">
        Tamamlanan: <b>{done}</b> / Hata: <b className={err ? 'text-red-600' : ''}>{err}</b> / Toplam: <b>{total}</b>
      </div>

      <ul className="text-xs space-y-1 opacity-80">
        {log.map((l, i) => <li key={i}>{l}</li>)}
      </ul>

      <div className="mt-6 p-3 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
        <b>Not:</b> Görsel kaynakları telifli olabilir; canlıya alırken kendi görsellerinizi yüklemeniz önerilir.
      </div>
    </div>
  );
}