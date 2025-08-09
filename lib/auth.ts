import { PrismaClient } from "@prisma/client";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();

/** "Mehmetcan Yazıcıgil" -> "M**** Y****" ; "Şarlatan" -> "Ş****" */
function makeMaskedNameFromHuman(name?: string | null, fallbackEmail?: string) {
  const src = (name || fallbackEmail?.split("@")[0] || "Anon").trim();

  // nokta/alt tire vs ile ayrılmış kullanıcı adlarını da kelime gibi ele al
  const parts = src
    .replace(/[_.-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3); // en fazla 3 parçayı maskele

  const maskPart = (p: string) => {
    const first = p.trim().charAt(0);
    if (!first) return "•****";
    // TR karakterleri için locale upper
    const upper = first.toLocaleUpperCase("tr-TR");
    return `${upper}****`;
  };

  if (parts.length === 0) return "A****";
  if (parts.length === 1) return maskPart(parts[0]);
  // 2+ parça: ilk iki parçayı göster, kalanları yoksay (istersen yıldız ekleyebilirsin)
  return `${maskPart(parts[0])} ${maskPart(parts[1])}`;
}
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, profile }) {
      if (!user?.email) return false;

      const email  = user.email.toLowerCase();
      const avatar = (profile as any)?.picture || null;
      const masked = makeMaskedName(email) || "anon-kedi-000";

      // create'de maskedName yaz; update'te maskedName'e dokunma
      await prisma.user.upsert({
        where: { email },
        create: {
          id: crypto.randomUUID(),
          email,
          name: user.name || null,
          maskedName: masked,
          avatarUrl: avatar,
        },
        update: {
          name: user.name || null,
          ...(avatar ? { avatarUrl: avatar } : {}),
        },
      });

      return true;
    },

    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } });
        if (dbUser) (token as any).uid = dbUser.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (session?.user) (session.user as any).id = (token as any).uid;
      return session;
    },
  },
  pages: { signIn: "/auth/signin" },
  debug: true, // Vercel function logs'ta detay
};

export async function getSessionUser() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return null;
  return { id: (s.user as any).id as string, email: s.user.email as string, name: s.user.name || null };
}
