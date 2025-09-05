"use client";
import { usePathname } from "next/navigation";
import Header from "@/components/header/Header";

export default function HeaderGate() {
  const pathname = usePathname();
  const hideHeader = pathname === "/" || pathname?.startsWith("/brand");
  if (hideHeader) return null;
  return <Header />;
}
