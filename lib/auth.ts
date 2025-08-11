// lib/auth.ts
import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    // Google ile girişte kullanıcıyı DB'de garanti et ve adı/avatari senkronla
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

    // Oturuma DB'deki id ve avatarUrl'i ekle (header ve /me için kritik)
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
  secret: process.env.NEXTAUTH_SECRET,
};

export function auth() {
  return getServerSession(authOptions);
}

export async function getSessionUser() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;

  return prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, avatarUrl: true },
  });
}
