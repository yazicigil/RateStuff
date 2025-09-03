"use client";
import { useEffect } from "react";
import { toast } from "react-hot-toast";

/**
 * Yeni brand eklendiğinde (?created=<email>) bir kere toast gösterir
 * ve listede ilgili satırı kısa süreli highlight eder.
 */
export default function CreatedFlash() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const created = params.get("created");
    if (!created) return;
    // Toast
    toast.success("Eklendi");
    // Highlight the corresponding row
    const sel = `[data-email="${CSS.escape(created)}"]`;
    const row = document.querySelector(sel) as HTMLElement | null;
    if (row) {
      row.classList.add("ring-2", "ring-emerald-400", "ring-offset-2");
      setTimeout(() => {
        row.classList.remove("ring-2", "ring-emerald-400", "ring-offset-2");
      }, 2000);
    }
    // Clean the URL (history replace)
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  return null;
}
