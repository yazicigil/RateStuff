'use client';
export default function StarRating({ value = 0 }: { value?: number }) {
  const full = Math.round(value);
  return (
    <div className="flex gap-1" aria-label={`ortalama ${value?.toFixed?.(1) ?? '-'}`}>
      {[1,2,3,4,5].map(i => (
        <span key={i} className={"px-2 py-1 rounded " + (full >= i ? "bg-white/20" : "bg-white/5")}>★</span>
      ))}
    </div>
  );
}
