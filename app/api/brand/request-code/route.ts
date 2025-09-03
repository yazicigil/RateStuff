import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashOtp } from "@/lib/crypto-lite";
import { sendBrandCodeEmail } from "@/lib/email/brand";

export async function POST(req: Request) {
  const db = prisma as any;
  const { email } = await req.json();
  const ip = req.headers.get("x-forwarded-for") ?? "";

  // purge expired OTP rows to keep table small
  await db.brandOtp.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  // whitelist check
  const acct = await db.brandAccount.findUnique({ where: { email } });
  if (!acct || !acct.active) return NextResponse.json({ ok: true });

  const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  const codeHash = hashOtp(code);

  await db.brandOtp.create({
    data: {
      id: crypto.randomUUID(),
      email, codeHash, ip,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  await sendBrandCodeEmail(email, code);
  return NextResponse.json({ ok: true });
}