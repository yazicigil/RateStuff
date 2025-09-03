import Image from "next/image";
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
        <Image
          src="/verified.svg"            // public/verified.svg
          alt="verified brand"
          width={14}
          height={14}
          className="opacity-90"
          priority={false}
        />
      )}
    </span>
  );
}