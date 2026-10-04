import React, { useMemo } from 'react';
import { useGameStore } from '../store/useGameStore.js';

/**
 * Ambient Background Component — Part 18
 *
 * Rich, atmospheric scene:
 * - Deep gradient with subtle warm/cool color mixing:
 *   Top: deep indigo/navy (#0a0f2c)
 *   Middle: rich teal/purple blend (#1b1440 to #0d1b3a)
 *   Bottom: dark warm plum (#1a0f2b)
 * - Soft radial gradients behind the table for a "spotlight" effect
 * - Very subtle animated particles drifting slowly (~5-8% opacity, GPU-accelerated)
 * - Faint corner accents (UNO card geometric outlines)
 * - Respects `prefers-reduced-motion` and user setting `reduceMotion`
 */
export default function AmbientBackground() {
  const reduceMotion = useGameStore((s) => s.reduceMotion);
  const theme = useGameStore((s) => s.theme);

  // Deterministic lightweight particles (capped at 15 for optimal mobile 60fps)
  const particles = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => {
      const left = ((i * 19 + 7) % 92) + 4; // 4% to 96%
      const top = ((i * 23 + 11) % 88) + 6; // 6% to 94%
      const size = 3 + ((i * 4) % 4); // 3px to 6px
      const duration = 20 + ((i * 7) % 14); // 20s to 34s
      const delay = -((i * 5) % 15); // Stagger start
      const opacity = 0.05 + ((i * 3) % 4) * 0.015; // 0.05 to 0.1
      const isGold = i % 2 === 0;

      return {
        id: i,
        left: `${left}%`,
        top: `${top}%`,
        size: `${size}px`,
        duration: `${duration}s`,
        delay: `${delay}s`,
        opacity,
        color: isGold ? '#d4af37' : i % 3 === 0 ? '#10b981' : '#f0d97a',
      };
    });
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0 transition-opacity duration-300"
    >
      {/* 1. Royal Casino Atmospheric Gradient Base Layer */}
      <div
        style={{
          background: 'var(--bg-gradient)',
          transition: 'background 200ms ease',
        }}
        className="absolute inset-0"
      />

      {/* 2. Soft Casino Table Spotlight (Emerald & Gold Arena Ambience) */}
      <div
        style={{
          background:
            theme === 'light'
              ? 'radial-gradient(ellipse 76% 58% at 50% 45%, rgba(30, 122, 92, 0.22) 0%, rgba(184, 134, 11, 0.12) 45%, transparent 75%)'
              : 'radial-gradient(ellipse 76% 58% at 50% 45%, rgba(11, 61, 46, 0.35) 0%, rgba(212, 175, 55, 0.14) 45%, transparent 75%)',
          transition: 'background 200ms ease',
        }}
        className="absolute inset-0"
      />

      {/* 3. Top-Center Subtle Gold Trim Glow */}
      <div
        style={{
          background:
            'radial-gradient(ellipse 65% 25% at 50% 0%, rgba(212, 175, 55, 0.15) 0%, transparent 65%)',
        }}
        className="absolute inset-0"
      />

      {/* 4. Bottom-Center Warm Felt Glow */}
      <div
        style={{
          background:
            'radial-gradient(ellipse 65% 30% at 50% 100%, rgba(11, 61, 46, 0.25) 0%, transparent 70%)',
        }}
        className="absolute inset-0"
      />

      {/* 5. Faint Corner UNO Decorative Outlines (Ultra-low opacity 0.04) */}
      <svg
        className="absolute top-3 left-3 w-28 h-28 text-amber-300/10 pointer-events-none"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="10" y="10" width="45" height="65" rx="8" transform="rotate(-12 32 42)" />
        <rect x="35" y="18" width="45" height="65" rx="8" transform="rotate(8 57 50)" />
      </svg>
      <svg
        className="absolute bottom-3 right-3 w-32 h-32 text-amber-400/10 pointer-events-none"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="50" cy="50" r="38" strokeDasharray="6 4" />
        <rect x="28" y="24" width="44" height="62" rx="7" transform="rotate(15 50 55)" />
      </svg>

      {/* 6. Subtle GPU-Accelerated Floating Particles (Capped at 15; disabled on reduced motion) */}
      {!reduceMotion && (
        <div className="absolute inset-0 overflow-hidden">
          {particles.map((p) => (
            <div
              key={p.id}
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                opacity: p.opacity,
                boxShadow: `0 0 8px ${p.color}`,
                animation: `ambient-drift ${p.duration} ease-in-out infinite alternate`,
                animationDelay: p.delay,
              }}
              className="absolute rounded-full will-change-transform"
            />
          ))}
        </div>
      )}
    </div>
  );
}
