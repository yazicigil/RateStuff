export default function UserAvatar({ src, name, size=20 }:{
  src?: string | null; name?: string | null; size?: number;
}) {
  const initial = (name ?? 'U')[0]?.toUpperCase() ?? 'U';
  return src ? (
    <img src={src} alt={name ?? 'user'} width={size} height={size}
         className="rounded-full object-cover inline-block" />
  ) : (
    <span className="inline-grid place-items-center rounded-full bg-gray-300 text-white font-bold"
          style={{ width: size, height: size }}>
      {initial}
    </span>
  );
}
