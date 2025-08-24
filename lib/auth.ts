// lib/auth.ts
import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email";

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
  ],
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    // Google ile girişte kullanıcıyı upsert et + ilk kayıt ise welcome gönder
    async signIn({ user }) {
      const email = user.email;
      if (!email) return false;

      // 1) Daha önce var mıydı?
      const existed = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      // 2) Upsert
      await prisma.user.upsert({
        where: { email },
        update: {
          name: user.name ?? undefined,
          avatarUrl: (user.image as string | undefined) ?? undefined,
        },
        create: {
          email,
          name: user.name ?? null,
          avatarUrl: (user.image as string | undefined) ?? null,
        },
      });

      // 3) Admin promote (merkezî)
      if (email === "ratestuffnet@gmail.com") {
        await prisma.user.update({ where: { email }, data: { isAdmin: true } });
      }

      // 4) İlk defaysa hoş geldin maili
      if (!existed) {
        try {
          await sendWelcomeEmail(email, user.name ?? undefined);
          console.log("[auth] welcome email sent in signIn to", email);
          g.__welcomeSent.add(email);
        } catch (err) {
          console.error("[auth] welcome email error (signIn):", err);
          // hataya rağmen login akışını bozma
        }
      }

      return true;
    },

    // Oturum objesine DB'deki id/name/avatarUrl’i ekle
    async session({ session }) {
      const email = session.user?.email;
      if (email) {
        const u = await prisma.user.findUnique({
          where: { email },
          select: { id: true, name: true, avatarUrl: true, isAdmin: true, createdAt: true },
        });

        if (u && session.user) {
          (session as any).user.id = u.id;
          session.user.name = u.name ?? session.user.name ?? null;
          (session.user as any).avatarUrl = u.avatarUrl ?? null;
          (session.user as any).isAdmin = u.isAdmin;
        }

        // Fallback: hesap yeni yaratıldıysa (<=120sn) ve bu process'te daha önce yollanmadıysa welcome gönder
        if (u && u.createdAt) {
         // session callback içinde u çektiğin yerde:
const secondsSinceCreate = (Date.now() - u.createdAt.getTime()) / 1000;
const isFresh = secondsSinceCreate <= 86400; // 24 saat
if (isFresh && !g.__welcomeSent.has(email)) {
  try {
    await sendWelcomeEmail(email, session.user?.name ?? undefined);
    g.__welcomeSent.add(email);
    console.log("[auth] welcome email sent in session to", email);
  } catch (e) {
    console.error("[auth] welcome email error (session):", e);
  }
}
        }
      }

      return session;
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
    select: { id: true, name: true, avatarUrl: true, isAdmin: true },
  });
}