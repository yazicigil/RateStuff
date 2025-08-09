import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// "M**** Y****" maskesi
function makeMaskedNameFromHuman(name?: string | null, fallbackEmail?: string) {
  const src = (name || fallbackEmail?.split("@")[0] || "Anon").trim();
  const parts = src.replace(/[_.-]+/g, " ").split(/\s+/).filter(Boolean).slice(0, 3);
  const maskPart = (p: string) => {
    const first = p.trim().charAt(0);
    const upper = first ? first.toLocaleUpperCase("tr-TR") : "•";
    return `${upper}****`;
  };
  if (parts.length === 0) return "A****";
  if (parts.length === 1) return maskPart(parts[0]);
  return `${maskPart(parts[0])} ${maskPart(parts[1])}`;
}

async function runFix
