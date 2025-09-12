// lib/mention-notify.ts
import { extractMentionsFromHtml, buildSnippet } from "@/lib/mentions";
import { Prisma, PrismaClient } from "@prisma/client";

function buildNotifBase(params: { type: 'MENTION_IN_COMMENT' | 'MENTION_IN_POST'; brandId: string; actorId: string; itemId: string; commentId?: string | null; itemName?: string }) {
  const { type, brandId, actorId, itemId, commentId, itemName } = params;
  const title = type === 'MENTION_IN_COMMENT' ? 'Bir kullanıcı yorumunda sizden bahsetti' : `${itemName ?? 'Gönderi'} gönderisinde sizden bahsedildi`;
  const body = type === 'MENTION_IN_COMMENT' ? '“' + (itemName ?? 'Gönderi') + '” içindeki bir yorumda mentionlandınız' : 'Gönderi açıklamasında mentionlandınız';
  const key = `${type}:${brandId}:${itemId}:${commentId ?? 'desc'}`; // eventKey üzerinden tekilleştireceğiz
  return { title, body, key };
}

type Tx = PrismaClient | Prisma.TransactionClient;

export async function handleMentionsOnComment(
  tx: Tx,
  params: { actorId: string; itemId: string; commentId: string; text: string }
) {
  const { actorId, itemId, commentId, text } = params;
  const mentions = extractMentionsFromHtml(text);
  if (!mentions.length) return;

  await Promise.all(
    mentions
      .filter((m) => m.brandId !== actorId) // self-mention yok
      .map(async (m) => {
        await tx.mention.upsert({
          where: { brandId_itemId_commentId: { brandId: m.brandId, itemId, commentId } },
          create: {
            brandId: m.brandId,
            actorId,
            itemId,
            commentId,
            snippet: buildSnippet(text),
          },
          update: { snippet: buildSnippet(text) },
        });

        const item = await tx.item.findUnique({ where: { id: itemId }, select: { name: true } });
        const base = buildNotifBase({ type: 'MENTION_IN_COMMENT', brandId: m.brandId, actorId, itemId, commentId, itemName: item?.name });

        await tx.notification.upsert({
          where: { eventKey: base.key },
          create: {
            eventKey: base.key,
            userId: m.brandId, // hedef marka hesabı
            type: 'MENTION_IN_COMMENT',
            title: base.title,
            body: base.body,
            link: `/?item=${itemId}&comment=${commentId}`,
            image: undefined,
            data: { itemId, commentId, actorId },
            brandId: m.brandId,
            actorId,
            itemId,
            commentId,
          },
          update: {
            // sadece metadata güncellesin (ör. body değiştiyse)
            title: base.title,
            body: base.body,
            data: { itemId, commentId, actorId },
          },
        });
      })
  );
}

export async function handleMentionsOnPost(
  tx: Tx,
  params: { actorId: string; itemId: string; description: string }
) {
  const { actorId, itemId, description } = params;
  const mentions = extractMentionsFromHtml(description);
  if (!mentions.length) return;

  await Promise.all(
    mentions
      .filter((m) => m.brandId !== actorId)
      .map(async (m) => {
        // Mention (post): commentId null için manuel upsert
        const existing = await tx.mention.findFirst({ where: { brandId: m.brandId, itemId, commentId: null } });
        if (existing) {
          await tx.mention.update({ where: { id: existing.id }, data: { snippet: buildSnippet(description) } });
        } else {
          await tx.mention.create({ data: { brandId: m.brandId, actorId, itemId, commentId: null, snippet: buildSnippet(description) } });
        }

        const item = await tx.item.findUnique({ where: { id: itemId }, select: { name: true } });
        const base = buildNotifBase({ type: 'MENTION_IN_POST', brandId: m.brandId, actorId, itemId, commentId: null, itemName: item?.name });

        await tx.notification.upsert({
          where: { eventKey: base.key },
          create: {
            eventKey: base.key,
            userId: m.brandId,
            type: 'MENTION_IN_POST',
            title: base.title,
            body: base.body,
            link: `/?item=${itemId}&hl=desc`,
            image: undefined,
            data: { itemId, actorId },
            brandId: m.brandId,
            actorId,
            itemId,
            commentId: null,
          },
          update: {
            title: base.title,
            body: base.body,
            data: { itemId, actorId },
          },
        });
      })
  );
}