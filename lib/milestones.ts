// lib/milestones.ts
import { PrismaClient } from "@prisma/client";
const LEVELS = [10, 50, 100] as const;
type Level = typeof LEVELS[number];

function badgeImage(kind: string, level: Level) {
  const base =
    kind === "owner_item_reviews" ? "owner-item" :
    kind === "user_items_shared" ? "items-shared" :
    "reviews-given";
  return `/badges/${base}-${level}.png`;
}

function badgeTitle(kind: string, level: Level): string {
  if (kind === "owner_item_reviews") {
    if (level === 10) return "İlgi Odağı";
    if (level === 50) return "Topluluk Favorisi";
    if (level === 100) return "Efsanevi Paylaşımcı";
  }
  if (kind === "user_items_shared") {
    if (level === 10) return "Öncü";
    if (level === 50) return "Arşivci";
    if (level === 100) return "Ansiklopedi";
  }
  if (kind === "user_reviews_given") {
    if (level === 10) return "Yorumcu";
    if (level === 50) return "Eleştirmen";
    if (level === 100) return "Usta Yorumcu";
  }
  return "";
}

export async function milestone_ownerItemReviews(prisma: PrismaClient, itemId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, name: true, createdById: true, imageUrl: true },
  });
  if (!item?.createdById) return;

  const total = await prisma.comment.count({
    where: { itemId, userId: { not: item.createdById } },
  });

  const hit = LEVELS.find(l => total === l);
  if (!hit) return;

  const eventKey = `ms:owner_item_reviews:${itemId}:${hit}`;
  await prisma.notification.create({
    data: {
      userId: item.createdById,
      type: "MILESTONE_REACHED" as any,
      title: `Tebrikler! “${badgeTitle("owner_item_reviews", hit)}” unvanını kazandın`,
      body: `“${item.name}” ${hit} değerlendirmeye ulaştı. Harika gidiyorsun!`,
      link: `/share/${item.id}`,
      image: badgeImage("owner_item_reviews", hit),
      eventKey,
      data: { kind: "owner_item_reviews", level: hit, badgeTitle: badgeTitle("owner_item_reviews", hit), itemId: item.id },
    },
  });
}

export async function milestone_userItemsShared(prisma: PrismaClient, ownerId: string) {
  const total = await prisma.item.count({ where: { createdById: ownerId } });
  const hit = LEVELS.find(l => total === l);
  if (!hit) return;

  const eventKey = `ms:user_items_shared:${ownerId}:${hit}`;
  await prisma.notification.create({
    data: {
      userId: ownerId,
      type: "MILESTONE_REACHED" as any,
      title: `Tebrikler! “${badgeTitle("user_items_shared", hit)}” unvanını kazandın`,
      body: `${hit} farklı item ekledin. Katkın büyüyor 👏`,
      link: "/me#tab=items",
      image: badgeImage("user_items_shared", hit),
      eventKey,
      data: { kind: "user_items_shared", level: hit, badgeTitle: badgeTitle("user_items_shared", hit) },
    },
  });
}

export async function milestone_userReviewsGiven(prisma: PrismaClient, userId: string) {
  const total = await prisma.comment.count({
    where: {
      userId,
      item: { createdById: { not: userId } },
    },
  });
  const hit = LEVELS.find(l => total === l);
  if (!hit) return;

  const eventKey = `ms:user_reviews_given:${userId}:${hit}`;
  await prisma.notification.create({
    data: {
      userId,
      type: "MILESTONE_REACHED" as any,
      title: `Tebrikler! “${badgeTitle("user_reviews_given", hit)}” unvanını kazandın`,
      body: `${hit} farklı değerlendirme bıraktın. Süpersin!`,
      link: null,
      image: badgeImage("user_reviews_given", hit),
      eventKey,
      data: { kind: "user_reviews_given", level: hit, badgeTitle: badgeTitle("user_reviews_given", hit) },
    },
  });
}