"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type Props = {
  brandEmail: string;
  ownerUserId: string;
  className?: string;
  // optional fast-path if caller already knows current user
  currentUserEmail?: string | null;
  currentUserId?: string | null;
};

type MeShape = { email?: string | null; id?: string | null; sub?: string | null } | null;

async function getMe(): Promise<MeShape> {
  try {
    const res = await fetch("/api/me", { credentials: "include", cache: "no-store" });
    if (!res.ok) return null;
    let j: any = null;
    try { j = await res.json(); } catch { return null; }
    const m = j?.me ?? j;
    return { email: m?.email ?? null, id: m?.id ?? null, sub: m?.sub ?? null };
  } catch {}
  return null;
}

export default function OwnerSettings({
  brandEmail,
  ownerUserId,
  className,
  currentUserEmail,
  currentUserId,
}: Props) {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meEmailProp = String(currentUserEmail ?? "").toLowerCase().trim();
        const meIdProp = String(currentUserId ?? "").toString().trim();
        const brandEmailLc = String(brandEmail ?? "").toLowerCase().trim();
        const ownerId = String(ownerUserId ?? "").toString().trim();

        let ok = false;
        if (meEmailProp || meIdProp) {
          ok = (!!meEmailProp && meEmailProp === brandEmailLc) || (!!meIdProp && meIdProp === ownerId);
        }
        if (!ok) {
          const me = await getMe();
          const meEmail = String(me?.email ?? "").toLowerCase().trim();
          const meId = String((me?.id ?? me?.sub ?? "")).trim();
          ok = (!!meEmail && meEmail === brandEmailLc) || (!!meId && meId === ownerId);
        }
        if (!cancelled) setIsOwner(!!ok);
      } catch (err) {
        console.warn('[OwnerSettings] owner check failed', err);
        if (!cancelled) setIsOwner(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brandEmail, ownerUserId, currentUserEmail, currentUserId]);

  if (!isOwner) return null;

  return (
    <Link
      href="/brand/me"
      aria-label="Ayarlar"
      title="Ayarlar"
      className={
        className ??
        "ml-1 inline-flex h-[26px] w-[26px] items-center justify-center rounded-full border border-[var(--brand-elev-bd,rgba(0,0,0,0.08))] text-[var(--brand-ink-subtle,inherit)] hover:text-[var(--brand-ink,inherit)] hover:bg-[var(--brand-chip-bg,rgba(0,0,0,0.05))] hover:bg-opacity-20 transition"
      }
    >
      <svg
        viewBox="0 0 24 24"
        width="15"
        height="15"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.894 3.31.873 2.416 2.416a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.894 1.543-.873 3.31-2.416 2.416a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.894-3.31-.873-2.416-2.416a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.894-1.543.873-3.31 2.416-2.416.996.577 2.249.07 2.573-1.066z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </Link>
  );
}