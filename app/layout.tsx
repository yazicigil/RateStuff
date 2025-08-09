import './globals.css';
import type { Metadata } from 'next';
import Providers from './providers';

export const metadata: Metadata = { title: 'RateStuff' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
