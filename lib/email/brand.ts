// lib/email/brand.ts
import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.zoho.eu";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "admin@ratestuff.net";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || `RateStuff <${SMTP_USER}>`;

let transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

export async function sendBrandCodeEmail(to: string, code: string) {
  const subject = "RateStuff • Giriş kodunuz";
  const text = `Giriş kodu: ${code} (10 dk geçerli)
https://ratestuff.net/brand`;
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin:0 0 12px">RateStuff • Giriş kodunuz</h2>
      <p style="margin:0 0 16px">Aşağıdaki kodu <strong>10 dakika</strong> içinde kullanın:</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:6px;margin:8px 0 16px">${code}</div>
      <p style="margin:0 0 6px">Giriş sayfası: <a href="https://ratestuff.net/brand">ratestuff.net/brand</a></p>
      <p style="font-size:12px;color:#475569;margin-top:18px">Bu e-posta tek kullanımlık bir koddur. Yanıtlamanıza gerek yoktur.</p>
    </div>`;

  const info = await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
    html,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("[brand-email] sent:", info.messageId, "to:", to, "code:", code);
  }
  return true;
}