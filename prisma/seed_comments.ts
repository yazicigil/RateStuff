// prisma/seed_comments.ts
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath });
else dotenv.config();

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/** ----------- küçük yardımcılar ----------- */
const FIRST = ["Can","Ece","Deniz","Mert","Zeynep","Ela","Kerem","Baran","İpek","Burak","Arda","Sena","Ayşe","Mehmet","Elif","Bora","Duru","Kaan","Bartu","Mina","Ali","Vera","Lara","Eren","Cem","Yasemin","Okan","Naz","Defne","Atlas"];
const LAST  = ["Yılmaz","Demir","Kaya","Çelik","Şahin","Öztürk","Aydın","Arslan","Doğan","Kılıç","Kurt","Koç","Aksoy","Yavuz","Kara","Güneş","Taş","Polat","Avcı","Erdem"];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const displayName = () => `${pick(FIRST)} ${pick(LAST)}`;
const uiAvatar = (name: string) => {
  const p = new URLSearchParams({ name, background: "random", bold: "true", format: "png" });
  return `https://ui-avatars.com/api/?${p.toString()}`;
};

// rating dağılımı hafifçe olumlu
function sampleRating(): number {
  const r = Math.random();
  if (r < 0.06) return 1;
  if (r < 0.18) return 2;
  if (r < 0.40) return 3;
  if (r < 0.75) return 4;
  return 5;
}

const POS = [
  "Beklentimin üstünde, kesinlikle tavsiye ederim.",
  "Fiyat/performans çok iyi, tekrar alırım/kullanırım.",
  "Detaylarda özen var, deneyim çok keyifliydi.",
  "Kalitesi belli oluyor, gönül rahatlığıyla öneriyorum.",
  "Genel olarak çok memnun kaldım.",
  "Tam aradığım şey buydu, harika!"
];
const NEU = [
  "Ortalama; bazı yönleri iyi, bazıları geliştirilebilir.",
  "Ne çok sevdim ne de kötü; iş görüyor.",
  "İlk izlenim nötr, biraz daha deneyip karar vereceğim.",
  "Beklentiyi tam karşılamadı ama idare eder.",
  "Ne eksik ne fazla; standart."
];
const NEG = [
  "Beklediğim gibi çıkmadı, hayal kırıklığı.",
  "Fiyatına göre zayıf, önermem.",
  "Tekrar tercih etmem, daha iyi alternatifler var.",
  "Kalite beklentimin altında kaldı.",
  "Benim için pek iyi bir deneyim olmadı."
];

function commentFor(r: number) {
  if (r <= 2) return pick(NEG);
  if (r === 3) return pick(NEU);
  return pick(POS);
}

/** ----------- ana akış ----------- */
const MIN_COMMENTS_PER_ITEM = 3;         // her item'da en az 3 farklı kullanıcı
const EXTRA_USER_POOL       = 150;       // gerekiyorsa oluşturulacak yeni kullanıcı sayısı

async function ensureExtraUsers(n: number) {
  // Zaten var olan “seeduser%”/“extrauser%” kullanıcıları say
  const totalUsers = await prisma.user.count();
  if (totalUsers >= n) return;

  const toCreate = n - totalUsers;
  console.log(`Kullanıcı havuzu artırılıyor: +${toCreate}`);

  const now = Date.now();
  const data = Array.from({ length: toCreate }, (_, i) => {
    const name = displayName();
    return {
      email: `extrauser_${now}_${i}@example.com`,
      name,
      avatarUrl: uiAvatar(name),
    };
  });

  // Tek sorguda toplu ekle (benzersiz email zaten üretiyoruz)
  await prisma.user.createMany({
    data,
    skipDuplicates: true,
  });
}

async function main() {
  console.log("Yorum+rating seed (mevcut itemlara takviye) başlıyor…");

  // 1) yeterli kullanıcı havuzunu garanti et
  await ensureExtraUsers(EXTRA_USER_POOL);

  // 2) tüm kullanıcıları ve itemları çek
  const [users, items] = await Promise.all([
    prisma.user.findMany({ select: { id: true, email: true } }),
    prisma.item.findMany({
      select: { id: true, createdById: true },
      orderBy: { createdAt: "asc" }
    })
  ]);

  if (!items.length) {
    console.log("Item yok, çıkıyorum.");
    return;
  }
  if (users.length < MIN_COMMENTS_PER_ITEM + 1) {
    throw new Error("Yeterli kullanıcı yok. Daha fazla kullanıcı oluşturun.");
  }

  let filledItems = 0, createdComments = 0;

  for (const it of items) {
    // bu item için mevcut yorum yapan kullanıcılar
    const existing = await prisma.comment.findMany({
      where: { itemId: it.id },
      select: { userId: true }
    });
    const commented = new Set(existing.map(x => x.userId));

    // Item sahibini yorumcu havuzundan çıkar (farklı kullanıcılar istiyoruz)
    if (it.createdById) commented.add(it.createdById);

    // tamamlanmış mı?
    if (commented.size >= MIN_COMMENTS_PER_ITEM) {
      continue;
    }

    // yorumcu havuzu: tüm kullanıcılar içinden daha önce yorum yapmamış olanlar
    const pool = users
      .map(u => u.id)
      .filter(uid => !commented.has(uid));

    // havuzdan seçip ekle
    while (commented.size < MIN_COMMENTS_PER_ITEM && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      const uid = pool.splice(idx, 1)[0];
      if (!uid) break;

      const value = sampleRating();
      const text  = commentFor(value);

      // rating ve comment tek kullanıcı için benzersiz, o yüzden transaction
      await prisma.$transaction(async (tx) => {
        // yoksa rating ekle
        const ratingExists = await tx.rating.findFirst({ where: { itemId: it.id, userId: uid } });
        if (!ratingExists) {
          await tx.rating.create({ data: { itemId: it.id, userId: uid, value } });
        }
        // yoksa comment ekle (rating değerini de comment.rating alanına yazıyoruz)
        const commentExists = await tx.comment.findFirst({ where: { itemId: it.id, userId: uid } });
        if (!commentExists) {
          await tx.comment.create({ data: { itemId: it.id, userId: uid, text, rating: value } });
          createdComments++;
        }
      });

      commented.add(uid);
    }

    if (commented.size >= MIN_COMMENTS_PER_ITEM) filledItems++;
  }

  console.log(`Tamamlanan item sayısı: ${filledItems}/${items.length}`);
  console.log(`Eklenen yeni yorum adedi: ${createdComments}`);
}

main()
  .catch((e) => {
    console.error("Seed (yorum takviye) hata:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });