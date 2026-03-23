"use client";

import { useEffect, useState } from "react";

type Props = {
  phrases: string[];
  intervalMs?: number;
  className?: string;
};

export function HeroRotatingLine({ phrases, intervalMs = 4200 }: Props) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!phrases.length) return;

    const fadeOutMs = 450;
    const holdMs = Math.max(1200, intervalMs - fadeOutMs);

    const timer = setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((old) => (old + 1) % phrases.length);
        setVisible(true);
      }, fadeOutMs);
    }, holdMs);

    return () => clearInterval(timer);
  }, [phrases, intervalMs]);

  return (
    <span
      className={[
        "block",
        "text-accent-400",
        className ?? "",
        "transition-all",
        "duration-500",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      ].join(" ")}
      aria-live="polite"
    >
      {phrases[index] ?? ""}
    </span>
  );
}
