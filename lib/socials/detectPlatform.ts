// lib/socials/detectPlatform.ts
export function detectPlatform(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('x.com') || host.includes('twitter.com')) return 'x';
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('linkedin.com')) return 'linkedin';
    if (host.includes('facebook.com')) return 'facebook';
    if (host.includes('threads.net')) return 'threads';
    if (host.includes('pinterest.com')) return 'pinterest';
    if (host.includes('twitch.tv')) return 'twitch';
    if (host.includes('github.com')) return 'github';
    if (host.includes('behance.net')) return 'behance';
    if (host.includes('dribbble.com')) return 'dribbble';
    if (host.includes('spotify.com')) return 'spotify';
    if (host.includes('soundcloud.com')) return 'soundcloud';
    if (host.includes('medium.com')) return 'medium';
    if (host.includes('telegram.me') || host.includes('t.me')) return 'telegram';
    if (host.includes('wa.me') || host.includes('whatsapp.com')) return 'whatsapp';
    return null;
  } catch {
    return null;
  }
}