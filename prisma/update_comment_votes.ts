// prisma/update_comment_votes.ts
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath });
else dotenv.config();

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// [-3, +5] arası tam sayı
function randomVoteCount() {
  return Math.floor(Math.random() * 9) - 3;
}

async function main() {
  console.log("Mevcut yorumlara rastgele oylar ekleniyor…");

  // Kullanıcı havuzu (id listesi)
  const users = await prisma.user.findMany({ select: { id: true } });
  const userIds = users.map(u => u.id);
  if (userIds.length === 0) {
    console.log("Kullanıcı yok, çıkıyorum.");
    return;
  }

  // Yorumları çek (oy verenleri de alalım ki aynısından eklemeyelim)
  const comments = await prisma.comment.findMany({
    select: { id: true, userId: true },
  });

  let affectedComments = 0;
  let totalVotesCreated = 0;

  for (const c of comments) {
    const count = randomVoteCount();
    if (count === 0) continue;

    // Bu yorum için daha önce kim oy vermiş?
    const existing = await prisma.commentVote.findMany({
      where: { commentId: c.id },
      select: { userId: true },
    });
    const existingSet = new Set(existing.map(v => v.userId));

    // Yorum sahibini ve mevcut oy vermiş kullanıcıları havuzdan çıkar
    const available = userIds.filter(
      uid => uid !== c.userId && !existingSet.has(uid)
    );

    // İstediğimiz kadar kullanıcı yoksa, eldeki kadar ekle
    const k = Math.min(Math.abs(count), available.length);
    if (k <= 0) continue;

    // Havuzdan rastgele k kullanıcı seç
    const picked: string[] = [];
    const pool = [...available];
    for (let i = 0; i < k; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }

    // Oy verileri (1 = upvote, -1 = downvote)
    const voteValue = count > 0 ? 1 : -1;
    const data = picked.map(uid => ({
      commentId: c.id,
      userId: uid,
      value: voteValue,
    }));

    // Tek seferde ekle, benzersiz kuralı için skipDuplicates açık
    const res = await prisma.commentVote.createMany({
      data,
      skipDuplicates: true,
    });

    if (res.count > 0) {
      affectedComments++;
      totalVotesCreated += res.count;
    }
  }

  console.log(
    `✅ ${affectedComments} yorumda toplam ${totalVotesCreated} oy oluşturuldu.`
  );
}

main()
  .catch(e => {
    console.error("Hata:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });