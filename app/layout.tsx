import './globals.css';
import type { Metadata } from 'next';
import Header from '@/components/Header';

export const metadata: Metadata = { title: 'RateStuff' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-screen">
        {/* Layout header'ı controls'suz: sadece logo+auth */}
        <Header />
        {children}
      </body>
    </html>
  );
}
