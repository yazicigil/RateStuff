// lib/auth.ts
import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

/**
 * Not: PrismaAdapter kullanmıyoruz; şemamız custom (avatarUrl vs).
 * Girişte upsert ediyoruz, session callback'te de session.user'ı
 * güvenli şekilde (varsa oluşturup) dolduruyoruz.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
  ],

  callbacks: {
    // 1) Google ile girişte kullanıcıyı garanti et
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

    // 2) Session'a DB'deki id + avatarUrl'i yaz (header & /me için kritik)
    //    session.user undefined olabilir -> önce güvenle oluşturuyoruz.
    async session({ session, token }) {
      // session.user yoksa oluştur (TS hatasını önler)
      const su = ((session as any).user ??= {} as any);

      // Erişim sıramız: email -> token.sub (id)
      const email: string | null = (su.email as string | undefined) ?? null;
      const tokenSub: string | null = (token as any)?.sub ?? null;

      // DB’den çekilecek alanlar
      const select = { id: true, name: true, avatarUrl: true } as const;

      let u =
        email
          ? await prisma.user.findUnique({ where: { email }, select })
          : null;

      if (!u && tokenSub) {
        u = await prisma.user.findUnique({ where: { id: tokenSub }, select });
      }

      if (u) {
        // header'nın ve /me'nin beklediği alanlar:
        su.id = u.id;
        su.name = u.name ?? su.name ?? null;
        (su as any).avatarUrl = u.avatarUrl ?? null;
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

// Sunucu tarafında kimliği tek satırla almak için yardımcı
export async function getSessionUser() {
  const session = await auth();
  const su = (session as any)?.user as
    | { id?: string; email?: string; name?: string | null; avatarUrl?: string | null }
    | undefined;

  if (!su) return null;

  // Önce id’ye, yoksa email’e göre çöz
  if (su.id) {
    return prisma.user.findUnique({
      where: { id: su.id },
      select: { id: true, name: true, avatarUrl: true },
    });
  }

  if (su.email) {
    return prisma.user.findUnique({
      where: { email: su.email },
      select: { id: true, name: true, avatarUrl: true },
    });
  }

  return null;
}
