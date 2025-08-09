'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Me = { id: string; name: string | null; avatarUrl?: string | null };

export default function Header() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ok = true;
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (ok) setMe(j?.me ?? null); })
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, []);

  return (
    <header className="sticky top-0 z-40 backdrop-blur border-b bg-white/80 dark:bg-gray-900/70 dark:border-gray-800">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-xl font-bold">RateStuff</Link>

        <nav className="ml-auto flex items-center gap-2">
          {!loading && !me && (
            <Link
              href="/api/auth/signin?callbackUrl=/"
              className="px-3 py-2 rounded-xl border text-sm dark:border-gray-700"
            >
              Google ile giriş
            </Link>
          )}

          {me && (
            <>
              <Link
                href="/profile"
                className="flex items-center gap-2 px-2 py-1 rounded-xl border text-sm dark:border-gray-700"
                title="Profilim"
              >
                {me.avatarUrl ? (
                  <img src={me.avatarUrl} alt="me" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-200 grid place-items-center text-xs text-gray-700">
                    {(me.name ?? 'U')[0]?.toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:block">{me.name ?? 'Ben'}</span>
              </Link>

              <Link
                href="/api/auth/signout?callbackUrl=/"
                className="px-3 py-2 rounded-xl border text-sm dark:border-gray-700"
                title="Çıkış yap"
              >
                Çıkış
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
