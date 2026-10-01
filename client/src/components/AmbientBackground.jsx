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

  // Deterministic lightweight particles (22 particles max)
  const particles = useMemo(() => {
    return Array.from({ length: 22 }, (_, i) => {
      const left = ((i * 17 + 7) % 94) + 3; // 3% to 97%
      const top = ((i * 23 + 13) % 90) + 5; // 5% to 95%
      const size = 3 + ((i * 5) % 5); // 3px to 7px
      const duration = 18 + ((i * 7) % 16); // 18s to 33s
      const delay = -((i * 4) % 15); // Stagger start
      const opacity = 0.04 + ((i * 3) % 5) * 0.01; // 0.04 to 0.08
      const isWarm = i % 3 === 0;

      return {
        id: i,
        left: `${left}%`,
        top: `${top}%`,
        size: `${size}px`,
        duration: `${duration}s`,
        delay: `${delay}s`,
        opacity,
        color: isWarm ? '#fbbf24' : i % 2 === 0 ? '#38bdf8' : '#a855f7',
      };
    });
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0"
    >
      {/* 1. Deep Atmospheric Gradient Base Layer */}
      <div
        style={{
          background: 'linear-gradient(180deg, #0a0f2c 0%, #1b1440 36%, #0d1b3a 68%, #1a0f2b 100%)',
        }}
        className="absolute inset-0"
      />

      {/* 2. Soft Table Spotlight (Centered on Arena) */}
      <div
        style={{
          background:
            'radial-gradient(ellipse 72% 56% at 50% 42%, rgba(20, 80, 85, 0.2) 0%, rgba(88, 28, 135, 0.12) 42%, transparent 74%)',
        }}
        className="absolute inset-0"
      />

      {/* 3. Top-Center Subtle Indigo Glow */}
      <div
        style={{
          background:
            'radial-gradient(ellipse 60% 30% at 50% 0%, rgba(99, 102, 241, 0.12) 0%, transparent 60%)',
        }}
        className="absolute inset-0"
      />

      {/* 4. Bottom-Center Soft Warm Plum Glow */}
      <div
        style={{
          background:
            'radial-gradient(ellipse 60% 35% at 50% 100%, rgba(217, 70, 239, 0.09) 0%, transparent 65%)',
        }}
        className="absolute inset-0"
      />

      {/* 5. Faint Corner UNO Decorative Outlines (Ultra-low opacity 0.035) */}
      <svg
        className="absolute top-3 left-3 w-28 h-28 text-white/5 pointer-events-none"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="10" y="10" width="45" height="65" rx="8" transform="rotate(-12 32 42)" />
        <rect x="35" y="18" width="45" height="65" rx="8" transform="rotate(8 57 50)" />
      </svg>
      <svg
        className="absolute bottom-3 right-3 w-32 h-32 text-amber-400/5 pointer-events-none"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="50" cy="50" r="38" strokeDasharray="6 4" />
        <rect x="28" y="24" width="44" height="62" rx="7" transform="rotate(15 50 55)" />
      </svg>

      {/* 6. Subtle GPU-Accelerated Floating Particles (Disabled on reduced motion) */}
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
