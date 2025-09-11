import Link from "next/link";

// slug karakter kümesi
const SLUG_CHARS = "A-Za-z0-9._-";
const MENTION = new RegExp(
  `(^|[^${SLUG_CHARS}])@([${SLUG_CHARS}]{1,32})(?![${SLUG_CHARS}])`,
  "gi"
);

type Options = {
  inline?: boolean; // true => <span> render et (iç içe <a> sorununu aşmak için)
};

export function linkifyMentions(text: string, opts: Options = {}) {
  const parts: (string | JSX.Element)[] = [];
  let last = 0;

  text.replace(MENTION, (match, pre, slug, offset) => {
    const prev = text[offset - 1];
    if (prev && /[A-Za-z0-9]/.test(prev)) return match;

    const start = offset;
    const preStr = typeof pre === "string" ? pre : "";
    const mentionStart = start + preStr.length;

    parts.push(text.slice(last, start));
    if (preStr) parts.push(preStr);

    if (opts.inline) {
      // Kart içindeki nested <a> sorunundan kaçınmak için <span> + JS navigation
      parts.push(
        <span
          key={`${slug}-${mentionStart}`}
          role="link"
          tabIndex={0}
          className="rs-mention-link hover:underline cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = `/brand/${slug}`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              window.location.href = `/brand/${slug}`;
            }
          }}
        >
          @{slug}
        </span>
      );
    } else {
      parts.push(
        <Link
          key={`${slug}-${mentionStart}`}
          href={`/brand/${slug}`}
          className="rs-mention-link hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          @{slug}
        </Link>
      );
    }

    last = mentionStart + (`@${slug}`).length;
    return match;
  });

  parts.push(text.slice(last));
  return parts;
}