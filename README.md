# RateEverything — Hazır Deploy (Anonim mod)

Bu sürüm **çalışan** API'ler içerir: item ekleme (ilk puan ve yorum zorunlu), etiketler, trend etiketler, report.
Kimlik doğrulama yok; anonim kullanıcı ile veri akışı kuruludur.

## Hızlı Kurulum (lokal)
```bash
pnpm i   # veya npm i / yarn
cp .env.example .env
# .env içindeki DATABASE_URL'i Postgres (Supabase) bağlantınla değiştir
npx prisma db push
npm run dev
```
Opsiyonel seed:
```bash
pnpm dlx tsx prisma/seed.ts
```

## Deploy
1) Kodu GitHub'a yükle (veya Vercel'de "Add New... → Project → Import Git Repository")  
2) Vercel → Project Settings → Environment Variables:
   - `DATABASE_URL` = Supabase Postgres bağlantı dizesi
3) Deploy

## Yol Haritası (Sonraki)
- Dosya yükleme (R2/S3, signed URL)
- NextAuth (Google + magic link), gerçek kullanıcı adları + mask
- Wilson bound trend sıralaması
- Yorum/oy düzenleme, item sayfası
