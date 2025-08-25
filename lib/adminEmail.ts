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
    } catch (e: unknown) {
      console.error('[adminEmail][resend] failed', e);
      // fallback to SMTP
    }
  }

  // 2) SMTP (Nodemailer) — yalnızca Node runtime
  if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      // @ts-ignore
      const nodemailer = await import('nodemailer');
      const port = parseInt(process.env.SMTP_PORT as string, 10) || 587;
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465, // 465 = SMTPS (SSL); 587 uses STARTTLS
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        requireTLS: port === 587,
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        tls: {
          minVersion: 'TLSv1.2',
        },
      });

      // bağlantı doğrulaması
      await transporter.verify();

      const info = await transporter.sendMail({ from: FROM, to, subject, html });
      if (process.env.MAIL_DEBUG === '1') {
        console.log('[adminEmail][smtp] ok', { host: process.env.SMTP_HOST, port, from: FROM, to });
      }
      return info;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[adminEmail][smtp] failed', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        msg,
      });
      throw e;
    }
  }

  throw new Error('No email transport configured: set RESEND_API_KEY or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS');
}