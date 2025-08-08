'use client';
import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButtons() {
  const { data: session, status } = useSession();
  if (status === "loading") return <div className="text-sm opacity-70">Auth…</div>;
  if (!session) return <button className="px-3 py-2 rounded-xl border text-sm" onClick={()=>signIn('google')}>Google ile giriş</button>;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm opacity-80 max-w-[160px] truncate">{session.user?.name || session.user?.email}</span>
      <button className="px-3 py-2 rounded-xl border text-sm" onClick={()=>signOut()}>Çıkış</button>
    </div>
  );
}
