// prisma/seed_comments.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const COMMENTS_POS = [
  "Harika bir deneyimdi!",
  "Beklentilerimin üzerinde.",
  "Tekrar alırım.",
  "Çok beğendim.",
];
const COMMENTS_NEU = [
  "Fena değil.",
  "Ortalama bir deneyim.",
  "Kısmen beğendim.",
];
const COMMENTS_NEG = [
  "Beğenmedim.",
  "Hayal kırıklığı.",
  "Bir daha almam.",
];

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function commentForRating(rating: number) {
  if (rating <= 2) return pick(COMMENTS_NEG);
  if (rating === 3) return pick(COMMENTS_NEU);
  return pick(COMMENTS_POS);
}

async function main() {
  const items = await prisma.item.findMany({
    include: { comments: { select: { userId: true } } },
  });
  const users = await prisma.user.findMany({ select: { id: true } });

  for (const item of items) {
    // %50 ihtimalle bu iteme ekstra yorum ekle
    if (Math.random() < 0.5) continue;

    // 1 ile 4 arası ekstra yorum
    const extraCount = Math.floor(Math.random() * 4) + 1;

    // Zaten yorum yapmamış kullanıcıları bul
    const commentedUserIds = new Set(item.comments.map(c => c.userId));
    const availableUsers = users.filter(u => !commentedUserIds.has(u.id));

    for (let i = 0; i < extraCount && availableUsers.length > 0; i++) {
      const user = availableUsers.splice(
        Math.floor(Math.random() * availableUsers.length), 1
      )[0];

      const ratingVal = Math.floor(Math.random() * 5) + 1;
      const text = commentForRating(ratingVal);

      await prisma.rating.create({
        data: { itemId: item.id, userId: user.id, value: ratingVal },
      });
      await prisma.comment.create({
        data: { itemId: item.id, userId: user.id, text, rating: ratingVal },
      });
    }
  }
}

main().finally(() => prisma.$disconnect());