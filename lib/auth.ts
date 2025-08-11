// lib/auth.ts
import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

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
      // Her girişte hesap seçme ekranını aç
      authorization: {
        params: {
          prompt: "select_account",
          // istersen izin ekranını da zorla:
          // prompt: "consent select_account",
        },
      },
    }),
  ],
  callbacks: {
    // Google ile girişte kullanıcıyı DB’de garanti et
    async signIn({ user }) {
      const email = user.email;
      if (!email) return false;

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

      return true;
    },

    // Session’a id ve avatarUrl ekle (header ve /me için kritik)
    async session({ session }) {
      const email = session.user?.email;
      if (email) {
        const u = await prisma.user.findUnique({
          where: { email },
          select: { id: true, name: true, avatarUrl: true },
        });
        if (u && session.user) {
          (session as any).user.id = u.id;
          session.user.name = u.name ?? session.user.name ?? null;
          (session.user as any).avatarUrl = u.avatarUrl ?? null;
        }
      }
      return session;
    },
  },
  // prod’da gerekli
  secret: process.env.NEXTAUTH_SECRET,
};

// SSR/API tarafında session almak için
export function auth() {
  return getServerSession(authOptions);
}

// Uygulamanın her yerinde kullandığımız yardımcı
export async function getSessionUser() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;

  return prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, avatarUrl: true },
  });
}
