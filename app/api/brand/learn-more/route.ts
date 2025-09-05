

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  brandName?: string;
  category?: string;
  customCategory?: string;
  contact?: string;
  about?: string;
  email?: string;
};

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function sanitize(v?: string | null) {
  return (v ?? "").toString().trim();
}

function renderHTML(p: Required<Pick<Payload, "brandName" | "category" | "email">> & Partial<Payload>) {
  const rows: [string, string | undefined][] = [
    ["Marka adı", p.brandName],
    ["Kategori", p.category + (p.customCategory ? ` (${p.customCategory})` : "")],
    ["Sosyal/Web", p.contact],
    ["Kısa açıklama", p.about],
    ["Gönderen e‑posta", p.email],
  ];
  const tr = rows
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600">${k}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb">${(v ?? "").toString().replace(/\n/g, "<br/>")}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html><html><body style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu">
    <h2 style="margin:0 0 8px 0">Yeni Marka Başvurusu</h2>
    <p style="margin:0 0 16px 0;color:#374151">RateStuff - Learn More formundan yeni bir giriş var.</p>
    <table style="border-collapse:collapse;border:1px solid #e5e7eb">${tr}</table>
  </body></html>`;
}

function renderText(p: Required<Pick<Payload, "brandName" | "category" | "email">> & Partial<Payload>) {
  return [
    `Yeni Marka Başvurusu`,
    `Marka adı: ${p.brandName}`,
    `Kategori: ${p.category}${p.customCategory ? ` (${p.customCategory})` : ""}`,
    `Sosyal/Web: ${p.contact || "-"}`,
    `Kısa açıklama:\n${p.about || "-"}`,
    `Gönderen e‑posta: ${p.email}`,
  ].join("\n");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Payload;

    const brandName = sanitize(body.brandName);
    const category = sanitize(body.category);
    const customCategory = sanitize(body.customCategory) || undefined;
    const contact = sanitize(body.contact) || undefined;
    const about = sanitize(body.about) || undefined;
    const email = sanitize(body.email);

    if (!brandName || brandName.length < 2) {
      return NextResponse.json({ ok: false, error: "Geçersiz marka adı." }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ ok: false, error: "Kategori gerekli." }, { status: 400 });
    }
    if (!email || !isEmail(email)) {
      return NextResponse.json({ ok: false, error: "Geçersiz e‑posta." }, { status: 400 });
    }

    // Create transport from env
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      MAIL_FROM = "RateStuff <no-reply@ratestuff.net>",
      MAIL_TO = "brand@ratestuff.net",
    } = process.env as Record<string, string | undefined>;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      console.error("SMTP env missing");
      return NextResponse.json({ ok: false, error: "Sunucu e‑posta yapılandırılmamış." }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465, // true for 465, false for others
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const subject = `Brand Lead: ${brandName} (${category}${customCategory ? `/${customCategory}` : ""})`;

    const html = renderHTML({ brandName, category, customCategory, contact, about, email });
    const text = renderText({ brandName, category, customCategory, contact, about, email });

    await transporter.sendMail({
      from: MAIL_FROM,
      to: MAIL_TO,
      subject,
      text,
      html,
      replyTo: email, // so the team can reply directly to the brand
      headers: {
        "X-RateStuff-Form": "brand-learn-more",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("learn-more error", err);
    return NextResponse.json({ ok: false, error: "Gönderilemedi." }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ ok: true, message: "Use POST." });
}