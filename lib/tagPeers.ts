// lib/tagPeers.ts
import { PrismaClient } from "@prisma/client";

export async function notifyTagPeers(prisma: PrismaClient, itemId: string) {
  // Yeni eklenen item + etiketler (ItemTag üzerinden Tag)
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      tags: {
        select: {
          tag: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!item) return;

  const tags = item.tags?.map((it: { tag: { id: string; name: string } }) => it.tag) ?? [];
  const tagIds = tags.map((t) => t.id);
  if (tagIds.length === 0) return;

  // Bu etiketlerde geçmişte paylaşım yapmış kullanıcılar (kendisi hariç) – DISTINCT by createdById
  const peers = await prisma.item.findMany({
    where: {
      createdById: { not: item.createdById },
      tags: { some: { tagId: { in: tagIds } } },
    },
    select: { createdById: true },
    distinct: ["createdById"],
    take: 200,
  });

  // null userId'leri ele (schema'da createdById nullable)
  const peerIds = peers
    .map((p) => p.createdById)
    .filter((u): u is string => typeof u === "string" && u.length > 0);

  if (peerIds.length === 0) return;

  // Kullanıcı tercihlerini (tagPeerNewItem) dikkate al
  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: { in: peerIds } },
    select: { userId: true, tagPeerNewItem: true },
  });
  const allowMap = new Map(prefs.map((p) => [p.userId, p.tagPeerNewItem]));
  const allowed = peerIds.filter((uid) => {
    const val = allowMap.get(uid);
    // kaydı yoksa varsayılan true
    return val === undefined || val === true;
  });

  if (allowed.length === 0) return;

  // Mesaj: birincil etiket olarak ilk etiketi öne çıkar (#etiket)
  const primaryTag = tags[0];
  const tagLabel = primaryTag?.name ? `#${primaryTag.name}` : "#etiket";

  // Tekilleştirme: kullanıcı + item bazlı eventKey
  const rows = allowed.map((uid) => ({
    userId: uid,
    type: "TAG_PEER_NEW_ITEM" as any,
    title: `${tagLabel} etiketiyle yeni gönderi paylaşıldı`,
    body: `“${item.name ?? "Yeni içerik"}” ilgini çekebilir.`,
    link: `/share/${item.id}`,
    image: item.imageUrl || "/badges/tag.svg",
    eventKey: `tagpeer:${uid}:${item.id}`,
    data: {
      itemId: item.id,
      tags: tags.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })),
    },
  }));

  // Var olan eventKey’leri ele, dup’ları at
  const existing = await prisma.notification.findMany({
    where: { eventKey: { in: rows.map((r) => r.eventKey!) } },
    select: { eventKey: true },
  });
  const existingSet = new Set(existing.map((e) => e.eventKey!));
  const toCreate = rows.filter((r) => !existingSet.has(r.eventKey!));
  if (toCreate.length === 0) return;

  // Toplu insert
  await prisma.notification.createMany({ data: toCreate });
}