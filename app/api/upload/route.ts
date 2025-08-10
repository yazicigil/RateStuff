// app/api/upload/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import crypto from "node:crypto";

export const runtime = "edge"; // hızlı ve ucuz

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ ok: false, error: "multipart/form-data bekleniyor" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "file yok" }, { status: 400 });
    }

    // Basit boyut & tip kontrolü (opsiyonel)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "Maksimum 5MB" }, { status: 400 });
    }
    const safeExt = (file.name.split(".").pop() || "bin").toLowerCase();
    const key = `uploads/${crypto.randomUUID()}.${safeExt}`;

    // Vercel Blob'a public upload
    const uploaded = await put(key, file, { access: "public" });

    return NextResponse.json({ ok: true, url: uploaded.url });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "upload error" }, { status: 500 });
  }
}
