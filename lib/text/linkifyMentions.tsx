import Link from "next/link";

// Slug kurallarına göre karakter setini daralt
const SLUG = "[a-z0-9._-]";
const MENTION = new RegExp(`(^|[\\s.,;:!?()"'»«\$begin:math:display$\\$end:math:display$])@(${SLUG}{2,32})(?=$|[\\s.,;:!?()"'»«\$begin:math:display$\\$end:math:display$])`, "gi");

export function linkifyMentions(text: string) {
  const out: (string | JSX.Element)[] = [];
  let last = 0;

  text.replace(MENTION, (match, pre, slug, idx) => {
    // e-posta kaçınma: '@' öncesi alfanumerik ise mention sayma
    const prev = text[idx - 1];
    if (prev && /[A-Za-z0-9]/.test(prev)) return match;

    out.push(text.slice(last, idx));
    if (pre) out.push(pre);
    out.push(
      <Link key={`${slug}-${idx}`} href={`/brand/${slug}`} className="!text-violet-600 dark:!text-violet-400 hover:underline">
        @{slug}
      </Link>
    );
    last = idx + match.length;
    return match;
  });

  out.push(text.slice(last));
  return out;
}