import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// TR destekli basit slugify
function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")                // accent/diacritic
    .replace(/ı/g, "i")               // tr özel
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

async function main() {
  const brands = await prisma.brandAccount.findMany();
  const taken = new Set<string>();
  for (const b of brands) {
    if (b.slug && b.slug.length > 0) { taken.add(b.slug); continue; }
    const base = slugify(b.displayName || b.email.split("@")[0] || "brand");
    let slug = base || "brand";
    let i = 2;
    while (taken.has(slug)) {
      slug = `${base}-${i++}`;
    }
    await prisma.brandAccount.update({ where: { id: b.id }, data: { slug } });
    taken.add(slug);
    console.log(`Set slug for ${b.displayName || b.email} -> ${slug}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());