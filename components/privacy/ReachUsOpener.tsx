'use client';
import React from 'react';
import ReachUsModal from '@/components/common/ReachUs';

export default function ReachUsOpener() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="underline text-purple-600 dark:text-purple-400"
      >
        Bize Ulaş
      </button>
      <ReachUsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}