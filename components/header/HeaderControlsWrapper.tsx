// components/header/HeaderControlsWrapper.tsx
'use client';
import { useEffect, useState } from 'react';
import { HeaderControlsProvider } from '@/components/header/Header';

export default function HeaderControlsWrapper({ children }: { children: React.ReactNode }) {
  const [headerControls, setHeaderControls] = useState<any>({});
  useEffect(() => {
    function onSet(e: any) {
      setHeaderControls((e && e.detail) || {});
    }
    window.addEventListener('rs:setHeaderControls', onSet);
    return () => window.removeEventListener('rs:setHeaderControls', onSet);
  }, []);

  return (
    <HeaderControlsProvider value={headerControls}>
      {children}
    </HeaderControlsProvider>
  );
}