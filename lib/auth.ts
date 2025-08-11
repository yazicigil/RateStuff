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
  debug: true, // geçici: sorun ayıklamaya yardımcı
  callbacks: {
    // Google ile girişte kullanıcıyı DB'de garanti et
    async signIn({ user }) {
      const email = user?.email;
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

    // Session’a DB’deki id ve avatarUrl’i yaz
    async session({ session }) {
      try {
        const email = session?.user?.email;
        if (!email) return session;

        const u = await prisma.user.findUnique({
          where: { email },
          select: { id: true, name: true, avatarUrl: true },
        });

        if (u) {
          // user undefined olabilir; koruyalım
          (session as any).user = {
            ...(session.user ?? {}),
            id: u.id,
            name: u.name ?? session.user?.name ?? null,
            avatarUrl: u.avatarUrl ?? null,
          };
        }
      } catch (e) {
        console.error("[session-cb] err:", e);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// SSR/API tarafında session
export function auth() {
  return getServerSession(authOptions);
}

// Uygulama genelinde kısa yol
export async function getSessionUser() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, avatarUrl: true },
  });
}
