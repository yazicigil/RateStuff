// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config();
}

// Hotlink izin vermeyen / sık sorun çıkaran hostlar
const BAD_HOSTS = [
  "instagram.com",
  "www.instagram.com",
  "scontent.cdninstagram.com",
  "cdninstagram.com",
  "facebook.com",
  "m.facebook.com",
  "fbcdn.net",
  "lookaside.facebook.com",
  "tiktok.com",
  "www.tiktok.com",
  "pinterest.com",
  "tr.pinterest.com",
  "i.pinimg.com",
  "x.com",
  "twitter.com",
  "pbs.twimg.com",
];

function hostOf(url: string | undefined) {
  try { return url ? new URL(url).hostname.toLowerCase() : ""; } catch { return ""; }
}
function isBad(url: string | undefined) {
  const h = hostOf(url);
  return !h ? true : BAD_HOSTS.some(b => h === b || h.endsWith(`.${b}`));
}
const prisma = new PrismaClient();

function assertEnv() {
  const hasCse = !!(process.env.GOOGLE_CSE_KEY && process.env.GOOGLE_CSE_ID);
  const hasSerp = !!process.env.SERPAPI_KEY;
  if (!hasCse && !hasSerp) {
    throw new Error(
      "Görsel arama için en az biri gerekli: (GOOGLE_CSE_KEY + GOOGLE_CSE_ID) veya SERPAPI_KEY"
    );
  }
}

assertEnv();

/* -------------------- Random isim/handle + UI Avatars -------------------- */
const FIRST_NAMES = [
  "Can","Ece","Deniz","Mert","Zeynep","Ela","Kerem","Baran","İpek","Burak",
  "Arda","Sena","Ayşe","Mehmet","Elif","Bora","Duru","Kaan","Bartu","Mina",
  "Ali","Vera","Lara","Eren","Cem","Yasemin","Okan","Naz","Defne","Atlas"
];
const LAST_NAMES = [
  "Yılmaz","Demir","Kaya","Çelik","Şahin","Öztürk","Aydın","Arslan","Doğan","Kılıç",
  "Kurt","Koç","Aksoy","Yavuz","Kara","Güneş","Taş","Polat","Avcı","Erdem"
];
const ADJS = ["cool","cosmic","lucky","urban","quiet","noisy","swift","brave","clever","dizzy","sunny","misty","pixel","neon","amber","fuzzy"];
const NOUNS = ["panda","lynx","otter","falcon","tiger","wolf","koala","orca","sparrow","badger","owl","fox","yak","gecko","beetle","marmot"];

function randomDisplayName() {
  const first = FIRST_NAMES[Math.floor(Math.random()*FIRST_NAMES.length)];
  const last  = LAST_NAMES[Math.floor(Math.random()*LAST_NAMES.length)];
  return `${first} ${last}`;
}
function randomHandle(): string {
  const base = `${ADJS[Math.floor(Math.random()*ADJS.length)]}${NOUNS[Math.floor(Math.random()*NOUNS.length)]}`;
  const num  = Math.floor(10 + Math.random()*89); // 10–99
  return Math.random() < 0.5 ? `${num}${base}` : `${base}${num}`;
}
function uiAvatarUrl(name: string) {
  const p = new URLSearchParams({ name, background: "random", bold: "true", format: "png" }).toString();
  return `https://ui-avatars.com/api/?${p}`;
}

/* -------------------- Yorum/rating helper'ları -------------------- */
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
function sampleRating(): number {
  const r = Math.random();
  if (r < 0.05) return 1;
  if (r < 0.20) return 2;
  if (r < 0.65) return 4;
  if (r < 0.90) return 3;
  return 5;
}
const COMMENTS_POS = [
  "Kesinlikle tavsiye ederim, beklentimi aştı.",
  "Fiyat/performans gayet iyi, tekrar alırım.",
  "Detaylarda özen var, denemeye değer.",
  "Harika bir deneyimdi, tekrar yaşamak isterim.",
  "Beklediğimden çok daha iyiydi.",
  "Kalitesi kendini belli ediyor.",
  "Her yönüyle memnun kaldım.",
  "Arkadaşlarıma da tavsiye ettim, onlar da memnun.",
  "Tek kelimeyle mükemmel.",
];
const COMMENTS_NEU = [
  "Ne iyi ne kötü, ortalama diyebilirim.",
  "Bazı yerleri güzel, bazıları geliştirilebilir.",
  "İlk izlenim nötr, biraz daha deneyip karar vereceğim.",
  "Beklentiyi tam karşılamadı ama iş görüyor.",
  "Ne çok sevdim ne de nefret ettim.",
  "Beni çok etkilemedi ama kötü de diyemem.",
  "Ortalama bir deneyimdi.",
  "Kararsız kaldım, emin değilim.",
  "Ne eksik ne fazla.",
];
const COMMENTS_NEG = [
  "Abartıldığı kadar değil, hayal kırıklığı yaşadım.",
  "Fiyatına göre zayıf, önermem.",
  "Deneyimim pek iyi değildi, daha iyi alternatif var.",
  "Tekrar tercih etmem.",
  "Kalitesi beklentimin altında kaldı.",
  "Parasını hak etmiyor.",
  "Zaman kaybı oldu.",
  "Bir daha tercih etmem.",
];
function commentForRating(n: number): string {
  if (n <= 2) return pick(COMMENTS_NEG);
  if (n === 3) return pick(COMMENTS_NEU);
  return pick(COMMENTS_POS);
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* -------------------- Görsel bulucu: Sadece Google CSE (no fallback) -------------------- */
function normalizeName(s: string) {
  return s.replace(/\(.+?\)/g, "").trim();
}

// İlk görseli getir: (opsiyonel) site kısıtlı, çoklu sonuç alıp filtrele
// Google CSE - genel arama (site kısıtsız), ilk uygun sonucu döndür
async function cseImageFirst(query: string): Promise<string | null> {
  const key = process.env.GOOGLE_CSE_KEY;
  const cx  = process.env.GOOGLE_CSE_ID;
  if (!key || !cx) return null;

  const params = new URLSearchParams({
    q: query,
    cx,
    key,
    searchType: "image",
    num: "10",
    safe: "off",
    hl: "tr",
    gl: "tr",
  });
  // ikon/sprite riskini azalt
  params.set("imgType", "photo");

  try {
    const r = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
    if (!r.ok) {
      console.warn(`CSE HTTP ${r.status} q="${query}"`);
      return null;
    }
    const j: any = await r.json().catch(() => null);
    const items: any[] = Array.isArray(j?.items) ? j.items : [];
    if (!items.length) {
      console.warn(`CSE boş → q="${query}"`);
      return null;
    }

    // Filtre: genişlik/yükseklik ve oran
   const candidates = items.map(it => {
  const link = it?.link as string | undefined;
  const w = Number(it?.image?.width || 0);
  const h = Number(it?.image?.height || 0);
  const ctx = it?.image?.contextLink as string | undefined;
  return { link, w, h, ctx };
})
  .filter(c => typeof c.link === "string" && c.link.startsWith("http"))
  .filter(c => !isBad(c.link) && !isBad(c.ctx))       // ← kötü hostları ele
  .filter(c => c.w >= 400 && c.h >= 400)
  .filter(c => {
    const ratio = c.w / c.h;
    return ratio > 0.4 && ratio < 2.5;
  });

    return candidates[0]?.link ?? null;
  } catch (e) {
    console.warn("CSE hata:", (e as any)?.message || e);
    return null;
  }
}
// SerpAPI - Google Images, ilk sonuç
async function serpImageFirst(query: string): Promise<string | null> {
  const key = process.env.SERPAPI_KEY;
  if (!key) return null;

  const params = new URLSearchParams({
    engine: "google_images",
    q: query,
    api_key: key,
    hl: "tr",
    gl: "tr",
    // Güzel oran/foto sonuçlar için birkaç ipucu:
    safe: "off",
  });

  try {
    const r = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
    if (!r.ok) {
      console.warn(`SerpAPI HTTP ${r.status} q="${query}"`);
      return null;
    }
    const j: any = await r.json().catch(() => null);
    const imgs: any[] = Array.isArray(j?.images_results) ? j.images_results : [];
    if (!imgs.length) {
      console.warn(`SerpAPI boş → q="${query}"`);
      return null;
    }

    // direct link veya thumbnail
    for (const im of imgs) {
  const link = im?.original || im?.thumbnail || im?.link;
  if (typeof link === "string" && link.startsWith("http") && !isBad(link)) {
    return link;
  }
}
return null;
  } catch (e) {
    console.warn("SerpAPI hata:", (e as any)?.message || e);
    return null;
  }
}

function isTag(tags: string[] | undefined, re: RegExp) {
  return (tags || []).some(t => re.test(t));
}

export async function findImageUrl(name: string, tags?: string[], hint?: string): Promise<string | null> {
  // Basit ve tutarlı: TR Google Images’ta ilk sonuç
  // 1) Kesin eşleşme etkisi için tırnak
  // 2) Kategoriye göre küçük ipuçları (poster/logo/ürün fotoğrafı vs.)
  const is = (re: RegExp) => (tags || []).some(t => re.test(t));
  const extras: string[] = [];
  if (is(/^(film|dizi)$/i))        extras.push("poster");
  if (is(/^uygulama$/i))           extras.push("logo");
  if (is(/^(gıda|atıştırmalık|içecek|çikolata|kahve)$/i)) extras.push("ürün fotoğrafı");
  if (is(/^gadget$/i))             extras.push("ürün fotoğrafı");
  if (is(/^(oyun)$/i))             extras.push("game cover", "box art");
  if (is(/^kitap$/i))              extras.push("kitap kapağı", "book cover");
  if (hint)                        extras.push(hint);

  const queryExact = [`"${name}"`, ...extras].join(" ").trim();
  const queryLoose = [name, ...extras].join(" ").trim();

  // Önce CSE (genel, site kısıtsız)
  let url = await cseImageFirst(queryExact);
  if (!url) url = await cseImageFirst(queryLoose);

  // Hâlâ yoksa SerpAPI
  if (!url) url = await serpImageFirst(queryExact);
  if (!url) url = await serpImageFirst(queryLoose);

  // Hâlâ yoksa SKIP
  return url ?? null;
}
/* -------------------- 50 item listesi -------------------- */
type SeedItem = { name: string; tags?: string[]; hint?: string };

const ITEMS_50: SeedItem[] = shuffle([
  // Yiyecek/İçecek
  { name: "Ülker Çikolatalı Gofret", tags: ["gıda", "atıştırmalık"], hint: "ürün fotoğrafı" },
  { name: "Coca-Cola Zero Sugar", tags: ["içecek"], hint: "kutu ürün fotoğrafı" },
  { name: "Ayran (Sütaş)", tags: ["içecek"], hint: "bardak ürün fotoğrafı" },
  { name: "Uludağ Gazoz", tags: ["içecek"], hint: "şişe ürün fotoğrafı" },
  { name: "Tadım Karışık Kuruyemiş", tags: ["gıda", "atıştırmalık"], hint: "paket ürün fotoğrafı" },
  { name: "Nestlé Damak", tags: ["gıda", "çikolata"], hint: "ürün fotoğrafı" },
  { name: "Komili Riviera Zeytinyağı", tags: ["gıda"], hint: "şişe ürün fotoğrafı" },
  { name: "V60 pour over", tags: ["kahve"], hint: "kahve demleme sunumu" },
  { name: "Flat white", tags: ["kahve"], hint: "bardak kahve sunumu" },
  { name: "Türk Kahvesi", tags: ["kahve"], hint: "fincan sunumu" },

  // Film / Dizi
  { name: "Inception", tags: ["film"], hint: "movie poster" },
  { name: "The Dark Knight", tags: ["film"], hint: "movie poster" },
  { name: "Interstellar", tags: ["film"], hint: "movie poster" },
  { name: "Fight Club", tags: ["film"], hint: "movie poster" },
  { name: "Parasite", tags: ["film"], hint: "film afiş" },
  { name: "Bir Zamanlar Anadolu’da", tags: ["film"], hint: "film afiş" },
  { name: "Gibi (Dizi)", tags: ["dizi"], hint: "dizi afiş poster" },
  { name: "Leyla ile Mecnun", tags: ["dizi"], hint: "dizi afiş poster" },
  { name: "Succession", tags: ["dizi"], hint: "tv series poster" },
  { name: "The Social Network", tags: ["film"], hint: "movie poster" },

  // Mekan / Spesifik
  { name: "Kadıköy Gaff Bar", tags: ["mekan", "bar"], hint: "dış görünüş" },
  { name: "Moda Sahili", tags: ["mekan", "sahil"], hint: "sahil manzara" },
  { name: "Galata Kulesi", tags: ["mekan", "tarihî"], hint: "dış görünüş" },
  { name: "Karaköy Lokantası", tags: ["mekan", "restoran"], hint: "dış görünüş" },
  { name: "Bursa İskender", tags: ["mekan", "restoran"], hint: "tabak sunum" },

  // Uygulama / Servis
  { name: "Spotify", tags: ["uygulama"], hint: "logo" },
  { name: "Netflix", tags: ["uygulama"], hint: "logo" },
  { name: "Google Maps", tags: ["uygulama"], hint: "logo" },
  { name: "Yemeksepeti", tags: ["uygulama"], hint: "logo" },
  { name: "Getir", tags: ["uygulama"], hint: "logo" },

  // Gadget / Donanım
  { name: "Apple AirPods Pro", tags: ["gadget"], hint: "ürün fotoğrafı" },
  { name: "Sony WH-1000XM4", tags: ["gadget"], hint: "ürün fotoğrafı" },
  { name: "Kindle Paperwhite", tags: ["gadget"], hint: "ürün fotoğrafı" },
  { name: "Logitech MX Master 3", tags: ["gadget"], hint: "ürün fotoğrafı" },
  { name: "Nintendo Switch", tags: ["gadget"], hint: "ürün fotoğrafı" },

  // Oyun / Yazılım
  { name: "The Last of Us Part II", tags: ["oyun"], hint: "box art cover" },
  { name: "Zelda: Breath of the Wild", tags: ["oyun"], hint: "game cover art" },
  { name: "Counter-Strike 2", tags: ["oyun"], hint: "game logo" },
  { name: "Baldur’s Gate 3", tags: ["oyun"], hint: "game poster" },

  // Kitap
  { name: "Kürk Mantolu Madonna", tags: ["kitap"], hint: "kitap kapağı" },
  { name: "Suç ve Ceza", tags: ["kitap"], hint: "book cover" },
  { name: "Harry Potter and the Philosopher’s Stone", tags: ["kitap"], hint: "book cover" },
  { name: "İnce Memed", tags: ["kitap"], hint: "kitap kapağı" },

  // Restoran / Kafe
  { name: "Petra Roasting Co. Gayrettepe", tags: ["kafe"], hint: "iç mekan" },
  { name: "Norm Coffee Karaköy", tags: ["kafe"], hint: "iç mekan" },
  { name: "Walter’s Coffee Roastery Moda", tags: ["kafe"], hint: "iç mekan" },

  // Deneyim / Yer
  { name: "Cappadocia hot air balloon sunrise", tags: ["seyahat", "deneyim"], hint: "hot air balloons" },
  { name: "Kaş dalış noktaları", tags: ["seyahat", "deneyim"], hint: "scuba diving" },
  { name: "Datça Knidos antik kenti", tags: ["seyahat", "tarihî"], hint: "arkeolojik alan" },
  { name: "Ayvalık Cunda gün batımı", tags: ["seyahat", "deneyim"], hint: "sunset" },
  { name: "Fethiye Kelebekler Vadisi", tags: ["seyahat", "doğa"], hint: "kanyon manzara" },

  // Esprili/spesifik obje/deneyim
  { name: "Boğaz vapurunda simit + çay", tags: ["deneyim", "nostalji"], hint: "vapur ve çay simit" },
  { name: "Metrobüs boş koltuk", tags: ["şehir", "deneyim"], hint: "public transport seat" },
  { name: "İETT akbil cihazı", tags: ["şehir"], hint: "turnstile" },
  { name: "Üsküdar sahilde gün doğumu", tags: ["seyahat", "doğa"], hint: "sunrise" },
]);

/* -------------------- SEED -------------------- */
async function main() {
  console.log("Seed başlıyor (50 item)…");

  const ITEM_LIST = ITEMS_50;
  const COUNT = ITEM_LIST.length;

  // 1) Kullanıcılar (UI Avatars + random isim) — idempotent
  const users: { id: string; email: string }[] = [];
  for (let i = 0; i < COUNT; i++) {
    const email  = `seeduser${i+1}@example.com`; // unique
    const name   = randomDisplayName();
    const handle = randomHandle(); // ileride username alanı eklenirse kullanılabilir
    const avatar = uiAvatarUrl(name);

    const u = await prisma.user.upsert({
      where: { email },
      update: { name, avatarUrl: avatar },
      create: { email, name, avatarUrl: avatar }
    });

    users.push({ id: u.id, email: u.email });
  }

  // 2) Item'lar
  let created = 0, skipped = 0, failed = 0;

  for (let i = 0; i < COUNT; i++) {
    const it = ITEM_LIST[i];
    const u  = users[i];

    try {
      // Aynı isimli item varsa atla (idempotent)
      const exists = await prisma.item.findFirst({ where: { name: it.name } });
      if (exists) { skipped++; continue; }

      // Görsel bul (yalnızca Google CSE; sonuç yoksa SKIP)
      const imageUrl = await findImageUrl(it.name, it.tags, it.hint);
      if (!imageUrl) {
        console.warn(`⏭  Görsel bulunamadı, atlanıyor → ${it.name}`);
        skipped++;
        continue;
      }

      // Puan + yorum
      const ratingVal = sampleRating();
      const ratingText = commentForRating(ratingVal);

      // Item
      const item = await prisma.item.create({
        data: {
          name: it.name,
          description: "",     // şemada zorunlu
          imageUrl,
          createdById: u.id,
        },
      });

      // Tagler
      for (const t of it.tags || []) {
        const tag = await prisma.tag.upsert({
          where: { name: t },
          update: {},
          create: { name: t },
        });
        await prisma.itemTag.create({
          data: { itemId: item.id, tagId: tag.id },
        });
      }

      // Rating + Comment (comment.rating DOLU)
      await prisma.rating.create({
        data: { itemId: item.id, userId: u.id, value: ratingVal },
      });
      await prisma.comment.create({
        data: { itemId: item.id, userId: u.id, text: ratingText, rating: ratingVal },
      });

      created++;
      if (created % 10 === 0) console.log(`✔︎ ${created}/${COUNT}`);
      // Harici servislere nazik ol
      await new Promise((r) => setTimeout(r, 120));
    } catch (e: any) {
      failed++;
      console.error(`✖ "${it?.name ?? 'unknown'}" eklenemedi:`, e?.message || e);
    }
  }

  console.log(`Seed bitti. Oluşturulan: ${created}, atlanan: ${skipped}, başarısız: ${failed}, hedef: ${COUNT}`);
}

main()
  .catch((e) => {
    console.error("Seed fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });