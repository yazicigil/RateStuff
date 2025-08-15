// app/[locale]/layout.tsx
import '../globals.css';
import Script from 'next/script';
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import Providers from '@/components/Providers';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function generateMetadata({
  params: { locale }
}: { params: { locale: 'tr' | 'en' } }): Promise<Metadata> {
  const msgs = (await import(`../../messages/${locale}.json`)).default as Record<string, string>;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: msgs['meta.title'],
      template: `%s | RateStuff`
    },
    description: msgs['meta.description'],
    applicationName: 'RateStuff',
    alternates: { canonical: `${SITE_URL}/${locale}` },
    openGraph: {
      type: 'website',
      url: `${SITE_URL}/${locale}`,
      siteName: 'RateStuff',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      title: msgs['meta.title'],
      description: msgs['meta.description'],
      images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'RateStuff' }]
    },
    twitter: {
      card: 'summary_large_image',
      title: msgs['meta.title'],
      description: msgs['meta.description'],
      images: ['/og-image.jpg']
    },
    robots: { index: true, follow: true },
    icons: {
      icon: [
        { url: '/favicon.ico' },
        { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
      ],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
      shortcut: ['/favicon.ico'],
      other: [{ rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#000000' }]
    },
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: '#ffffff' },
      { media: '(prefers-color-scheme: dark)', color: '#0b0b0b' }
    ],
    other: {
      'msapplication-TileColor': '#0b0b0b'
    }
  };
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: 'tr' | 'en' };
}) {
  let messages: Record<string, string>;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch {
    notFound();
  }

  const orgLD = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'RateStuff',
    url: SITE_URL,
    logo: `${SITE_URL}/android-chrome-512x512.png`,
    sameAs: ['https://twitter.com/ratestuffnet', 'https://www.instagram.com/ratestuffnet']
  };

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Google AdSense */}
        <Script
          id="adsbygoogle-init"
          strategy="afterInteractive"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6558549333507218"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLD) }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
          <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}