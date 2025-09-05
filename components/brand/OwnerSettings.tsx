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
  // 1) Try custom /api/me
  try {
    const res = await fetch("/api/me", { credentials: "include", cache: "no-store" });
    if (res.ok) {
      const j = await res.json();
      return { email: j?.email ?? null, id: j?.id ?? null, sub: j?.sub ?? null };
    }
  } catch {}
  // 2) Try NextAuth session fallback
  try {
    const res = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" });
    if (res.ok) {
      const j = await res.json();
      return { email: j?.user?.email ?? null, id: (j?.user?.id ?? j?.user?.sub ?? j?.sub ?? null) };
    }
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
      const meEmailProp = (currentUserEmail || "").toLowerCase().trim();
      const meIdProp = (currentUserId || "").trim();
      const brandEmailLc = (brandEmail || "").toLowerCase().trim();
      const ownerId = (ownerUserId || "").trim();

      let ok = false;
      if (meEmailProp || meIdProp) {
        ok = (!!meEmailProp && meEmailProp === brandEmailLc) || (!!meIdProp && meIdProp === ownerId);
      }
      if (!ok) {
        const me = await getMe();
        const meEmail = (me?.email || "").toLowerCase().trim();
        const meId = (me?.id || me?.sub || "").toString().trim();
        ok = (!!meEmail && meEmail === brandEmailLc) || (!!meId && meId === ownerId);
      }
      if (!cancelled) setIsOwner(!!ok);
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
        "ml-1 inline-flex h-[26px] w-[26px] items-center justify-center rounded-full border border-[var(--brand-elev-bd,rgba(0,0,0,0.08))] text-[var(--brand-ink-subtle,inherit)] hover:text-[var(--brand-ink,inherit)] hover:bg-[var(--brand-chip-bg,rgba(0,0,0,0.05))] transition"
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
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path d="M19.4 15a1 1 0 0 0 .2-1.1l-.6-1a1 1 0 0 1 0-.9l.6-1a1 1 0 0 0-.2-1.1l-1.1-1.1a1 1 0 0 0-1.1-.2l-1 .6a1 1 0 0 1-.9 0l-1-.6a1 1 0 0 0-1.1.2L10 6.6a1 1 0 0 0-.2 1.1l.6 1a1 1 0 0 1 0 .9l-.6 1a1 1 0 0 0 .2 1.1l1.1 1.1a1 1 0 0 0 1.1.2l1-.6a1 1 0 0 1 .9 0l1 .6a1 1 0 0 0 1.1-.2L19.4 15Z" />
      </svg>
    </Link>
  );
}