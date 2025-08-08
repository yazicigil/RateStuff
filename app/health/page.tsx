export default async function HealthPage() {
  const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/health`, { cache: 'no-store' });
  const j = await r.json();
  return <pre className="card">{JSON.stringify(j, null, 2)}</pre>
}
