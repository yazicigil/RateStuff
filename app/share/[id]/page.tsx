// app/share/[id]/page.tsx
import type { Metadata } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? '';

type Props = { params: { id: string } };

async function getItemMeta(id: string) {
  try {
    const base = SITE || '';
    const res = await fetch(`${base}/api/items?id=${id}`, { next: { revalidate: 60 } });
    const j = await res.json();
    return j?.item ?? null;
  } catch { return null; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const it = await getItemMeta(params.id);
  const title = it?.name ? `${it.name} — RateStuff` : 'RateStuff';
  const desc  = it?.description || (it?.avg ? `Ortalama ${it.avg.toFixed(2)} ⭐` : 'RateStuff’ta keşfet');
  const ogImg = `${SITE || ''}/api/og/item/${params.id}`;
  return {
    title,
    description: desc,
    openGraph: { title, description: desc, images: [ogImg], url: `${SITE || ''}/share/${params.id}`, type: 'website' },
    twitter:   { card: 'summary_large_image', title, description: desc, images: [ogImg] },
  };
}

export default function ShareRedirectPage({ params }: Props) {
  const href = `/?item=${encodeURIComponent(params.id)}`;
  return (
    <main className="min-h-screen grid place-items-center">
      <div className="text-sm opacity-70">
        RateStuff’a yönlendiriliyor… <a href={href} className="underline">git</a>
      </div>
      {/* client-side redirect; bu sayfa client component değil */}
      <script
        dangerouslySetInnerHTML={{ __html: `location.replace(${JSON.stringify(href)});` }}
      />
    </main>
  );
}