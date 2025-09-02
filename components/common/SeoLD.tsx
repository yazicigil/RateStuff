// components/SeoLD.tsx
"use client";

export default function SeoLD({ json }: { json: Record<string, any> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}