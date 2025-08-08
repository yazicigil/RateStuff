import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "RateEverything",
  description: "Add anything. Rate everything.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <header className="border-b border-white/10">
          <div className="container flex items-center gap-4 py-4">
            <div className="text-xl font-semibold">RateEverything</div>
            <nav className="ml-auto flex gap-2">
              <Link className="btn" href="/">Anasayfa</Link>
              <Link className="btn" href="/items/new">Yeni Item</Link>
            </nav>
          </div>
        </header>
        <main className="container py-6">{children}</main>
      </body>
    </html>
  );
}
