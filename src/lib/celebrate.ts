import confetti from "canvas-confetti";

/** Confetti burst in brand colours; skipped when the user prefers reduced motion. */
export function celebrate() {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  confetti({
    particleCount: 90,
    spread: 75,
    startVelocity: 38,
    origin: { y: 0.6 },
    colors: ["#4a5ddb", "#127a75", "#e0a030", "#95a2f8"],
    disableForReducedMotion: true,
  });
}
