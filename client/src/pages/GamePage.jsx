import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCw,
  RotateCcw,
  Volume2,
  VolumeX,
  LogOut,
  Flame,
  Zap,
  SkipForward,
  Layers,
  Crown,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
  Menu,
  X,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore.js';
import UnoCard from '../components/UnoCard.jsx';
import OpponentSeat from '../components/OpponentSeat.jsx';
import TurnTimer from '../components/TurnTimer.jsx';
import ColorPickerModal from '../components/ColorPickerModal.jsx';
import LeaderboardModal from '../components/LeaderboardModal.jsx';
import ChatDrawer from '../components/ChatDrawer.jsx';
import {
  RotateDeviceOverlay,
  DirectionSwirl,
  TurnHint,
  UnoButton,
  SettingsButton,
  FullscreenButton,
} from '../components/TableDecorations.jsx';

const ACTIVE_COLOR_STYLES = {
  red: {
    badge: 'bg-red-600 border-red-300 text-white shadow-red-500/50',
    circleBorder: 'border-red-500/75 shadow-[0_0_80px_rgba(239,68,68,0.45)]',
    glowRing: 'ring-8 ring-red-500/60 shadow-[0_0_50px_rgba(239,68,68,0.75)]',
    banner: 'from-red-600 to-rose-700 border-red-300 text-white',
  },
  yellow: {
    badge: 'bg-amber-400 border-yellow-200 text-slate-950 shadow-amber-400/50',
    circleBorder: 'border-amber-400/80 shadow-[0_0_80px_rgba(251,191,36,0.45)]',
    glowRing: 'ring-8 ring-amber-400/65 shadow-[0_0_50px_rgba(251,191,36,0.75)]',
    banner: 'from-amber-400 to-yellow-500 border-yellow-100 text-slate-950',
  },
  green: {
    badge: 'bg-emerald-500 border-emerald-200 text-white shadow-emerald-500/50',
    circleBorder: 'border-emerald-400/75 shadow-[0_0_80px_rgba(16,185,129,0.45)]',
    glowRing: 'ring-8 ring-emerald-500/60 shadow-[0_0_50px_rgba(16,185,129,0.75)]',
    banner: 'from-emerald-500 to-green-700 border-emerald-200 text-white',
  },
  blue: {
    badge: 'bg-blue-600 border-blue-300 text-white shadow-blue-500/50',
    circleBorder: 'border-sky-400/80 shadow-[0_0_80px_rgba(56,189,248,0.45)]',
    glowRing: 'ring-8 ring-blue-500/60 shadow-[0_0_50px_rgba(59,130,246,0.75)]',
    banner: 'from-blue-600 to-indigo-700 border-blue-300 text-white',
  },
};

function isCardPlayableClient(card, hand, gameState) {
  if (!card || !gameState || gameState.status !== 'playing') return false;
  const topCard = gameState.topCard;
  const activeColor = gameState.activeColor;
  if (!topCard) return false;

  if (
    gameState.hasDrawnThisTurn &&
    gameState.drawnPlayableCardId &&
    card.id !== gameState.drawnPlayableCardId
  ) {
    return false;
  }

  if (gameState.settings?.allowStacking && gameState.pendingDraw > 0) {
    if (topCard.type === 'draw2' && card.type === 'draw2') return true;
    if (card.type === 'wild4') return true;
    return false;
  }

  if (card.type === 'wild') return true;

  if (card.type === 'wild4') {
    if (gameState.settings?.strictWild4 !== false) {
      const hasMatchingColor = hand.some((c) => c.color === activeColor);
      return !hasMatchingColor;
    }
    return true;
  }

  if (card.color === activeColor) return true;
  if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) {
    return true;
  }
  if (card.type !== 'number' && card.type === topCard.type) {
    return true;
  }

  return false;
}

/**
 * Maps opponents (ordered clockwise from local player's bottom seat)
 * to exact perimeter seats per Part 14 Table Overhaul:
 * - 1 opponent (1vBot / 2P): ['top-center']
 * - 2 opponents (3P):        ['top-left', 'top-right']
 * - 3 opponents (4P):        ['top-left', 'top-center', 'top-right']
 * - 4 opponents (5P):        ['top-left', 'top-center', 'top-right', 'right-side']
 * - 5 opponents (6P):        ['left-side', 'top-left', 'top-center', 'top-right', 'right-side']
 */
function assignOpponentSeats(opponents) {
  const count = opponents.length;
  const seatTemplates = {
    1: [{ seatPosition: 'top-center', gridAreaClass: 'grid-area-top-center' }],
    2: [
      { seatPosition: 'top-left', gridAreaClass: 'grid-area-top-left' },
      { seatPosition: 'top-right', gridAreaClass: 'grid-area-top-right' },
    ],
    3: [
      { seatPosition: 'top-left', gridAreaClass: 'grid-area-top-left' },
      { seatPosition: 'top-center', gridAreaClass: 'grid-area-top-center' },
      { seatPosition: 'top-right', gridAreaClass: 'grid-area-top-right' },
    ],
    4: [
      { seatPosition: 'top-left', gridAreaClass: 'grid-area-top-left' },
      { seatPosition: 'top-center', gridAreaClass: 'grid-area-top-center' },
      { seatPosition: 'top-right', gridAreaClass: 'grid-area-top-right' },
      { seatPosition: 'right-edge', gridAreaClass: 'grid-area-mid-right' },
    ],
    5: [
      { seatPosition: 'left-edge', gridAreaClass: 'grid-area-mid-left' },
      { seatPosition: 'top-left', gridAreaClass: 'grid-area-top-left' },
      { seatPosition: 'top-center', gridAreaClass: 'grid-area-top-center' },
      { seatPosition: 'top-right', gridAreaClass: 'grid-area-top-right' },
      { seatPosition: 'right-edge', gridAreaClass: 'grid-area-mid-right' },
    ],
  };

  const template = seatTemplates[count] || seatTemplates[5];
  return opponents.map((opp, idx) => ({
    player: opp,
    seatPosition: template[idx]?.seatPosition || 'top-center',
    gridAreaClass: template[idx]?.gridAreaClass || 'grid-area-top-center',
  }));
}

export default function GamePage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const {
    playerId,
    playerName,
    gameState,
    joinRoom,
    leaveRoom,
    playCard,
    drawCard,
    chooseColor,
    callUno,
    catchUno,
    startGame,
    returnToLobby,
    sendChat,
    pendingWildCard,
    setPendingWildCard,
    lastPlayedAnnouncement,
    floatingReactions,
    soundEnabled,
    toggleSound,
    colorBlindMode,
    toggleColorBlindMode,
    reduceMotion,
    toggleReduceMotion,
  } = useGameStore();

  const gameContainerRef = useRef(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [focusedCardIndex, setFocusedCardIndex] = useState(0);

  // Real-time debounced resize + orientationchange state for portrait mobile vs desktop/landscape
  const [isPortraitMobile, setIsPortraitMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px) and (orientation: portrait)').matches;
  });
  const [dismissRotateOverlay, setDismissRotateOverlay] = useState(false);

  // Part 14 Issue 2: Auto-rotate screen to landscape on mobile game start
  useEffect(() => {
    try {
      if (window.screen?.orientation?.lock) {
        window.screen.orientation.lock('landscape').catch(() => {
          // Handled gracefully on browsers without user-gesture fullscreen requirement
        });
      }
    } catch {
      // Ignore unsupported browsers
    }

    return () => {
      try {
        if (window.screen?.orientation?.unlock) {
          window.screen.orientation.unlock();
        }
      } catch {
        // Ignore
      }
      try {
        sessionStorage.removeItem('uno_fullscreen_preferred');
      } catch {
        // Ignore
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let debounceTimer = null;

    const updateViewportMode = () => {
      const matchesPortraitMobile = window.matchMedia(
        '(max-width: 767px) and (orientation: portrait)'
      ).matches;
      setIsPortraitMobile(matchesPortraitMobile);
    };

    const handleDebouncedResize = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(updateViewportMode, 100);
    };

    const mql = window.matchMedia('(max-width: 767px) and (orientation: portrait)');
    window.addEventListener('resize', handleDebouncedResize);
    window.addEventListener('orientationchange', handleDebouncedResize);
    if (mql.addEventListener) {
      mql.addEventListener('change', updateViewportMode);
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('resize', handleDebouncedResize);
      window.removeEventListener('orientationchange', handleDebouncedResize);
      if (mql.removeEventListener) {
        mql.removeEventListener('change', updateViewportMode);
      }
    };
  }, []);

  const isMobilePortrait =
    !dismissRotateOverlay &&
    (isPortraitMobile ||
      (typeof window !== 'undefined' &&
        window.innerHeight > window.innerWidth &&
        window.innerWidth < 850));

  useEffect(() => {
    if (!gameState || gameState.roomId !== roomId) {
      const fallbackName =
        playerName || `Player_${Math.floor(100 + Math.random() * 899)}`;
      joinRoom(roomId, fallbackName).then((res) => {
        if (res?.error) navigate('/');
      });
    }
  }, [roomId, gameState, playerName, joinRoom, navigate]);

  useEffect(() => {
    if (gameState?.status === 'lobby') {
      navigate(`/lobby/${roomId}`);
    }
  }, [gameState?.status, roomId, navigate]);

  const myHand = gameState?.myHand || [];
  const handScrollRef = useRef(null);
  const prevHandCountRef = useRef(myHand.length);

  // Auto-scroll hand smoothly when a new card is drawn
  useEffect(() => {
    if (myHand.length > prevHandCountRef.current && prevHandCountRef.current > 0) {
      if (handScrollRef.current) {
        handScrollRef.current.scrollTo({
          left: handScrollRef.current.scrollWidth,
          behavior: 'smooth',
        });
      }
    }
    prevHandCountRef.current = myHand.length;
  }, [myHand.length]);

  const isMyTurn =
    gameState?.status === 'playing' && gameState?.activePlayerId === playerId;
  const players = gameState?.players || [];
  const myIndex = players.findIndex((p) => p.id === playerId);
  const me = players[myIndex] || {
    name: playerName || 'You',
    score: 0,
    roundsWon: 0,
    saidUno: false,
    finished: false,
    finishRank: null,
    isNext: false,
    avatarColor: '#ef4444',
  };

  // Compute who is next in rotation (from server nextPlayerId or client fallback)
  const resolvedNextPlayerId = React.useMemo(() => {
    if (!gameState || gameState.status !== 'playing' || players.length < 2) return null;
    if (gameState.nextPlayerId) return gameState.nextPlayerId;
    const currentIdx = gameState.currentTurnIndex ?? 0;
    const dir = gameState.direction || 1;
    for (let step = 1; step <= players.length; step++) {
      const candidateIdx =
        (((currentIdx + dir * step) % players.length) + players.length) %
        players.length;
      if (!players[candidateIdx]?.finished && candidateIdx !== currentIdx) {
        return players[candidateIdx].id;
      }
    }
    return null;
  }, [gameState, players]);

  const isMeNext = !isMyTurn && !me.finished && resolvedNextPlayerId === playerId;

  // Stable card click handler so UnoCard memoization prevents any re-render
  const handleCardClick = useCallback(
    (card) => {
      if (!isMyTurn || me.finished) return;

      if (card.type === 'wild' || card.type === 'wild4') {
        const legal = isCardPlayableClient(card, myHand, gameState);
        if (!legal) {
          playCard(card.id);
          return;
        }
        setPendingWildCard(card);
        return;
      }

      playCard(card.id);
    },
    [isMyTurn, me.finished, myHand, gameState, playCard, setPendingWildCard]
  );

  // Desktop Keyboard Navigation (ArrowLeft / ArrowRight / Enter to play / D to Draw / U for UNO)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (!isMyTurn || myHand.length === 0) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedCardIndex((prev) => (prev + 1) % myHand.length);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedCardIndex((prev) => (prev - 1 + myHand.length) % myHand.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = myHand[focusedCardIndex];
        if (selected) {
          handleCardClick(selected);
        }
      } else if (e.key.toLowerCase() === 'd') {
        drawCard();
      } else if (e.key.toLowerCase() === 'u' && myHand.length <= 2) {
        callUno();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMyTurn, myHand, focusedCardIndex, handleCardClick, drawCard, callUno]);

  if (!gameState) {
    return (
      <div className="uno-safe-viewport flex items-center justify-center text-white font-display text-xl">
        Loading UNO Table...
      </div>
    );
  }

  const isHost = gameState.hostId === playerId;
  const myFloatingReactions = floatingReactions.filter((r) => r.playerId === playerId);

  // Rotate opponents relative to local player's bottom seat so clockwise goes Left -> Top -> Right
  const opponents =
    myIndex !== -1
      ? [...players.slice(myIndex + 1), ...players.slice(0, myIndex)]
      : players;

  const opponentCount = opponents.length;
  const assignedSeats = assignOpponentSeats(opponents);

  const vulnerableOpponent = opponents.find(
    (p) => !p.finished && p.unoVulnerable && p.cardCount === 1
  );

  const activePlayerObj = players.find((p) => p.id === gameState.activePlayerId);
  const nextPlayerObj = players.find((p) => p.id === resolvedNextPlayerId);

  const finishedCount = players.filter((p) => p.finished).length;
  const activeRemainingCount = gameState.activeRemainingCount ?? players.length;
  const isSurvivalMode =
    !me.finished && finishedCount > 0 && activeRemainingCount <= 2;

  const handleLeaveGame = () => {
    leaveRoom();
    navigate('/');
  };

  const activeColorStyle =
    ACTIVE_COLOR_STYLES[gameState.activeColor] || ACTIVE_COLOR_STYLES.blue;

  const isTopWild =
    gameState.topCard?.type === 'wild' || gameState.topCard?.type === 'wild4';

  const authoritativeEndsAt = gameState.endsAt || gameState.turnDeadline;
  const handMid = (myHand.length - 1) / 2;

  return (
    <div ref={gameContainerRef} className="game-screen uno-safe-viewport select-none">
      {/* Top Header Bar: Info (i) + Center Turn Flow Pill + Menu (☰) */}
      <header
        style={{ paddingBlock: '0.4vh', gap: 'var(--gap)' }}
        className="z-30 flex items-center justify-between shrink-0"
      >
        {/* Top-Left: Diamond Timer ("01:00") + Room Code Pill (Part 14) */}
        <div className="flex items-center gap-2">
          <TurnTimer
            variant="diamond"
            endsAt={authoritativeEndsAt}
            turnDeadline={authoritativeEndsAt}
            serverNow={gameState.serverNow}
            turnSequence={gameState.turnSequence}
            totalTurnSeconds={60}
            isTurn={gameState.status === 'playing'}
            isActive={gameState.status === 'playing'}
            isMyTurn={isMyTurn && !me.finished}
            playAudioWarning={isMyTurn && !me.finished}
          />

          <div
            style={{ fontSize: 'var(--font-xs)' }}
            className="hidden sm:flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-white/15 rounded-full px-3 py-1 shadow"
          >
            <span className="font-display font-black text-amber-400">
              #{gameState.roomId}
            </span>
            <span className="text-slate-300 font-semibold">
              {gameState.settings?.playerMode || `${players.length}P`} • R{gameState.currentRound}
            </span>
          </div>
        </div>

        {/* Center Turn Flow Indicator: Playing Now -> Up Next */}
        <div
          style={{ fontSize: 'var(--font-xs)' }}
          className="flex items-center gap-1.5 font-semibold bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 shadow-lg max-w-[62vw] truncate"
        >
          <span className="inline-flex items-center gap-1 text-amber-300 font-extrabold truncate">
            🔥 {activePlayerObj?.id === playerId ? 'You' : activePlayerObj?.name || 'Active'}
          </span>
          {nextPlayerObj && (
            <>
              <ArrowRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="inline-flex items-center gap-1 text-sky-300 font-bold truncate">
                ⏭️ {nextPlayerObj.id === playerId ? 'You' : nextPlayerObj.name}
              </span>
            </>
          )}
        </div>

        {/* Top-Right: Side-by-side Fullscreen (⛶) + Info (ℹ️) + Menu (☰) Buttons (Part 15) */}
        <div className="relative flex items-center gap-2">
          <FullscreenButton containerRef={gameContainerRef} />
          <button
            type="button"
            onClick={() => setShowInfoModal(true)}
            style={{
              width: 'clamp(36px, 5vmin, 44px)',
              height: 'clamp(36px, 5vmin, 44px)',
            }}
            className="uno-tap-target rounded-full bg-slate-900/90 hover:bg-slate-800 border-2 border-sky-400/60 text-sky-300 shadow-lg flex items-center justify-center cursor-pointer transition hover:scale-105"
            title="Game Rules & Info"
          >
            <Info className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            type="button"
            onClick={() => setShowMenuModal((v) => !v)}
            style={{
              width: 'clamp(36px, 5vmin, 44px)',
              height: 'clamp(36px, 5vmin, 44px)',
            }}
            className="uno-tap-target rounded-full bg-slate-900/90 hover:bg-slate-800 border-2 border-amber-400/60 text-amber-300 shadow-lg flex items-center justify-center cursor-pointer transition hover:scale-105"
            title="Menu & Settings"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Menu (☰) Dropdown Popover */}
          <AnimatePresence>
            {showMenuModal && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                style={{ width: 'clamp(220px, 24vw, 270px)', fontSize: 'var(--font-xs)' }}
                className="absolute right-0 top-full mt-2 z-50 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-white/20 p-3.5 shadow-2xl space-y-2"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span
                    style={{ fontSize: 'var(--font-sm)' }}
                    className="font-display font-bold text-white"
                  >
                    Room #{gameState.roomId}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMenuModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={toggleSound}
                  className="w-full flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-white/5 text-slate-200 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-slate-400" />
                    )}
                    Sound Effects
                  </span>
                  <span
                    className={`font-bold ${
                      soundEnabled ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {soundEnabled ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={toggleColorBlindMode}
                  className="w-full flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-white/5 text-slate-200 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-amber-400" /> Color-Blind Symbols
                  </span>
                  <span
                    className={`font-bold ${
                      colorBlindMode ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {colorBlindMode ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={toggleReduceMotion}
                  className="w-full flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-white/5 text-slate-200 cursor-pointer"
                >
                  <span>Reduce Motion</span>
                  <span
                    className={`font-bold ${
                      reduceMotion ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {reduceMotion ? 'ON' : 'OFF'}
                  </span>
                </button>

                <div className="pt-1 border-t border-white/10">
                  <button
                    type="button"
                    onClick={handleLeaveGame}
                    className="w-full py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-300 font-bold flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    <LogOut className="w-4 h-4" /> Leave Table
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* GAME TABLE: Portrait Mobile (3-Zone Flow) vs Desktop / Landscape (3x3 Grid) */}
      {isPortraitMobile ? (
        <div className="flex-1 flex flex-col justify-between min-h-0 w-full z-10 overflow-hidden py-1">
          {/* ZONE 1 (Top ~18-20% height): Opponents horizontal strip */}
          <div className="w-full flex items-center justify-around gap-2 px-2 py-1 overflow-x-auto shrink-0 z-20">
            {opponents.map((opp) => {
              const isOpponentNext =
                !opp.finished &&
                !opp.isTurn &&
                (opp.isNext || resolvedNextPlayerId === opp.id);

              return (
                <OpponentSeat
                  key={opp.id}
                  player={opp}
                  variant="chip"
                  opponentCount={opponentCount}
                  isNext={isOpponentNext}
                  isPortraitMobile={true}
                  endsAt={authoritativeEndsAt}
                  turnDeadline={authoritativeEndsAt}
                  serverNow={gameState.serverNow}
                  turnSequence={gameState.turnSequence}
                  totalTurnSeconds={60}
                  onCatchUno={catchUno}
                />
              );
            })}
          </div>

          {/* ZONE 2 (Middle ~42-45% height): Center Table Arena (Draw + Discard centered) */}
          <main className="flex-1 flex flex-col items-center justify-center relative min-h-0 py-1">
            {/* Survival / Finished Status Banner */}
            {me.finished && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-1 px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-display font-bold text-xs flex items-center gap-1.5 shadow-lg"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Finished 🏆 Rank #{me.finishRank}!
              </motion.div>
            )}

            {isSurvivalMode && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-1 px-3 py-0.5 rounded-full bg-rose-600/25 border border-rose-400 text-rose-200 font-display font-bold text-xs flex items-center gap-1.5 shadow-lg animate-pulse"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300" /> Last duel — play to survive!
              </motion.div>
            )}

            {/* Sleek Center Table Card Arena */}
            <div
              className={`relative px-4 py-2.5 rounded-3xl bg-slate-900/80 backdrop-blur-md border transition-all duration-500 flex flex-col items-center justify-center ${activeColorStyle.circleBorder}`}
            >
              {/* Part 14: Green Swirling Direction Indicator with REVERSED pop-up */}
              <DirectionSwirl direction={gameState.direction} />

              {/* Suit Indicator Pill */}
              <div
                className={`px-2.5 py-0.5 rounded-full border text-[11px] font-display font-black uppercase tracking-wider mb-1 transition-colors z-20 ${activeColorStyle.badge}`}
              >
                Suit: {gameState.activeColor}
              </div>

              {/* Floating Attribution Banner */}
              <div className="h-4 flex items-center justify-center mb-1">
                <AnimatePresence>
                  {lastPlayedAnnouncement && (
                    <motion.div
                      key={lastPlayedAnnouncement.announcementId}
                      initial={{ opacity: 0, y: 5, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.9 }}
                      className="px-2 py-0.5 rounded-full bg-slate-950/95 border border-amber-400/50 text-amber-300 font-display font-bold text-[11px] shadow"
                    >
                      🃏 {lastPlayedAnnouncement.playerName}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Draw Pile & Discard Pile */}
              <div
                style={{ gap: 'clamp(12px, 4vw, 24px)' }}
                className="flex items-center justify-center"
              >
                {/* Draw Pile (Deck) */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <UnoCard
                      faceDown
                      size="center"
                      disabled={!isMyTurn || me.finished}
                      onClick={() => isMyTurn && !me.finished && drawCard()}
                      className={
                        isMyTurn && !me.finished
                          ? 'ring-4 ring-emerald-400/85 shadow-[0_0_20px_rgba(16,185,129,0.55)]'
                          : ''
                      }
                    />
                    <span className="absolute -top-1.5 -left-1.5 px-1.5 py-0.5 rounded-full bg-slate-900 border border-white/20 text-[10px] font-extrabold text-slate-200 flex items-center gap-0.5 shadow">
                      <Layers className="w-2.5 h-2.5 text-amber-400" /> Deck
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={!isMyTurn || me.finished}
                    onClick={() => isMyTurn && !me.finished && drawCard()}
                    className={`mt-1.5 px-3 py-1 rounded-xl text-xs font-bold transition uno-tap-target flex items-center justify-center gap-1 ${
                      isMyTurn && !me.finished
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow cursor-pointer'
                        : 'bg-slate-800/60 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {gameState.hasDrawnThisTurn ? (
                      <>
                        <SkipForward className="w-3 h-3" /> Pass
                      </>
                    ) : (
                      'Draw'
                    )}
                  </button>
                </div>

                {/* Top Discard Pile */}
                <div className="flex flex-col items-center">
                  <div
                    className={`relative p-0.5 rounded-2xl transition-all ${
                      isTopWild ? activeColorStyle.glowRing : ''
                    }`}
                  >
                    <AnimatePresence mode="popLayout">
                      {gameState.topCard && (
                        <motion.div
                          key={gameState.topCard.id}
                          initial={{ scale: 1.25, y: -16, rotate: -8, opacity: 0 }}
                          animate={{ scale: 1.02, y: 0, rotate: 2, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                        >
                          <UnoCard card={gameState.topCard} size="center" disabled />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <span className="mt-1.5 text-xs font-bold text-slate-300">
                    Discard
                  </span>
                </div>
              </div>

              {/* Turn Direction Below Piles */}
              <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-950/80 border border-white/15 text-[11px] font-bold text-slate-200">
                {gameState.direction === 1 ? (
                  <>
                    <RotateCw className="w-3 h-3 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
                    <span>Clockwise ↻</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                    <span>Counter-Clockwise ↺</span>
                  </>
                )}
              </div>

              {/* Floating "UNO!" Call Button */}
              {!me.finished && myHand.length <= 2 && myHand.length > 0 && !me.saidUno && (
                <motion.button
                  type="button"
                  initial={{ scale: 0.85 }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 0.85 }}
                  onClick={callUno}
                  className="uno-tap-target absolute -bottom-3 -right-2 px-3 py-1 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 text-slate-950 font-display font-black shadow-[0_0_20px_rgba(239,68,68,0.8)] border-2 border-white flex items-center justify-center gap-1 cursor-pointer z-30 text-xs"
                >
                  <Flame className="w-3.5 h-3.5 fill-slate-950" /> UNO!
                </motion.button>
              )}

              {/* Catch Opponent UNO Penalty Button */}
              {vulnerableOpponent && (
                <motion.button
                  type="button"
                  initial={{ scale: 0.85 }}
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  onClick={() => catchUno(vulnerableOpponent.id)}
                  className="uno-tap-target absolute -bottom-3 -left-2 px-2.5 py-1 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 text-white font-display font-black shadow-xl border-2 border-white flex items-center justify-center gap-1 cursor-pointer z-30 text-xs"
                >
                  <Zap className="w-3 h-3" /> Catch {vulnerableOpponent.name}
                </motion.button>
              )}
            </div>
          </main>

          {/* ZONE 3 (Bottom ~35-38% height): Local Player & Horizontally Scrollable Hand */}
          <section
            className={`w-full rounded-t-3xl border-t border-x bg-slate-900/95 backdrop-blur-xl transition-all duration-300 flex flex-col justify-between shrink-0 z-20 pb-safe ${
              isMyTurn && !me.finished
                ? 'border-yellow-400/75 shadow-[0_-5px_30px_rgba(250,204,21,0.2)]'
                : isMeNext
                ? 'border-sky-300/60'
                : 'border-white/15'
            }`}
          >
            {/* Compact Header & Timer Strip */}
            <div className="px-3 pt-2 pb-1 flex items-center justify-between gap-2 border-b border-white/10">
              <div className="relative flex items-center gap-2 min-w-0">
                {/* Floating Emoji Reactions */}
                <div className="absolute -top-7 left-2 flex justify-center pointer-events-none z-30">
                  <AnimatePresence>
                    {myFloatingReactions.map((r) => (
                      <motion.span
                        key={r.id}
                        initial={{ opacity: 0, y: 10, scale: 0.6 }}
                        animate={{ opacity: 1, y: -24, scale: 1.35 }}
                        exit={{ opacity: 0, y: -40, scale: 0.8 }}
                        className="text-2xl"
                      >
                        {r.emoji}
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>

                <TurnTimer
                  variant="ring"
                  endsAt={authoritativeEndsAt}
                  turnDeadline={authoritativeEndsAt}
                  serverNow={gameState.serverNow}
                  turnSequence={gameState.turnSequence}
                  totalTurnSeconds={60}
                  isTurn={isMyTurn && !me.finished}
                  isActive={isMyTurn && !me.finished}
                  isMyTurn={isMyTurn && !me.finished}
                  size={38}
                  strokeWidth={3.5}
                >
                  <div
                    style={{ backgroundColor: me.avatarColor || '#ef4444' }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-display font-black text-xs relative ${
                      isMyTurn && !me.finished
                        ? 'border-2 border-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.65)]'
                        : isMeNext
                        ? 'border border-sky-300/80 shadow-[0_0_8px_rgba(56,189,248,0.35)]'
                        : 'border border-white/60'
                    }`}
                  >
                    {me.finished ? '🏆' : (me.name || 'Y').trim().charAt(0).toUpperCase()}
                    {isHost && (
                      <span className="absolute -top-1 -left-1 bg-amber-400 text-slate-950 p-0.5 rounded-full shadow">
                        <Crown className="w-2 h-2" />
                      </span>
                    )}
                    {!me.finished && myHand.length === 1 && (
                      <span
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 text-white border border-white flex items-center justify-center text-[7px]"
                        title="UNO!"
                      >
                        🔴
                      </span>
                    )}
                  </div>
                </TurnTimer>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display font-bold text-xs text-white truncate max-w-[85px]">
                      {me.name}
                    </span>
                    {!me.finished && (
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-900/90 border border-amber-400/40 text-amber-300 font-mono font-bold text-[10px] shadow shrink-0">
                        🃏 {myHand.length}
                      </span>
                    )}
                    {me.finished ? (
                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[10px] font-bold">
                        🏆 #{me.finishRank}
                      </span>
                    ) : isMyTurn ? (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-display font-black text-[10px] uppercase">
                        Your Turn
                      </span>
                    ) : isMeNext ? (
                      <span className="px-1.5 py-0.2 rounded-full bg-sky-400/20 border border-sky-300/60 text-sky-200 text-[10px] font-bold uppercase">
                        Up Next
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 truncate">
                    {me.finished
                      ? 'Safe! Watching...'
                      : isMyTurn
                      ? '🔥 Tap a card or Deck'
                      : isMeNext
                      ? `⏭️ After ${activePlayerObj?.name || 'opponent'}`
                      : `Waiting for ${activePlayerObj?.name || 'opponent'}...`}
                  </div>
                </div>
              </div>

              {/* Turn Countdown Display */}
              <div className="shrink-0 flex items-center">
                <TurnTimer
                  variant="compact"
                  endsAt={authoritativeEndsAt}
                  turnDeadline={authoritativeEndsAt}
                  serverNow={gameState.serverNow}
                  turnSequence={gameState.turnSequence}
                  totalTurnSeconds={60}
                  isTurn={gameState.status === 'playing'}
                  isActive={gameState.status === 'playing'}
                  isMyTurn={isMyTurn && !me.finished}
                  playAudioWarning={isMyTurn && !me.finished}
                />
              </div>
            </div>

            {/* Horizontally Scrollable Hand with Edge Mask */}
            <div
              ref={handScrollRef}
              style={{
                touchAction: 'pan-x',
                scrollPadding: '0 16px',
                WebkitOverflowScrolling: 'touch',
              }}
              className="hand-scroll hand-fade-mask hand-wrapper flex items-center overflow-x-auto overflow-y-hidden w-full px-4 pt-4 pb-3"
            >
              {me.finished ? (
                <div className="text-center py-3 text-emerald-300 font-display font-bold text-xs w-full">
                  🎉 Hand Empty — Finished 🏆 #{me.finishRank}!
                </div>
              ) : (
                <div className="flex items-end min-w-full justify-start sm:justify-center px-3 shrink-0">
                  <AnimatePresence>
                    {myHand.map((card, idx) => {
                      const playable =
                        isMyTurn && isCardPlayableClient(card, myHand, gameState);

                      return (
                        <div
                          key={card.id}
                          style={{
                            marginLeft: idx === 0 ? '0px' : 'calc(var(--card-w) * -0.35)',
                            zIndex: idx + 1,
                            touchAction: 'pan-x',
                          }}
                          className="hand-card-slot shrink-0 snap-center"
                        >
                          <UnoCard
                            card={card}
                            size="md"
                            playable={playable}
                            focused={isMyTurn && focusedCardIndex === idx}
                            disabled={!isMyTurn}
                            onCardSelect={handleCardClick}
                          />
                        </div>
                      );
                    })}
                  </AnimatePresence>
                  <div className="w-6 shrink-0 pointer-events-none" aria-hidden="true" />
                </div>
              )}
            </div>
          </section>
        </div>
      ) : (
        /* Desktop / Landscape Mode: 3x3 .uno-table-grid */
        <div className="uno-table-grid z-10">
          {/* Opponent Seats mapped directly to Named Grid Areas (top-left, top-center, top-right, mid-left, mid-right) */}
          {assignedSeats.map(({ player: opp, seatPosition, gridAreaClass }) => {
            const isOpponentNext =
              !opp.finished &&
              !opp.isTurn &&
              (opp.isNext || resolvedNextPlayerId === opp.id);

            return (
              <div
                key={opp.id}
                className={`${gridAreaClass} flex items-center justify-center min-w-0 min-h-0`}
              >
                <OpponentSeat
                  player={opp}
                  seatPosition={seatPosition}
                  opponentCount={opponentCount}
                  isNext={isOpponentNext}
                  isPortraitMobile={false}
                  endsAt={authoritativeEndsAt}
                  turnDeadline={authoritativeEndsAt}
                  serverNow={gameState.serverNow}
                  turnSequence={gameState.turnSequence}
                  totalTurnSeconds={60}
                  onCatchUno={catchUno}
                />
              </div>
            );
          })}

          {/* DEAD-CENTER CIRCULAR PLAY AREA (grid-area: center) */}
          <main className="grid-area-center relative flex flex-col items-center justify-center min-w-0 min-h-0">
            {/* Survival / Finished Status Banner above Center Circle */}
            {me.finished && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ fontSize: 'var(--font-xs)' }}
                className="mb-1 px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-display font-bold flex items-center gap-1.5 shadow-lg"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Finished 🏆 Rank #{me.finishRank}!
              </motion.div>
            )}

            {isSurvivalMode && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ fontSize: 'var(--font-xs)' }}
                className="mb-1 px-3 py-0.5 rounded-full bg-rose-600/25 border border-rose-400 text-rose-200 font-display font-bold flex items-center gap-1.5 shadow-lg animate-pulse"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300" /> Last duel — play to survive!
              </motion.div>
            )}

            {/* Glowing Center Circle (Fluid width/height via --arena-width / --arena-height) */}
            <div
              style={{
                width: 'var(--arena-width)',
                height: 'var(--arena-height)',
                padding: 'clamp(0.45rem, 1.4vmin, 1rem)',
              }}
              className={`relative rounded-full bg-radial from-sky-950/75 via-slate-900/90 to-slate-950/95 border-4 transition-all duration-500 flex flex-col items-center justify-center ${activeColorStyle.circleBorder}`}
            >
              {/* Part 14: Green Swirling Direction Indicator with REVERSED pop-up */}
              <DirectionSwirl direction={gameState.direction} />

              {/* Active Suit Badge at Top of Circle */}
              <div
                style={{ fontSize: 'var(--font-xs)' }}
                className={`px-3 py-0.5 rounded-full border-2 font-display font-black uppercase tracking-wider shadow-lg mb-1 transition-colors z-20 ${activeColorStyle.badge}`}
              >
                Suit: {gameState.activeColor}
              </div>

              {/* Floating Attribution Banner */}
              <div className="h-4 flex items-center justify-center mb-1">
                <AnimatePresence>
                  {lastPlayedAnnouncement && (
                    <motion.div
                      key={lastPlayedAnnouncement.announcementId}
                      initial={{ opacity: 0, y: 5, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.9 }}
                      style={{ fontSize: 'var(--font-xs)' }}
                      className="px-2 py-0.5 rounded-full bg-slate-950/95 border border-amber-400/50 text-amber-300 font-display font-bold shadow"
                    >
                      🃏 {lastPlayedAnnouncement.playerName}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Draw Pile & Top Discard Card Dead Center */}
              <div
                style={{ gap: 'clamp(0.85rem, 3vmin, 2.25rem)' }}
                className="flex items-center justify-center"
              >
                {/* Draw Pile */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <UnoCard
                      faceDown
                      size="center"
                      disabled={!isMyTurn || me.finished}
                      onClick={() => isMyTurn && !me.finished && drawCard()}
                      className={
                        isMyTurn && !me.finished
                          ? 'ring-4 ring-emerald-400/85 shadow-[0_0_25px_rgba(16,185,129,0.55)]'
                          : ''
                      }
                    />
                    <span
                      style={{ fontSize: 'clamp(0.55rem, 1vmin, 0.7rem)' }}
                      className="absolute -top-1.5 -left-1.5 px-1.5 py-0.5 rounded-full bg-slate-900 border border-white/20 font-extrabold text-slate-200 flex items-center gap-0.5 shadow"
                    >
                      <Layers className="w-2.5 h-2.5 text-amber-400" /> Deck
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={!isMyTurn || me.finished}
                    onClick={() => isMyTurn && !me.finished && drawCard()}
                    style={{
                      minWidth: 'clamp(64px, 8vw, 110px)',
                      padding: '0.35em 0.9em',
                      fontSize: 'var(--font-xs)',
                    }}
                    className={`mt-1 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
                      isMyTurn && !me.finished
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow cursor-pointer'
                        : 'bg-slate-800/60 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {gameState.hasDrawnThisTurn ? (
                      <>
                        <SkipForward className="w-3 h-3" /> Pass
                      </>
                    ) : (
                      'Draw'
                    )}
                  </button>
                </div>

                {/* Top Discard Pile */}
                <div className="flex flex-col items-center">
                  <div
                    className={`relative p-0.5 rounded-2xl transition-all ${
                      isTopWild ? activeColorStyle.glowRing : ''
                    }`}
                  >
                    <AnimatePresence mode="popLayout">
                      {gameState.topCard && (
                        <motion.div
                          key={gameState.topCard.id}
                          initial={{ scale: 1.32, y: -22, rotate: -10, opacity: 0 }}
                          animate={{ scale: 1.04, y: 0, rotate: 3, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                        >
                          <UnoCard card={gameState.topCard} size="center" disabled />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <span
                    style={{ fontSize: 'var(--font-xs)' }}
                    className="mt-1 font-bold text-slate-200"
                  >
                    Discard
                  </span>
                </div>
              </div>

              {/* Curved Turn Direction Indicator Below Discard Pile (Flips on Reverse) */}
              <motion.div
                key={`dir_${gameState.direction}`}
                initial={{ scale: 0.85, rotate: gameState.direction === 1 ? -25 : 25 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                style={{ fontSize: 'var(--font-xs)' }}
                className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900/95 border border-white/15 font-bold text-slate-100 shadow"
              >
                {gameState.direction === 1 ? (
                  <>
                    <RotateCw
                      className="w-3 h-3 text-emerald-400 animate-spin"
                      style={{ animationDuration: '5s' }}
                    />
                    <span>Clockwise ↻</span>
                  </>
                ) : (
                  <>
                    <RotateCcw
                      className="w-3 h-3 text-amber-400 animate-spin"
                      style={{ animationDuration: '5s' }}
                    />
                    <span>Counter-Clockwise ↺</span>
                  </>
                )}
              </motion.div>

              {/* Floating "UNO" Call Button at Bottom-Right of Center Play Area */}
              {!me.finished && myHand.length <= 2 && myHand.length > 0 && !me.saidUno && (
                <motion.button
                  type="button"
                  initial={{ scale: 0.85 }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 0.85 }}
                  onClick={callUno}
                  style={{
                    minWidth: 'clamp(76px, 9vw, 125px)',
                    padding: '0.5em 1.1em',
                    fontSize: 'var(--font-sm)',
                  }}
                  className="uno-tap-target absolute -bottom-2.5 -right-2 sm:right-0 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 text-slate-950 font-display font-black shadow-[0_0_25px_rgba(239,68,68,0.8)] border-2 border-white flex items-center justify-center gap-1 cursor-pointer z-20"
                >
                  <Flame className="w-4 h-4 fill-slate-950" /> UNO!
                </motion.button>
              )}

              {/* Catch Opponent UNO Penalty Button */}
              {vulnerableOpponent && (
                <motion.button
                  type="button"
                  initial={{ scale: 0.85 }}
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  onClick={() => catchUno(vulnerableOpponent.id)}
                  style={{
                    minWidth: 'clamp(80px, 10vw, 135px)',
                    padding: '0.45em 1em',
                    fontSize: 'var(--font-xs)',
                  }}
                  className="uno-tap-target absolute -bottom-2.5 -left-2 sm:left-0 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 text-white font-display font-black shadow-xl border-2 border-white flex items-center justify-center gap-1 cursor-pointer z-20"
                >
                  <Zap className="w-3.5 h-3.5" /> Catch {vulnerableOpponent.name}
                </motion.button>
              )}
            </div>
          </main>

          {/* BOTTOM-LEFT: Settings (⚙️) Button (Part 14) */}
          <div className="grid-area-bottom-left flex items-end justify-start p-2 pointer-events-auto z-20">
            <SettingsButton onClick={() => setShowMenuModal(true)} />
          </div>

          {/* BOTTOM-CENTER: Local Player Avatar + Timer + Horizontally Fanned Face-Up Hand (grid-area: hand) */}
          <section
            style={{
              maxWidth: '92vw',
              paddingInline: 'clamp(0.6rem, 1.8vw, 1.4rem)',
              paddingBlock: 'clamp(0.4rem, 1.1vh, 0.8rem)',
            }}
            className={`grid-area-hand z-20 w-full mx-auto rounded-3xl backdrop-blur-xl border shadow-2xl transition-all duration-300 flex flex-col justify-between min-w-0 ${
              isMyTurn && !me.finished
                ? 'bg-slate-900/95 border-yellow-400/75 ring-2 ring-yellow-400/40 shadow-[0_0_35px_rgba(250,204,21,0.25)]'
                : isMeNext
                ? 'bg-slate-900/90 border-sky-300/60 ring-2 ring-sky-300/35'
                : 'bg-slate-900/90 border-white/15'
            }`}
          >
            {/* Local Player Header + Isolated 60s Countdown Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <div className="relative flex items-center gap-2.5">
                {/* Floating Emoji Reactions for Local Player */}
                <div className="absolute -top-8 left-2 flex justify-center pointer-events-none z-30">
                  <AnimatePresence>
                    {myFloatingReactions.map((r) => (
                      <motion.span
                        key={r.id}
                        initial={{ opacity: 0, y: 10, scale: 0.6 }}
                        animate={{ opacity: 1, y: -24, scale: 1.35 }}
                        exit={{ opacity: 0, y: -40, scale: 0.8 }}
                        className="text-2xl"
                      >
                        {r.emoji}
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="relative flex items-center justify-center">
                  <TurnTimer
                    variant="ring"
                    endsAt={authoritativeEndsAt}
                    turnDeadline={authoritativeEndsAt}
                    serverNow={gameState.serverNow}
                    turnSequence={gameState.turnSequence}
                    totalTurnSeconds={60}
                    isTurn={isMyTurn && !me.finished}
                    isActive={isMyTurn && !me.finished}
                    isMyTurn={isMyTurn && !me.finished}
                    size={50}
                    strokeWidth={4}
                  >
                    <div
                      style={{
                        width: 'var(--avatar-size)',
                        height: 'var(--avatar-size)',
                        backgroundColor: me.avatarColor || '#ef4444',
                        fontSize: 'var(--font-base)',
                      }}
                      className={`rounded-full flex items-center justify-center text-white font-display font-black shadow relative transition-all ${
                        isMyTurn && !me.finished
                          ? 'border-2 border-yellow-200 shadow-[0_0_18px_rgba(250,204,21,0.65)]'
                          : isMeNext
                          ? 'border-2 border-sky-300/80 shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                          : 'border-2 border-white/60'
                      }`}
                    >
                      {me.finished ? '🏆' : (me.name || 'Y').trim().charAt(0).toUpperCase()}
                      {isHost && (
                        <span className="absolute -top-1 -left-1 bg-amber-400 text-slate-950 p-0.5 rounded-full">
                          <Crown className="w-2.5 h-2.5" />
                        </span>
                      )}
                      {/* UNO Symbol Badge (🔴) ONLY when local player has 1 card */}
                      {!me.finished && myHand.length === 1 && (
                        <span
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white border-2 border-white shadow-lg flex items-center justify-center text-[10px]"
                          title="UNO!"
                        >
                          🔴
                        </span>
                      )}
                    </div>
                  </TurnTimer>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      style={{ fontSize: 'var(--font-sm)' }}
                      className="font-display font-bold text-white"
                    >
                      {me.name} (You)
                    </span>
                    {!me.finished && (
                      <span
                        style={{ fontSize: 'var(--font-xs)' }}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-amber-400/40 text-amber-300 font-mono font-bold shadow"
                        title={`${myHand.length} cards in hand`}
                      >
                        🃏 {myHand.length}
                      </span>
                    )}
                    {me.finished && (
                      <span
                        style={{ fontSize: 'var(--font-xs)' }}
                        className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-bold"
                      >
                        Finished 🏆 #{me.finishRank}
                      </span>
                    )}
                    {!me.finished && isMyTurn && (
                      <span
                        style={{ fontSize: 'var(--font-xs)' }}
                        className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-display font-black uppercase tracking-wider"
                      >
                        Your Turn
                      </span>
                    )}
                    {!me.finished && isMeNext && (
                      <span
                        style={{ fontSize: 'var(--font-xs)' }}
                        className="px-2 py-0.5 rounded-full bg-sky-400/20 border border-sky-300/60 text-sky-200 font-display font-bold uppercase tracking-wider"
                      >
                        Up Next
                      </span>
                    )}
                  </div>
                  <div
                    style={{ fontSize: 'var(--font-xs)' }}
                    className={`font-extrabold ${
                      me.finished
                        ? 'text-emerald-400'
                        : isMyTurn
                        ? 'text-amber-300'
                        : isMeNext
                        ? 'text-sky-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {me.finished
                      ? 'Safe! Watching remaining players finish...'
                      : isMyTurn
                      ? '🔥 Tap a glowing card to play or click Deck to draw'
                      : isMeNext
                      ? `⏭️ Up next after ${activePlayerObj?.name || 'opponent'}`
                      : `Waiting for ${activePlayerObj?.name || 'opponent'}...`}
                  </div>
                </div>
              </div>
            </div>

            {/* Isolated 60-Second Progress Bar & Clock (Ticks reliably from server endsAt) */}
            <TurnTimer
              variant="bar"
              endsAt={authoritativeEndsAt}
              turnDeadline={authoritativeEndsAt}
              serverNow={gameState.serverNow}
              turnSequence={gameState.turnSequence}
              totalTurnSeconds={60}
              isTurn={gameState.status === 'playing'}
              isActive={gameState.status === 'playing'}
              isMyTurn={isMyTurn && !me.finished}
              playAudioWarning={isMyTurn && !me.finished}
            />

            {/* Horizontally Fanned Face-Up Hand (Fluid clamp() card sizing + snap-scrollable overflow on mobile) */}
            <div
              style={{
                paddingTop: '16px',
                paddingBottom: 'clamp(0.25rem, 0.8vh, 0.5rem)',
                touchAction: 'pan-x',
                scrollPadding: '0 16px',
                WebkitOverflowScrolling: 'touch',
              }}
              className="hand-scroll hand-fade-mask hand-wrapper flex items-center overflow-x-auto overflow-y-hidden px-4"
            >
              {me.finished ? (
                <div
                  style={{ fontSize: 'var(--font-sm)' }}
                  className="text-center py-4 text-emerald-300 font-display font-bold w-full"
                >
                  🎉 Hand Empty — Finished 🏆 #{me.finishRank}!
                </div>
              ) : (
                <div className="flex items-end min-w-full justify-start sm:justify-center px-3 shrink-0">
                  <AnimatePresence>
                    {myHand.map((card, idx) => {
                      const playable =
                        isMyTurn && isCardPlayableClient(card, myHand, gameState);
                      const offsetFromCenter = idx - handMid;
                      const fanAngleDeg =
                        myHand.length <= 12
                          ? offsetFromCenter * 2.5
                          : offsetFromCenter * 1.4;
                      const archDropVmin = Math.min(
                        1.8,
                        Math.abs(offsetFromCenter) * 0.22
                      );

                      return (
                        <div
                          key={card.id}
                          style={{
                            marginLeft:
                              idx === 0 ? '0px' : 'calc(var(--card-w) * -0.35)',
                            transform: `translate3d(0, ${archDropVmin}vmin, 0) rotate(${fanAngleDeg}deg)`,
                            zIndex: idx + 1,
                            touchAction: 'pan-x',
                          }}
                          className="hand-card-slot shrink-0 transition-transform duration-200 hover:!z-30 snap-center"
                        >
                          <UnoCard
                            card={card}
                            size="md"
                            playable={playable}
                            focused={isMyTurn && focusedCardIndex === idx}
                            disabled={!isMyTurn}
                            onCardSelect={handleCardClick}
                          />
                        </div>
                      );
                    })}
                  </AnimatePresence>
                  <div className="w-6 shrink-0 pointer-events-none" aria-hidden="true" />
                </div>
              )}
            </div>
          </section>

          {/* BOTTOM-RIGHT: Large Red UNO Oval Button (Part 14) */}
          <div className="grid-area-bottom-right flex items-end justify-end p-2 pointer-events-auto z-20">
            <UnoButton
              onCallUno={callUno}
              eligible={!me.finished && myHand.length <= 2 && myHand.length > 0}
              saidUno={me.saidUno}
            />
          </div>
        </div>
      )}

      {/* Top-Left Info (i) Modal: Rules & Keyboard Shortcuts */}
      <AnimatePresence>
        {showInfoModal && (
          <div
            onClick={() => setShowInfoModal(false)}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md rounded-3xl bg-slate-950 border border-white/20 p-5 shadow-2xl text-white space-y-3"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <h2 className="font-display font-black text-base text-amber-400 flex items-center gap-2">
                  <Info className="w-5 h-5 text-sky-400" /> UNO Rules & Guide
                </h2>
                <button
                  type="button"
                  onClick={() => setShowInfoModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                <p>
                  <strong className="text-white">🎯 Match Card:</strong> Play a card matching the top discard by <span className="text-amber-300">Color</span>, <span className="text-amber-300">Number</span>, or <span className="text-amber-300">Action Symbol</span>.
                </p>
                <p>
                  <strong className="text-white">🏆 Elimination Mode:</strong> Emptying your hand locks in your finish rank (<span className="text-emerald-400">#1, #2, #3...</span>). The round continues until only 1 player is left holding cards!
                </p>
                <p>
                  <strong className="text-white">⏱️ 60s Turn Timer:</strong> Every turn has a 60-second server countdown. If time expires, the server automatically draws and plays a legal card for you.
                </p>
                <p>
                  <strong className="text-white">🔴 UNO Call:</strong> Press the <span className="text-red-400 font-bold">UNO!</span> button (or key <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-white">U</kbd>) when down to 1–2 cards before an opponent catches you!
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Right-Edge Floating Widget: 💬 Collapsible Chat / Move Log (Portal) */}
      <ChatDrawer
        chatMessages={gameState.chatMessages}
        actionLog={gameState.actionLog}
        onSendChat={sendChat}
      />

      {/* Wild Card Color Picker Modal */}
      <ColorPickerModal
        isOpen={Boolean(pendingWildCard) || (isMyTurn && gameState.awaitingColorChoice)}
        cardType={pendingWildCard?.type || gameState.topCard?.type}
        onSelectColor={(color) => chooseColor(color)}
        onCancel={pendingWildCard ? () => setPendingWildCard(null) : undefined}
      />

      {/* Round End / Game Over Final Leaderboard Modal (Ephemeral — Destroyed on Play Again or Leave) */}
      {(gameState.status === 'round_over' || gameState.status === 'game_over') && (
        <LeaderboardModal
          roundSummary={gameState.roundSummary}
          isGameOver={gameState.status === 'game_over'}
          isHost={isHost}
          onNextRound={() => startGame(true)}
          onPlayAgain={returnToLobby}
          onLeave={handleLeaveGame}
        />
      )}

      {/* Part 14 Issue 3: Turn Hints (Floating Tooltip + Bouncing Arrow) */}
      <TurnHint
        isMyTurn={isMyTurn && !me.finished}
        turnSequence={gameState.turnSequence}
        activePlayerName={activePlayerObj?.name}
        isAwaitingColor={gameState.awaitingColorChoice}
        hasDrawn={gameState.hasDrawnThisTurn}
        cardCount={myHand.length}
        saidUno={me.saidUno}
      />

      {/* Part 14 Issue 2: Mobile Landscape Lock / Rotation Prompt Overlay */}
      <AnimatePresence>
        {isMobilePortrait && (
          <RotateDeviceOverlay onContinueAnyway={() => setDismissRotateOverlay(true)} />
        )}
      </AnimatePresence>
    </div>
  );
}
