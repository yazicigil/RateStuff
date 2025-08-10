// app/api/upload/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return NextResponse.json({ ok: false, error: "multipart/form-data bekleniyor" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "file yok" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "Maksimum 5MB" }, { status: 400 });
    }

    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    // Web Crypto (Edge) — node:crypto yok
    const key = `uploads/${crypto.randomUUID()}.${ext}`;

    const uploaded = await put(key, file, { access: "public" });
    return NextResponse.json({ ok: true, url: uploaded.url });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "upload error" }, { status: 500 });
  }
}
