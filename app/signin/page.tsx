'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleGoogle() {
    try {
      setLoading(true);
      await signIn('google', { callbackUrl: '/' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-8 flex flex-col items-center space-y-6">
        <div className="text-center">
          <img src="/logo.svg" alt="RateStuff" className="mx-auto h-14 w-auto dark:invert" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Giriş yap</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Devam etmek için bir yöntem seç</p>
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-800 bg-white border border-gray-300 hover:bg-gray-100 active:bg-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Google ile giriş yap"
        >
          <svg width="18" height="18" viewBox="0 0 256 262" aria-hidden="true" className="flex-shrink-0">
            <path fill="#4285F4" d="M255.9 133.5c0-10.4-.9-18-2.9-25.9H130v46.9h71.9c-1.5 11.7-9.6 29.3-27.5 41.1l-.3 2.2 40 31 2.8.3c25.7-23.7 40.5-58.6 40.5-96.6z"/>
            <path fill="#34A853" d="M130 261.1c36.6 0 67.3-12.1 89.8-32.9l-42.8-33.2c-11.5 8-26.9 13.6-47 13.6-35.9 0-66.4-23.7-77.3-56.6l-2 .2-41.9 32.5-.5 2c22.4 44.6 68.5 74.4 121.7 74.4z"/>
            <path fill="#FBBC05" d="M52.7 151.9c-2.9-8.8-4.6-18.2-4.6-27.9s1.7-19.1 4.6-27.9l-.1-2.1L10.1 60.9l-1.9.9C3 74.2 0 89.4 0 104c0 14.6 3 29.8 8.2 42.2l44.5-34.3z"/>
            <path fill="#EA4335" d="M130 50.5c25.5 0 42.7 11 52.5 20.3l38.3-37.3C197.1 12.3 166.6 0 130 0 76.8 0 30.7 29.8 8.2 74.5l44.4 34.3C63.6 75.9 94.1 50.5 130 50.5z"/>
          </svg>
          <span>{loading ? 'Yönlendiriliyor…' : 'Google ile giriş yap'}</span>
        </button>

        <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
          Giriş yaparak kullanım şartlarını kabul edersin.
        </p>

        <button
          onClick={() => router.push('/')}
          className="mt-1 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded"
          aria-label="Anasayfaya dön"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Anasayfa
        </button>
      </div>
    </div>
  );
}
