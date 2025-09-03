import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { constantTimeEqual, hashOtp, hashNonce } from "@/lib/crypto-lite";

const db = prisma as any;

export async function POST(req: Request) {
  const { email, code } = await req.json();

  // purge expired OTP rows to keep table small
  await db.brandOtp.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  const entry = await db.brandOtp.findFirst({
    where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!entry) return NextResponse.json({ ok: false, error: "invalid_code" });

  if (entry.attempts >= 5) return NextResponse.json({ ok: false, error: "locked" });

  const ok = constantTimeEqual(hashOtp(code), entry.codeHash);
  if (!ok) {
    await db.brandOtp.update({
      where: { id: entry.id },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ ok: false, error: "invalid_code" });
  }

  await db.brandOtp.update({ where: { id: entry.id }, data: { consumedAt: new Date() } });

  // nonce
  const nonce = crypto.randomUUID();
  const nonceHash = hashNonce(nonce);

  await db.brandLoginNonce.create({
    data: {
      id: crypto.randomUUID(),
      email, nonceHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  return NextResponse.json({ ok: true, nonce });
}