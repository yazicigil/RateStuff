// app/api/upload/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSessionUser } from "@/lib/auth";

export const runtime = "edge";

const MAX_BYTES = 5 * 1024 * 1024;
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

export async function POST(req: Request) {
  try {
    // 1) Auth (opsiyonel değilse şart koş)
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

    // 4) Güvenli isim: UUID + MIME tabanlı uzantı
    const ext = extFromMime(mime);
    const key = `uploads/${crypto.randomUUID()}.${ext}`;

    // 5) Yükle (public erişim, çakışma önleme)
    const uploaded = await put(key, file, {
      access: "public",
      addRandomSuffix: true, // extra güvenlik
      // cacheControl: "public, max-age=31536000, immutable", // istersen aç
    });

    return NextResponse.json({
      ok: true,
      url: uploaded.url,
      // istersen meta da döndürebilirsin:
      // size: file.size, mime,
    }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "upload-error" },
      { status: 500 }
    );
  }
}