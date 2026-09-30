import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Play, Sparkles, Bot, LogOut, ShieldCheck } from 'lucide-react';

export default function LeaderboardModal({
  roundSummary,
  isGameOver,
  isHost,
  onNextRound,
  onPlayAgain,
  onLeave,
}) {
  useEffect(() => {
    if (roundSummary) {
      try {
        confetti({
          particleCount: isGameOver ? 120 : 65,
          spread: 80,
          origin: { y: 0.55 },
        });
      } catch {
        // Ignore confetti errors
      }
    }
  }, [roundSummary, isGameOver]);

  if (!roundSummary) return null;

  const standings = roundSummary.standings || [];
  const totalPlayers = standings.length;
  const topThree = [
    standings[1] || null, // 2nd place
    standings[0] || null, // 1st place
    standings[2] || null, // 3rd place
  ];

  const podiumMeta = [
    {
      place: 2,
      medal: '🥈',
      height: 'h-24 sm:h-28',
      bg: 'from-slate-400/25 to-slate-600/25 border-slate-300/40',
      text: 'text-slate-200',
    },
    {
      place: 1,
      medal: '🥇',
      height: 'h-32 sm:h-36',
      bg: 'from-amber-400/30 to-yellow-600/30 border-amber-300/60 shadow-[0_0_30px_rgba(251,191,36,0.3)]',
      text: 'text-amber-300',
    },
    {
      place: 3,
      medal: '🥉',
      height: 'h-20 sm:h-24',
      bg: 'from-orange-500/25 to-amber-800/25 border-orange-400/40',
      text: 'text-orange-300',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-lg p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 25 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl rounded-3xl bg-slate-900/95 border border-white/15 p-5 sm:p-8 shadow-2xl my-auto"
      >
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
            {isGameOver ? (
              <>
                <Trophy className="w-4 h-4" /> Final Match Standings
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Elimination Round {roundSummary.roundNumber} Results
              </>
            )}
          </div>

          <h2 className="font-display text-2xl sm:text-4xl font-black text-white">
            {isGameOver
              ? `🏆 ${standings[0]?.name} Wins the Match!`
              : `🥇 ${roundSummary.winnerName} Finished 1st Place!`}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            1st place earned <span className="text-emerald-400 font-bold">+{roundSummary.roundPointsEarned} pts</span> • Ranked bonuses awarded to finishers!
          </p>
        </div>

        {/* Podium UI for Top 3 Players (🥇 🥈 🥉) with Avatars */}
        <div className="grid grid-cols-3 gap-3 items-end max-w-md mx-auto mb-6 pt-2">
          {topThree.map((player, idx) => {
            const meta = podiumMeta[idx];
            if (!player) {
              return <div key={`empty_${idx}`} className="h-16" />;
            }
            const initial = (player.initial || player.name || 'P').trim().charAt(0).toUpperCase();
            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex flex-col items-center"
              >
                <div className="text-xl sm:text-2xl mb-1">{meta.medal}</div>
                <div
                  style={{ backgroundColor: player.avatarColor || '#3b82f6' }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-display font-black text-sm border-2 border-white/60 shadow mb-1"
                >
                  {player.isBot ? '🤖' : initial}
                </div>
                <p className="font-bold text-xs sm:text-sm text-white truncate max-w-[110px] mb-0.5">
                  {player.name}
                </p>
                <p className={`text-xs font-extrabold ${meta.text} mb-2`}>
                  {player.totalScore} pts (+{player.roundPointsEarned || 0})
                </p>
                <div
                  className={`w-full ${meta.height} rounded-t-2xl bg-gradient-to-b ${meta.bg} border flex flex-col items-center justify-center p-2`}
                >
                  <span className="font-display text-2xl sm:text-3xl font-black text-white/90">
                    #{meta.place}
                  </span>
                  <span className="text-[11px] text-slate-300 font-medium">
                    {player.isLastPlace ? 'Last Place' : 'Finished'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Full Elimination Ranking Table with Player Avatars */}
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/60 mb-4">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 text-xs uppercase">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-4 text-center">Round Bonus</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Match Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {standings.map((p) => {
                const isLast = p.rank === totalPlayers && totalPlayers > 1;
                const initial = (p.initial || p.name || 'P').trim().charAt(0).toUpperCase();
                return (
                  <tr
                    key={p.id}
                    className={`${
                      p.rank === 1
                        ? 'bg-amber-500/10'
                        : isLast
                        ? 'bg-rose-950/30'
                        : 'hover:bg-white/5'
                    } transition`}
                  >
                    <td className="py-3 px-4 font-display font-bold">
                      {p.rank === 1 ? (
                        <span className="text-amber-400">🥇 1st</span>
                      ) : isLast ? (
                        <span className="text-rose-400">❌ Last (#{p.rank})</span>
                      ) : p.rank === 2 ? (
                        <span className="text-slate-200">🥈 2nd</span>
                      ) : p.rank === 3 ? (
                        <span className="text-orange-300">🥉 3rd</span>
                      ) : (
                        <span className="text-emerald-300">✅ #{p.rank}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2.5">
                        <div
                          style={{ backgroundColor: p.avatarColor || '#3b82f6' }}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white font-display font-bold text-xs border border-white/40 shrink-0"
                        >
                          {p.isBot ? '🤖' : initial}
                        </div>
                        <span>{p.name}</span>
                        {p.isBot && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 inline-flex items-center gap-1">
                            <Bot className="w-3 h-3" /> AI
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-400">
                      +{p.roundPointsEarned || 0} pts
                    </td>
                    <td className="py-3 px-4 text-center text-slate-300 text-xs">
                      {p.cardsLeft === 0 ? (
                        <span className="text-emerald-400 font-bold">Finished ✅</span>
                      ) : (
                        <span className="text-rose-300">
                          Last Place ({p.handPointsRemaining} pts in hand)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-display font-extrabold text-amber-300 text-base">
                      {p.totalScore}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Part 9 Privacy Notice: Reassures players that scores are ephemeral and never saved */}
        <div className="mb-5 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Scores are shown only for this game and are not saved.</span>
        </div>

        {/* Footer Action Buttons: Next Round | Play Again (Reset Scores to 0) | Leave (Destroy & Exit) */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
          {!isGameOver && isHost && (
            <button
              type="button"
              onClick={onNextRound}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-display font-bold text-sm sm:text-base shadow-lg flex items-center justify-center gap-2 cursor-pointer transition"
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
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-display font-bold text-sm sm:text-base shadow-lg flex items-center justify-center gap-2 cursor-pointer transition"
          >
            <RotateCcw className="w-4 h-4" /> Play Again (Reset Scores)
          </button>

          {onLeave && (
            <button
              type="button"
              onClick={onLeave}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-300 font-display font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <LogOut className="w-4 h-4" /> Leave
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
