export default function UserAvatar({ src, name, size=20 }:{
  src?: string | null; name?: string | null; size?: number;
}) {
  const initial = (name ?? 'U')[0]?.toUpperCase() ?? 'U';
  return src ? (
    <img src={src} alt={name ?? 'user'} width={size} height={size}
         className="rounded-full object-cover inline-block" />
  ) : (
    <span className="inline-grid place-items-center rounded-full bg-gray-200 text-gray-700"
          style={{ width: size, height: size, fontSize: Math.max(10, size*0.5) }}>
      {initial}
    </span>
  );
}
