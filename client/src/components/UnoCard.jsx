import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Ban, RefreshCw } from 'lucide-react';
import { useGameStore } from '../store/useGameStore.js';

const COLOR_STYLES = {
  red: {
    bg: 'from-red-500 via-red-600 to-red-700',
    border: 'border-red-300/45',
    text: 'text-red-600',
    glow: 'shadow-red-500/50',
    symbol: '▲',
  },
  yellow: {
    bg: 'from-amber-400 via-yellow-500 to-amber-600',
    border: 'border-yellow-200/55',
    text: 'text-amber-500',
    glow: 'shadow-amber-400/50',
    symbol: '●',
  },
  green: {
    bg: 'from-emerald-500 via-green-600 to-emerald-700',
    border: 'border-emerald-300/45',
    text: 'text-emerald-600',
    glow: 'shadow-emerald-500/50',
    symbol: '■',
  },
  blue: {
    bg: 'from-blue-500 via-blue-600 to-indigo-700',
    border: 'border-blue-300/45',
    text: 'text-blue-600',
    glow: 'shadow-blue-500/50',
    symbol: '◆',
  },
  wild: {
    bg: 'from-slate-800 via-slate-900 to-black',
    border: 'border-white/40',
    text: 'text-white',
    glow: 'shadow-purple-500/50',
    symbol: '★',
  },
};

/**
 * Memoized UNO Card Component (`<UnoCard />`) — Part 4, 8 & 11 Tap vs Swipe & Pan-X
 *
 * - Uses `aspect-ratio: 2 / 3` (`uno-card-fluid`) and `touch-action: pan-x`.
 * - Detects tap vs swipe using an 8px movement threshold so horizontal hand swipes never accidentally play cards.
 * - Zero hardcoded pixel sizes — scales fluidly across phones, tablets, laptops, and desktops.
 * - Strictly memoized so cards never re-render or wobble on timer ticks.
 */
function UnoCardComponent({
  card,
  faceDown = false,
  playable = false,
  isBestPlayable = false,
  focused = false,
  disabled = false,
  size = 'md', // 'sm' | 'md' | 'lg' | 'center'
  onCardSelect,
  onClick,
  className = '',
}) {
  const colorBlindMode = useGameStore((s) => s.colorBlindMode);
  const reduceMotion = useGameStore((s) => s.reduceMotion);

  const pointerStartRef = useRef(null);
  const pointerMovedRef = useRef(false);

  const fluidWidth =
    size === 'sm'
      ? 'var(--opp-card-w, var(--card-sm-size, 52px))'
      : size === 'lg' || size === 'center'
      ? 'var(--pile-card-w, var(--card-center-size, 110px))'
      : 'var(--card-w, var(--card-size, 80px))';

  const minWidth =
    size === 'sm'
      ? '36px'
      : size === 'lg' || size === 'center'
      ? '88px'
      : '52px';

  const minHeight =
    size === 'sm'
      ? '50px'
      : size === 'lg' || size === 'center'
      ? '124px'
      : '72px';

  const handlePress = () => {
    // When disabled (e.g. not your turn), still allow clicking unplayable cards to show "Wait for your turn" toast
    if (onCardSelect && card) {
      onCardSelect(card);
    } else if (onClick) {
      onClick();
    }
  };

  const handlePointerDown = (e) => {
    pointerMovedRef.current = false;
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
    };
  };

  const handlePointerMove = (e) => {
    if (!pointerStartRef.current) return;
    const dx = Math.abs(e.clientX - pointerStartRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartRef.current.y);
    if (dx >= 8 || dy >= 8) {
      pointerMovedRef.current = true;
    }
  };

  const handlePointerUp = (e) => {
    if (!pointerStartRef.current) return;
    const dx = Math.abs(e.clientX - pointerStartRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartRef.current.y);
    pointerStartRef.current = null;

    if (dx < 8 && dy < 8 && !pointerMovedRef.current) {
      handlePress();
    }
  };

  const handlePointerCancel = () => {
    pointerStartRef.current = null;
    pointerMovedRef.current = false;
  };

  const handleClick = (e) => {
    // If user moved/swiped >= 8px, cancel click to prevent accidental play
    if (pointerMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // Keyboard accessibility trigger (Enter / Space)
    if (e.detail === 0) {
      handlePress();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePress();
    }
  };

  // Royal Casino Face-Down Card Back
  if (faceDown) {
    return (
      <motion.button
        type="button"
        aria-label="UNO Draw Pile Card"
        style={{
          width: fluidWidth,
          minWidth,
          minHeight,
          aspectRatio: '1 / 1.4',
          borderRadius: `calc(${fluidWidth} * 0.08)`,
          touchAction: 'pan-x',
          borderColor: 'var(--card-back-border, #d4af37)',
        }}
        whileTap={!reduceMotion && (onClick || onCardSelect) && !disabled ? { scale: 0.95 } : {}}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`uno-card-fluid relative select-none border-2 p-[4%] shadow-xl overflow-hidden flex items-center justify-center ${
          (onClick || onCardSelect) && !disabled
            ? 'cursor-pointer uno-card-hover-lift'
            : 'cursor-default'
        } ${className}`}
      >
        <div
          style={{
            borderRadius: `calc(${fluidWidth} * 0.06)`,
            background: 'var(--card-back-bg)',
            borderColor: 'var(--gold-border, rgba(212, 175, 55, 0.45))',
          }}
          className="w-full h-full flex items-center justify-center relative overflow-hidden border"
        >
          {/* Subtle casino pattern/filigree overlay */}
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.4)_1px,transparent_1px)] [background-size:8px_8px]" />

          {/* Center Oval Crest */}
          <div className="w-[86%] h-[68%] bg-gradient-to-br from-[#8b1a1a] via-[#5c0b0b] to-[#3a0606] rounded-full -rotate-28 flex items-center justify-center shadow-inner border-2 border-amber-300/85">
            <span
              style={{ fontSize: `calc(${fluidWidth} * 0.28)` }}
              className="font-display font-black text-amber-200 tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] -rotate-6"
            >
              UNO
            </span>
          </div>

          {/* Diagonal foil shimmer streak */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none casino-shimmer-sweep"
          />
        </div>
      </motion.button>
    );
  }

  // Defensive fallback if card is null/undefined
  const safeCard = card || {
    id: 'fallback-card',
    color: 'wild',
    type: 'number',
    value: '?',
  };

  const isWildCard = safeCard.type === 'wild' || safeCard.type === 'wild4';
  const declaredColor = isWildCard && safeCard.declaredColor ? safeCard.declaredColor : null;
  const effectiveColor = !isWildCard ? (safeCard.color || 'wild') : (declaredColor || 'wild');
  const palette = COLOR_STYLES[effectiveColor] || COLOR_STYLES.wild;

  // Wild cards keep the dark casino gradient so the 4-color wheel remains iconic
  const cardFaceGradient = isWildCard
    ? 'from-slate-800 via-slate-900 to-black'
    : palette.bg;

  // Distinct border ring for Wild cards with declared color
  const declaredColorRingClass = declaredColor === 'red'
    ? 'border-red-500 ring-4 ring-red-500/85 shadow-[0_0_22px_rgba(239,68,68,0.7)]'
    : declaredColor === 'blue'
    ? 'border-blue-500 ring-4 ring-blue-500/85 shadow-[0_0_22px_rgba(59,130,246,0.7)]'
    : declaredColor === 'green'
    ? 'border-emerald-500 ring-4 ring-emerald-500/85 shadow-[0_0_22px_rgba(16,185,129,0.7)]'
    : declaredColor === 'yellow'
    ? 'border-amber-400 ring-4 ring-amber-400/85 shadow-[0_0_22px_rgba(251,191,36,0.7)]'
    : '';

  const renderSymbol = (isCorner = false) => {
    const cornerStyle = { fontSize: `calc(${fluidWidth} * 0.18)` };
    const centerStyle = { fontSize: `calc(${fluidWidth} * 0.45)` };
    const symbolStyle = { fontSize: `calc(${fluidWidth} * 0.35)` };

    switch (safeCard.type) {
      case 'skip':
        return (
          <Ban
            style={{
              width: isCorner ? `calc(${fluidWidth} * 0.18)` : `calc(${fluidWidth} * 0.35)`,
              height: isCorner ? `calc(${fluidWidth} * 0.18)` : `calc(${fluidWidth} * 0.35)`,
            }}
            className="stroke-[3]"
          />
        );
      case 'reverse':
        return (
          <RefreshCw
            style={{
              width: isCorner ? `calc(${fluidWidth} * 0.18)` : `calc(${fluidWidth} * 0.35)`,
              height: isCorner ? `calc(${fluidWidth} * 0.18)` : `calc(${fluidWidth} * 0.35)`,
            }}
            className="stroke-[3]"
          />
        );
      case 'draw2':
        return (
          <span
            style={isCorner ? cornerStyle : symbolStyle}
            className="font-display font-black tracking-tighter leading-none"
          >
            +2
          </span>
        );
      case 'wild':
        return isCorner ? (
          <span style={cornerStyle} className="font-display font-black leading-none">
            W
          </span>
        ) : (
          <div className="w-[58%] aspect-square rounded-full overflow-hidden grid grid-cols-2 grid-rows-2 border-2 border-white shadow-md rotate-12">
            <div className="bg-red-500" />
            <div className="bg-blue-500" />
            <div className="bg-yellow-400" />
            <div className="bg-emerald-500" />
          </div>
        );
      case 'wild4':
        return isCorner ? (
          <span style={cornerStyle} className="font-display font-black leading-none">
            +4
          </span>
        ) : (
          <div className="relative flex items-center justify-center w-full h-full">
            <div className="grid grid-cols-2 gap-0.5 p-[6%] rounded-md bg-slate-900/90 border border-white/40 rotate-6 shadow-md w-[52%] aspect-square">
              <div className="bg-red-500 rounded-xs" />
              <div className="bg-blue-500 rounded-xs" />
              <div className="bg-yellow-400 rounded-xs" />
              <div className="bg-emerald-500 rounded-xs" />
            </div>
            <span
              style={{ fontSize: `calc(${fluidWidth} * 0.32)` }}
              className="absolute font-display font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
            >
              +4
            </span>
          </div>
        );
      default:
        return (
          <span
            style={isCorner ? cornerStyle : centerStyle}
            className="font-display font-black leading-none"
          >
            {safeCard.value !== undefined && safeCard.value !== null ? safeCard.value : '?'}
          </span>
        );
    }
  };

  const isUnplayableInHand = !playable && onCardSelect;

  return (
    <motion.button
      type="button"
      aria-label={playable ? `Playable: ${effectiveColor} ${safeCard.value || safeCard.type}` : `${effectiveColor} ${safeCard.value || safeCard.type} card`}
      title={playable ? 'Playable Card' : declaredColor ? `Declared Suit: ${declaredColor.toUpperCase()}` : undefined}
      style={{
        width: fluidWidth,
        minWidth,
        minHeight,
        aspectRatio: '1 / 1.4',
        borderRadius: `calc(${fluidWidth} * 0.08)`,
        backgroundColor: 'var(--card-bg, #f8f3e6)',
        touchAction: 'pan-x',
        ...(playable
          ? {
              boxShadow: '0 8px 24px rgba(212, 175, 55, 0.45), 0 2px 8px rgba(0, 0, 0, 0.4)',
              borderColor: '#f0d97a',
            }
          : declaredColor
          ? {}
          : {
              borderColor: 'rgba(255, 255, 255, 0.9)',
            }),
      }}
      initial={reduceMotion ? false : { opacity: 0.7, scale: 0.94 }}
      animate={{
        opacity: 1,
        scale: focused ? 1.06 : 1,
        y: playable ? '-8px' : '0px',
      }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      whileTap={!reduceMotion ? { scale: 0.95 } : {}}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`uno-card-fluid relative select-none border-2 p-[4%] shadow-lg flex items-center justify-center shrink-0 snap-center transition-all ${
        playable
          ? 'casino-playable-pulse ring-2 ring-amber-300/80 cursor-pointer uno-card-hover-lift z-10'
          : focused
          ? 'ring-3 ring-sky-400 cursor-pointer uno-card-hover-lift'
          : declaredColorRingClass
          ? `${declaredColorRingClass} z-10`
          : isUnplayableInHand
          ? 'casino-card-unplayable cursor-pointer hover:opacity-85'
          : !disabled
          ? 'cursor-pointer uno-card-hover-lift'
          : 'cursor-default'
      } ${className}`}
    >
      <div
        style={{ borderRadius: `calc(${fluidWidth} * 0.06)` }}
        className={`w-full h-full bg-gradient-to-br ${cardFaceGradient} ${isWildCard ? (declaredColor ? 'border-white/40' : 'border-white/30') : palette.border} border flex flex-col justify-between p-[8%] relative overflow-hidden`}
      >
        {isWildCard && (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.22)_0%,transparent_45%,rgba(255,255,255,0.12)_100%)] pointer-events-none" />
        )}

        {/* Diagonal Shimmer Sweep across card face on playable cards (every ~4s) */}
        {playable && (
          <div
            aria-hidden="true"
            className="absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none casino-shimmer-sweep z-20"
          />
        )}

        <div className="self-start text-white font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] leading-none z-10 flex items-center gap-0.5">
          {renderSymbol(true)}
          {declaredColor && (
            <span
              style={{
                width: `calc(${fluidWidth} * 0.12)`,
                height: `calc(${fluidWidth} * 0.12)`,
              }}
              className={`rounded-full inline-block shadow-sm ${
                declaredColor === 'red' ? 'bg-red-500' :
                declaredColor === 'blue' ? 'bg-blue-500' :
                declaredColor === 'green' ? 'bg-emerald-500' :
                'bg-amber-400'
              }`}
              title={`Declared: ${declaredColor.toUpperCase()}`}
            />
          )}
          {colorBlindMode && (
            <span style={{ fontSize: `calc(${fluidWidth} * 0.12)` }} className="opacity-90">
              {palette.symbol}
            </span>
          )}
        </div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            style={declaredColor ? { borderColor: declaredColor === 'red' ? '#ef4444' : declaredColor === 'blue' ? '#3b82f6' : declaredColor === 'green' ? '#10b981' : '#f59e0b' } : {}}
            className={`w-[84%] h-[68%] bg-white/95 rounded-full -rotate-25 flex items-center justify-center shadow-inner ${declaredColor ? 'border-3' : 'border-2 border-white/60'}`}
          >
            <div
              className={`rotate-25 flex items-center justify-center w-full h-full ${
                isWildCard ? 'text-slate-900' : palette.text
              } drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]`}
            >
              {renderSymbol(false)}
            </div>
          </div>
        </div>

        <div className="self-end rotate-180 text-white font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] leading-none z-10 flex items-center gap-0.5">
          {renderSymbol(true)}
          {declaredColor && (
            <span
              style={{
                width: `calc(${fluidWidth} * 0.12)`,
                height: `calc(${fluidWidth} * 0.12)`,
              }}
              className={`rounded-full inline-block shadow-sm ${
                declaredColor === 'red' ? 'bg-red-500' :
                declaredColor === 'blue' ? 'bg-blue-500' :
                declaredColor === 'green' ? 'bg-emerald-500' :
                'bg-amber-400'
              }`}
              title={`Declared: ${declaredColor.toUpperCase()}`}
            />
          )}
          {colorBlindMode && (
            <span style={{ fontSize: `calc(${fluidWidth} * 0.12)` }} className="opacity-90">
              {palette.symbol}
            </span>
          )}
        </div>
      </div>

      {/* Tiny subtle best-card indicator chevron / star badge */}
      {playable && isBestPlayable && (
        <span
          className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-display font-black text-[9px] shadow-lg border border-slate-900 flex items-center gap-0.5 z-30"
          title="Best Legal Match"
        >
          ★
        </span>
      )}

      {/* Static Playable Indicator Dot */}
      {playable && !isBestPlayable && (
        <span className="absolute -top-1 -right-1 w-[14%] aspect-square rounded-full bg-amber-300 border-2 border-slate-950 shadow" />
      )}
    </motion.button>
  );
}

export default React.memo(
  UnoCardComponent,
  (prev, next) =>
    prev.card?.id === next.card?.id &&
    prev.card?.color === next.card?.color &&
    prev.card?.value === next.card?.value &&
    prev.card?.type === next.card?.type &&
    prev.card?.declaredColor === next.card?.declaredColor &&
    prev.faceDown === next.faceDown &&
    prev.playable === next.playable &&
    prev.isBestPlayable === next.isBestPlayable &&
    prev.focused === next.focused &&
    prev.disabled === next.disabled &&
    prev.size === next.size
);
