import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "anon@local" },
    update: {},
    create: { email: "anon@local", name: "Anonim Kullanıcı", maskedName: "A**** K*************" }
  });

  const items = [
    { name: "Türk Kahvesi", description: "Klasik, sert, tatlımsı köpük.", tags: ["içecek","kahve"], rating: 5, comment: "Efsane" },
    { name: "Atom Sandviç", description: "Sucuk + kaşar + turşu kombosu.", tags: ["yemek","sandviç"], rating: 4, comment: "Geceye iyi gider" },
  ];
  for (const it of items) {
    const created = await prisma.item.create({ data: { name: it.name, description: it.description, createdById: user.id } });
    for (const t of it.tags) {
      const tag = await prisma.tag.upsert({ where: { name: t }, update: {}, create: { name: t } });
      await prisma.itemTag.create({ data: { itemId: created.id, tagId: tag.id } });
    }
    await prisma.rating.create({ data: { itemId: created.id, userId: user.id, value: it.rating } });
    await prisma.comment.create({ data: { itemId: created.id, userId: user.id, text: it.comment } });
  }
  console.log("Seed ok");
}

main().finally(()=> prisma.$disconnect());
