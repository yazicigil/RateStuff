// lib/adminEmail.ts
// Admin e-postaları için somut gönderici: önce RESEND, sonra SMTP (Nodemailer)

// Parse MAIL_FROM reliably (supports "Name <addr>" and plain address)
function parseFrom(raw?: string) {
  const s = (raw || '').trim();
  // Match optional name and <address>
  const m = s.match(/^"?([^"<]*)"?\s*<\s*([^>]+)\s*>$/);
  if (m) {
    const name = (m[1] || '').trim() || undefined;
    const address = (m[2] || '').trim();
    return { name, address };
  }
  // Fallback: plain address (strip quotes/brackets)
  const address = s.replace(/^['"<\s]+|['">\s]+$/g, '');
  return { name: undefined as string | undefined, address };
}

const RAW_FROM = process.env.MAIL_FROM || 'RateStuff <admin@ratestuff.net>';
const FROM_PARSED = parseFrom(RAW_FROM);
const FROM_DISPLAY = FROM_PARSED.name
  ? `${FROM_PARSED.name} <${FROM_PARSED.address}>`
  : FROM_PARSED.address;

export async function sendAdminEmail(to: string, subject: string, html: string) {
  // 1) RESEND (Edge ve Node'da çalışır)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      // dynamic import — build-time dependency zorunlu değil
      // @ts-ignore
      const { Resend } = await import('resend');
      const resend = new Resend(resendKey);
      const { data, error } = await resend.emails.send({ from: FROM_DISPLAY, to, subject, html });
if (error) throw error;
if (process.env.MAIL_DEBUG === '1') {
  console.log('[adminEmail][resend] ok', { from: FROM_DISPLAY, to });
}
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
              logger: process.env.MAIL_DEBUG === '1',
      debug: process.env.MAIL_DEBUG === '1',
      });

      // bağlantı doğrulaması
      await transporter.verify();

      const info = await transporter.sendMail({
  from: { name: FROM_PARSED.name, address: FROM_PARSED.address },
  to,
  subject,
  html,
  // Ensure clean SMTP envelope (MAIL FROM / RCPT TO)
  envelope: { from: FROM_PARSED.address, to },
});
      if (process.env.MAIL_DEBUG === '1') {
        console.log('[adminEmail][smtp] ok', { host: process.env.SMTP_HOST, port, from: FROM_PARSED.address, to });
      }
      return info;
   } catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error('[adminEmail][smtp] failed', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    from: FROM_PARSED.address,
    msg,
  });
  throw e;
}
  }

  throw new Error('No email transport configured: set RESEND_API_KEY or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS');
}