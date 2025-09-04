"use client";
import { useEffect, useState } from "react";
import { SocialIcon } from "react-social-icons";
import dynamic from "next/dynamic";

const SocialBarEditor = dynamic(() => import("./SocialBarEditor"), { ssr: false });

type SocialLink = {
  id: string;
  url: string;
  label?: string | null;
  platform?: string | null;
  order: number;
  visible: boolean;
};

export default function SocialBar({ userId, className = "", canEdit = false }: { userId: string; className?: string; canEdit?: boolean }) {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [openEditor, setOpenEditor] = useState(false);

  useEffect(() => {
    let abort = false;
    (async () => {
      const res = await fetch(`/api/users/${userId}/socials`, { cache: "no-store" });
      const data = await res.json();
      if (!abort && data?.ok) {
        setLinks((data.items as SocialLink[]).filter((x) => x.visible));
      }
    })();
    return () => { abort = true; };
  }, [userId]);

  if (!links.length) {
    if (canEdit) {
      return (
        <div className={className}>
          <button
            onClick={() => setOpenEditor(true)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm border border-zinc-300/50 hover:border-zinc-300/80 hover:bg-zinc-200/20 transition"
          >
            {/* Plus icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="opacity-80">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
            </svg>
            <span>Bağlantı ekle</span>
          </button>
          {openEditor && (
            <div className="mt-3">
              <SocialBarEditor
                userId={userId}
                onPreview={(draft) => setLinks(draft.filter((x) => x.visible))}
                onClose={() => setOpenEditor(false)}
              />
            </div>
          )}
        </div>
      );
    }
    return null;
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {links
            .sort((a, b) => a.order - b.order || 0)
            .map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2"
                aria-label={l.label ?? l.platform ?? l.url}
              >
                <SocialIcon url={l.url} style={{ height: 28, width: 28 }} />
                {l.label ? (
                  <span className="text-sm opacity-80 group-hover:opacity-100 transition-opacity">
                    {l.label}
                  </span>
                ) : null}
              </a>
            ))}
          {canEdit && (
            <button
              onClick={() => setOpenEditor((v) => !v)}
              className="inline-flex items-center justify-center rounded-full w-[28px] h-[28px] border border-zinc-300/50 hover:border-zinc-300/80 hover:bg-zinc-200/20 transition"
              aria-label={openEditor ? "Düzenlemeyi kapat" : "Düzenle"}
              title={openEditor ? "Düzenlemeyi kapat" : "Düzenle"}
            >
              {/* Inline pencil svg */}
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="opacity-80">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/>
                <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42L18.37 3.29a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.83z" fill="currentColor"/>
              </svg>
            </button>
          )}
        </div>
      </div>
      {openEditor && canEdit && (
        <div className="mt-3">
          <SocialBarEditor
            userId={userId}
            onPreview={(draft) => setLinks(draft.filter((x) => x.visible))}
            onClose={() => setOpenEditor(false)}
          />
        </div>
      )}
    </div>
  );
}