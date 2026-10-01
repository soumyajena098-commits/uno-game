import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Play, Sparkles, Bot, LogOut, ShieldCheck } from 'lucide-react';
import { FullscreenButton } from '../context/FullscreenContext.jsx';
import CardCountPill from './CardCountPill.jsx';

/**
 * Animated number counter that counts smoothly from 0 to target score
 */
function AnimatedScore({ value = 0, duration = 1000 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    let frameId;
    const startVal = 0;
    const endVal = Number(value) || 0;

    if (endVal === 0) {
      setDisplayValue(0);
      return;
    }

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(Math.round(startVal + (endVal - startVal) * ease));
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [value, duration]);

  return <span>{displayValue}</span>;
}

/**
 * Dynamic Ephemeral Leaderboard Modal (`<LeaderboardModal />`) — Part 17
 *
 * - Celebratory 3-tier podium layout (🥇 center, 🥈 left, 🥉 right).
 * - Fullscreen exit toggle button rendered in top-right corner.
 * - Always visible card counts for all players (`🃏 N` or `✅ Finished`).
 * - Rising pedestals with spring entry animations & falling medals.
 * - Confetti bursts on mount.
 * - Animated score count-up (~1s).
 * - Highlighted row / badge for local player.
 * - Compact list below for 4th-6th places.
 * - Strictly ephemeral (zero storage, destroyed on exit / play again).
 */
export default function LeaderboardModal({
  roundSummary,
  isGameOver = false,
  isHost = false,
  localPlayerId,
  onNextRound,
  onPlayAgain,
  onLeave,
}) {
  useEffect(() => {
    if (roundSummary) {
      try {
        confetti({
          particleCount: isGameOver ? 140 : 80,
          spread: 90,
          origin: { y: 0.5 },
        });
      } catch {
        // Ignore canvas confetti errors
      }
    }
  }, [roundSummary, isGameOver]);

  if (!roundSummary) return null;

  const standings = roundSummary.standings || [];
  const totalPlayers = standings.length;

  // Podium slots: [2nd (left), 1st (center), 3rd (right)]
  const first = standings[0] || null;
  const second = standings[1] || null;
  const third = standings[2] || null;

  const podiumSlots = [
    {
      player: second,
      place: 2,
      medal: '🥈',
      label: '2nd Place',
      pedestalHeight: 'h-24 sm:h-28',
      bgGradient: 'from-slate-400/30 to-slate-700/40 border-slate-300/50 shadow-slate-500/20',
      textColor: 'text-slate-200',
      badgeBg: 'bg-slate-400/20 text-slate-200 border-slate-300/40',
      delay: 0.15,
    },
    {
      player: first,
      place: 1,
      medal: '🥇',
      label: 'Winner',
      pedestalHeight: 'h-32 sm:h-40',
      bgGradient: 'from-amber-400/40 via-yellow-500/30 to-amber-700/40 border-amber-300/80 shadow-[0_0_35px_rgba(251,191,36,0.35)]',
      textColor: 'text-amber-300',
      badgeBg: 'bg-amber-400/25 text-amber-300 border-amber-300/60',
      delay: 0,
    },
    {
      player: third,
      place: 3,
      medal: '🥉',
      label: '3rd Place',
      pedestalHeight: 'h-20 sm:h-24',
      bgGradient: 'from-amber-700/30 to-orange-950/40 border-orange-400/50 shadow-orange-500/20',
      textColor: 'text-orange-300',
      badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-400/40',
      delay: 0.25,
    },
  ];

  // Remaining players (4th place and below)
  const remainingPlayers = standings.slice(3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-3 sm:p-5 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="w-full max-w-2xl rounded-3xl bg-slate-900/95 border border-white/20 p-4 sm:p-7 shadow-2xl my-auto relative"
      >
        {/* Top Header Bar: Status Badge + Fullscreen Exit Toggle (Part 17) */}
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            {isGameOver ? (
              <>
                <Trophy className="w-4 h-4 text-amber-400" /> Final Match Standings
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-yellow-300" /> Elimination Round {roundSummary.roundNumber} Results
              </>
            )}
          </div>

          {/* Fullscreen Button allows exiting fullscreen from results screen */}
          <FullscreenButton />
        </div>

        {/* Modal Title */}
        <div className="text-center mb-5">
          <h2 className="font-display text-2xl sm:text-4xl font-black text-white drop-shadow">
            {isGameOver
              ? `🏆 ${standings[0]?.name} Wins the Match!`
              : `🥇 ${roundSummary.winnerName} Finished 1st!`}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            1st place earned <span className="text-emerald-400 font-bold">+{roundSummary.roundPointsEarned} pts</span> • Ranked bonuses awarded!
          </p>
        </div>

        {/* Celebratory 3-Tier Podium (🥈 2nd | 🥇 1st | 🥉 3rd) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-lg mx-auto mb-6 pt-2">
          {podiumSlots.map(({ player, place, medal, label, pedestalHeight, bgGradient, textColor, delay }) => {
            if (!player) {
              return <div key={`empty_podium_${place}`} className="h-16" />;
            }

            const isMe = localPlayerId && player.id === localPlayerId;
            const initial = (player.initial || player.name || 'P').trim().charAt(0).toUpperCase();

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay, type: 'spring', stiffness: 220, damping: 20 }}
                className="flex flex-col items-center min-w-0"
              >
                {/* Falling Medal Icon */}
                <motion.div
                  initial={{ y: -20, opacity: 0, scale: 0.5 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ delay: delay + 0.15, type: 'spring', stiffness: 300, damping: 15 }}
                  className="text-2xl sm:text-3xl mb-1 filter drop-shadow-md"
                >
                  {medal}
                </motion.div>

                {/* Player Avatar */}
                <div
                  style={{ backgroundColor: player.avatarColor || '#3b82f6' }}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-display font-black text-base sm:text-lg border-2 shadow-lg mb-1 relative ${
                    isMe
                      ? 'border-yellow-300 ring-4 ring-yellow-400/70 shadow-[0_0_20px_rgba(250,204,21,0.6)]'
                      : 'border-white/70'
                  }`}
                >
                  {player.isBot ? '🤖' : initial}
                  {isMe && (
                    <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] shadow">
                      YOU
                    </span>
                  )}
                </div>

                {/* Name */}
                <p className="font-extrabold text-xs sm:text-sm text-white truncate max-w-[95px] sm:max-w-[125px] text-center mb-0.5">
                  {player.name}
                </p>

                {/* Card Count on Podium (Part 20) */}
                <div className="mb-1.5 flex justify-center">
                  <CardCountPill
                    cardCount={player.cardsLeft}
                    finished={player.cardsLeft === 0}
                    finishRank={place}
                    playerColor={player.avatarColor || '#eab308'}
                  />
                </div>

                {/* Animated Score Display */}
                <div className={`text-xs sm:text-sm font-black ${textColor} mb-2 text-center`}>
                  <AnimatedScore value={player.totalScore} /> pts
                  {player.roundPointsEarned > 0 && (
                    <span className="text-[10px] text-emerald-400 ml-1">
                      (+{player.roundPointsEarned})
                    </span>
                  )}
                </div>

                {/* Rising Pedestal */}
                <motion.div
                  initial={{ scaleY: 0.2, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  transition={{ delay: delay + 0.1, duration: 0.4, ease: 'easeOut' }}
                  style={{ transformOrigin: 'bottom' }}
                  className={`w-full ${pedestalHeight} rounded-t-2xl bg-gradient-to-b ${bgGradient} border flex flex-col items-center justify-center p-2 shadow-inner`}
                >
                  <span className="font-display text-2xl sm:text-4xl font-black text-white/95 drop-shadow">
                    #{place}
                  </span>
                  <span className="text-[10px] sm:text-xs text-white/80 font-bold uppercase tracking-wider">
                    {label}
                  </span>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Standings Table for 4th–6th Places (Part 17: visible card counts) */}
        {standings.length > 3 && (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/70 mb-4">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-[11px] uppercase">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Player</th>
                  <th className="py-2.5 px-3 text-center">Round Bonus</th>
                  <th className="py-2.5 px-3 text-center">Cards / Status</th>
                  <th className="py-2.5 px-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {remainingPlayers.map((p) => {
                  const isMe = localPlayerId && p.id === localPlayerId;
                  const isLast = p.rank === totalPlayers && totalPlayers > 1;
                  const initial = (p.initial || p.name || 'P').trim().charAt(0).toUpperCase();

                  return (
                    <tr
                      key={p.id}
                      className={`transition ${
                        isMe
                          ? 'bg-amber-400/15 border-l-4 border-amber-400 font-bold'
                          : isLast
                          ? 'bg-rose-950/30'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-display font-bold">
                        {isLast ? (
                          <span className="text-rose-400">❌ Last (#{p.rank})</span>
                        ) : (
                          <span className="text-slate-300">#{p.rank}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <div
                            style={{ backgroundColor: p.avatarColor || '#3b82f6' }}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white font-display font-bold text-xs border border-white/40 shrink-0"
                          >
                            {p.isBot ? '🤖' : initial}
                          </div>
                          <span className="truncate max-w-[120px]">{p.name}</span>
                          {isMe && (
                            <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black">
                              YOU
                            </span>
                          )}
                          {p.isBot && (
                            <span className="px-1.5 py-0.2 text-[9px] rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 inline-flex items-center gap-0.5">
                              <Bot className="w-2.5 h-2.5" /> AI
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-400">
                        +{p.roundPointsEarned || 0} pts
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-300 text-xs">
                        <div className="flex justify-center">
                          <CardCountPill
                            cardCount={p.cardsLeft}
                            finished={p.cardsLeft === 0}
                            finishRank={p.rank}
                            playerColor={p.avatarColor || '#3b82f6'}
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-display font-black text-amber-300 text-sm sm:text-base">
                        <AnimatedScore value={p.totalScore} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Part 9 Ephemeral Notice */}
        <div className="mb-5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Scores are shown only for this game and are never stored.</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5">
          {!isGameOver && isHost && (
            <button
              type="button"
              onClick={onNextRound}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-display font-black text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition hover:scale-105"
            >
              <Play className="w-4 h-4 fill-slate-950" /> Next Round
            </button>
          )}

          {!isGameOver && !isHost && (
            <span className="text-xs text-slate-400 italic mr-auto">
              Waiting for host to start the next round...
            </span>
          )}

          <button
            type="button"
            onClick={onPlayAgain}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-display font-black text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition hover:scale-105"
          >
            <RotateCcw className="w-4 h-4" /> Play Again (Reset Scores)
          </button>

          {onLeave && (
            <button
              type="button"
              onClick={onLeave}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-300 font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition hover:scale-105"
            >
              <LogOut className="w-4 h-4" /> Leave
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
