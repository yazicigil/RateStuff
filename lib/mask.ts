export function maskName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return parts.map(p => p ? (p[0].toLocaleUpperCase('tr-TR') + '*'.repeat(Math.max(1, Math.min(10, p.length - 1)))) : '').join(' ');
}
