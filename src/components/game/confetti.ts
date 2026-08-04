"use client";

import confetti from "canvas-confetti";

/** Celebratory burst for wins. */
export function celebrate() {
  const colors = ["#7c5cf6", "#38e0fa", "#f472b6", "#facc5a", "#ffffff"];
  const end = Date.now() + 1400;
  (function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 62,
      startVelocity: 55,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 62,
      startVelocity: 55,
      origin: { x: 1, y: 0.7 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  confetti({
    particleCount: 120,
    spread: 100,
    startVelocity: 45,
    origin: { y: 0.6 },
    colors,
  });
}
