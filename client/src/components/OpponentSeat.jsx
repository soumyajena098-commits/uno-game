import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Crown } from 'lucide-react';
import { useGameStore } from '../store/useGameStore.js';
import TurnTimer from './TurnTimer.jsx';

/**
 * Memoized Fluid Face-Down Opponent Card Fan (`<OpponentCardFan />`) — Part 7 & Part 8
 *
 * - Uses Flexbox with fluid viewport-relative overlap (`clamp()` negative margins) and `aspect-ratio: 2 / 3`.
 * - Zero hardcoded pixel coordinates — scales automatically with `vmin`/`vw`/`vh`.
 * - Constant rotation angles per card (`(i - mid) * 5deg`).
 */
const OpponentCardFan = React.memo(function OpponentCardFan({
  cardCount = 7,
  orientation = 'horizontal', // 'horizontal' | 'vertical-left' | 'vertical-right'
  compact = false,
  finished = false,
}) {
  if (finished || cardCount <= 0) {
    return null;
  }

  const visibleCount = compact
    ? Math.min(Math.max(cardCount, 1), 4)
    : Math.min(Math.max(cardCount, 1), 9);
  const mid = (visibleCount - 1) / 2;
  const cardWidthToken = compact
    ? 'clamp(18px, 3.2vw, 24px)'
    : 'var(--opp-card-width)';

  if (orientation === 'horizontal') {
    return (
      <div className="flex flex-row items-center justify-center select-none pointer-events-none py-[0.2vh] px-[0.2vw]">
        {Array.from({ length: visibleCount }).map((_, i) => {
          const offset = i - mid;
          const rotateDeg = offset * (compact ? 3 : 5);
          const archY = Math.abs(offset) * (compact ? 0.15 : 0.25);

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.035, duration: 0.2 }}
              style={{
                width: cardWidthToken,
                marginLeft: i === 0 ? '0' : compact ? 'clamp(-13px, -2vw, -8px)' : 'clamp(-20px, -1.7vmin, -10px)',
                transform: `translateY(${archY}vh) rotate(${rotateDeg}deg)`,
                zIndex: i + 1,
              }}
              className="uno-card-fluid rounded-[14%] bg-gradient-to-br from-slate-900 via-slate-950 to-black border-2 border-white/85 shadow-md flex items-center justify-center overflow-hidden shrink-0"
            >
              <div className="w-[82%] h-[76%] rounded-full bg-gradient-to-br from-red-600 to-rose-700 -rotate-24 border border-amber-300/70 flex items-center justify-center">
                <span
                  style={{ fontSize: 'clamp(6px, 0.75vmin, 9px)' }}
                  className="font-display font-black text-yellow-300 tracking-tighter"
                >
                  UNO
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  }

  // Vertical Stack for Left-Edge or Right-Edge Opponents
  const isLeft = orientation === 'vertical-left';

  return (
    <div className="flex flex-col items-center justify-center select-none pointer-events-none px-[0.5vw] py-[0.5vh]">
      {Array.from({ length: visibleCount }).map((_, i) => {
        const offset = i - mid;
        const rotateDeg = (isLeft ? 90 : -90) + offset * 3.5;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.035, duration: 0.2 }}
            style={{
              width: cardWidthToken,
              marginTop: i === 0 ? '0' : 'clamp(-34px, -3.6vmin, -18px)',
              transform: `rotate(${rotateDeg}deg)`,
              zIndex: i + 1,
            }}
            className="uno-card-fluid rounded-[14%] bg-gradient-to-br from-slate-900 via-slate-950 to-black border-2 border-white/85 shadow-md flex items-center justify-center overflow-hidden shrink-0"
          >
            <div className="w-[82%] h-[76%] rounded-full bg-gradient-to-br from-red-600 to-rose-700 -rotate-24 border border-amber-300/70 flex items-center justify-center">
              <span
                style={{ fontSize: 'clamp(6px, 0.75vmin, 9px)' }}
                className="font-display font-black text-yellow-300 tracking-tighter"
              >
                UNO
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
});

/**
 * OpponentSeat (`<OpponentSeat />`) — Part 7 & Part 8 Relative Fluid Design
 */
function OpponentSeatComponent({
  player,
  variant = 'seat', // 'seat' | 'chip'
  seatPosition = 'top-center', // 'top-center' | 'top-left' | 'top-right' | 'left-edge' | 'right-edge'
  opponentCount = 3,
  isPortraitMobile = false,
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
  const compact = opponentCount >= 4 || isPortraitMobile;

  // Fluid timer ring size scaled with viewport
  const timerRingPx = compact ? 54 : 64;

  const renderAvatarBadgeBlock = () => (
    <div
      onMouseEnter={() => {
        if (window.matchMedia?.('(hover: hover)').matches) setShowTooltip(true);
      }}
      onMouseLeave={() => {
        if (window.matchMedia?.('(hover: hover)').matches) setShowTooltip(false);
      }}
      className="relative flex flex-col items-center shrink-0"
    >
      {/* Floating Emoji Reactions */}
      <div className="absolute -top-[4vh] inset-x-0 flex justify-center pointer-events-none z-30">
        <AnimatePresence>
          {myReactions.map((r) => (
            <motion.span
              key={r.id}
              initial={{ opacity: 0, y: 10, scale: 0.6 }}
              animate={{ opacity: 1, y: -22, scale: 1.3 }}
              exit={{ opacity: 0, y: -38, scale: 0.8 }}
              transition={{ duration: 1.4 }}
              style={{ fontSize: 'clamp(18px, 2.5vmin, 26px)' }}
              className="drop-shadow-lg"
            >
              {r.emoji}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* Active or Next Turn Pill */}
      {!player.finished && isTurn && (
        <span
          style={{ fontSize: 'var(--font-xs)' }}
          className="mb-[0.3vh] px-[0.6em] py-[0.1em] rounded-full bg-amber-400 text-slate-950 font-display font-black uppercase tracking-wider shadow"
        >
          Turn
        </span>
      )}
      {!player.finished && !isTurn && isNext && (
        <span
          style={{ fontSize: 'var(--font-xs)' }}
          className="mb-[0.3vh] px-[0.6em] py-[0.1em] rounded-full bg-sky-400/25 border border-sky-300/60 text-sky-200 font-display font-bold uppercase tracking-wider"
        >
          Next
        </span>
      )}

      {/* Tappable Avatar (Guaranteed >= 44x44px tap target) */}
      <button
        type="button"
        onClick={() => setShowTooltip((v) => !v)}
        className="uno-tap-target relative flex items-center justify-center cursor-pointer focus:outline-none"
        title={player.name}
      >
        <TurnTimer
          variant="ring"
          size={timerRingPx}
          strokeWidth={4}
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
              backgroundColor: player.avatarColor || '#3b82f6',
              width: compact
                ? 'clamp(38px, 5.6vmin, 56px)'
                : 'var(--avatar-size)',
              height: compact
                ? 'clamp(38px, 5.6vmin, 56px)'
                : 'var(--avatar-size)',
              fontSize: 'var(--font-md)',
            }}
            className={`aspect-square rounded-full flex items-center justify-center text-white font-display font-black shadow-inner relative transition-all ${
              isTurn
                ? 'border-2 border-yellow-200 shadow-[0_0_20px_rgba(250,204,21,0.7)]'
                : isNext
                ? 'border-2 border-sky-300/80 shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                : 'border-2 border-white/50'
            }`}
          >
            {player.finished ? '🏆' : player.isBot ? '🤖' : initial}

            {/* Host Crown */}
            {player.isHost && (
              <span
                className="absolute -top-1 -left-1 bg-amber-400 text-slate-950 p-0.5 rounded-full shadow"
                title="Room Host"
              >
                <Crown className="w-2.5 h-2.5" />
              </span>
            )}

            {/* UNO Badge (🔴) ONLY when player has 1 card (icon only) */}
            {!player.finished && player.cardCount === 1 && (
              <span
                className="absolute -top-1 -right-1 w-[38%] aspect-square rounded-full bg-red-600 text-white border border-white shadow-lg flex items-center justify-center text-[9px]"
                title="UNO!"
              >
                🔴
              </span>
            )}

            {/* Disconnected Indicator */}
            {!player.connected && !player.isBot && (
              <span
                className="absolute -bottom-1 -right-1 bg-rose-600 text-white p-0.5 rounded-full shadow"
                title="Disconnected"
              >
                <WifiOff className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
        </TurnTimer>
      </button>

      {/* Fluid Player Name & Finished Badge */}
      <div className="mt-[0.2vh] text-center max-w-[14vw] sm:max-w-[9vw]">
        <p
          style={{ fontSize: 'var(--font-sm)' }}
          className="font-extrabold text-white drop-shadow truncate"
        >
          {player.name}
        </p>
        {player.finished && (
          <span
            style={{ fontSize: 'var(--font-xs)' }}
            className="inline-block px-[0.5em] py-[0.1em] rounded-full bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 font-display font-bold"
          >
            🏆 #{player.finishRank}
          </span>
        )}
      </div>

      {/* Catch UNO Penalty Button */}
      {!player.finished && player.unoVulnerable && player.cardCount === 1 && (
        <button
          type="button"
          onClick={() => onCatchUno(player.id)}
          style={{ fontSize: 'var(--font-xs)' }}
          className="mt-[0.3vh] px-[0.7em] py-[0.25em] rounded-full bg-rose-600 hover:bg-rose-500 text-white font-display font-bold shadow border border-white/40 cursor-pointer"
        >
          ⚡ Catch
        </button>
      )}

      {/* Tooltip Popover */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.92 }}
            style={{ width: 'clamp(120px, 16vw, 160px)', fontSize: 'var(--font-xs)' }}
            className="absolute top-full mt-1 z-40 rounded-2xl bg-slate-950/95 border border-white/20 p-2 shadow-2xl text-center"
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
                : 'In Rotation'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const containerRingStyle = isTurn
    ? 'bg-slate-900/90 border-yellow-400/80 ring-2 ring-yellow-400/50 shadow-[0_0_24px_rgba(250,204,21,0.4)]'
    : isNext
    ? 'bg-slate-900/75 border-sky-300/60 ring-1 ring-sky-300/40'
    : 'bg-slate-900/55 border-white/10';

  // On portrait mobile (or variant="chip"): render compact horizontal opponent chip
  if (isPortraitMobile || variant === 'chip') {
    return (
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-2xl backdrop-blur-md border transition-all duration-300 shrink-0 ${containerRingStyle}`}
      >
        {/* Avatar with Turn Ring */}
        <div className="relative flex items-center justify-center shrink-0">
          <TurnTimer
            variant="ring"
            size={38}
            strokeWidth={3}
            isTurn={isTurn}
            isActive={isTurn}
            endsAt={endsAt || turnDeadline}
            turnDeadline={turnDeadline}
            serverNow={serverNow}
            turnSequence={turnSequence}
            totalTurnSeconds={totalTurnSeconds}
          >
            <div
              style={{ backgroundColor: player.avatarColor || '#3b82f6' }}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-display font-black text-xs relative shadow ${
                isTurn
                  ? 'border-2 border-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.7)]'
                  : isNext
                  ? 'border border-sky-300/80 shadow-[0_0_8px_rgba(56,189,248,0.35)]'
                  : 'border border-white/50'
              }`}
            >
              {player.finished ? '🏆' : player.isBot ? '🤖' : initial}
              {player.isHost && (
                <span
                  className="absolute -top-1 -left-1 bg-amber-400 text-slate-950 p-0.5 rounded-full shadow"
                  title="Host"
                >
                  <Crown className="w-2 h-2" />
                </span>
              )}
              {!player.finished && player.cardCount === 1 && (
                <span
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 text-white border border-white flex items-center justify-center text-[7px]"
                  title="UNO!"
                >
                  🔴
                </span>
              )}
              {!player.connected && !player.isBot && (
                <span
                  className="absolute -bottom-1 -right-1 bg-rose-600 text-white p-0.5 rounded-full shadow"
                  title="Disconnected"
                >
                  <WifiOff className="w-2 h-2" />
                </span>
              )}
            </div>
          </TurnTimer>
        </div>

        {/* Player Name & Status */}
        <div className="flex flex-col min-w-0">
          <span className="font-display font-bold text-xs text-white truncate max-w-[65px] sm:max-w-[85px]">
            {player.name}
          </span>
          {player.finished ? (
            <span className="text-[10px] font-bold text-emerald-400">
              🏆 #{player.finishRank}
            </span>
          ) : isTurn ? (
            <span className="text-[10px] font-black text-amber-300 uppercase tracking-tight">
              Turn
            </span>
          ) : isNext ? (
            <span className="text-[10px] font-bold text-sky-300 uppercase tracking-tight">
              Next
            </span>
          ) : null}
        </div>

        {/* Mini Face-Down Card Fan */}
        <OpponentCardFan
          cardCount={player.cardCount}
          orientation="horizontal"
          compact={true}
          finished={player.finished}
        />

        {/* Catch UNO button */}
        {!player.finished && player.unoVulnerable && player.cardCount === 1 && (
          <button
            type="button"
            onClick={() => onCatchUno(player.id)}
            className="px-1.5 py-0.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-display font-bold text-[10px] shadow border border-white/30 cursor-pointer shrink-0"
          >
            ⚡ Catch
          </button>
        )}
      </div>
    );
  }

  // On desktop / landscape:
  if (seatPosition === 'left-edge' && !isPortraitMobile) {
    return (
      <div
        style={{ padding: 'clamp(4px, 0.8vmin, 10px)', gap: 'clamp(4px, 0.9vmin, 10px)' }}
        className={`flex flex-col items-center rounded-2xl backdrop-blur-md border transition-all duration-300 ${containerRingStyle}`}
      >
        <OpponentCardFan
          cardCount={player.cardCount}
          orientation="vertical-left"
          compact={compact}
          finished={player.finished}
        />
        {renderAvatarBadgeBlock()}
      </div>
    );
  }

  if (seatPosition === 'right-edge' && !isPortraitMobile) {
    return (
      <div
        style={{ padding: 'clamp(4px, 0.8vmin, 10px)', gap: 'clamp(4px, 0.9vmin, 10px)' }}
        className={`flex flex-col items-center rounded-2xl backdrop-blur-md border transition-all duration-300 ${containerRingStyle}`}
      >
        {renderAvatarBadgeBlock()}
        <OpponentCardFan
          cardCount={player.cardCount}
          orientation="vertical-right"
          compact={compact}
          finished={player.finished}
        />
      </div>
    );
  }

  // Top seats (or portrait mobile compressed seats): Avatar to the left of horizontal fan
  return (
    <div
      style={{ padding: 'clamp(4px, 0.8vmin, 10px)', gap: 'clamp(6px, 1vmin, 12px)' }}
      className={`flex flex-row items-center rounded-2xl backdrop-blur-md border transition-all duration-300 ${containerRingStyle}`}
    >
      {renderAvatarBadgeBlock()}
      <OpponentCardFan
        cardCount={player.cardCount}
        orientation="horizontal"
        compact={compact}
        finished={player.finished}
      />
    </div>
  );
}

export default React.memo(OpponentSeatComponent);
