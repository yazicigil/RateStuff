'use client';

import { SessionProvider } from 'next-auth/react';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
