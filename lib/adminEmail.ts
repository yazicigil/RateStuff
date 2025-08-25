// lib/adminEmail.ts
// Admin bildirimlerini göndermek için küçük yardımcı.
// Mevcut altyapını bozmamak için birkaç yaygın yolu dener.

export async function sendAdminEmail(to: string, subject: string, html: string) {
  // Projede generic bir gönderici tanımlıysa önce onu dene
  try {
    // @ts-ignore
    if (typeof (global as any).sendGenericEmail === 'function') {
      // @ts-ignore
      return await (global as any).sendGenericEmail({ to, subject, html });
    }
  } catch {}

  // Resend client globali varsa (projede init edilmiş olabilir)
  try {
    // @ts-ignore
    if (typeof resend !== 'undefined' && resend?.emails?.send) {
      // @ts-ignore
      return await resend.emails.send({
        from: 'RateStuff <admin@ratestuff.net>',
        to,
        subject,
        html,
      });
    }
  } catch {}

  // Nodemailer transporter globali varsa
  try {
    // @ts-ignore
    if (typeof transporter !== 'undefined' && transporter?.sendMail) {
      // @ts-ignore
      return await transporter.sendMail({
        from: 'RateStuff <admin@ratestuff.net>',
        to,
        subject,
        html,
      });
    }
  } catch {}

  // Hiçbiri yoksa çağıranı bozma diye net bir hata fırlat
  throw new Error('No email transport configured for admin emails');
}