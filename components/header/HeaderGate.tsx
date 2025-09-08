"use client";
import { usePathname } from "next/navigation";
import Header from "@/components/header/Header";

export default function HeaderGate() {
  const pathname = usePathname();
  const hideHeader =pathname === "/item" || pathname === "/" || pathname === "/share" || pathname === "/brand";
  if (hideHeader) return null;
  return <Header />;
}
