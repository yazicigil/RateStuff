

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

function isValidEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json();

    const cleanName = (name || "").trim();
    const cleanEmail = (email || "").trim();
    const cleanSubject = (subject || "").trim();
    const cleanMessage = (message || "").trim();

    if (!cleanName || !cleanEmail || !cleanMessage) {
      return NextResponse.json({ error: "Eksik alanlar var." }, { status: 400 });
    }
    if (!isValidEmail(cleanEmail)) {
      return NextResponse.json({ error: "Geçersiz e-posta" }, { status: 400 });
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const fromEnv = process.env.MAIL_FROM;
    const secureEnv = process.env.SMTP_SECURE;

    if (!host || !user || !pass) {
      return NextResponse.json({ error: "SMTP env eksik." }, { status: 500 });
    }

    const secure = secureEnv ? secureEnv === "true" : port === 465;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    const fromAddr = fromEnv || user;

    await transporter.sendMail({
      from: fromAddr,
      replyTo: `${cleanName} <${cleanEmail}>`,
      to: "contact@ratestuff.net",
      subject: cleanSubject ? `[RateStuff] ${cleanSubject}` : "[RateStuff] Yeni mesaj",
      text: `İsim: ${cleanName}\nE-posta: ${cleanEmail}\n\n${cleanMessage}`,
      html: `<p><strong>İsim:</strong> ${cleanName}</p>
             <p><strong>E-posta:</strong> ${cleanEmail}</p>
             <p><strong>Konu:</strong> ${cleanSubject || "-"}</p>
             <p><strong>Mesaj:</strong><br/>${cleanMessage.replace(/\n/g, "<br/>")}</p>`,
      headers: {
        "X-RateStuff-Form": "reach-us",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("reach-us error:", err);
    return NextResponse.json(
      { error: err?.message || "Mail gönderilemedi." },
      { status: 500 }
    );
  }
}