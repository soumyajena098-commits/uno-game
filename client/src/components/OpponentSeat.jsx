import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Crown } from 'lucide-react';
import { useGameStore } from '../store/useGameStore.js';
import TurnTimer from './TurnTimer.jsx';
import CardCountPill from './CardCountPill.jsx';

/**
 * Clean Horizontal Opponent Seat (`<OpponentSeat />`) — Part 18
 *
 * - Horizontal chip layout:
 *   [Circle Avatar]  [Name]
 *                    [🃏 N]
 * - Circle stays on the left; name + card count stack vertically to the right.
 * - Bold white name (`clamp(13px, 1.9vmin, 18px)`) with drop shadow & max-width 140px.
 * - Always visible card count pill (`🃏 N`, `clamp(11px, 1.6vmin, 15px)`).
 * - Stronger active player glow: bright pulsing ring in player color, soft outer glow,
 *   timer progress ring, and 1.05x scale-up.
 * - Non-active players dimmed (opacity 0.75).
 * - Next player has softer, thinner ring in their color.
 * - Red UNO badge with bold "UNO" text when holding exactly 1 card.
 */
function OpponentSeatComponent({
  player,
  isNext = false,
  endsAt,
  turnDeadline,
  serverNow,
  turnSequence,
  totalTurnSeconds = 60,
  onCatchUno,
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const floatingReactions = useGameStore((s) => s.floatingReactions);

  const myReactions = floatingReactions.filter((r) => r.playerId === player.id);
  const isTurn = Boolean(player.isTurn && !player.finished);
  const initial = (player.name || 'P').trim().charAt(0).toUpperCase();
  const playerColor = player.avatarColor || '#3b82f6';

  return (
    <div
      className={`relative flex items-center gap-2 select-none pointer-events-auto transition-all duration-300 ${
        isTurn
          ? 'z-30 opacity-100'
          : isNext
          ? 'z-20 opacity-95'
          : 'z-10 opacity-75 hover:opacity-100'
      }`}
    >
      {/* Floating Emoji Reactions */}
      <div className="absolute -top-7 inset-x-0 flex justify-center pointer-events-none z-40">
        <AnimatePresence>
          {myReactions.map((r) => (
            <motion.span
              key={r.id}
              initial={{ opacity: 0, y: 10, scale: 0.6 }}
              animate={{ opacity: 1, y: -26, scale: 1.4 }}
              exit={{ opacity: 0, y: -42, scale: 0.8 }}
              transition={{ duration: 1.4 }}
              style={{ fontSize: 'clamp(20px, 3vmin, 30px)' }}
              className="drop-shadow-lg"
            >
              {r.emoji}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* Left: Circular Avatar + Turn Timer Ring + Strong Glow */}
      <div
        onMouseEnter={() => {
          if (window.matchMedia?.('(hover: hover)').matches) setShowTooltip(true);
        }}
        onMouseLeave={() => {
          if (window.matchMedia?.('(hover: hover)').matches) setShowTooltip(false);
        }}
        className="relative flex items-center justify-center shrink-0"
      >
        <button
          type="button"
          onClick={() => setShowTooltip((v) => !v)}
          className="uno-tap-target relative flex items-center justify-center cursor-pointer focus:outline-none bg-transparent border-0 p-0"
          title={player.name}
          aria-label={player.name}
        >
          <TurnTimer
            variant="ring"
            isTurn={isTurn}
            isActive={isTurn}
            endsAt={endsAt || turnDeadline}
            turnDeadline={turnDeadline}
            serverNow={serverNow}
            turnSequence={turnSequence}
            totalTurnSeconds={totalTurnSeconds}
          >
            <div
              style={{
                backgroundColor: playerColor,
                width: 'var(--avatar-size)',
                height: 'var(--avatar-size)',
                fontSize: 'clamp(18px, 2.8vmin, 26px)',
                '--glow-color': playerColor,
                ...(isTurn
                  ? {
                      boxShadow: `0 0 28px ${playerColor}, 0 0 14px ${playerColor}cc, inset 0 0 8px rgba(255,255,255,0.4)`,
                      borderColor: '#fef08a',
                    }
                  : isNext
                  ? {
                      boxShadow: `0 0 14px ${playerColor}80`,
                      borderColor: playerColor,
                    }
                  : {
                      borderColor: 'rgba(255,255,255,0.8)',
                    }),
              }}
              className={`rounded-full flex items-center justify-center text-white font-display font-black relative transition-all duration-300 ${
                isTurn
                  ? 'border-2 ring-4 ring-yellow-400/80 active-player-pulse'
                  : isNext
                  ? 'border-2 ring-2 ring-sky-300/70'
                  : 'border-2 shadow-md hover:border-white'
              }`}
            >
              {player.finished ? '🏆' : player.isBot ? '🤖' : initial}

              {/* Host Crown */}
              {player.isHost && (
                <span
                  className="absolute -top-1 -left-1 bg-amber-400 text-slate-950 p-1 rounded-full shadow-md"
                  title="Room Host"
                >
                  <Crown className="w-3 h-3" />
                </span>
              )}

              {/* UNO Badge with bold "UNO" text ONLY when player has exactly 1 card */}
              {!player.finished && player.cardCount === 1 && (
                <span
                  className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-red-600 text-white font-display font-black text-[10px] tracking-wider border-2 border-white shadow-lg flex items-center justify-center animate-bounce z-20"
                  title="UNO!"
                >
                  UNO
                </span>
              )}

              {/* Disconnected Indicator */}
              {!player.connected && !player.isBot && (
                <span
                  className="absolute -bottom-1 -right-1 bg-rose-600 text-white p-1 rounded-full shadow-md"
                  title="Disconnected"
                >
                  <WifiOff className="w-3 h-3" />
                </span>
              )}
            </div>
          </TurnTimer>
        </button>

        {/* Hover/Tap Tooltip Popover (Extra Details Only) */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.92 }}
              style={{ width: 'clamp(120px, 16vw, 170px)', fontSize: 'var(--font-xs)' }}
              className="absolute top-full mt-2 z-40 rounded-xl bg-slate-950/95 border border-white/20 p-2 shadow-2xl text-center pointer-events-none"
            >
              <p className="font-display font-bold text-white truncate">
                {player.name}
              </p>
              <p className="font-semibold text-amber-300 mt-0.5">
                {player.finished
                  ? `Finished 🏆 #${player.finishRank}`
                  : isTurn
                  ? '🔥 Playing Now'
                  : isNext
                  ? '⏭️ Up Next'
                  : `${player.cardCount} cards in hand`}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: Name and Card Count Pill (Horizontally aligned, vertically centered - Part 20) */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <div className="flex flex-col items-start min-w-0">
          <p
            style={{
              fontSize: 'clamp(13px, 1.9vmin, 18px)',
              maxWidth: 'clamp(80px, 12vw, 130px)',
              textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.7)',
            }}
            className={`font-extrabold text-white truncate leading-tight transition-colors ${
              isTurn ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' : ''
            }`}
            title={player.name}
          >
            {player.name}
          </p>

          {/* Mini Face-Down Cards Fan (Max 4 mini cards overlapping) */}
          {!player.finished && player.cardCount > 0 && (
            <div className="flex items-center mt-0.5 select-none pointer-events-none" aria-hidden="true">
              {Array.from({ length: Math.min(player.cardCount, 4) }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 'clamp(12px, 1.8vmin, 18px)',
                    height: 'clamp(16px, 2.5vmin, 24px)',
                    marginLeft: i === 0 ? 0 : 'clamp(-8px, -1.2vmin, -12px)',
                    borderRadius: '3px',
                    borderColor: 'var(--card-back-border, #d4af37)',
                    background: 'var(--card-back-bg, #8b1a1a)',
                    transform: `rotate(${(i - 1.5) * 6}deg)`,
                    zIndex: i,
                  }}
                  className="border shadow-xs flex items-center justify-center shrink-0"
                >
                  <span className="text-[6px] font-black text-amber-200 opacity-80 leading-none">U</span>
                </div>
              ))}
              {player.cardCount > 4 && (
                <span className="text-[9px] font-black text-amber-300/80 ml-1 leading-none">
                  +{player.cardCount - 4}
                </span>
              )}
            </div>
          )}

          {/* Disconnected / AFK: small label below name (does not replace the pill) */}
          {!player.connected && !player.isBot && (
            <span className="text-[10px] text-rose-300 font-semibold tracking-wide">
              Disconnected
            </span>
          )}

          {/* Catch UNO Penalty Button */}
          {!player.finished && player.unoVulnerable && player.cardCount === 1 && onCatchUno && (
            <button
              type="button"
              onClick={() => onCatchUno(player.id)}
              style={{ fontSize: 'clamp(10px, 1.4vmin, 13px)' }}
              className="mt-0.5 px-2 py-0.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-display font-black shadow-lg border border-white/50 cursor-pointer transition hover:scale-105 shrink-0"
            >
              ⚡ Catch
            </button>
          )}
        </div>

        {/* Bigger Card Count Pill (Part 20) */}
        <CardCountPill
          cardCount={player.cardCount}
          finished={player.finished}
          finishRank={player.finishRank}
          playerColor={playerColor}
        />
      </div>
    </div>
  );
}

export default React.memo(OpponentSeatComponent);
