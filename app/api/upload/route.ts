// app/api/upload/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

// 5 MB sınırı
const MAX_BYTES = 5 * 1024 * 1024;

// Sunucuda destekleyeceğimiz mime türleri
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic", // iOS
  "image/heif",
]);

function extFromMime(m: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  return map[m] ?? "bin";
}

/**
 * Yüklenen görseli sunucuda optimize eder:
 * - otomatik oryantasyon (rotate)
 * - EXIF dahil tüm metadata’yı temizler
 * - genişliği 1600px ile sınırlar (daha genişse)
 * - WebP (q=72) olarak tek optimize dosya üretir
 *
 * Neden tek dosya? Mevcut UI yalnızca tek bir URL bekliyor.
 * API kontratını bozmadan büyük kazanç elde etmek için
 * önce tek optimize edilmiş WebP döndürüyoruz.
 * (İleride responsive srcset’e geçmek istersek API’yi genişletiriz.)
 */
async function optimizeToWebp(input: Buffer): Promise<Buffer> {
  try {
    // Optional dependency: suppress TS resolution error until installed
    // @ts-ignore
    const sharp = (await import("sharp")).default as any;
    const img = sharp(input, { failOnError: false }).rotate().withMetadata(false);
    const meta = await img.metadata();
    const needsResize = meta.width && meta.width > 1600;
    const pipeline = needsResize ? img.resize({ width: 1600 }) : img;
    // GIF'ler için ilk frame; animasyon korunmaz.
    return pipeline.webp({ quality: 72 }).toBuffer();
  } catch {
    // sharp mevcut değilse ya da hata aldıysa, orijinali döndür (fallback)
    return input;
  }
}

export async function POST(req: Request) {
  try {
    // 1) Auth
    const me = await getSessionUser();
    if (!me) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // 2) Content-Type kontrolü
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return NextResponse.json(
        { ok: false, error: "multipart/form-data bekleniyor" },
        { status: 400 }
      );
    }

    // 3) Dosyayı al
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "file yok" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "Maksimum 5MB" }, { status: 400 });
    }

    const mime = (file.type || "").toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json(
        { ok: false, error: "Sadece görsel dosyalar yüklenebilir" },
        { status: 415 }
      );
    }

    // 4) Buffer'a al
    const arrayBuf = await file.arrayBuffer();
    const input = Buffer.from(arrayBuf);

    // 5) Optimize et (tek bir WebP çıktısı)
    const optimized = await optimizeToWebp(input);

    // 6) Güvenli anahtar ve yükleme
    const baseExt = extFromMime(mime);
    const key = `uploads/${crypto.randomUUID()}.${baseExt}.webp`; // kaynak uzantıyı bilgi amaçlı ekledik

    const uploaded = await put(key, optimized, {
      access: "public",
      addRandomSuffix: true,
      contentType: "image/webp",
      cacheControlMaxAge: 31536000,
    });

    return NextResponse.json(
      {
        ok: true,
        url: uploaded.url, // optimize edilmiş webp
        // İleride çoklu varyantlar için şu alanlar eklenebilir:
        // variants: [{ width: 320, url: "..." }, ...]
      },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "upload-error" },
      { status: 500 }
    );
  }
}