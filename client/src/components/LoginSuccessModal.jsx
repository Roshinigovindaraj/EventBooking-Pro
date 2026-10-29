import React from "react";
import { ArrowRight, X } from "lucide-react";
import confetti from "canvas-confetti";

/**
 * RealisticPartyPopper
 * Detailed 3D-styled party popper cone matching the reference vector artwork:
 * - 3D glossy conical body with curved gold contour stripes
 * - Realistic dark interior void and highlighted lip
 * - Signature green corkscrew/spiral spring ribbon
 * - Blue looping streamer, curved orange ribbon, red star, and scattered confetti slips
 * - Synchronized firing recoil & muzzle flash
 */
export function RealisticPartyPopper({ isRight = false, fired = false, className = "", style = {} }) {
  const gradientIdCone = isRight ? "popperConeGradRight" : "popperConeGradLeft";
  const gradientIdStripe = isRight ? "popperStripeGradRight" : "popperStripeGradLeft";
  const shadowId = isRight ? "stripeShadowRight" : "stripeShadowLeft";

  return (
    <svg
      className={`popper-horn-svg ${className}`.trim()}
      viewBox="0 0 160 170"
      fill="none"
      style={{
        transform: isRight ? "scaleX(-1) rotate(40deg)" : "rotate(40deg)",
        transformOrigin: "70px 145px",
        ...style,
      }}
    >
      <defs>
        {/* Glossy 3D red/crimson cone gradient matching reference */}
        <linearGradient id={gradientIdCone} x1="0%" y1="0%" x2="100%" y2="80%">
          <stop offset="0%" stopColor="#FF3366" />
          <stop offset="30%" stopColor="#EF144A" />
          <stop offset="68%" stopColor="#C90836" />
          <stop offset="100%" stopColor="#8E0221" />
        </linearGradient>

        {/* Glossy golden-yellow stripe gradient */}
        <linearGradient id={gradientIdStripe} x1="0%" y1="0%" x2="100%" y2="80%">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="50%" stopColor="#FFB800" />
          <stop offset="100%" stopColor="#E59000" />
        </linearGradient>

        {/* Subtle shadow under stripes to enhance 3D curvature */}
        <filter id={shadowId} x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#700015" floodOpacity="0.32" />
        </filter>
      </defs>

      {/* ERUPTING STREAMERS & CONFETTI (Sprouting out from the mouth) */}
      <g className={`popper-streamers-group ${fired ? "popper-streamers-active" : ""}`}>
        {/* Cyan wavy ribbon */}
        <path
          d="M 44 68 C 34 50, 18 46, 10 30"
          stroke="#06B6D4"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />

        {/* Iconic Green Corkscrew / Spiral Spring Ribbon */}
        <path
          d="M 64 68 C 56 52, 44 46, 44 34 C 44 20, 62 18, 68 28 C 74 38, 64 48, 52 42 C 44 36, 48 22, 58 14 C 64 8, 68 4, 70 0"
          stroke="#22C55E"
          strokeWidth="4.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Vibrant Blue Looping Ribbon */}
        <path
          d="M 82 66 C 98 48, 120 52, 115 36 C 110 24, 90 28, 94 42 C 96 50, 110 54, 118 44"
          stroke="#0284C7"
          strokeWidth="4.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Orange Curved Streamer */}
        <path
          d="M 90 70 C 108 66, 124 76, 120 92"
          stroke="#F97316"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />

        {/* Red Star */}
        <polygon
          points="46,44 48,49 53,49 49,52 51,57 46,54 42,57 43,52 39,49 44,49"
          fill="#EF4444"
        />

        {/* Confetti Flakes */}
        <rect x="28" y="28" width="5.5" height="11" rx="1.5" transform="rotate(-30 30 33)" fill="#22C55E" />
        <rect x="76" y="46" width="5.5" height="10" rx="1.5" transform="rotate(35 78 51)" fill="#FBBF24" />
        <rect x="102" y="60" width="4.5" height="9" rx="1.5" transform="rotate(22 104 64)" fill="#EF4444" />
        <rect x="72" y="16" width="5" height="10" rx="1.5" transform="rotate(-15 74 21)" fill="#3B82F6" />
        <rect x="52" y="20" width="4.5" height="9" rx="1.5" transform="rotate(45 54 24)" fill="#F97316" />
        <rect x="38" y="58" width="5" height="9" rx="1.5" transform="rotate(-40 40 62)" fill="#EC4899" />
      </g>

      {/* Muzzle flash spark burst during firing */}
      <g className="popper-muzzle-spark">
        <path
          d="M 50 60 L 32 38 M 70 56 L 70 28 M 90 60 L 108 38 M 40 68 L 18 58 M 100 68 L 122 58"
          stroke="#FBBF24"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="70" cy="58" r="6" fill="#FBBF24" opacity="0.9" />
      </g>

      {/* 3D CONE BODY */}
      <path
        d="M 34 70 L 66 144 Q 70 149 74 144 L 106 70 Z"
        fill={`url(#${gradientIdCone})`}
      />

      {/* Deep dark shaded interior of the cone mouth */}
      <ellipse cx="70" cy="70" rx="36" ry="13" fill="#6A041D" />

      {/* 3D CURVED GOLDEN CONTOUR STRIPES */}
      {/* Stripe 1 */}
      <path
        d="M 40 80 C 40 89, 100 89, 100 80 L 95 90 C 95 99, 45 99, 45 90 Z"
        fill={`url(#${gradientIdStripe})`}
        filter={`url(#${shadowId})`}
      />
      {/* Stripe 2 */}
      <path
        d="M 47 96 C 47 105, 93 105, 93 96 L 88 106 C 88 114, 52 114, 52 106 Z"
        fill={`url(#${gradientIdStripe})`}
        filter={`url(#${shadowId})`}
      />
      {/* Stripe 3 */}
      <path
        d="M 54 112 C 54 120, 86 120, 86 112 L 81 121 C 81 128, 59 128, 59 121 Z"
        fill={`url(#${gradientIdStripe})`}
        filter={`url(#${shadowId})`}
      />
      {/* Stripe 4 (near rounded tip) */}
      <path
        d="M 61 127 C 61 133, 79 133, 79 127 L 76 135 C 76 140, 64 140, 64 135 Z"
        fill={`url(#${gradientIdStripe})`}
        filter={`url(#${shadowId})`}
      />

      {/* Front lip rim with glossy highlight */}
      <path
        d="M 34 70 C 34 81, 106 81, 106 70"
        stroke="#FF6B8B"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * LoginSuccessModal
 * Celebratory popper modal displayed upon successful login or registration,
 * featuring realistic party poppers firing colorful confetti bursts across the viewport,
 * emerald green checkmark sunburst badge, and continue action.
 */
export default function LoginSuccessModal({
  open = true,
  onContinue,
  titleTop = "Login",
  titleBottom = "Successful!",
  description = "Welcome back! You have been logged in successfully to your account.",
  buttonText = "Continue",
}) {
  const [fired, setFired] = React.useState(false);
  const leftHornRef = React.useRef(null);
  const rightHornRef = React.useRef(null);
  const hasTriggeredAnimationRef = React.useRef(false);

  // Safe wrapper for canvas-confetti calls
  const fireParticles = React.useCallback((options) => {
    try {
      if (typeof confetti === "function") {
        confetti(options);
      }
    } catch {
      // Graceful fallback if canvas is not supported in environment
    }
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        onContinue?.();
      }
    };

    if (open) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      try {
        if (typeof confetti?.reset === "function") {
          confetti.reset();
        }
      } catch {
        // Safe cleanup
      }
    };
  }, [open, onContinue]);

  // Trigger firing motion and confetti burst sequence
  React.useEffect(() => {
    if (!open || hasTriggeredAnimationRef.current) return;
    hasTriggeredAnimationRef.current = true;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const timers = [];

    // Step 1: Fire poppers almost simultaneously after card scale-in (~200ms)
    timers.push(
      setTimeout(() => {
        setFired(true);

        const leftRect = leftHornRef.current?.getBoundingClientRect();
        const rightRect = rightHornRef.current?.getBoundingClientRect();

        const vw = window.innerWidth || 1000;
        const vh = window.innerHeight || 800;

        const leftOrigin = leftRect
          ? {
              x: Math.min(Math.max((leftRect.left + leftRect.width * 0.76) / vw, 0.05), 0.95),
              y: Math.min(Math.max((leftRect.top + leftRect.height * 0.22) / vh, 0.05), 0.95),
            }
          : { x: 0.36, y: 0.42 };

        const rightOrigin = rightRect
          ? {
              x: Math.min(Math.max((rightRect.left + rightRect.width * 0.24) / vw, 0.05), 0.95),
              y: Math.min(Math.max((rightRect.top + rightRect.height * 0.22) / vh, 0.05), 0.95),
            }
          : { x: 0.64, y: 0.42 };

        const primaryColors = [
          "#EF4444", // Bright Red
          "#FBBF24", // Yellow Gold
          "#22C55E", // Vibrant Green
          "#0284C7", // Sky Blue
          "#F97316", // Orange
          "#EC4899", // Neon Pink
          "#7C3AED", // Purple
          "#06B6D4", // Cyan
        ];

        // Burst 1: Left popper launches diagonally upward & inward
        fireParticles({
          particleCount: prefersReducedMotion ? 15 : 65,
          angle: 55,
          spread: 60,
          origin: leftOrigin,
          startVelocity: prefersReducedMotion ? 20 : 45,
          decay: 0.91,
          gravity: 0.95,
          drift: 0.08,
          ticks: 260,
          colors: primaryColors,
          shapes: ["square", "circle"],
          scalar: 1.05,
          zIndex: 100001,
          disableForReducedMotion: false,
        });

        // Burst 1: Right popper launches diagonally upward & inward
        fireParticles({
          particleCount: prefersReducedMotion ? 15 : 65,
          angle: 125,
          spread: 60,
          origin: rightOrigin,
          startVelocity: prefersReducedMotion ? 20 : 45,
          decay: 0.91,
          gravity: 0.95,
          drift: -0.08,
          ticks: 260,
          colors: primaryColors,
          shapes: ["square", "circle"],
          scalar: 1.05,
          zIndex: 100001,
          disableForReducedMotion: false,
        });
      }, 200)
    );

    // Step 2: Follow-up celebratory burst with stars and sparkles (~420ms)
    timers.push(
      setTimeout(() => {
        const leftRect = leftHornRef.current?.getBoundingClientRect();
        const rightRect = rightHornRef.current?.getBoundingClientRect();

        const vw = window.innerWidth || 1000;
        const vh = window.innerHeight || 800;

        const leftOrigin = leftRect
          ? {
              x: Math.min(Math.max((leftRect.left + leftRect.width * 0.76) / vw, 0.05), 0.95),
              y: Math.min(Math.max((leftRect.top + leftRect.height * 0.22) / vh, 0.05), 0.95),
            }
          : { x: 0.36, y: 0.42 };

        const rightOrigin = rightRect
          ? {
              x: Math.min(Math.max((rightRect.left + rightRect.width * 0.24) / vw, 0.05), 0.95),
              y: Math.min(Math.max((rightRect.top + rightRect.height * 0.22) / vh, 0.05), 0.95),
            }
          : { x: 0.64, y: 0.42 };

        const starColors = ["#FBBF24", "#EF4444", "#22C55E", "#0284C7", "#F97316", "#EC4899"];

        fireParticles({
          particleCount: prefersReducedMotion ? 8 : 32,
          angle: 65,
          spread: 50,
          origin: leftOrigin,
          startVelocity: prefersReducedMotion ? 18 : 38,
          decay: 0.92,
          gravity: 0.88,
          ticks: 240,
          colors: starColors,
          shapes: ["star", "circle"],
          scalar: 1.25,
          zIndex: 100001,
          disableForReducedMotion: false,
        });

        fireParticles({
          particleCount: prefersReducedMotion ? 8 : 32,
          angle: 115,
          spread: 50,
          origin: rightOrigin,
          startVelocity: prefersReducedMotion ? 18 : 38,
          decay: 0.92,
          gravity: 0.88,
          ticks: 240,
          colors: starColors,
          shapes: ["star", "circle"],
          scalar: 1.25,
          zIndex: 100001,
          disableForReducedMotion: false,
        });
      }, 420)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [open, fireParticles]);

  if (!open) return null;

  return (
    <div
      className="popper-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-success-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onContinue?.();
      }}
    >
      <div className="popper-modal-container">
        {/* White Modal Card */}
        <div className="popper-card">
          {/* Close button */}
          <button
            type="button"
            className="popper-close-btn"
            onClick={onContinue}
            aria-label="Close dialog"
          >
            <X size={20} strokeWidth={2.4} />
          </button>

          {/* Left Realistic Party Popper */}
          <div
            ref={leftHornRef}
            className={`popper-horn-wrapper popper-horn-left ${fired ? "popper-horn-fired" : ""}`}
            aria-hidden="true"
          >
            <RealisticPartyPopper isRight={false} fired={fired} />
          </div>

          {/* Right Realistic Party Popper */}
          <div
            ref={rightHornRef}
            className={`popper-horn-wrapper popper-horn-right ${fired ? "popper-horn-fired" : ""}`}
            aria-hidden="true"
          >
            <RealisticPartyPopper isRight={true} fired={fired} />
          </div>

          {/* Central Checkmark Badge with radiating sunburst rays */}
          <div className="popper-badge-wrap">
            <svg className="popper-check-badge" viewBox="0 0 100 100" fill="none">
              {/* 8 Green radiating sunburst rays */}
              <line x1="50" y1="5" x2="50" y2="15" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />
              <line x1="50" y1="85" x2="50" y2="95" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />
              <line x1="5" y1="50" x2="15" y2="50" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />
              <line x1="85" y1="50" x2="95" y2="50" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />
              <line x1="18" y1="18" x2="25" y2="25" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />
              <line x1="75" y1="75" x2="82" y2="82" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />
              <line x1="18" y1="82" x2="25" y2="75" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />
              <line x1="75" y1="25" x2="82" y2="18" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />

              {/* Concentric pale mint halo circle */}
              <circle cx="50" cy="50" r="33" fill="#E6FBF0" />

              {/* Inner emerald circle */}
              <circle cx="50" cy="50" r="23" fill="#22C55E" />

              {/* Crisp white checkmark */}
              <path
                d="M40 50.5 L47 57.5 L60 43.5"
                stroke="#FFFFFF"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Headline */}
          <h2 id="login-success-title" className="popper-title">
            <span className="popper-title-dark">{titleTop}</span>
            <span className="popper-title-gradient">{titleBottom}</span>
          </h2>

          {/* Description */}
          <p className="popper-desc">{description}</p>

          {/* Action Button */}
          <button
            type="button"
            className="popper-continue-btn"
            onClick={onContinue}
            autoFocus
          >
            <span>{buttonText}</span>
            <ArrowRight size={17} strokeWidth={2.4} aria-hidden="true" />
          </button>

          {/* Decorative bottom waves inside the card */}
          <div className="popper-bottom-waves" aria-hidden="true">
            <svg viewBox="0 0 500 80" preserveAspectRatio="none" fill="none">
              <path
                d="M0 45 Q 90 15 190 55 T 350 35 T 500 48 L 500 80 L 0 80 Z"
                fill="rgba(245, 243, 255, 0.95)"
              />
              <path
                d="M0 60 Q 110 35 220 62 T 380 44 T 500 58 L 500 80 L 0 80 Z"
                fill="rgba(237, 233, 254, 0.65)"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
