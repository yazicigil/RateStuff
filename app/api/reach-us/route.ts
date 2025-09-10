

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Eksik alanlar var." }, { status: 400 });
    }

    // Create transporter (configure via environment variables)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"${name}" <${email}>`,
      to: "mehmetcan@ratestuff.net",
      subject: subject ? `[RateStuff] ${subject}` : "[RateStuff] Yeni mesaj",
      text: `İsim: ${name}\nE-posta: ${email}\n\n${message}`,
      html: `<p><strong>İsim:</strong> ${name}</p>
             <p><strong>E-posta:</strong> ${email}</p>
             <p><strong>Konu:</strong> ${subject || "-"}</p>
             <p><strong>Mesaj:</strong><br/>${message.replace(/\n/g, "<br/>")}</p>`,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Mail gönderilemedi:", err);
    return NextResponse.json(
      { error: "Mail gönderilemedi." },
      { status: 500 }
    );
  }
}