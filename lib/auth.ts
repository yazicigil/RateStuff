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
  // (opsiyonel) hata ayıklama açık kalsın; iş bitince kapat
  debug: true,
  callbacks: {
    // DB’ye dokunmadan izin ver; (DB senkronu session içinde/sonrada)
    async signIn() {
      return true;
    },

    // Oturum zenginleştirme: hata olursa akışı bozma
    async session({ session }) {
      try {
        const email = session.user?.email;
        if (!email) return session;

        // yoksa oluştur (upsert), varsa oku
        const u = await prisma.user.upsert({
          where: { email },
          update: {
            name: session.user?.name ?? undefined,
            avatarUrl: (session.user as any)?.image ?? undefined,
          },
          create: {
            email,
            name: session.user?.name ?? null,
            avatarUrl: (session.user as any)?.image ?? null,
          },
          select: { id: true, name: true, avatarUrl: true },
        });

        (session as any).user = {
          ...(session.user || {}),
          id: u.id,
          name: u.name ?? session.user?.name ?? null,
          avatarUrl: u.avatarUrl ?? null,
        } as any;
      } catch (e) {
        console.error("[session-cb] err:", e);
        // hata olsa bile oturumu döndür
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
