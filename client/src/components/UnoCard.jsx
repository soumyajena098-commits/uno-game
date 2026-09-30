import React from 'react';
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
 * Memoized UNO Card Component (`<UnoCard />`) — Part 4 & Part 8 Fluid Relative Layout
 *
 * - Uses `aspect-ratio: 2 / 3` (`uno-card-fluid`) and CSS custom property widths (`var(--card-size)`, `var(--card-center-size)`).
 * - Zero hardcoded pixel sizes — scales fluidly across phones, tablets, laptops, and desktops.
 * - Strictly memoized so cards never re-render or wobble on timer ticks.
 */
function UnoCardComponent({
  card,
  faceDown = false,
  playable = false,
  focused = false,
  disabled = false,
  size = 'md', // 'sm' | 'md' | 'lg'
  onCardSelect,
  onClick,
  className = '',
}) {
  const colorBlindMode = useGameStore((s) => s.colorBlindMode);
  const reduceMotion = useGameStore((s) => s.reduceMotion);

  const fluidWidth =
    size === 'sm'
      ? 'var(--card-sm-size)'
      : size === 'lg' || size === 'center'
      ? 'var(--card-center-size)'
      : 'var(--card-size)';

  const handlePress = () => {
    if (disabled) return;
    if (onCardSelect && card) {
      onCardSelect(card);
    } else if (onClick) {
      onClick();
    }
  };

  if (faceDown || !card) {
    return (
      <motion.button
        type="button"
        aria-label="UNO Draw Pile Card"
        style={{ width: fluidWidth }}
        whileTap={!reduceMotion && (onClick || onCardSelect) && !disabled ? { scale: 0.95 } : {}}
        onClick={handlePress}
        className={`uno-card-fluid relative select-none bg-slate-950 border-2 border-white/90 rounded-[14%] p-[5%] shadow-xl overflow-hidden flex items-center justify-center ${
          (onClick || onCardSelect) && !disabled
            ? 'cursor-pointer uno-card-hover-lift'
            : 'cursor-default'
        } ${className}`}
      >
        <div className="w-full h-full rounded-[11%] bg-gradient-to-br from-slate-900 via-black to-slate-950 flex items-center justify-center relative overflow-hidden border border-white/10">
          <div className="w-[86%] h-[68%] bg-gradient-to-br from-red-500 to-red-700 rounded-full -rotate-28 flex items-center justify-center shadow-inner border-2 border-yellow-400/80">
            <span
              style={{ fontSize: 'clamp(11px, 2vmin, 22px)' }}
              className="font-display font-extrabold text-yellow-300 tracking-tighter drop-shadow-[0_2px_2px_rgba(0,0,0,0.85)] -rotate-6"
            >
              UNO
            </span>
          </div>
        </div>
      </motion.button>
    );
  }

  const effectiveColor =
    (card.type === 'wild' || card.type === 'wild4') && card.declaredColor
      ? card.declaredColor
      : card.color || 'wild';

  const palette = COLOR_STYLES[effectiveColor] || COLOR_STYLES.wild;
  const isWildCard = card.type === 'wild' || card.type === 'wild4';

  const renderSymbol = (isCorner = false) => {
    const cornerStyle = { fontSize: 'clamp(9px, 1.25vmin, 14px)' };
    const centerStyle = { fontSize: 'clamp(20px, 3.8vmin, 42px)' };

    switch (card.type) {
      case 'skip':
        return (
          <Ban
            style={{
              width: isCorner ? 'clamp(10px, 1.4vmin, 15px)' : 'clamp(20px, 3.8vmin, 42px)',
              height: isCorner ? 'clamp(10px, 1.4vmin, 15px)' : 'clamp(20px, 3.8vmin, 42px)',
            }}
            className="stroke-[2.75]"
          />
        );
      case 'reverse':
        return (
          <RefreshCw
            style={{
              width: isCorner ? 'clamp(10px, 1.4vmin, 15px)' : 'clamp(20px, 3.8vmin, 42px)',
              height: isCorner ? 'clamp(10px, 1.4vmin, 15px)' : 'clamp(20px, 3.8vmin, 42px)',
            }}
            className="stroke-[2.75]"
          />
        );
      case 'draw2':
        return (
          <span
            style={isCorner ? cornerStyle : centerStyle}
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
              style={{ fontSize: 'clamp(15px, 2.8vmin, 28px)' }}
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
            {card.value}
          </span>
        );
    }
  };

  return (
    <motion.button
      type="button"
      aria-label={`${effectiveColor} ${card.value} card`}
      style={{ width: fluidWidth }}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
      animate={{
        opacity: disabled && !playable ? 0.62 : 1,
        scale: focused ? 1.06 : 1,
        y: playable ? '-0.7vh' : '0vh',
      }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      whileTap={!reduceMotion && !disabled ? { scale: 0.95 } : {}}
      onClick={handlePress}
      className={`uno-card-fluid relative select-none bg-white border-2 border-white rounded-[14%] p-[5%] shadow-lg flex items-center justify-center shrink-0 snap-center ${
        playable
          ? `ring-3 ring-yellow-300 shadow-xl ${palette.glow} cursor-pointer uno-card-hover-lift`
          : focused
          ? 'ring-3 ring-sky-400 cursor-pointer uno-card-hover-lift'
          : !disabled
          ? 'cursor-pointer uno-card-hover-lift'
          : 'cursor-not-allowed'
      } ${className}`}
    >
      <div
        className={`w-full h-full rounded-[11%] bg-gradient-to-br ${palette.bg} ${palette.border} border flex flex-col justify-between p-[8%] relative overflow-hidden`}
      >
        {isWildCard && (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.22)_0%,transparent_45%,rgba(255,255,255,0.12)_100%)] pointer-events-none" />
        )}

        <div className="self-start text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] leading-none z-10 flex items-center gap-0.5">
          {renderSymbol(true)}
          {colorBlindMode && (
            <span style={{ fontSize: 'clamp(7px, 0.9vmin, 10px)' }} className="opacity-90">
              {palette.symbol}
            </span>
          )}
        </div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[84%] h-[68%] bg-white/95 rounded-full -rotate-25 flex items-center justify-center shadow-inner border-2 border-white/60">
            <div
              className={`rotate-25 flex items-center justify-center w-full h-full ${
                isWildCard ? 'text-slate-900' : palette.text
              } drop-shadow-xs`}
            >
              {renderSymbol(false)}
            </div>
          </div>
        </div>

        <div className="self-end rotate-180 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] leading-none z-10 flex items-center gap-0.5">
          {renderSymbol(true)}
          {colorBlindMode && (
            <span style={{ fontSize: 'clamp(7px, 0.9vmin, 10px)' }} className="opacity-90">
              {palette.symbol}
            </span>
          )}
        </div>
      </div>

      {/* Static Playable Indicator Dot (no animate-ping wobble) */}
      {playable && (
        <span className="absolute -top-1 -right-1 w-[14%] aspect-square rounded-full bg-yellow-300 border-2 border-slate-950 shadow" />
      )}
    </motion.button>
  );
}

export default React.memo(
  UnoCardComponent,
  (prev, next) =>
    prev.card?.id === next.card?.id &&
    prev.card?.declaredColor === next.card?.declaredColor &&
    prev.faceDown === next.faceDown &&
    prev.playable === next.playable &&
    prev.focused === next.focused &&
    prev.disabled === next.disabled &&
    prev.size === next.size
);
