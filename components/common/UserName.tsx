import { getDisplayName, isBrand, UserLike } from "@/lib/userDisplay";

export default function UserName({
  user,
  className = "",
  showIcon = true,
}: {
  user: UserLike;
  className?: string;
  showIcon?: boolean;
}) {
  const name = getDisplayName(user);
  const brand = isBrand(user);

  return (
    <span className={["inline-flex items-center gap-1.5", className].join(" ")}>
      <span className="truncate">{name}</span>
      {showIcon && brand && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="inline-block ml-1 w-4 h-4 align-middle"
        >
          <circle cx="12" cy="12" r="9" fill="#3B82F6" />
          <path
            d="M8.5 12.5l2 2 4-4"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}