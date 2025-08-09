
export default function UserAvatar({ src, name, size=20 }:{src?:string|null; name?:string; size?:number}) {
  const initials = (name||'?').split('-')[1]?.[0]?.toUpperCase() || '?';
  return src ? (
    <img src={src} alt={name||'u'} width={size} height={size} className="rounded-full object-cover inline-block" />
  ) : (
    <span className="inline-grid place-items-center rounded-full bg-gray-200 text-gray-700"
      style={{width:size, height:size, fontSize: Math.max(10, size*0.5)}}>{initials}</span>
  );
}
