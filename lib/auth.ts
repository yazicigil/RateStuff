// lib/auth.ts
import { PrismaClient } from "@prisma/client";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();

function makeMaskedName(seed: string) {
  const animals = ["panda","martı","tilki","kedi","alpaka","baykuş","yunus","kaplan","koala","lemur"];
  const adjs = ["sessiz","şen","yaramaz","parlak","soğukkanlı","kozmik","minik","yıldızlı","uslu","aceleci"];
  let h = 0; for (const c of seed) h = (h*31 + c.charCodeAt(0)) >>> 0;
  const a = adjs[h % adjs.length], b = animals[(h>>8) % animals.length];
  const n = (h % 900 + 100).toString(); // 100-999
  return `${a}-${b}-${n}`; // örn: kozmik-kedi-421
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
      const email = user.email.toLowerCase();

      // maskedName üret
      const masked = makeMaskedName(email);
      const avatar = (profile as any)?.picture || null;

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
          maskedName: { set: undefined }, // varsa elleme
          avatarUrl: avatar || undefined,
        },
      });
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } });
        if (dbUser) { (token as any).uid = dbUser.id; }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) (session.user as any).id = (token as any).uid;
      return session;
    },
  },
  pages: { signIn: "/auth/signin" },
};

export async function getSessionUser() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return null;
  return { id: (s.user as any).id as string, email: s.user.email as string, name: s.user.name || null };
}
