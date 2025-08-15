'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

export default function LanguageSwitcher() {
  const params = useParams();
  const pathname = usePathname(); // ör: /tr/items/123
  const locale = (params?.locale as string) || 'tr';

  // locale'i değiştirerek aynı path'e giden yardımcı
  const switchHref = (target: 'tr' | 'en'): string => {
    const p = pathname || '/';
    const segs = p.split('/');
    // segs[0] === '' her zaman, segs[1] ilk path segmentidir
    if (segs[1] === 'tr' || segs[1] === 'en') {
      segs[1] = target;
      return segs.join('/') || `/${target}`;
    }
    // locale yoksa başa ekle
    return `/${target}${p.startsWith('/') ? '' : '/'}${p}`;
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <Link className={locale === 'tr' ? 'font-semibold' : ''} href={switchHref('tr')}>🇹🇷TR</Link>
      <span className="opacity-40">/</span>
      <Link className={locale === 'en' ? 'font-semibold' : ''} href={switchHref('en')}>🇬🇧EN</Link>
    </div>
  );
}