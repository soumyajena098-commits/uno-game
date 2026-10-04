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
  WifiOff,
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
import ThemeToggle from '../components/ThemeToggle.jsx';
import AmbientBackground from '../components/AmbientBackground.jsx';
import InGameNotificationBanner from '../components/InGameNotificationBanner.jsx';
import CardCountPill from '../components/CardCountPill.jsx';

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

function formatCardName(card, activeColor) {
  if (!card) return '';
  const colorStr = (card.color || activeColor || '').toUpperCase();
  if (card.type === 'number') return `${colorStr} ${card.value}`;
  if (card.type === 'skip') return `${colorStr} SKIP`;
  if (card.type === 'reverse') return `${colorStr} REVERSE`;
  if (card.type === 'draw2') return `${colorStr} +2`;
  if (card.type === 'wild') return `WILD (${activeColor?.toUpperCase() || 'COLOR'})`;
  if (card.type === 'wild4') return `WILD +4 (${activeColor?.toUpperCase() || 'COLOR'})`;
  return `${colorStr} ${card.type}`.trim();
}

function getUnplayableCardMessage(card, hand, gameState) {
  if (!card || !gameState) return "Can't play this card right now.";
  const topCard = gameState.topCard;
  if (!topCard) return 'No active discard card.';
  const activeColor = (gameState.activeColor || topCard.color || '').toUpperCase();

  if (gameState.settings?.allowStacking && gameState.pendingDraw > 0) {
    return `Must stack a ${topCard.type === 'draw2' ? '+2 or Wild +4' : 'Wild +4'} or draw cards!`;
  }

  if (card.type === 'wild4' && gameState.settings?.strictWild4 !== false) {
    const hasMatchingColor = hand.some((c) => c.color === gameState.activeColor);
    if (hasMatchingColor) {
      return `Can't play Wild +4 while holding a ${activeColor} card!`;
    }
  }

  const topValueStr =
    topCard.type === 'number'
      ? String(topCard.value)
      : topCard.type === 'draw2'
      ? '+2'
      : topCard.type.toUpperCase();

  return `Doesn't match — play a ${activeColor} or a ${topValueStr}`;
}

/**
 * Bigger Next-Turn Indicator Box (Part 18 Specification)
 * Height: clamp(52px, 7vh, 72px)
 * Horizontal padding: clamp(20px, 3.2vw, 32px)
 * Names: clamp(15px, 2.2vmin, 22px), bold
 * Avatar inside pill: clamp(32px, 4.6vmin, 48px)
 * Arrow: clamp(20px, 2.8vmin, 28px)
 * Card count: clamp(12px, 1.8vmin, 16px)
 * Layout: [🔥] [Avatar] Current Name [🃏 N]  ➜  [Avatar] Next Name [🃏 N]
 */
function TurnIndicatorPill({
  activePlayer,
  nextPlayer,
  playerId,
  myHandCount,
}) {
  if (!activePlayer) return null;

  const isActiveMe = activePlayer.id === playerId;
  const activeName = isActiveMe ? 'You' : activePlayer.name;
  const activeCount = isActiveMe ? myHandCount : activePlayer.cardCount;
  const activeColor = activePlayer.avatarColor || '#ef4444';
  const activeInitial = (activeName || 'P').trim().charAt(0).toUpperCase();

  const isNextMe = nextPlayer ? nextPlayer.id === playerId : false;
  const nextName = nextPlayer ? (isNextMe ? 'You' : nextPlayer.name) : null;
  const nextCount = nextPlayer ? (isNextMe ? myHandCount : nextPlayer.cardCount) : null;
  const nextColor = nextPlayer?.avatarColor || '#3b82f6';
  const nextInitial = nextPlayer ? (nextName || 'P').trim().charAt(0).toUpperCase() : null;

  return (
    <div
      style={{
        minHeight: 'clamp(52px, 7vh, 72px)',
        paddingInline: 'clamp(20px, 3.2vw, 32px)',
        paddingBlock: 'clamp(6px, 1vh, 12px)',
        gap: 'clamp(10px, 1.8vw, 20px)',
      }}
      className="flex items-center bg-slate-950/85 backdrop-blur-xl rounded-full border-2 border-amber-400/50 shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_24px_rgba(251,191,36,0.25)] ring-1 ring-amber-400/30 select-none max-w-[80vw] sm:max-w-none shrink-0 transition-all"
    >
      {/* Active Player (Current Turn 🔥) */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span
          className="text-amber-400 drop-shadow flex items-center justify-center shrink-0 animate-pulse"
          style={{ fontSize: 'clamp(20px, 3vmin, 30px)' }}
          title="Current Turn"
        >
          🔥
        </span>

        {/* Active Player Avatar with matching color ring */}
        <div
          style={{
            width: 'clamp(32px, 4.6vmin, 48px)',
            height: 'clamp(32px, 4.6vmin, 48px)',
            backgroundColor: activeColor,
            borderColor: activeColor,
            fontSize: 'clamp(14px, 2vmin, 20px)',
          }}
          className="rounded-full flex items-center justify-center text-white font-display font-black border-2 shadow-md shrink-0 ring-2 ring-amber-400/90"
        >
          {activePlayer.finished ? '🏆' : activePlayer.isBot ? '🤖' : activeInitial}
        </div>

        {/* Active Player Name (Bold, High Contrast) */}
        <span
          style={{
            fontSize: 'clamp(15px, 2.2vmin, 22px)',
            textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.7)',
          }}
          className="font-display font-black text-amber-300 drop-shadow truncate max-w-[95px] sm:max-w-[150px]"
        >
          {activeName}
        </span>

        {/* Active Player Card Count (Part 20: Universal Bigger Pill) */}
        <CardCountPill
          cardCount={activeCount}
          finished={activePlayer.finished}
          finishRank={activePlayer.finishRank}
          playerColor={activeColor}
        />
      </div>

      {/* Arrow Divider & Next Player */}
      {nextPlayer && (
        <>
          <ArrowRight
            style={{
              width: 'clamp(20px, 2.8vmin, 28px)',
              height: 'clamp(20px, 2.8vmin, 28px)',
            }}
            className="text-sky-400 shrink-0 mx-1"
          />

          {/* Next Player */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Next Player Avatar with matching color ring */}
            <div
              style={{
                width: 'clamp(32px, 4.6vmin, 48px)',
                height: 'clamp(32px, 4.6vmin, 48px)',
                backgroundColor: nextColor,
                borderColor: nextColor,
                fontSize: 'clamp(14px, 2vmin, 20px)',
              }}
              className="rounded-full flex items-center justify-center text-white font-display font-black border-2 shadow-md shrink-0 ring-2 ring-sky-300/70"
            >
              {nextPlayer.finished ? '🏆' : nextPlayer.isBot ? '🤖' : nextInitial}
            </div>

            {/* Next Player Name */}
            <span
              style={{
                fontSize: 'clamp(15px, 2.2vmin, 22px)',
                textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.7)',
              }}
              className="font-display font-extrabold text-sky-200 drop-shadow truncate max-w-[90px] sm:max-w-[145px]"
            >
              {nextName}
            </span>

            {/* Next Player Card Count (Part 20: Universal Bigger Pill) */}
            <CardCountPill
              cardCount={nextCount}
              finished={nextPlayer.finished}
              finishRank={nextPlayer.finishRank}
              playerColor={nextColor}
            />
          </div>
        </>
      )}
    </div>
  );
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
    addInGameNotification,
    addToast,
  } = useGameStore();

  const gameContainerRef = useRef(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [focusedCardIndex, setFocusedCardIndex] = useState(0);

  // Real-time debounced resize + orientation detection
  const [isPortraitMobile, setIsPortraitMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px) and (orientation: portrait)').matches;
  });
  const [dismissRotateOverlay, setDismissRotateOverlay] = useState(false);
  const [, setViewportDimensions] = useState({ width: 0, height: 0 });

  // Auto-rotate screen to landscape on mobile game start (Part 14)
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

  // Part 21: ResizeObserver on game container so layout recalculates smoothly on all size changes
  useEffect(() => {
    if (!gameContainerRef.current || typeof ResizeObserver === 'undefined') return;
    let resizeTimer = null;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          setViewportDimensions({ width: Math.round(width), height: Math.round(height) });
          setIsPortraitMobile(height > width && width < 768);
        }, 100);
      }
    });

    observer.observe(gameContainerRef.current);
    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      observer.disconnect();
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

  // Compute who is next in rotation
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

  // Secondary "Next Turn" callout just above the discard pile (Part 18)
  const [showNextCallout, setShowNextCallout] = useState(false);
  const prevTurnRef = useRef(null);

  useEffect(() => {
    if (gameState?.status === 'playing' && gameState.activePlayerId) {
      if (prevTurnRef.current !== gameState.activePlayerId) {
        setShowNextCallout(true);
        const timer = setTimeout(() => setShowNextCallout(false), 3000);
        prevTurnRef.current = gameState.activePlayerId;
        return () => clearTimeout(timer);
      }
    }
  }, [gameState?.status, gameState?.activePlayerId]);

  const hasPlayableCard = React.useMemo(() => {
    return myHand.some((c) => isCardPlayableClient(c, myHand, gameState));
  }, [myHand, gameState]);

  // Identify the best playable card to subtly highlight with a star badge (Part 21 Issue 3)
  const bestPlayableCardId = React.useMemo(() => {
    if (!isMyTurn || me.finished) return null;
    const playableCards = myHand.filter((c) => isCardPlayableClient(c, myHand, gameState));
    if (playableCards.length === 0) return null;
    const scoreCard = (c) => {
      if (c.type === 'wild4') return 100;
      if (c.type === 'draw2') return 90;
      if (c.type === 'skip') return 80;
      if (c.type === 'reverse') return 70;
      if (c.type === 'number') return 20 + Number(c.value || 0);
      return 10;
    };
    let best = playableCards[0];
    let maxScore = scoreCard(best);
    for (let i = 1; i < playableCards.length; i++) {
      const score = scoreCard(playableCards[i]);
      if (score > maxScore) {
        best = playableCards[i];
        maxScore = score;
      }
    }
    return best.id;
  }, [isMyTurn, me.finished, myHand, gameState]);

  // Stable card click handler with unplayable guidance toast (Part 21 Issue 3)
  const handleCardClick = useCallback(
    (card) => {
      if (!isMyTurn || me.finished) {
        addToast('Wait for your turn to play', 'info');
        return;
      }

      const legal = isCardPlayableClient(card, myHand, gameState);
      if (!legal) {
        const reason = getUnplayableCardMessage(card, myHand, gameState);
        addToast(reason, 'warning');
        return;
      }

      if (card.type === 'wild' || card.type === 'wild4') {
        setPendingWildCard(card);
        return;
      }

      playCard(card.id);
    },
    [isMyTurn, me.finished, myHand, gameState, playCard, setPendingWildCard, addToast]
  );

  // Desktop Keyboard Navigation
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

  // Order opponents clockwise from local player's seat (index 0 = local player at bottom)
  const opponents =
    myIndex !== -1
      ? [...players.slice(myIndex + 1), ...players.slice(0, myIndex)]
      : players;

  const totalPlayers = Math.max(players.length, 2);

  const vulnerableOpponent = opponents.find(
    (p) => !p.finished && p.unoVulnerable && p.cardCount === 1
  );

  const activePlayerObj = players.find((p) => p.id === gameState.activePlayerId);
  const nextPlayerObj = players.find((p) => p.id === resolvedNextPlayerId);

  const finishedCount = players.filter((p) => p.finished).length;
  const activeRemainingCount = gameState.activeRemainingCount ?? players.length;
  const isSurvivalMode =
    !me.finished && finishedCount > 0 && activeRemainingCount <= 2;

  const survivalNotifiedRef = useRef(false);
  useEffect(() => {
    if (isSurvivalMode && !survivalNotifiedRef.current) {
      survivalNotifiedRef.current = true;
      addInGameNotification({
        message: '⚔️ Last duel — play to survive!',
        icon: '⚔️',
        type: 'warning',
        playerColor: '#ef4444',
        durationMs: 3000,
      });
    } else if (!isSurvivalMode) {
      survivalNotifiedRef.current = false;
    }
  }, [isSurvivalMode, addInGameNotification]);

  const handleLeaveGame = () => {
    leaveRoom();
    navigate('/');
  };

  const activeColorStyle =
    ACTIVE_COLOR_STYLES[gameState.activeColor] || ACTIVE_COLOR_STYLES.blue;

  const resolvedTopCard =
    gameState.topCard ||
    (Array.isArray(gameState.discardPile) && gameState.discardPile.length > 0
      ? gameState.discardPile[gameState.discardPile.length - 1]
      : null) ||
    (Array.isArray(gameState.recentDiscards) && gameState.recentDiscards.length > 0
      ? gameState.recentDiscards[gameState.recentDiscards.length - 1]
      : null);

  const isTopWild =
    resolvedTopCard?.type === 'wild' || resolvedTopCard?.type === 'wild4';

  const authoritativeEndsAt = gameState.endsAt || gameState.turnDeadline;
  const handMid = (myHand.length - 1) / 2;

  // Center of table ellipse
  const centerYPercent = isPortraitMobile ? 39 : 42;
  const rxPercent = isPortraitMobile
    ? 38
    : totalPlayers === 6
    ? 42
    : totalPlayers >= 4
    ? 40
    : 36;
  const ryPercent = isPortraitMobile ? 26 : 30;

  // Local player sits at 90° (bottom-center): angle 90° in screen coords (+Y is down)
  const localPlayerSeatY = centerYPercent + ryPercent;

  return (
    <div ref={gameContainerRef} className="game-screen uno-safe-viewport select-none">
      {/* Part 18: Atmospheric Layered Ambient Background with Spotlight & Drifting Particles */}
      <AmbientBackground />

      {/* Top Header Bar: Clean Info & Turn Flow */}
      <header
        style={{ paddingBlock: '0.4vh', gap: 'var(--gap)' }}
        className="z-30 flex items-center justify-between shrink-0 px-2 sm:px-4"
      >
        {/* Top-Left: Room Code & Mode Badge (Part 16) */}
        <div
          style={{ fontSize: 'var(--font-xs)' }}
          className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-white/15 rounded-full px-3 py-1 shadow"
        >
          <span className="font-display font-black text-amber-400">
            #{gameState.roomId}
          </span>
          <span className="text-slate-300 font-semibold">
            • {gameState.settings?.playerMode || `${players.length}P`} • R{gameState.currentRound}
          </span>
        </div>

        {/* Center: Bigger Turn Flow Indicator Pill (Part 17) */}
        <TurnIndicatorPill
          activePlayer={activePlayerObj}
          nextPlayer={nextPlayerObj}
          playerId={playerId}
          myHandCount={myHand.length}
        />

        {/* Top-Right: Fullscreen (⛶) + Theme (☀️/🌙) + Info (ℹ️) + Menu (☰) Buttons */}
        <div className="relative flex items-center gap-1.5 sm:gap-2">
          <FullscreenButton containerRef={gameContainerRef} />
          <ThemeToggle />
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

          {/* Menu Dropdown Popover */}
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

      {/* Part 16: REAL TABLE ARENA WITH ELLIPTICAL SEATING */}
      <main className="relative flex-1 w-full h-full min-h-0 overflow-hidden">
        {/* Part 21: Royal Casino Elliptical Felt Table with Gold Ornamental Rim */}
        <div
          aria-hidden="true"
          style={{
            width: 'min(95vw, 1120px)',
            height: 'min(70vh, 560px)',
            left: '50%',
            top: `${centerYPercent}%`,
            transform: 'translate(-50%, -50%)',
            background: 'var(--table-felt)',
            borderColor: 'var(--gold-primary)',
            boxShadow:
              '0 0 0 3px var(--felt-border), 0 0 0 7px rgba(212, 175, 55, 0.28), inset 0 0 90px rgba(0, 0, 0, 0.65), 0 24px 60px rgba(0, 0, 0, 0.75)',
          }}
          className="absolute pointer-events-none rounded-[50%] border-4 transition-all duration-300"
        >
          {/* Inner Gold Pinstripe Inlay */}
          <div
            style={{
              inset: 'clamp(8px, 1.4vmin, 16px)',
              borderColor: 'var(--gold-border)',
            }}
            className="absolute rounded-[50%] border border-dashed pointer-events-none opacity-40"
          />
        </div>

        {/* OPPONENTS SEATED AROUND TABLE PERIMETER (Clean Circles Only) */}
        {opponents.map((opp, idx) => {
          const seatIndex = idx + 1; // 1 to totalPlayers - 1
          const angleDeg = 90 + (360 / totalPlayers) * seatIndex;
          const angleRad = (angleDeg * Math.PI) / 180;
          const leftPct = 50 + Math.cos(angleRad) * rxPercent;
          const topPct = centerYPercent + Math.sin(angleRad) * ryPercent;

          const isOpponentNext =
            !opp.finished &&
            !opp.isTurn &&
            (opp.isNext || resolvedNextPlayerId === opp.id);

          return (
            <div
              key={opp.id}
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                top: `${topPct}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="z-20 pointer-events-auto"
            >
              <OpponentSeat
                player={opp}
                isNext={isOpponentNext}
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

        {/* DEAD-CENTER FLOATING DISCARD PILE & DECK (No Container Box) */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: `${centerYPercent}%`,
            transform: 'translate(-50%, -50%)',
          }}
          className="z-20 flex flex-col items-center justify-center pointer-events-auto"
        >
          {/* Secondary "Next Turn" Callout just above Discard Pile (Part 18) */}
          <AnimatePresence>
            {showNextCallout && nextPlayerObj && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                style={{ fontSize: 'clamp(12px, 1.6vmin, 15px)' }}
                className="mb-1 px-3 py-0.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-sky-400/50 text-sky-200 font-display font-bold shadow-lg flex items-center gap-1.5 pointer-events-none z-20"
              >
                <span>Next:</span>
                <span className="text-white font-extrabold">{nextPlayerObj.name}</span>
                <span className="text-sky-400 text-sm font-black">➜</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Direction Indicator */}
          <DirectionSwirl direction={gameState.direction} />

          {/* Suit Indicator Pill */}
          <div
            style={{ fontSize: 'var(--font-xs)' }}
            className={`px-3 py-0.5 rounded-full border-2 font-display font-black uppercase tracking-wider shadow-lg mb-1.5 transition-colors z-20 ${activeColorStyle.badge}`}
          >
            Suit: {gameState.activeColor}
          </div>

          {/* Draw Pile & Discard Pile Side-by-Side */}
          <div
            style={{ gap: 'clamp(14px, 3.5vmin, 32px)' }}
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
                    isMyTurn && !me.finished && !hasPlayableCard
                      ? 'ring-4 ring-amber-400 animate-pulse shadow-[0_0_36px_rgba(212,175,55,0.95)] hover:scale-105 cursor-pointer transition-all'
                      : isMyTurn && !me.finished
                      ? 'ring-4 ring-emerald-400/85 shadow-[0_0_28px_rgba(16,185,129,0.65)] hover:scale-105 cursor-pointer transition-all'
                      : ''
                  }
                />
                <span
                  style={{ fontSize: 'clamp(0.6rem, 1vmin, 0.72rem)' }}
                  className="absolute -top-1.5 -left-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-white/20 font-extrabold text-slate-200 flex items-center gap-0.5 shadow-md"
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
                  padding: '0.3em 0.8em',
                  fontSize: 'var(--font-xs)',
                }}
                className={`mt-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
                  isMyTurn && !me.finished && !hasPlayableCard
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black shadow-[0_0_24px_rgba(212,175,55,0.7)] animate-pulse cursor-pointer'
                    : isMyTurn && !me.finished
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

            {/* Discard Pile */}
            <div className="flex flex-col items-center">
              <div
                className={`relative p-0.5 rounded-2xl transition-all ${
                  isTopWild
                    ? activeColorStyle.glowRing
                    : isMyTurn && !me.finished
                    ? 'ring-4 ring-amber-400/90 shadow-[0_0_36px_rgba(212,175,55,0.85)]'
                    : ''
                }`}
              >
                {resolvedTopCard ? (
                  <motion.div
                    key={resolvedTopCard.id || `${resolvedTopCard.color}-${resolvedTopCard.type}-${resolvedTopCard.value}`}
                    initial={{ scale: 1.25, y: -16, rotate: -6, opacity: 0.8 }}
                    animate={{ scale: 1.02, y: 0, rotate: 2, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                  >
                    <UnoCard card={resolvedTopCard} size="center" disabled />
                  </motion.div>
                ) : (
                  <div
                    style={{
                      width: 'var(--pile-card-w, var(--card-center-size, 110px))',
                      aspectRatio: '1 / 1.4',
                      borderRadius: 'calc(var(--pile-card-w, var(--card-center-size, 110px)) * 0.08)',
                    }}
                    className="border-2 border-dashed border-amber-400/40 bg-black/35 flex flex-col items-center justify-center text-amber-300/50 select-none shadow-inner"
                  >
                    <span className="font-display font-black text-xs tracking-wider opacity-75">UNO</span>
                    <span className="text-[10px] font-bold text-amber-200/40 mt-0.5">DISCARD</span>
                  </div>
                )}
              </div>
              <span
                style={{ fontSize: 'var(--font-xs)' }}
                className="mt-1.5 font-bold text-slate-200 drop-shadow"
              >
                Discard
              </span>
            </div>
          </div>

          {/* Turn Direction Badge Below Discard Pile */}
          <motion.div
            key={`dir_${gameState.direction}`}
            initial={{ scale: 0.85, rotate: gameState.direction === 1 ? -25 : 25 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            style={{ fontSize: 'var(--font-xs)' }}
            className="mt-2 inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-slate-950/85 border border-white/20 font-bold text-slate-100 shadow-md backdrop-blur-sm"
          >
            {gameState.direction === 1 ? (
              <>
                <RotateCw className="w-3 h-3 text-emerald-400 animate-spin" style={{ animationDuration: '5s' }} />
                <span>Clockwise ↻</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '5s' }} />
                <span>Counter-Clockwise ↺</span>
              </>
            )}
          </motion.div>

          {/* Turn Hints on/near Discard Pile (Part 18 Specification) */}
          <TurnHint
            isMyTurn={isMyTurn && !me.finished}
            hasPlayableCard={hasPlayableCard}
            turnSequence={gameState.turnSequence}
            isAwaitingColor={gameState.awaitingColorChoice}
            hasDrawn={gameState.hasDrawnThisTurn}
            cardCount={myHand.length}
            saidUno={me.saidUno}
          />
        </div>

        {/* LOCAL PLAYER SEATED AT BOTTOM-CENTER (Part 18 Horizontal Chip: Circle on left, Name & Count on right) */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: `${localPlayerSeatY}%`,
            transform: 'translate(-50%, -50%)',
          }}
          className={`z-20 flex items-center gap-2 pointer-events-auto select-none transition-all duration-300 ${
            isMyTurn && !me.finished
              ? 'opacity-100 scale-105 z-30'
              : isMeNext
              ? 'opacity-95 z-20'
              : 'opacity-75 hover:opacity-100 z-10'
          }`}
        >
          {/* Floating Emoji Reactions for Local Player */}
          <div className="absolute -top-7 inset-x-0 flex justify-center pointer-events-none z-40">
            <AnimatePresence>
              {myFloatingReactions.map((r) => (
                <motion.span
                  key={r.id}
                  initial={{ opacity: 0, y: 10, scale: 0.6 }}
                  animate={{ opacity: 1, y: -24, scale: 1.35 }}
                  exit={{ opacity: 0, y: -40, scale: 0.8 }}
                  transition={{ duration: 1.4 }}
                  style={{ fontSize: 'clamp(18px, 2.5vmin, 26px)' }}
                  className="drop-shadow-lg"
                >
                  {r.emoji}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>

          {/* Left: Local Player Avatar Circle with Active Turn Ring + Strong Glow */}
          <div className="relative flex items-center justify-center shrink-0">
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
              playAudioWarning={isMyTurn && !me.finished}
            >
              <div
                style={{
                  backgroundColor: me.avatarColor || '#ef4444',
                  width: 'var(--avatar-size)',
                  height: 'var(--avatar-size)',
                  fontSize: 'clamp(18px, 2.8vmin, 26px)',
                  '--glow-color': me.avatarColor || '#ef4444',
                  ...(isMyTurn && !me.finished
                    ? {
                        boxShadow: `0 0 28px ${me.avatarColor || '#ef4444'}, 0 0 14px ${me.avatarColor || '#ef4444'}cc, inset 0 0 8px rgba(255,255,255,0.4)`,
                        borderColor: '#fef08a',
                      }
                    : isMeNext
                    ? {
                        boxShadow: `0 0 14px ${me.avatarColor || '#ef4444'}80`,
                        borderColor: me.avatarColor || '#ef4444',
                      }
                    : {
                        borderColor: 'rgba(255,255,255,0.8)',
                      }),
                }}
                className={`rounded-full flex items-center justify-center text-white font-display font-black relative transition-all duration-300 ${
                  isMyTurn && !me.finished
                    ? 'border-2 ring-4 ring-yellow-400/80 active-player-pulse'
                    : isMeNext
                    ? 'border-2 ring-2 ring-sky-300/70'
                    : 'border-2 shadow-md hover:border-white'
                }`}
              >
                {me.finished ? '🏆' : (me.name || 'Y').trim().charAt(0).toUpperCase()}

                {isHost && (
                  <span
                    className="absolute -top-1 -left-1 bg-amber-400 text-slate-950 p-1 rounded-full shadow-md"
                    title="Room Host"
                  >
                    <Crown className="w-3 h-3" />
                  </span>
                )}

                {/* UNO Badge with "UNO" text ONLY when holding 1 card (Part 17) */}
                {!me.finished && myHand.length === 1 && (
                  <span
                    className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-red-600 text-white font-display font-black text-[10px] tracking-wider border-2 border-white shadow-lg flex items-center justify-center animate-bounce z-20"
                    title="UNO!"
                  >
                    UNO
                  </span>
                )}

                {/* Disconnected Indicator */}
                {!me.connected && (
                  <span
                    className="absolute -bottom-1 -right-1 bg-rose-600 text-white p-1 rounded-full shadow-md"
                    title="Disconnected"
                  >
                    <WifiOff className="w-3 h-3" />
                  </span>
                )}
              </div>
            </TurnTimer>
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
                  isMyTurn && !me.finished ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' : ''
                }`}
                title={me.name}
              >
                {me.name} (You)
              </p>

              {/* Catch UNO button if opponent is vulnerable */}
              {vulnerableOpponent && (
                <button
                  type="button"
                  onClick={() => catchUno(vulnerableOpponent.id)}
                  style={{ fontSize: 'clamp(10px, 1.4vmin, 13px)' }}
                  className="mt-0.5 px-2 py-0.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-display font-black shadow-lg border border-white/50 cursor-pointer transition hover:scale-105 shrink-0"
                >
                  ⚡ Catch {vulnerableOpponent.name}!
                </button>
              )}
            </div>

            {/* Bigger Card Count Pill (Part 20) */}
            <CardCountPill
              cardCount={myHand.length}
              finished={me.finished}
              finishRank={me.finishRank}
              playerColor={me.avatarColor || '#ef4444'}
            />
          </div>
        </div>

        {/* FLOATING FACE-UP HAND (Border-less, horizontal scroll at bottom of table) */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
          }}
          className="z-30 flex flex-col items-center pointer-events-none pb-1 sm:pb-2"
        >
          <div
            ref={handScrollRef}
            style={{
              touchAction: 'pan-x',
              scrollPadding: '0 16px',
              WebkitOverflowScrolling: 'touch',
              maxWidth: 'min(98vw, 1100px)',
            }}
            className="pointer-events-auto hand-scroll hand-fade-mask hand-wrapper flex items-center overflow-x-auto overflow-y-hidden w-full px-4 pt-4 pb-2"
          >
            {me.finished ? (
              <div
                style={{ fontSize: 'var(--font-sm)' }}
                className="text-center py-2 text-emerald-300 font-display font-bold w-full"
              >
                🎉 Hand Empty — Finished 🏆 #{me.finishRank}!
              </div>
            ) : (
              <div className="flex items-end justify-center min-w-max mx-auto px-4 shrink-0">
                <AnimatePresence>
                  {(() => {
                    const overlapRatio =
                      myHand.length <= 4
                        ? 0.22
                        : myHand.length <= 7
                        ? 0.35
                        : myHand.length <= 10
                        ? 0.46
                        : myHand.length <= 14
                        ? 0.54
                        : 0.62;

                    return myHand.map((card, idx) => {
                      const playable =
                        isMyTurn && isCardPlayableClient(card, myHand, gameState);
                      const offsetFromCenter = idx - handMid;
                      const fanAngleDeg =
                        myHand.length <= 12
                          ? offsetFromCenter * 2.2
                          : offsetFromCenter * 1.2;
                      const archDropVmin = Math.min(
                        1.5,
                        Math.abs(offsetFromCenter) * 0.18
                      );

                      return (
                        <div
                          key={card.id || `hand-${idx}`}
                          style={{
                            marginLeft:
                              idx === 0
                                ? '0px'
                                : `calc(var(--card-w, 80px) * -${overlapRatio})`,
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
                            isBestPlayable={card.id === bestPlayableCardId}
                            focused={isMyTurn && focusedCardIndex === idx}
                            disabled={!isMyTurn}
                            onCardSelect={handleCardClick}
                          />
                        </div>
                      );
                    });
                  })()}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM-LEFT: Settings (⚙️) Button */}
        <div className="absolute bottom-2 left-2 z-30 pointer-events-auto">
          <SettingsButton onClick={() => setShowMenuModal(true)} />
        </div>

        {/* BOTTOM-RIGHT: Large Red UNO Button */}
        <div className="absolute bottom-2 right-2 z-30 pointer-events-auto">
          <UnoButton
            onCallUno={callUno}
            eligible={!me.finished && myHand.length <= 2 && myHand.length > 0}
            saidUno={me.saidUno}
          />
        </div>
      </main>

      {/* Top-Left Info Modal: Rules & Guide */}
      <AnimatePresence>
        {showInfoModal && (
          <div
            onClick={() => setShowInfoModal(false)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
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
                  <X className="w-4 h-4" />
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
                  <strong className="text-white">⏱️ Turn Timer Ring:</strong> The glowing ring around your circle avatar counts down your turn. If time expires, the server automatically draws and plays for you.
                </p>
                <p>
                  <strong className="text-white">🔴 UNO Call:</strong> Press the <span className="text-red-400 font-bold">UNO!</span> button (or key <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-white">U</kbd>) when down to 1–2 cards before an opponent catches you!
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Right-Edge Floating Widget: 💬 Collapsible Chat / Move Log */}
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

      {/* Round End / Game Over Final Leaderboard Modal (Dynamic & Ephemeral) */}
      {(gameState.status === 'round_over' || gameState.status === 'game_over') && (
        <LeaderboardModal
          roundSummary={gameState.roundSummary}
          isGameOver={gameState.status === 'game_over'}
          isHost={isHost}
          localPlayerId={playerId}
          onNextRound={() => startGame(true)}
          onPlayAgain={returnToLobby}
          onLeave={handleLeaveGame}
        />
      )}

      {/* In-Game Notification Banner (Part 19: Top-Right Fixed) */}
      <InGameNotificationBanner />

      {/* Part 14: Mobile Landscape Lock / Rotation Prompt Overlay */}
      <AnimatePresence>
        {isMobilePortrait && (
          <RotateDeviceOverlay onContinueAnyway={() => setDismissRotateOverlay(true)} />
        )}
      </AnimatePresence>
    </div>
  );
}
