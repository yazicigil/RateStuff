'use client';
function Star({ filled, onClick }: { filled: boolean; onClick?: ()=>void }) {
  return (
    <button type="button" onClick={onClick} className="w-6 h-6 inline-flex items-center justify-center transition-transform hover:scale-110" title={filled ? "Rated" : "Rate"}>
      <svg viewBox="0 0 24 24" className={`w-5 h-5 ${filled ? "fill-yellow-400" : "fill-gray-300"}`}>
        <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.401 8.168L12 18.897l-7.335 3.868 1.401-8.168L.132 9.21l8.2-1.192z" />
      </svg>
    </button>
  );
}
export default function Stars({ value, onRate }: { value: number; onRate?: (n:number)=>void }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => <Star key={n} filled={n <= Math.round(value)} onClick={()=>onRate?.(n)} />)}
    </div>
  );
}
