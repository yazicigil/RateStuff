// prisma/add_random_votes.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const comments = await prisma.comment.findMany({
    include: { item: true },
  });

  // yorumları itemId'ye göre gruplandır
  const grouped: Record<string, typeof comments> = {};
  for (const c of comments) {
    if (!grouped[c.itemId]) grouped[c.itemId] = [];
    grouped[c.itemId].push(c);
  }

  for (const [itemId, itemComments] of Object.entries(grouped)) {
    // Bu itemde kaç yoruma vote verelim (1–4 arası)
    const howMany = Math.floor(Math.random() * 4) + 1;
    const shuffled = [...itemComments].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, howMany);

    for (const comment of selected) {
      // Kaç tane farklı kullanıcı oy versin (1–3 arası)
      const votersCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < votersCount; i++) {
        const randomUser = await prisma.user.findFirst({
          skip: Math.floor(Math.random() * await prisma.user.count()),
        });
        if (!randomUser) continue;

        // -3 ile +5 arasında rastgele oy
        const value = Math.floor(Math.random() * 9) - 3;

        await prisma.commentVote.create({
          data: {
            commentId: comment.id,
            userId: randomUser.id,
            value,
          },
        });
      }
    }
  }
}

main()
  .then(() => {
    console.log("Rastgele oylar eklendi.");
  })
  .catch((e) => {
    console.error(e);
  })
  .finally(() => prisma.$disconnect());