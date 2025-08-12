// app/api/og/item/[id]/route.ts
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const { origin } = new URL(req.url);

  let item: any = null;
  try {
    const r = await fetch(`${origin}/api/items?id=${id}`, { cache: 'no-store' });
    const j = await r.json();
    item = j?.item ?? null;
  } catch {}

  const name = item?.name ?? 'RateStuff';
  const avg  = item?.avg ? Number(item.avg).toFixed(2) : null;
  const img  = item?.imageUrl ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          height: 630,
          width: 1200,
          display: 'flex',
          background: '#0b0b0b',
          color: 'white',
          fontFamily: 'Inter, ui-sans-serif, system-ui',
        }}
      >
        <div style={{ flex: 1, padding: 64, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.1 }}>{name}</div>
          {avg && (
            <div style={{ marginTop: 16, fontSize: 28, opacity: 0.9 }}>
              Ortalama {avg} ⭐
            </div>
          )}
          <div style={{ marginTop: 24, fontSize: 24, opacity: 0.7 }}>ratestuff.com</div>
        </div>
        {img ? (
          <div style={{ width: 420, height: 630, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img}
              alt=""
              width={420}
              height={630}
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
            />
          </div>
        ) : null}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}