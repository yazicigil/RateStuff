'use client';

import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm rounded-2xl border p-6 bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm">
        <div className="mb-4 text-center">
          <img src="/logo.svg" alt="RateStuff" className="mx-auto h-30 w-30" />
          <h1 className="mt-2 text-lg font-semibold">Giriş yap</h1>
          <p className="text-sm opacity-70">Devam etmek için bir yöntem seç</p>
        </div>

        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-2 border rounded-xl px-3 py-2 text-sm dark:border-gray-700"
        >
          {/* Google ikonu */}
          <svg width="16" height="16" viewBox="0 0 256 262" aria-hidden="true">
            <path fill="#4285F4" d="M255.9 133.5c0-10.4-.9-18-2.9-25.9H130v46.9h71.9c-1.5 11.7-9.6 29.3-27.5 41.1l-.3 2.2 40 31 2.8.3c25.7-23.7 40.5-58.6 40.5-96.6z"/>
            <path fill="#34A853" d="M130 261.1c36.6 0 67.3-12.1 89.8-32.9l-42.8-33.2c-11.5 8-26.9 13.6-47 13.6-35.9 0-66.4-23.7-77.3-56.6l-2 .2-41.9 32.5-.5 2c22.4 44.6 68.5 74.4 121.7 74.4z"/>
            <path fill="#FBBC05" d="M52.7 151.9c-2.9-8.8-4.6-18.2-4.6-27.9s1.7-19.1 4.6-27.9l-.1-2.1L10.1 60.9l-1.9.9C3 74.2 0 89.4 0 104c0 14.6 3 29.8 8.2 42.2l44.5-34.3z"/>
            <path fill="#EA4335" d="M130 50.5c25.5 0 42.7 11 52.5 20.3l38.3-37.3C197.1 12.3 166.6 0 130 0 76.8 0 30.7 29.8 8.2 74.5l44.4 34.3C63.6 75.9 94.1 50.5 130 50.5z"/>
          </svg>
          Google ile giriş yap
        </button>

        <p className="text-xs opacity-60 text-center mt-4">
          Giriş yaparak kullanım şartlarını kabul edersin.
        </p>
      </div>
    </div>
  );
}
