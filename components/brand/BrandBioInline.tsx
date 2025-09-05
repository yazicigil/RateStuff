'use client';

import { useState } from 'react';

interface BrandBioInlineProps {
  initialBio: string | null;
  brandId: string;
  isOwner?: boolean;
}

export default function BrandBioInline({ initialBio, brandId, isOwner }: BrandBioInlineProps) {
  const [bio, setBio] = useState(initialBio ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [draftBio, setDraftBio] = useState(bio);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/brand/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bio: draftBio, brandId }),
      });
      if (res.ok) {
        setBio(draftBio);
        setIsEditing(false);
      } else {
        // Optionally handle error
      }
    } catch {
      // Optionally handle error
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraftBio(bio);
    setIsEditing(false);
  };

  if (!isOwner) {
    // Public görünüm: bio boşsa hiç göstermeyelim
    if (!bio || bio.trim().length === 0) return null;
    return (
      <p className="text-sm" style={{ color: 'var(--brand-ink, currentColor)' }}>
        {bio}
      </p>
    );
  }

  return (
    <div className="text-sm" style={{ color: 'var(--brand-ink, currentColor)' }}>
      {isEditing ? (
        <div className="flex flex-col space-y-2">
          <textarea
            className="border rounded p-2 resize-none bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
            rows={3}
            value={draftBio}
            onChange={(e) => setDraftBio(e.target.value)}
            disabled={isSaving}
            maxLength={240}
            style={{ color: 'var(--brand-ink)', backgroundColor: 'transparent', borderColor: 'var(--brand-elev-bd)', caretColor: 'var(--brand-ink)' }}
            placeholder="Açıklama ekle"
          />
          <div className="text-xs text-right" style={{ color: 'var(--brand-ink-subtle, var(--brand-ink, currentColor))' }}>
            {draftBio.length} / 240
          </div>
          <div className="flex space-x-2">
            <button
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSave}
              disabled={isSaving}
              type="button"
            >
              Kaydet
            </button>
            <button
              className="bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-700 px-3 py-1 rounded"
              onClick={handleCancel}
              type="button"
            >
              İptal
            </button>
          </div>
        </div>
      ) : (
        <div
          className="flex items-center space-x-1 cursor-pointer hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 rounded"
          style={{ color: 'var(--brand-ink, currentColor)' }}
          onClick={() => setIsEditing(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsEditing(true);
            }
          }}
        >
          <p>{bio || 'Açıklama ekle'}</p>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            className="w-4 h-4"
            aria-hidden="true"
          >
            <path d="M3 17.25V21h3.75l11.06-11.06-3.75-3.75L3 17.25z" fill="currentColor" />
            <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor" />
          </svg>
        </div>
      )}
    </div>
  );
}
