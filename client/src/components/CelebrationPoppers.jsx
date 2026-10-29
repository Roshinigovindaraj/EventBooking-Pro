import React from "react";
import confetti from "canvas-confetti";
import { RealisticPartyPopper } from "./LoginSuccessModal.jsx";

/**
 * Universal celebration confetti cannon trigger.
 * Launches dual synchronized confetti bursts from left and right angles,
 * followed by a cascading shower of colorful stars and ribbons.
 */
export function fireConfettiCelebration(options = {}) {
  try {
    if (typeof confetti !== "function") return;

    // In non-mocked headless / test environments without canvas 2D context support, return safely
    const isMock = typeof confetti.mock !== 'undefined' || typeof confetti._isMockFunction === 'function';
    if (!isMock && typeof document !== "undefined") {
      try {
        const dummyCanvas = document.createElement("canvas");
        const ctx = dummyCanvas.getContext && dummyCanvas.getContext("2d");
        if (!ctx) return;
      } catch {
        return;
      }
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) return;

    const colors = options.colors || [
      "#EC4899", // Neon pink
      "#8B5CF6", // Purple
      "#3B82F6", // Royal blue
      "#10B981", // Emerald green
      "#F59E0B", // Vibrant gold/amber
      "#EF4444", // Bright red
      "#06B6D4", // Cyan
      "#F43F5E", // Rose
      "#FFE066", // Golden yellow
    ];

    const originLeft = options.originLeft || { x: 0.2, y: 0.65 };
    const originRight = options.originRight || { x: 0.8, y: 0.65 };

    // Stage 1: Initial punchy diagonal blasts matching the popper horns
    confetti({
      particleCount: options.particleCount || 48,
      angle: 55,
      spread: 72,
      origin: originLeft,
      colors,
      startVelocity: 44,
      decay: 0.9,
      scalar: 1.1,
      shapes: ["square", "circle"],
      ticks: 240,
      zIndex: options.zIndex || 99999,
    });

    confetti({
      particleCount: options.particleCount || 48,
      angle: 125,
      spread: 72,
      origin: originRight,
      colors,
      startVelocity: 44,
      decay: 0.9,
      scalar: 1.1,
      shapes: ["square", "circle"],
      ticks: 240,
      zIndex: options.zIndex || 99999,
    });

    // Stage 2: Secondary high-altitude cascade burst
    setTimeout(() => {
      try {
        confetti({
          particleCount: 36,
          angle: 60,
          spread: 85,
          origin: originLeft,
          colors,
          startVelocity: 36,
          decay: 0.92,
          scalar: 0.95,
          ticks: 220,
          zIndex: options.zIndex || 99999,
        });

        confetti({
          particleCount: 36,
          angle: 120,
          spread: 85,
          origin: originRight,
          colors,
          startVelocity: 36,
          decay: 0.92,
          scalar: 0.95,
          ticks: 220,
          zIndex: options.zIndex || 99999,
        });
      } catch {
        // Safe fallback
      }
    }, 220);
  } catch {
    // Graceful error handling
  }
}

/**
 * CelebrationPoppers Component
 * Renders two realistic 3D vector party poppers on the left and right edges
 * of any card, modal, or confirmation section, accompanied by synchronized
 * recoil animations, erupting streamers, and real confetti blasts.
 */
export default function CelebrationPoppers({
  autoFire = true,
  className = "",
  style = {},
  top = "16px",
  left = "-16px",
  right = "-16px",
}) {
  const [fired, setFired] = React.useState(false);
  const leftHornRef = React.useRef(null);
  const rightHornRef = React.useRef(null);
  const hasFiredRef = React.useRef(false);

  React.useEffect(() => {
    if (!autoFire || hasFiredRef.current) return;
    hasFiredRef.current = true;

    const timer = setTimeout(() => {
      setFired(true);

      let originLeft = { x: 0.22, y: 0.62 };
      let originRight = { x: 0.78, y: 0.62 };

      if (leftHornRef.current && rightHornRef.current) {
        const lRect = leftHornRef.current.getBoundingClientRect();
        const rRect = rightHornRef.current.getBoundingClientRect();
        const vw = typeof window !== "undefined" ? window.innerWidth || 1000 : 1000;
        const vh = typeof window !== "undefined" ? window.innerHeight || 800 : 800;

        if (lRect.width > 0 && rRect.width > 0) {
          originLeft = {
            x: Math.max(0.05, Math.min(0.95, (lRect.left + lRect.width * 0.7) / vw)),
            y: Math.max(0.1, Math.min(0.95, (lRect.top + lRect.height * 0.35) / vh)),
          };
          originRight = {
            x: Math.max(0.05, Math.min(0.95, (rRect.left + rRect.width * 0.3) / vw)),
            y: Math.max(0.1, Math.min(0.95, (rRect.top + rRect.height * 0.35) / vh)),
          };
        }
      }

      fireConfettiCelebration({ originLeft, originRight });
    }, 180);

    return () => clearTimeout(timer);
  }, [autoFire]);

  return (
    <div
      className={`celebration-poppers-overlay ${className}`.trim()}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "visible",
        zIndex: 15,
        ...style,
      }}
      aria-hidden="true"
    >
      {/* Left Realistic Party Popper */}
      <div
        ref={leftHornRef}
        className={`popper-horn-wrapper popper-horn-left ${fired ? "popper-horn-fired" : ""}`}
        style={{ top, left }}
      >
        <RealisticPartyPopper isRight={false} fired={fired} />
      </div>

      {/* Right Realistic Party Popper */}
      <div
        ref={rightHornRef}
        className={`popper-horn-wrapper popper-horn-right ${fired ? "popper-horn-fired" : ""}`}
        style={{ top, right }}
      >
        <RealisticPartyPopper isRight={true} fired={fired} />
      </div>
    </div>
  );
}

let lastPopperTime = 0;

/**
 * Spawns an energetic party popper visual burst right at the given screen coordinates.
 */
function spawnButtonPopperVisual(x, y) {
  try {
    if (typeof document === "undefined" || !document.body) return;

    const burst = document.createElement("div");
    burst.className = "button-popper-burst";
    burst.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 0;
      height: 0;
    `;
    burst.innerHTML = `
      <div class="button-popper-icon">🎉</div>
      <span class="button-popper-sparkle s1">✨</span>
      <span class="button-popper-sparkle s2">🎊</span>
      <span class="button-popper-sparkle s3">⭐</span>
      <span class="button-popper-ring"></span>
    `;
    document.body.appendChild(burst);
    setTimeout(() => {
      try {
        burst.remove();
      } catch {}
    }, 700);
  } catch {}
}

/**
 * Universal celebration popper triggered on any button click.
 * Accurately centers the confetti cannons and visual party popper at the button's position.
 */
export function fireButtonPopper(targetOrEvent, customOptions = {}) {
  const now = Date.now();
  if (now - lastPopperTime < 160) return;
  lastPopperTime = now;

  try {
    let elem = null;
    let clientX = null;
    let clientY = null;

    if (targetOrEvent) {
      if (targetOrEvent.target) {
        elem =
          targetOrEvent.target.closest?.(
            'button, .btn, a.btn, [role="button"], a, input[type="submit"]'
          ) || targetOrEvent.target;
        clientX = targetOrEvent.clientX;
        clientY = targetOrEvent.clientY;
      } else if (targetOrEvent.getBoundingClientRect) {
        elem = targetOrEvent;
      }
    }

    const vw = typeof window !== "undefined" ? window.innerWidth || 1000 : 1000;
    const vh = typeof window !== "undefined" ? window.innerHeight || 800 : 800;

    let cx = 0.5;
    let cy = 0.6;
    let xPixel = clientX;
    let yPixel = clientY;

    if (elem && elem.getBoundingClientRect) {
      const rect = elem.getBoundingClientRect();
      cx = (rect.left + rect.width / 2) / vw;
      cy = (rect.top + rect.height / 2) / vh;
      if (xPixel == null || yPixel == null) {
        xPixel = rect.left + rect.width / 2;
        yPixel = rect.top + rect.height / 2;
      }
    } else if (clientX != null && clientY != null) {
      cx = clientX / vw;
      cy = clientY / vh;
    }

    cx = Math.max(0.06, Math.min(0.94, cx));
    cy = Math.max(0.08, Math.min(0.92, cy));

    if (xPixel == null) xPixel = cx * vw;
    if (yPixel == null) yPixel = cy * vh;

    // Launch confetti cannon originating from the clicked button
    fireConfettiCelebration({
      originLeft: {
        x: Math.max(0.03, cx - 0.05),
        y: cy,
      },
      originRight: {
        x: Math.min(0.97, cx + 0.05),
        y: cy,
      },
      particleCount: 45,
      ...customOptions,
    });

    // Spawn party popper icon and sparkle ring animation at the button
    spawnButtonPopperVisual(xPixel, yPixel);
  } catch (err) {
    fireConfettiCelebration();
  }
}
