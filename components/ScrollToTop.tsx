"use client";
import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react"; // ya da Heroicons/Feather vs.

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 300); // 300px aşağı inince göster
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollTop}
      className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-violet-600 text-white shadow-lg hover:bg-violet-700 transition"
      aria-label="Yukarı dön"
    >
      <ChevronUp className="w-5 h-5" />
    </button>
  );
}