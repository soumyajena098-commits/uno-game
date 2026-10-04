import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Copy,
  Check,
  Bot,
  UserMinus,
  Play,
  LogOut,
  Crown,
  Users,
  CheckCircle2,
  Gamepad2,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore.js';
import { FullscreenButton } from '../context/FullscreenContext.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';

const GAME_MODES = [
  { id: '1vBot', label: '1 vs Bot', required: 2 },
  { id: '2P', label: '2P', required: 2 },
  { id: '3P', label: '3P', required: 3 },
  { id: '4P', label: '4P', required: 4 },
  { id: '5P', label: '5P', required: 5 },
  { id: '6P', label: '6P', required: 6 },
];

export default function LobbyPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const {
    playerId,
    playerName,
    gameState,
    joinRoom,
    leaveRoom,
    selectGameMode,
    toggleReady,
    addBot,
    removeBot,
    kickPlayer,
    updateSettings,
    startGame,
    addToast,
  } = useGameStore();

  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!gameState || gameState.roomId !== roomId) {
      const fallbackName =
        playerName || `Player_${Math.floor(100 + Math.random() * 899)}`;
      joinRoom(roomId, fallbackName).then((res) => {
        if (res?.error) {
          navigate('/');
        }
      });
    }
  }, [roomId, gameState, playerName, joinRoom, navigate]);

  useEffect(() => {
    if (
      gameState?.status === 'playing' ||
      gameState?.status === 'round_over' ||
      gameState?.status === 'game_over'
    ) {
      navigate(`/game/${roomId}`);
    }
  }, [gameState?.status, roomId, navigate]);

  if (!gameState) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-slate-300 font-display text-xl">
        Joining Room {roomId}...
      </div>
    );
  }

  const isHost = gameState.hostId === playerId;
  const players = gameState.players || [];
  const me = players.find((p) => p.id === playerId);
  const botCount = players.filter((p) => p.isBot).length;
  const playerMode = gameState.settings?.playerMode || '2P';
  const requiredPlayers = gameState.settings?.requiredPlayers || 2;
  const botDifficulty = gameState.settings?.botDifficulty || 'hard';
  const allHumansReady = players.every((p) => p.isBot || p.ready);
  const hasExactPlayerCount = players.length === requiredPlayers;
  const canStartGame = isHost && hasExactPlayerCount && allHumansReady;

  /**
   * Part 3 Requirement:
   * Copy ONLY the 6-digit room code to the clipboard (never generate http://localhost URLs).
   */
  const handleCopyCode = () => {
    navigator.clipboard.writeText(gameState.roomId);
    setCopiedCode(true);
    addToast(`Room code ${gameState.roomId} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleLeave = () => {
    leaveRoom();
    navigate('/');
  };

  const emptySlotsCount = Math.max(0, requiredPlayers - players.length);

  return (
    <div className="lobby-screen">
      {/* Clean Sticky Header */}
      <header className="lobby-header">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center font-display font-black text-yellow-200 shadow-lg shrink-0">
              UNO
            </div>
            <div>
              <h1 className="font-display text-base sm:text-xl font-bold text-white leading-tight">
                UNO Multiplayer Lobby
              </h1>
              <p className="text-xs text-slate-400">
                Elimination Mode • Players: {players.length} / {requiredPlayers}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <FullscreenButton />
            <ThemeToggle />

            {me && (
              <button
                type="button"
                onClick={toggleReady}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-extrabold border flex items-center gap-1.5 cursor-pointer transition ${
                  me.ready
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-amber-500/20 border-amber-400 text-amber-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {me.ready ? 'Ready ✅' : 'Click to Ready'}
              </button>
            )}

            <button
              type="button"
              onClick={handleLeave}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              <LogOut className="w-4 h-4" /> Leave
            </button>
          </div>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="lobby-scroll">
        <div className="max-w-5xl mx-auto space-y-4 pb-2">
          {/* Room Code Banner (Code Only — No Localhost URL) */}
          <div className="rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-white/15 p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Invite Friends with Room Code
              </span>
              <p className="text-sm text-slate-300 mt-1">
                Share this code with friends:{' '}
                <strong className="font-mono text-2xl sm:text-3xl font-black text-white tracking-widest ml-1">
                  {gameState.roomId}
                </strong>
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-display font-black text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition shrink-0 uno-tap-target"
            >
              {copiedCode ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" /> Code Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 stroke-[2.5]" /> Copy Code ({gameState.roomId})
                </>
              )}
            </button>
          </div>

          {/* Mode Selector Pill Buttons (1vBot, 2P, 3P, 4P, 5P, 6P) */}
          <div className="rounded-3xl bg-slate-900/90 border border-white/15 p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-amber-400" />
                <h2 className="font-display text-base font-bold text-white">
                  Game Mode
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {['easy', 'medium', 'hard'].map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    disabled={!isHost}
                    onClick={() => selectGameMode(playerMode, diff)}
                    className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition cursor-pointer ${
                      botDifficulty === diff
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Bot: {diff}
                  </button>
                ))}
              </div>
            </div>

            <div className="lobby-mode-grid">
              {GAME_MODES.map((m) => {
                const active = playerMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={!isHost}
                    onClick={() => selectGameMode(m.id, botDifficulty)}
                    className={`min-h-[46px] py-2.5 px-3 rounded-2xl font-display font-bold text-sm border transition cursor-pointer flex items-center justify-center uno-tap-target ${
                      active
                        ? 'bg-gradient-to-b from-amber-400 to-yellow-500 text-slate-950 border-white shadow-lg'
                        : 'bg-slate-950/70 text-slate-300 border-white/10 hover:border-white/25 disabled:opacity-60'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Players Grid */}
          <div className="rounded-3xl bg-slate-900/90 border border-white/15 p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" /> Players ({players.length} / {requiredPlayers})
              </h2>

              {isHost && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={players.length >= 6}
                    onClick={addBot}
                    className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition disabled:opacity-40 uno-tap-target"
                  >
                    <Bot className="w-4 h-4" /> + Add Bot
                  </button>
                  {botCount > 0 && (
                    <button
                      type="button"
                      onClick={() => removeBot()}
                      className="min-h-[44px] px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition uno-tap-target"
                    >
                      <UserMinus className="w-3.5 h-3.5" /> Remove Bot
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="lobby-players-grid">
              {players.map((p) => {
                const initial = (p.name || 'P').trim().charAt(0).toUpperCase();
                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative rounded-2xl bg-slate-950/80 border border-white/15 p-3 flex flex-col items-center text-center shadow min-h-[120px] justify-center"
                  >
                    <div
                      style={{ backgroundColor: p.avatarColor || '#3b82f6' }}
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-display font-black text-xl shadow-inner border-2 border-white/50 relative"
                    >
                      {p.isBot ? '🤖' : initial}
                      {p.isHost && (
                        <span
                          className="absolute -top-1 -left-1 bg-amber-400 text-slate-950 p-0.5 rounded-full shadow"
                          title="Host"
                        >
                          <Crown className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    <p className="mt-2 font-bold text-xs text-white truncate max-w-full">
                      {p.name}
                    </p>
                    <span
                      className={`text-[10px] font-bold mt-0.5 ${
                        p.ready ? 'text-emerald-400' : 'text-amber-300'
                      }`}
                    >
                      {p.ready ? 'Ready ✅' : 'Waiting'}
                    </span>

                    {isHost && p.id !== playerId && (
                      <button
                        type="button"
                        onClick={() => (p.isBot ? removeBot(p.id) : kickPlayer(p.id))}
                        className="absolute top-1.5 right-1.5 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                        title="Remove"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </motion.div>
                );
              })}

              {Array.from({ length: emptySlotsCount }).map((_, i) => (
                <div
                  key={`empty_${i}`}
                  className="rounded-2xl border-2 border-dashed border-white/15 bg-slate-950/30 p-3 flex flex-col items-center justify-center text-center min-h-[120px]"
                >
                  <div className="w-11 h-11 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-slate-500 font-display font-bold text-xs">
                    Empty
                  </div>
                  {isHost ? (
                    <button
                      type="button"
                      onClick={addBot}
                      className="mt-2 min-h-[36px] px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold cursor-pointer uno-tap-target"
                    >
                      + Bot
                    </button>
                  ) : (
                    <span className="mt-2 text-[10px] text-slate-500">Waiting...</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Rules Summary */}
          <div className="rounded-2xl bg-slate-900/50 border border-white/10 p-3.5 text-center text-xs text-slate-400">
            Elimination Rules: Matches continue until only 1 player remains • Match cards by color or number to win!
          </div>
        </div>
      </main>

      {/* Sticky Bottom Footer: Start Game Action Bar */}
      <footer className="lobby-footer">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${
                  canStartGame ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                }`}
              />
              <p className="font-display font-bold text-white text-sm sm:text-base">
                {canStartGame
                  ? `Ready to start ${playerMode} Match!`
                  : !hasExactPlayerCount
                  ? `Need ${requiredPlayers} players (${players.length}/${requiredPlayers})`
                  : `Waiting for all players to Ready up`}
              </p>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Elimination rules: Last player with cards loses
            </p>
          </div>

          <div className="w-full sm:w-auto flex items-center justify-end gap-2.5">
            {isHost ? (
              <button
                type="button"
                disabled={!canStartGame}
                onClick={() => startGame(false)}
                className="w-full sm:w-auto min-h-[50px] py-3 px-8 rounded-2xl bg-gradient-to-r from-emerald-400 to-green-600 hover:from-emerald-300 hover:to-green-500 text-slate-950 font-display font-black text-base sm:text-lg shadow-xl flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-35 disabled:cursor-not-allowed shrink-0 uno-tap-target"
              >
                <Play className="w-5 h-5 fill-slate-950" /> START GAME
              </button>
            ) : (
              <span className="text-xs font-semibold text-amber-300 py-2">
                Waiting for host to start...
              </span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
