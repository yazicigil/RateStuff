import { PrismaClient } from "@prisma/client";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      // Email zorunlu
      if (!user?.email) return false;
      const email = user.email.toLowerCase();

      // Kendi User tablomuzda upsert
      await prisma.user.upsert({
        where: { email },
        create: {
          id: crypto.randomUUID(),
          email,
          name: user.name || null,
          maskedName: null,
        },
        update: { name: user.name || null },
      });
      return true;
    },

    async jwt({ token, user }) {
      // token'a DB user id ekle
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
        });
        if (dbUser) (token as any).uid = dbUser.id;
      }
      return token;
    },

    async session({ session, token }) {
      // session.user.id alanına DB id’yi koy
      if (session?.user) (session.user as any).id = (token as any).uid;
      return session;
    },
  },
  pages: { signIn: "/auth/signin" },
};

// API route'larda kullanmak için yardımcı
export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    id: (session.user as any).id as string,
    email: session.user.email as string,
    name: session.user.name || null,
  };
}
