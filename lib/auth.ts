// lib/auth.ts
import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email";
import { constantTimeEqual, hashNonce } from "@/lib/crypto-lite";

// basit in-memory guard (dev/prod serverless'ta cold startta sıfırlanır, yine de duplicate'i azaltır)
const g: any = globalThis as any;
g.__welcomeSent ||= new Set<string>();

const GOOGLE_ID = process.env.GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
const GOOGLE_SECRET = process.env.GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;

if (!GOOGLE_ID || !GOOGLE_SECRET) {
  console.error("[auth] Missing Google credentials. Set GOOGLE_ID/GOOGLE_SECRET or GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET");
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: GOOGLE_ID!,
      clientSecret: GOOGLE_SECRET!,
    }),
    Credentials({
      id: "brand-otp",
      name: "Brand OTP",
      credentials: {
        email: { label: "Email", type: "text" },
        nonce: { label: "Nonce", type: "text" },
      },
      async authorize(creds) {
        const db = prisma as any;
        const email = String(creds?.email || "").toLowerCase().trim();
        const nonce = String(creds?.nonce || "");
        if (!email || !nonce) return null;

        // nonce doğrula
        const rec = await db.brandLoginNonce.findFirst({
          where: { email, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
        });
        if (!rec) return null;

        const ok = constantTimeEqual(hashNonce(nonce), rec.nonceHash);
        if (!ok) return null;

        // whitelist kontrolü
        const acct = await db.brandAccount.findUnique({ where: { email } });
        if (!acct || !acct.active) return null;

        // user upsert (BRAND)
        const user = await prisma.user.upsert({
          where: { email },
          update: { kind: "BRAND" } as any,
          create: { email, kind: "BRAND", name: acct.displayName ?? null } as any,
          select: { id: true, email: true, name: true },
        });

        // nonce tek kullanımlık
        await db.brandLoginNonce.delete({ where: { id: rec.id } });

        return { id: user.id, email: user.email!, name: user.name ?? undefined };
      },
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    // Google ile girişte kullanıcıyı upsert et + ilk kayıt ise welcome gönder
    async signIn({ user }) {
      const email = user.email;
      if (!email) return false;

      // 1) Var mı? (adı ve kind bilgisi ile birlikte al)
      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, kind: true },
      });

      if (!existing) {
        // 2a) İlk defa giriş — oluştur (ad ve provider avatarı yalnızca burada set edilir)
        await prisma.user.create({
          data: {
            email,
            name: user.name ?? null,
            avatarUrl: (user.image as string | undefined) ?? null,
          },
        });
      } else {
        // 2b) Mevcut kullanıcı — adı ezme:
        // - Eğer kullanıcı BRAND ise asla overwrite etme
        // - BRAND değilse ve daha önce adı yoksa (null/empty) sadece o zaman provider adını set et
        const isBrand = String(existing.kind || "").toUpperCase() === "BRAND";
        const hasName = Boolean(existing.name && String(existing.name).trim().length > 0);
        const providerName = (user.name ?? "").trim();

        if (!isBrand && !hasName && providerName) {
          await prisma.user.update({
            where: { email },
            data: { name: providerName },
          });
        }
        // Not: avatarUrl burada güncellenmez; kullanıcı yüklediği avatar korunur.
      }

      // 3) Admin promote (merkezî)
      if (email === "ratestuffnet@gmail.com") {
        await prisma.user.update({ where: { email }, data: { isAdmin: true } });
      }

      return true;
    },

    // Oturum objesine DB'deki id/name/avatarUrl’i ekle
    async session({ session }) {
      const email = session.user?.email;
      if (email) {
        const u = await prisma.user.findUnique({
          where: { email },
          select: { id: true, name: true, avatarUrl: true, isAdmin: true, createdAt: true, kind: true } as any,
        });

        if (u && session.user) {
          (session as any).user.id = u.id;
          (session.user as any).name = (u?.name ?? null);
          (session.user as any).avatarUrl = u.avatarUrl ?? null;
          (session.user as any).isAdmin = u.isAdmin;
          (session.user as any).kind = u.kind ?? "REGULAR";
        }
      }

      return session;
    },
  },
  events: {
    async createUser({ user }) {
      try {
        const u = await prisma.user.findUnique({
          where: { id: user.id },
          select: { email: true, name: true, welcomeEmailSentAt: true },
        });
        const email = u?.email ?? user.email;
        if (!email) return;
        if (u?.welcomeEmailSentAt) return;
        await sendWelcomeEmail(email, (u?.name ?? user.name) ?? undefined);
        await prisma.user.update({
          where: { id: user.id },
          data: { welcomeEmailSentAt: new Date() },
        });
      } catch (err) {
        console.error("[auth] events.createUser welcome failed:", err);
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// SSR/API tarafında session almak için
export function auth() {
  return getServerSession(authOptions);
}

// App genelinde kısa yol
export async function getSessionUser() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, avatarUrl: true, isAdmin: true, kind: true },
  });
}