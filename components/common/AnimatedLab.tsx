

"use client";
import { useEffect, useRef } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import animationData from "@/assets/animations/lab.json";

export default function AnimatedLab({ playing }: { playing?: boolean }) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    if (playing) {
      lottieRef.current?.play();
    } else {
      lottieRef.current?.stop();
    }
  }, [playing]);

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={animationData}
      loop={false}
      autoplay={false}
      style={{ width: 32, height: 32 }}
    />
  );
}