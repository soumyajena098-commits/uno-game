import React from 'react';

/**
 * Universal Bigger Card-Count Box (Part 20 Specification)
 *
 * Specs:
 * - Pill background: solid dark color with a contrasting border in player's assigned UNO color
 * - Height: clamp(36px, 4.5vmin, 52px) (min 36px on mobile, up to 52px on desktop)
 * - Horizontal padding: clamp(12px, 1.6vmin, 18px)
 * - Icon (🃏): clamp(16px, 2vmin, 22px)
 * - Number font size: clamp(18px, 2.6vmin, 26px) — bold, high contrast white
 * - Corner radius: rounded-full (999px)
 * - Subtle shadow beneath the pill
 * - Layout inside: [icon]  [number] — gap of 6–8px
 *
 * Visual States:
 * - Normal (>1): dark pill + playerColor border + white number
 * - UNO (1 card left): red pill + white number + red glow + animate pulse
 * - Finished (0 cards): large green `✅ Finished` badge
 */
export default function CardCountPill({
  cardCount = 0,
  finished = false,
  finishRank = null,
  playerColor = '#3b82f6',
  className = '',
  title,
}) {
  if (finished) {
    return (
      <div
        style={{
          minHeight: 'clamp(36px, 4.5vmin, 52px)',
          paddingInline: 'clamp(12px, 1.6vmin, 18px)',
        }}
        className={`inline-flex items-center gap-2 rounded-full bg-emerald-500/25 border-2 border-emerald-400 text-emerald-300 font-display font-black shadow-[0_4px_16px_rgba(16,185,129,0.35)] shrink-0 select-none ${className}`}
        title={`Finished — Rank #${finishRank || 1}`}
      >
        <span
          style={{ fontSize: 'clamp(16px, 2vmin, 22px)' }}
          className="shrink-0"
        >
          ✅
        </span>
        <span
          style={{ fontSize: 'clamp(14px, 1.9vmin, 18px)' }}
          className="whitespace-nowrap"
        >
          Finished {finishRank ? `(#${finishRank})` : ''}
        </span>
      </div>
    );
  }

  const isUno = cardCount === 1;

  return (
    <div
      style={{
        minHeight: 'clamp(36px, 4.5vmin, 52px)',
        paddingInline: 'clamp(12px, 1.6vmin, 18px)',
        borderColor: isUno ? '#f87171' : (playerColor || '#38bdf8'),
        backgroundColor: isUno ? 'rgba(220, 38, 38, 0.95)' : 'rgba(2, 6, 23, 0.95)',
        boxShadow: isUno
          ? '0 0 24px rgba(239, 68, 68, 0.75), 0 4px 16px rgba(0,0,0,0.8)'
          : '0 4px 16px rgba(0, 0, 0, 0.75)',
      }}
      className={`inline-flex items-center justify-center gap-2 rounded-full border-2 text-white font-display font-black shrink-0 select-none transition-all ${
        isUno ? 'animate-pulse ring-2 ring-red-400/80' : ''
      } ${className}`}
      title={title || `${cardCount} ${cardCount === 1 ? 'card' : 'cards'} in hand`}
    >
      <span
        style={{ fontSize: 'clamp(16px, 2vmin, 22px)' }}
        className="shrink-0 drop-shadow flex items-center justify-center leading-none"
      >
        🃏
      </span>
      <span
        style={{ fontSize: 'clamp(18px, 2.6vmin, 26px)' }}
        className="text-white font-black leading-none drop-shadow tabular-nums"
      >
        {cardCount}
      </span>
    </div>
  );
}
