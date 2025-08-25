export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sendAdminEmail } from '@/lib/adminEmail';

export async function GET() {
  try {
    const to = process.env.REPORTS_INBOX || process.env.SMTP_USER || 'reports@ratestuff.net';
    const html = `<div style="font-family:system-ui">Debug mail test at ${new Date().toISOString()}</div>`;
    const res = await sendAdminEmail(to, 'RateStuff SMTP Debug', html);
    return NextResponse.json({
      ok: true,
      to,
      transport: process.env.RESEND_API_KEY ? 'resend' : (process.env.SMTP_HOST ? 'smtp' : 'none'),
      res
    }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e?.message || String(e),
      env: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        from: process.env.MAIL_FROM,
        reports: process.env.REPORTS_INBOX,
      }
    }, { status: 500 });
  }
}