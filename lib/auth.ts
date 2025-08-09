import { PrismaClient } from "@prisma/client";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();

/** Güvenli masked name üretici: her zaman string döner, 'undefined' çıkmaz */
function makeMaskedName(seed: string) {
  const animals = ["panda","martı","tilki","kedi","alpaka","baykuş","yunus","kaplan","koala","lemur","serçe","yılan","kaplumbağa","balina","kartal"];
  const adjs    = ["sessiz","şen","yaramaz","parlak","soğukkanlı","kozmik","minik","yıldızlı","uslu","aceleci","meraklı","sakız","sonsuz","neşeli","ciddi"];

  // basit deterministik hash
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  const a = adjs[ Math.abs(h) % adjs.length ] ?? "kozmik";
  const b = animals[ Math.abs(h >>> 8) % animals.length ] ?? "kedi";
  const n = (Math.abs(h >>> 16) % 900 + 100).toString(); // 100-999
  return `${a}-${b}-${n}`;
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
