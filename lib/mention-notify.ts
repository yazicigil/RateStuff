// lib/mention-notify.ts
import { extractMentionsFromHtml, buildSnippet } from "@/lib/mentions";
import { Prisma, PrismaClient } from "@prisma/client";

function buildNotifBase(params: { type: 'MENTION_IN_COMMENT' | 'MENTION_IN_POST'; brandId: string; actorId: string; itemId: string; commentId?: string | null; itemName?: string }) {
  const { type, brandId, actorId, itemId, commentId, itemName } = params;
  const title = type === 'MENTION_IN_COMMENT' ? 'Bir kullanıcı yorumunda sizden bahsetti' : `${itemName ?? 'Gönderi'} gönderisinde sizden bahsedildi`;
  const body = type === 'MENTION_IN_COMMENT' ? '“' + (itemName ?? 'Gönderi') + '” içindeki bir yorumda sizden bahsedildi' : 'Gönderi açıklamasında sizden bahsedildi';
  const key = `${type}:${brandId}:${itemId}:${commentId ?? 'desc'}`; // eventKey üzerinden tekilleştireceğiz
  return { title, body, key };
}

type ResolvedMention = { brandId: string; display?: string };

async function resolveMentionTargets(tx: Tx, parsed: ReturnType<typeof extractMentionsFromHtml>): Promise<ResolvedMention[]> {
  const out: ResolvedMention[] = [];

  // 1) Already have brandId
  for (const m of parsed) {
    if ((m as any).brandId) out.push({ brandId: (m as any).brandId, display: (m as any).display });
  }

  // 2) Slugs → BrandAccount.slug -> email -> User(kind='BRAND')
  const slugs = parsed.filter((m: any) => m.slug).map((m: any) => String(m.slug).toLowerCase());
  if (slugs.length) {
    // BrandAccount: { slug, email }
    const accounts = await (tx as any).brandAccount.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true, email: true },
    });
    const emails = accounts.map((a: any) => a.email).filter(Boolean);
    if (emails.length) {
      const brandUsers = await (tx as any).user.findMany({
        where: { email: { in: emails } },
        select: { id: true, email: true },
      });
      const emailToUserId = new Map<string, string>(brandUsers.map((u: any) => [u.email, u.id]));
      const slugToUserId = new Map<string, string>();
      for (const a of accounts) {
        const uid = emailToUserId.get(a.email);
        if (uid) slugToUserId.set(String(a.slug).toLowerCase(), uid);
      }
      for (const m of parsed) {
        if ((m as any).slug) {
          const uid = slugToUserId.get(String((m as any).slug).toLowerCase());
          if (uid) out.push({ brandId: uid, display: (m as any).display });
        }
      }
    }
  }

  // de-dup by brandId
  const uniq = new Map<string, ResolvedMention>();
  for (const r of out) if (!uniq.has(r.brandId)) uniq.set(r.brandId, r);
  return Array.from(uniq.values());
}

type Tx = PrismaClient | Prisma.TransactionClient;

export async function handleMentionsOnComment(
  
  tx: Tx,
  params: { actorId: string; itemId: string; commentId: string; text: string }
) {
  const { actorId, itemId, commentId, text } = params;
  console.info('[mention:comment] start', { itemId, commentId, actorId, textLen: text?.length });
  const parsed = extractMentionsFromHtml(text);
  console.info('[mention:comment] parsed', parsed);
  const mentions = await resolveMentionTargets(tx, parsed);
  console.info('[mention:comment] resolved', mentions);
  if (!mentions.length) return;

  await Promise.all(
    mentions
      .filter((m) => m.brandId !== actorId) // self-mention yok
      .map(async (m) => {
        console.info('[mention:comment] processing', { brandId: m.brandId, display: m.display });
        const existing = await tx.mention.findFirst({ where: { brandId: m.brandId, itemId, commentId } });
        if (existing) {
          await tx.mention.update({ where: { id: existing.id }, data: { snippet: buildSnippet(text) } });
        } else {
          await tx.mention.create({ data: { brandId: m.brandId, actorId, itemId, commentId, snippet: buildSnippet(text) } });
        }

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
  console.info('[mention:post] start', { itemId, actorId, descLen: description?.length });
  const parsed = extractMentionsFromHtml(description);
  console.info('[mention:post] parsed', parsed);
  const mentions = await resolveMentionTargets(tx, parsed);
  console.info('[mention:post] resolved', mentions);
  if (!mentions.length) return;

  await Promise.all(
    mentions
      .filter((m) => m.brandId !== actorId)
      .map(async (m) => {
        console.info('[mention:post] processing', { brandId: m.brandId, display: m.display });
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