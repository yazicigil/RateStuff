import './globals.css';
import Script from "next/script";
import type { Metadata } from 'next';
import Providers from '@/components/Providers';

export const metadata: Metadata = { title: 'RateStuff' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6558549333507218"
     crossOrigin="anonymous"></script>
     </head>
      <body className="min-h-screen">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
