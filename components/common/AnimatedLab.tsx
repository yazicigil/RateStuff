"use client";
import { useEffect, useRef } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import animationData from "@/assets/animations/lab.json";

export default function AnimatedLab({ playing, size = 16, white }: { playing?: boolean; size?: number; white?: boolean }) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    if (playing) {
      lottieRef.current?.goToAndPlay(0, true);
    } else {
      lottieRef.current?.stop();
    }
  }, [playing]);

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={animationData as unknown as object}
      loop={false}
      autoplay={false}
      style={{ width: size, height: size }}
      className={white ? "filter brightness-0 invert" : ""}
      rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
    />
  );
}