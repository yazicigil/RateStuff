import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Ayarlar
const SEED_DOMAIN = 'example.com';          // seed kullanıcı e-postaları
const CUTOFF_MINUTES = 240;                 // son 4 saat içinde eklenenler
const EXECUTE = true;                       // önce false yapıp "dry run" görebilirsin

async function main() {
  const cutoff = new Date(Date.now() - CUTOFF_MINUTES * 60_000);

  // 1) Seed kullanıcılarını bul (user1@example.com ... user100@example.com)
  const seedUsers = await prisma.user.findMany({
    where: { email: { endsWith: `@${SEED_DOMAIN}` } },
    select: { id: true, email: true }
  });

  // 2) Bu kullanıcıların oluşturduğu veya son X dakikada eklenen item’ları hedefle
  // Not: schema’da Item.createdById onDelete SetNull; o yüzden önce Item'ları silmek gerekir.
  const seedUserIds = seedUsers.map(u => u.id);

  // Silinecek item’lar
  const itemsToDelete = await prisma.item.findMany({
    where: {
      OR: [
        { createdById: { in: seedUserIds } }, // seed kullanıcılarının ekledikleri
        { createdAt: { gte: cutoff } }        // son X dk içinde eklenenler (bulk/seed yakalar)
      ]
    },
    select: { id: true, name: true, createdAt: true, createdById: true }
  });

  // Bilgi
  console.log(`Seed users: ${seedUsers.length}`);
  console.log(`Items to delete: ${itemsToDelete.length}`);

  if (!EXECUTE) {
    console.log('Dry run bitti. EXECUTE=true yaparsan siler.');
    return;
  }

  // 3) Item’ları sil (Rating, Comment, ItemTag ilişkileri CASCADE olduğu için otomatik silinir)
  if (itemsToDelete.length) {
    const ids = itemsToDelete.map(i => i.id);
    await prisma.item.deleteMany({ where: { id: { in: ids } } });
    console.log(`Silinen item: ${ids.length}`);
  }

  // 4) İçeriksiz (orphans) Tag’leri temizle
  const orphanTags = await prisma.tag.findMany({
    where: { items: { none: {} } },
    select: { id: true, name: true }
  });
  if (orphanTags.length) {
    await prisma.tag.deleteMany({ where: { id: { in: orphanTags.map(t => t.id) } } });
    console.log(`Silinen boş tag: ${orphanTags.length}`);
  }

  // 5) İstersen seed kullanıcılarını da kaldır
  if (seedUsers.length) {
    // Dikkat: User silince Item.createdById SetNull olur (zaten item'ları sildik).
    await prisma.user.deleteMany({ where: { id: { in: seedUserIds } } });
    console.log(`Silinen seed user: ${seedUsers.length}`);
  }

  console.log('Temizlik tamam.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});