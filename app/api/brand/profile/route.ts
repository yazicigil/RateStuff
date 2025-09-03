import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Only update fields that are explicitly provided in the body.
function has(obj: any, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { brandId } = body as { brandId?: string };

    if (!brandId) {
      return NextResponse.json({ error: "brandId required" }, { status: 400 });
    }

    // Build partial update for BrandAccount
    const brandData: Record<string, any> = {};
    if (has(body, "coverImageUrl")) {
      brandData.coverImageUrl = body.coverImageUrl ?? null;
    }
    if (has(body, "bio")) {
      const bioVal = typeof body.bio === "string" ? body.bio.trim() : body.bio;
      brandData.bio = bioVal === "" ? null : bioVal ?? null;
    }

    // Prepare optional User update (avatar)
    const shouldUpdateAvatar = has(body, "avatarUrl");
    const newAvatarUrl = shouldUpdateAvatar ? (body.avatarUrl ?? null) : undefined;

    if (!Object.keys(brandData).length && !shouldUpdateAvatar) {
      return NextResponse.json({ error: "no updatable fields provided" }, { status: 400 });
    }

    // Fetch brand to locate related user if avatar update is requested
    let brand = null as any;
    if (Object.keys(brandData).length || shouldUpdateAvatar) {
      brand = await prisma.brandAccount.findUnique({
        where: { id: brandId },
        select: { id: true, email: true, createdById: true, bio: true, coverImageUrl: true },
      });
      if (!brand) {
        return NextResponse.json({ error: "brand not found" }, { status: 404 });
      }
    }

    // Execute updates atomically where possible
    const results = await prisma.$transaction(async (tx) => {
      let updatedBrand = null as any;
      if (Object.keys(brandData).length) {
        updatedBrand = await tx.brandAccount.update({ where: { id: brandId }, data: brandData });
      }

      let updatedUser = null as any;
      if (shouldUpdateAvatar) {
        // Prefer createdById relation if present, else fallback to email match
        if (brand?.createdById) {
          updatedUser = await tx.user.update({
            where: { id: brand.createdById },
            data: { avatarUrl: newAvatarUrl ?? null },
          });
        } else if (brand?.email) {
          updatedUser = await tx.user.update({
            where: { email: brand.email },
            data: { avatarUrl: newAvatarUrl ?? null },
          });
        } else {
          throw new Error("Cannot resolve user to update avatar");
        }
      }

      return { updatedBrand, updatedUser };
    });

    return NextResponse.json({ ok: true, brand: results.updatedBrand ?? brand, user: results.updatedUser ?? null });
  } catch (e) {
    console.error("PATCH /api/brand/profile error", e);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
}