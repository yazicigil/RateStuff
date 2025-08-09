import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'RateStuff' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
