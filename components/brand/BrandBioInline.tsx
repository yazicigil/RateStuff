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
    return (
      <p className="text-sm text-neutral-700">{bio || 'Açıklama ekle'}</p>
    );
  }

  return (
    <div className="text-sm text-neutral-700">
      {isEditing ? (
        <div className="flex flex-col space-y-2">
          <textarea
            className="border border-neutral-300 rounded p-2 resize-none"
            rows={3}
            value={draftBio}
            onChange={(e) => setDraftBio(e.target.value)}
            disabled={isSaving}
            maxLength={240}
          />
          <div className="text-xs text-neutral-500 text-right">
            {draftBio.length} / 240
          </div>
          <div className="flex space-x-2">
            <button
              className="bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50"
              onClick={handleSave}
              disabled={isSaving}
              type="button"
            >
              Kaydet
            </button>
            <button
              className="bg-gray-300 text-gray-800 px-3 py-1 rounded"
              onClick={handleCancel}
              type="button"
            >
              İptal
            </button>
          </div>
        </div>
      ) : (
        <div
          className="flex items-center space-x-1 cursor-pointer hover:text-neutral-900"
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
          <img
            src="/assets/icons/pencil.svg"
            alt="Edit bio"
            className="w-4 h-4"
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
