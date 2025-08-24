// lib/email.ts
import { SendMailClient } from "zeptomail";

const url = "api.zeptomail.eu/"; // EU datacenter
const token = process.env.ZEPTO_TOKEN!; // ZeptoMail Send Mail Token (.env)

const client = new SendMailClient({ url, token });

export async function sendWelcomeEmail(to: string, name?: string) {
  try {
    const resp = await client.sendMail({
      from: {
        address: "mehmetcan@ratestuff.net", // ZeptoMail’de doğrulanmış domain
        name: "RateStuff",
      },
      to: [
        {
          email_address: {
            address: to,
            name: name || to.split("@")[0],
          },
        },
      ],
      subject: "RateStuff’a hoş geldin ⭐",
      htmlbody: `
      <div style="font-family:Arial,Helvetica,sans-serif; max-width:600px; margin:auto; padding:24px; background:#f9f9f9; border-radius:8px;">
        <h2 style="color:#121f30; margin-top:0;">Merhaba ${name || ""},</h2>
        <p>RateStuff'a katıldığın için çok mutluyuz 🎉</p>
        <p>Artık her şeyi <b>puanlayabilir</b>, <b>yorum yapabilir</b> ve başkalarının fikirlerini görebilirsin.</p>
        <p style="margin:24px 0;">
          <a href="https://ratestuff.net" 
             style="background:#121f30; color:#fff; padding:12px 20px; border-radius:6px; text-decoration:none; font-weight:bold;">
            Hemen keşfet →
          </a>
        </p>
        <p style="color:#666; font-size:13px;">Sevgiler,<br/>RateStuff Ekibi</p>
        <hr style="border:none; border-top:1px solid #ddd; margin:20px 0;" />
        <p style="color:#999; font-size:11px;">Bu e-postayı beklemiyorduysan görmezden gelebilirsin.</p>
      </div>
      `,
      // fallback plain text
      textbody: `
Merhaba ${name || ""},
RateStuff'a katıldığın için çok mutluyuz 🎉

Artık her şeyi puanlayabilir, yorum yapabilir ve başkalarının fikirlerini görebilirsin.

Hemen keşfet → https://ratestuff.net

Sevgiler,
RateStuff Ekibi

---
Bu e-postayı beklemiyorduysan görmezden gelebilirsin.
      `,
    });

    console.log("Welcome email sent:", resp);
  } catch (err) {
    console.error("ZeptoMail send error:", err);
  }
}