"use client";
import { useEffect } from "react";

export default function PresencePinger() {
  useEffect(() => {
    let stop = false;
    const hit = () => fetch("/api/presence/heartbeat", { method: "POST" }).catch(() => {});
    // İlk ping
    hit();
    // 15 sn’de bir
    const id = setInterval(hit, 15000);

    // Sekme gizlenince aralığı uzat (trafik koruması, opsiyonel)
    const onVis = () => {
      if (document.hidden) return;
      // Sayfa görünür olduğunda hemen pingle
      hit();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stop = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return null;
}