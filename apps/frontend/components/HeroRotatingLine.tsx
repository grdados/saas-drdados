"use client";

import { useEffect, useState } from "react";

type Props = {
  phrases: string[];
  intervalMs?: number;
  className?: string;
};

export function HeroRotatingLine({ phrases, intervalMs = 4200, className }: Props) {
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

  const raw = phrases[index] ?? "";
  const parts = raw.split("\n");
  const line1 = parts[0] ?? "";
  const line2 = parts.slice(1).join(" ").trim();

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
      <span className="block">{line1}</span>
      <span className="block">{line2}</span>
    </span>
  );
}
