// lib/adminEmail.ts
// Admin e-postaları için somut gönderici: önce RESEND, sonra SMTP (Nodemailer)

const FROM = process.env.MAIL_FROM || 'RateStuff <admin@ratestuff.net>';

export async function sendAdminEmail(to: string, subject: string, html: string) {
  // 1) RESEND (Edge ve Node'da çalışır)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      // dynamic import — build-time dependency zorunlu değil
      // @ts-ignore
      const { Resend } = await import('resend');
      const resend = new Resend(resendKey);
      const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('[adminEmail][resend] failed', e);
      // fallback to SMTP
    }
  }

  // 2) SMTP (Nodemailer) — yalnızca Node runtime
  const host = process.env.SMTP_HOST;
  const portStr = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && portStr && user && pass) {
    try {
      // @ts-ignore
      const nodemailer = await import('nodemailer');
      const port = parseInt(portStr as string, 10) || 587;
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // 465 = SMTPS (SSL); 587 uses STARTTLS
        auth: { user, pass },
        requireTLS: port === 587,
      });
      const info = await transporter.sendMail({ from: FROM, to, subject, html });
      return info;
    } catch (e) {
      console.error('[adminEmail][smtp] failed', e);
    }
  }

  throw new Error('No email transport configured: set RESEND_API_KEY or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS');
}