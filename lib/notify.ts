import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export type NotifyPayload = {
  userId: string;
  type:
    | "COMMENT_ON_OWN_ITEM"
    | "RATING_ON_OWN_ITEM"
    | "TAG_PEER_NEW_ITEM"
    | "REPORT_OPENED"
    | "REPORT_UPDATED"
    | "REPORT_RESOLVED"
    | "MILESTONE_REACHED"
    | "COMMENT_UPVOTED";
  title: string;
  body: string;
  link?: string;
  image?: string;
  data?: Record<string, unknown>;
  eventKey?: string;
};

// dakikada 10 kayıt sınırı
async function canWrite(userId: string) {
  const since = new Date(Date.now() - 60_000);
  const c = await prisma.notification.count({
    where: { userId, createdAt: { gte: since } },
  });
  return c < 10;
}

function keyOf(p: NotifyPayload) {
  if (p.eventKey) return p.eventKey;
  return crypto
    .createHash("sha1")
    .update([p.userId, p.type, p.link ?? "", p.body].join("|"))
    .digest("hex");
}

export async function notify(p: NotifyPayload) {
  if (!(await canWrite(p.userId))) return null;

  const eventKey = keyOf(p);
  try {
    const n = await prisma.notification.create({
      data: {
        userId: p.userId,
        type: p.type as any,
        title: p.title,
        body: p.body,
        link: p.link,
        image: p.image,
        data: p.data as any,
        eventKey,
      },
    });
    // canlı yayın (SSE/WS) ileride:
    // emitToUser(p.userId, { kind: "notification:new", id: n.id });
    return n;
  } catch (e: any) {
    // unique eventKey tekrarını yoksay
    if (String(e?.code) === "P2002") return null;
    throw e;
  }
}

export const templates = {
  commentOnOwnItem: (args: {
    ownerId: string;
    actorName: string;
    itemTitle: string;
    commentText: string;
    itemId: string;
    thumb?: string;
  }) =>
    notify({
      userId: args.ownerId,
      type: "COMMENT_ON_OWN_ITEM",
      title: `${args.actorName} yorum yaptı`,
      body: `“${args.commentText.slice(0, 80)}” • ${args.itemTitle}`,
      link: `/items/${args.itemId}`,
      image: args.thumb,
      eventKey: `cmt:${args.itemId}:${args.actorName}:${args.commentText.slice(0,40)}`,
      data: { itemId: args.itemId },
    }),
};