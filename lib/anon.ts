import { prisma } from "@/lib/prisma";

export async function getAnonUser() {
  const email = "anon@local";
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Anonim Kullanıcı", maskedName: "A**** K*************" }
  });
  return user;
}
