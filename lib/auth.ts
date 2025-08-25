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
    select: { id: true, name: true, avatarUrl: true, isAdmin: true },
  });
}