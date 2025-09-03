// lib/crypto-lite.ts
import { createHash } from "crypto";

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function hashOtp(input: string): string {
  return sha256Hex(input);
}

export function hashNonce(input: string): string {
  return sha256Hex(input);
}

// Constant-time kıyas (hex stringler için)
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}