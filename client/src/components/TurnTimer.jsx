import React, { useEffect, useState, useRef } from 'react';
import { Clock } from 'lucide-react';
import { soundEngine } from '../utils/sound.js';

/**
 * Isolated TurnTimer Component (`<TurnTimer />`) — Part 4 & Part 7
 *
 * - Single authoritative source of truth (`endsAt` / `turnDeadline` from server).
 * - Uses monotonic `performance.now()` anchored to `serverNow` (falling back to `Date.now()`).
 * - Accepts both `isTurn` and `isActive` props so both avatar rings and the bottom bar tick reliably.
 * - Color transitions at >30s (Green), 10–30s (Yellow), and <=10s (Red + gentle ring pulse).
 * - Completely isolated state so cards never re-render or wobble.
 */
function TurnTimerComponent({
  endsAt,
  turnDeadline,
  serverNow,
  turnSequence,
  totalTurnSeconds = 60,
  isTurn = false,
  isActive = false,
  isMyTurn = false,
  playAudioWarning = false,
  playAudioTicks = false,
  variant = 'ring', // 'ring' (SVG ring around avatar) | 'bar' (bottom progress bar + digital clock)
  size = 68,
  strokeWidth = 4.5,
  children,
}) {
  const active = Boolean(isTurn || isActive);
  const targetEndsAt = endsAt || turnDeadline || null;
  const shouldPlayBeep = Boolean(playAudioWarning || playAudioTicks);

  const [remainingSeconds, setRemainingSeconds] = useState(totalTurnSeconds);
  const lastBeepSecondRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!active || !targetEndsAt) {
      setRemainingSeconds(totalTurnSeconds);
      lastBeepSecondRef.current = null;
      return;
    }

    // Anchor monotonic clock (performance.now()) to server clock if serverNow is provided
    const clientAnchorWallMs = Date.now();
    const serverAnchorMs =
      typeof serverNow === 'number' && serverNow > 0
        ? serverNow
        : clientAnchorWallMs;
    const clockSkewOffsetMs = serverAnchorMs - clientAnchorWallMs;
    const perfStart =
      typeof performance !== 'undefined' ? performance.now() : null;

    const getAuthoritativeNow = () => {
      if (perfStart !== null && typeof performance !== 'undefined') {
        const elapsed = performance.now() - perfStart;
        return clientAnchorWallMs + clockSkewOffsetMs + elapsed;
      }
      return Date.now() + clockSkewOffsetMs;
    };

    const updateTick = () => {
      const msLeft = Math.max(0, targetEndsAt - getAuthoritativeNow());
      const secs = Math.min(totalTurnSeconds, Math.ceil(msLeft / 1000));
      setRemainingSeconds((prev) => (prev !== secs ? secs : prev));

      if (
        shouldPlayBeep &&
        secs <= 10 &&
        secs > 0 &&
        lastBeepSecondRef.current !== secs
      ) {
        lastBeepSecondRef.current = secs;
        soundEngine.timerTick(secs <= 5);
      }
    };

    updateTick();
    intervalRef.current = setInterval(updateTick, 250);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [
    active,
    targetEndsAt,
    serverNow,
    turnSequence,
    totalTurnSeconds,
    shouldPlayBeep,
  ]);

  const progress = active
    ? Math.max(0, Math.min(1, remainingSeconds / totalTurnSeconds))
    : 0;

  // Part 7 C: Green (>30s), Yellow (10–30s), Red (<=10s)
  const isUrgent = active && remainingSeconds <= 10;
  const isWarning = active && remainingSeconds <= 30 && remainingSeconds > 10;

  const strokeColor = isUrgent
    ? '#ef4444' // Red (<10s)
    : isWarning
    ? '#facc15' // Yellow (10-30s)
    : '#10b981'; // Green (>30s)

  if (variant === 'bar') {
    const pct = Math.round(progress * 100);
    return (
      <div className="flex flex-col gap-1 w-full mb-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold">
            <Clock
              className={`w-3.5 h-3.5 transition-colors ${
                isUrgent
                  ? 'text-red-400 animate-pulse'
                  : isWarning
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            />
            <span
              className={`font-mono text-xs sm:text-sm tabular-nums transition-colors ${
                isUrgent
                  ? 'text-red-400 font-black'
                  : isWarning
                  ? 'text-amber-300 font-bold'
                  : 'text-emerald-300 font-bold'
              }`}
            >
              {active ? `${remainingSeconds}s / ${totalTurnSeconds}s` : `${totalTurnSeconds}s`}
            </span>

            {isMyTurn && active && (
              <span className="text-[10px] text-amber-300 font-extrabold uppercase tracking-wider ml-1">
                • Your Turn Timer
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isUrgent && (
              <span className="text-[11px] font-bold text-red-400 animate-pulse">
                ⏱️ Auto-play in {remainingSeconds}s!
              </span>
            )}
            {/* Part 7 Section E: Dev-only indicator showing raw seconds remaining & endsAt epoch */}
            {import.meta.env.DEV && targetEndsAt && (
              <span className="hidden md:inline-block font-mono text-[9px] text-slate-500 bg-slate-950/80 px-1.5 py-0.5 rounded border border-white/5">
                raw:{remainingSeconds}s | endsAt:{targetEndsAt}
              </span>
            )}
          </div>
        </div>

        <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden border border-white/10">
          <div
            style={{ width: `${active ? pct : 0}%` }}
            className={`h-full transition-all duration-300 ${
              isUrgent
                ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.85)] animate-pulse'
                : isWarning
                ? 'bg-amber-400'
                : 'bg-emerald-400'
            }`}
          />
        </div>
      </div>
    );
  }

  // Default: Circular SVG Countdown Ring around Avatar (`variant === 'ring'`)
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center rounded-full transition-shadow duration-300 ${
        isUrgent
          ? 'shadow-[0_0_24px_rgba(239,68,68,0.75)] animate-pulse'
          : active
          ? 'shadow-[0_0_18px_rgba(16,185,129,0.45)]'
          : ''
      }`}
    >
      {active && (
        <svg
          width={size}
          height={size}
          className="absolute inset-0 -rotate-90 pointer-events-none"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>
      )}

      {children}

      {active && (
        <span
          className={`absolute -bottom-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold tabular-nums tracking-tight shadow border border-slate-950 transition-colors ${
            isUrgent
              ? 'bg-red-600 text-white animate-pulse'
              : isWarning
              ? 'bg-amber-400 text-slate-950'
              : 'bg-emerald-400 text-slate-950'
          }`}
        >
          {remainingSeconds}s
        </span>
      )}
    </div>
  );
}

export default React.memo(TurnTimerComponent);
