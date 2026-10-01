import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  VolumeX,
  Trophy,
  Bot,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore.js';

/**
 * Validates player name per Part 2 specification:
 * - Required before Create or Join can be clicked
 * - 2 to 15 characters
 * - Only letters, numbers, underscores (_), and spaces allowed
 */
function checkNameValidity(rawName) {
  const trimmed = String(rawName || '').trim();
  if (trimmed.length === 0) {
    return { valid: false, message: 'Enter your name (2–15 characters) to unlock Create & Join.' };
  }
  if (trimmed.length < 2 || trimmed.length > 15) {
    return { valid: false, message: 'Name must be between 2 and 15 characters.' };
  }
  if (!/^[a-zA-Z0-9_ ]+$/.test(trimmed)) {
    return {
      valid: false,
      message: 'Only letters, numbers, spaces, and underscores (_) are allowed.',
    };
  }
  return { valid: true, cleanName: trimmed, message: 'Name looks great!' };
}

export default function HomePage() {
  const navigate = useNavigate();
  const { roomId: inviteRoomId } = useParams();

  const {
    playerName,
    setPlayerName,
    clearSavedPlayerName,
    createRoom,
    joinRoom,
    soundEnabled,
    toggleSound,
    addToast,
  } = useGameStore();

  const [nameInput, setNameInput] = useState(playerName || '');
  const [showJoinInput, setShowJoinInput] = useState(Boolean(inviteRoomId));
  const [roomCodeInput, setRoomCodeInput] = useState(inviteRoomId || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (inviteRoomId) {
      setRoomCodeInput(inviteRoomId);
      setShowJoinInput(true);
    }
  }, [inviteRoomId]);

  const validation = checkNameValidity(nameInput);
  const initialLetter = validation.valid
    ? validation.cleanName.charAt(0).toUpperCase()
    : '?';

  const handleNameChange = (e) => {
    const val = e.target.value;
    setNameInput(val);
    const check = checkNameValidity(val);
    if (check.valid) {
      setPlayerName(check.cleanName);
    } else if (val.trim().length === 0) {
      clearSavedPlayerName();
    }
  };

  const handleClearSavedName = () => {
    setNameInput('');
    clearSavedPlayerName();
  };

  const handleCreateGame = async () => {
    if (!validation.valid || loading) return;
    setLoading(true);
    setPlayerName(validation.cleanName);
    const res = await createRoom(validation.cleanName);
    setLoading(false);
    if (res?.roomId) {
      navigate(`/lobby/${res.roomId}`);
    }
  };

  const handleJoinButtonClick = () => {
    if (!validation.valid || loading) return;
    if (showJoinInput && roomCodeInput.trim().length === 6) {
      handleJoinSubmit();
      return;
    }
    setShowJoinInput(true);
  };

  const handleJoinSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!validation.valid || loading) return;
    const code = roomCodeInput.trim().toUpperCase();
    if (code.length !== 6) {
      addToast('Please enter a valid 6-character room code (e.g., 482913).', 'error');
      return;
    }
    setLoading(true);
    setPlayerName(validation.cleanName);
    const res = await joinRoom(code, validation.cleanName);
    setLoading(false);
    if (res?.roomId) {
      if (res.state?.status === 'playing') {
        navigate(`/game/${res.roomId}`);
      } else {
        navigate(`/lobby/${res.roomId}`);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between px-4 py-6 sm:px-8 max-w-4xl mx-auto">
      {/* Top Bar */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center shadow-lg border border-white/30 -rotate-6">
            <span className="font-display font-black text-base text-yellow-200">
              UNO
            </span>
          </div>
          <span className="font-display font-bold text-lg text-white">
            UNO Multiplayer
          </span>
        </div>

        <button
          type="button"
          onClick={toggleSound}
          className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-200 flex items-center gap-2 text-xs font-semibold cursor-pointer transition"
        >
          {soundEnabled ? (
            <>
              <Volume2 className="w-4 h-4 text-emerald-400" /> Sound On
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4 text-slate-400" /> Muted
            </>
          )}
        </button>
      </header>

      {/* Single Clean Entry Card */}
      <main className="my-auto py-8 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="w-full max-w-lg rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-white/15 p-7 sm:p-10 shadow-2xl text-center space-y-6"
        >
          {/* App Logo & Title */}
          <div className="flex flex-col items-center space-y-3">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500 via-amber-500 to-yellow-400 p-1 shadow-[0_0_40px_rgba(239,68,68,0.45)] -rotate-6">
              <div className="w-full h-full rounded-[20px] bg-slate-950 flex items-center justify-center">
                <span className="font-display font-black text-3xl bg-gradient-to-r from-red-400 via-yellow-300 to-emerald-400 bg-clip-text text-transparent">
                  UNO
                </span>
              </div>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-black text-white tracking-tight">
              UNO Multiplayer
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              1vBot to 6 Players • Official 108-Card Rules • Real-Time Chat
            </p>
          </div>

          {/* Required Name Input Box with Live Avatar Icon Preview & Removable Saved Name */}
          <div className="text-left space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Player Name <span className="text-rose-400">*</span>
              </label>
              {nameInput.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSavedName}
                  className="text-[11px] text-slate-400 hover:text-rose-400 font-semibold cursor-pointer transition"
                  title="Clear saved player name"
                >
                  Clear saved name ✕
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Auto-generated Initial Avatar Circle */}
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-black text-xl shrink-0 border-2 transition ${
                  validation.valid
                    ? 'bg-gradient-to-br from-red-500 to-amber-500 text-white border-white shadow-lg'
                    : 'bg-slate-800 text-slate-500 border-white/10'
                }`}
                title="Your In-Game Avatar Icon"
              >
                {initialLetter}
              </div>

              <input
                type="text"
                value={nameInput}
                onChange={handleNameChange}
                placeholder="Enter your name..."
                maxLength={15}
                className={`w-full rounded-2xl bg-slate-950/90 border px-4 py-3.5 text-white font-semibold text-base focus:outline-none transition ${
                  nameInput.length === 0
                    ? 'border-white/15 focus:border-amber-400'
                    : validation.valid
                    ? 'border-emerald-400/70 focus:border-emerald-400'
                    : 'border-rose-500 focus:border-rose-400'
                }`}
              />
            </div>

            {/* Validation Helper Text */}
            <div className="flex items-center gap-1.5 text-xs pl-1">
              {validation.valid ? (
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {validation.message}
                </span>
              ) : (
                <span
                  className={`flex items-center gap-1 ${
                    nameInput.length > 0 ? 'text-rose-400 font-medium' : 'text-slate-400'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {validation.message}
                </span>
              )}
            </div>
          </div>

          {/* Two Big Primary Action Buttons: 🎮 CREATE GAME & 🔗 JOIN GAME */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <button
              type="button"
              disabled={!validation.valid || loading}
              onClick={handleCreateGame}
              className="py-4 px-5 rounded-2xl bg-gradient-to-r from-red-500 via-amber-500 to-yellow-400 hover:from-red-400 hover:to-yellow-300 text-slate-950 font-display font-black text-base sm:text-lg shadow-xl transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            >
              {loading ? 'CREATING...' : '🎮 CREATE GAME'}
            </button>

            <button
              type="button"
              disabled={!validation.valid || loading}
              onClick={handleJoinButtonClick}
              className={`py-4 px-5 rounded-2xl font-display font-black text-base sm:text-lg border-2 shadow-xl transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                showJoinInput
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border-white/20'
              }`}
            >
              {loading && showJoinInput ? 'JOINING...' : '🔗 JOIN GAME'}
            </button>
          </div>

          {/* Room Code Input (Revealed when 🔗 JOIN GAME is clicked or via /join/:roomId) */}
          <AnimatePresence>
            {showJoinInput && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleJoinSubmit}
                className="pt-2 space-y-2 overflow-hidden"
              >
                <div className="p-4 rounded-2xl bg-slate-950/90 border border-emerald-400/40 space-y-3">
                  <label className="block text-xs font-bold uppercase text-emerald-300 text-left">
                    Enter 6-Digit Room Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={roomCodeInput}
                      onChange={(e) =>
                        setRoomCodeInput(e.target.value.trim().toUpperCase().slice(0, 6))
                      }
                      placeholder="e.g. 482913"
                      maxLength={6}
                      autoFocus
                      className="flex-1 rounded-xl bg-slate-900 border border-white/20 px-4 py-3 text-white font-mono text-xl tracking-widest text-center uppercase focus:outline-none focus:border-emerald-400"
                    />
                    <button
                      type="submit"
                      disabled={!validation.valid || roomCodeInput.trim().length !== 6 || loading}
                      className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-sm flex items-center gap-1.5 cursor-pointer transition disabled:opacity-40"
                    >
                      {loading ? 'Joining...' : 'Enter'} <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      <footer className="text-center text-xs text-slate-500">
        UNO Multiplayer • Ephemeral In-Memory Sessions • No Score History Stored
      </footer>
    </div>
  );
}
