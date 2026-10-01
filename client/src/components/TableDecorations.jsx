import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Flame, Sparkles, X, Settings, Maximize, Minimize } from 'lucide-react';

/**
 * Mobile Rotate Device Overlay (Part 14 Issue 2)
 * Shows a full-screen rotating phone animation when device is in portrait mode on mobile.
 */
export function RotateDeviceOverlay({ onContinueAnyway }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none"
    >
      <div className="relative mb-6">
        {/* Animated Rotating Smartphone */}
        <motion.div
          animate={{
            rotate: [0, 0, -90, -90, 0],
            scale: [1, 1.05, 1.1, 1.05, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: 'easeInOut',
            times: [0, 0.2, 0.5, 0.7, 1],
          }}
          className="w-20 h-20 rounded-3xl bg-slate-900 border-2 border-amber-400/80 shadow-[0_0_35px_rgba(251,191,36,0.35)] flex items-center justify-center"
        >
          <Smartphone className="w-10 h-10 text-amber-400" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.8, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute -inset-3 rounded-full bg-amber-400/10 -z-10 blur-md"
        />
      </div>

      <h2 className="font-display font-black text-2xl text-white tracking-wide mb-2">
        Please Rotate Your Device
      </h2>
      <p className="text-sm text-slate-300 max-w-xs mb-8 leading-relaxed">
        Rotate to <span className="text-amber-300 font-bold">Landscape mode</span> for the best UNO table experience — see all players, fanned cards, and center piles.
      </p>

      {onContinueAnyway && (
        <button
          type="button"
          onClick={onContinueAnyway}
          className="px-5 py-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-white/10 transition cursor-pointer"
        >
          Continue in Portrait Anyway
        </button>
      )}
    </motion.div>
  );
}

/**
 * Green Swirling Direction Indicator & Reverse Pop-up (Part 14 Issue 4)
 * - Animated green curved arc swirling around the discard & draw piles
 * - 500ms smooth flip transition when direction reverses
 * - Temporary "↺ REVERSED!" pop-up badge
 */
export function DirectionSwirl({ direction = 1 }) {
  const [showReverseBadge, setShowReverseBadge] = useState(false);
  const prevDirectionRef = useRef(direction);

  useEffect(() => {
    if (prevDirectionRef.current !== undefined && prevDirectionRef.current !== direction) {
      setShowReverseBadge(true);
      const timer = setTimeout(() => setShowReverseBadge(false), 2400);
      return () => clearTimeout(timer);
    }
    prevDirectionRef.current = direction;
  }, [direction]);

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
      {/* 500ms smooth flip container for SVG arc */}
      <motion.div
        animate={{ scaleX: direction === 1 ? 1 : -1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="relative w-full h-full flex items-center justify-center"
      >
        <motion.svg
          animate={{ rotate: direction === 1 ? 360 : -360 }}
          transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
          viewBox="0 0 200 200"
          className="w-[96%] h-[96%] overflow-visible opacity-80"
        >
          <defs>
            <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
              <stop offset="70%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="1" />
            </linearGradient>
            <filter id="greenGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Top Arc (Clockwise sweep with arrow head) */}
          <path
            d="M 30,100 A 70,70 0 0,1 170,100"
            fill="none"
            stroke="url(#emeraldGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="9 5"
            filter="url(#greenGlow)"
          />
          {/* Arrowhead at end of Top Arc (170, 100) */}
          <polygon
            points="170,92 182,106 166,104"
            fill="#34d399"
            filter="url(#greenGlow)"
          />

          {/* Bottom Arc (Clockwise sweep with arrow head) */}
          <path
            d="M 170,100 A 70,70 0 0,1 30,100"
            fill="none"
            stroke="url(#emeraldGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="9 5"
            filter="url(#greenGlow)"
          />
          {/* Arrowhead at end of Bottom Arc (30, 100) */}
          <polygon
            points="30,108 18,94 34,96"
            fill="#34d399"
            filter="url(#greenGlow)"
          />
        </motion.svg>
      </motion.div>

      {/* Temporary "↺ REVERSED!" pop-up badge */}
      <AnimatePresence>
        {showReverseBadge && (
          <motion.div
            initial={{ scale: 0.4, y: -25, opacity: 0 }}
            animate={{ scale: 1.15, y: -45, opacity: 1 }}
            exit={{ scale: 0.7, y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 20 }}
            className="absolute z-40 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-slate-950 font-display font-black text-xs sm:text-sm tracking-wide shadow-[0_0_30px_rgba(16,185,129,0.9)] border-2 border-white flex items-center gap-1.5"
          >
            <span className="text-base">↺</span>
            <span>REVERSED!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Turn Hint (Part 14 Issue 3)
 * Floating tooltip with curved animated arrow that appears for ~3 seconds when turn changes.
 * Never blocks card clicks and never wobbles cards.
 */
export function TurnHint({
  isMyTurn,
  turnSequence,
  activePlayerName,
  isAwaitingColor,
  hasDrawn,
  cardCount,
  saidUno,
}) {
  const [visible, setVisible] = useState(false);
  const [hintInfo, setHintInfo] = useState({ text: '', target: 'hand' });
  const dismissTimerRef = useRef(null);

  useEffect(() => {
    // Determine hint text & target
    let text = '';
    let target = 'hand';

    if (isMyTurn) {
      if (isAwaitingColor) {
        text = 'Pick a color for your Wild card!';
        target = 'center';
      } else if (cardCount === 1 && !saidUno) {
        text = 'Press UNO before anyone catches you!';
        target = 'uno';
      } else if (hasDrawn) {
        text = 'Play your drawn card or Pass!';
        target = 'hand';
      } else {
        text = 'Your turn! Tap a glowing card or Draw from Deck.';
        target = 'hand';
      }
    } else {
      text = `${activePlayerName || 'Opponent'}'s turn`;
      target = 'center';
    }

    setHintInfo({ text, target });
    setVisible(true);

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, 3200);

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [isMyTurn, turnSequence, isAwaitingColor, hasDrawn, cardCount, saidUno, activePlayerName]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: isMyTurn ? 15 : -15, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: isMyTurn ? 10 : -10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 360, damping: 22 }}
          onClick={() => setVisible(false)}
          className={`fixed z-40 pointer-events-auto cursor-pointer ${
            isMyTurn
              ? 'bottom-[22vh] left-1/2 -translate-x-1/2'
              : 'top-[16vh] left-1/2 -translate-x-1/2'
          }`}
        >
          <div
            className={`px-4 py-2 rounded-2xl border-2 backdrop-blur-xl shadow-2xl flex items-center gap-2.5 max-w-[85vw] ${
              isMyTurn
                ? 'bg-amber-400 text-slate-950 border-amber-200 shadow-[0_0_30px_rgba(251,191,36,0.6)] font-extrabold'
                : 'bg-slate-900/90 text-white border-white/20 shadow-xl font-bold'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
            <span className="text-xs sm:text-sm font-display tracking-tight truncate">
              {hintInfo.text}
            </span>
            {isMyTurn && (
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="shrink-0 text-slate-950 text-sm font-black"
              >
                ↓
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Large Red UNO Oval Button (Part 14 Layout Specification)
 * Positioned in Bottom-Right corner with pulsing glow when 1-2 cards in hand.
 */
export function UnoButton({ onCallUno, eligible, saidUno }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={onCallUno}
      disabled={saidUno}
      style={{
        width: 'clamp(80px, 9.5vw, 115px)',
        height: 'clamp(44px, 5.2vh, 56px)',
      }}
      className={`uno-tap-target rounded-full border-2 border-white flex items-center justify-center shadow-2xl cursor-pointer transition select-none ${
        saidUno
          ? 'bg-emerald-600 opacity-90 cursor-default'
          : eligible
          ? 'bg-gradient-to-br from-red-500 via-rose-600 to-red-700 shadow-[0_0_30px_rgba(239,68,68,0.9)] animate-pulse'
          : 'bg-gradient-to-br from-red-600 to-rose-800 opacity-90 hover:opacity-100 hover:scale-105'
      }`}
      title={saidUno ? 'UNO Called!' : 'Call UNO!'}
    >
      <div className="flex items-center gap-1 font-display font-black text-white text-base sm:text-lg tracking-wider drop-shadow-md">
        <Flame className="w-4 h-4 fill-yellow-300 text-yellow-300" />
        <span>{saidUno ? 'CALLED' : 'UNO!'}</span>
      </div>
    </motion.button>
  );
}

/**
 * Settings Gear Button for Bottom-Left Corner (Part 14 Layout Specification)
 */
export function SettingsButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 'clamp(40px, 5vmin, 48px)',
        height: 'clamp(40px, 5vmin, 48px)',
      }}
      className="uno-tap-target rounded-full bg-slate-900/90 hover:bg-slate-800 border-2 border-white/20 text-slate-200 shadow-xl flex items-center justify-center cursor-pointer transition hover:scale-105"
      title="Settings & Menu"
    >
      <Settings className="w-5 h-5 text-amber-400" />
    </button>
  );
}

/**
 * Fullscreen Detection & API Integration (Part 15)
 */
export function isFullscreen() {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

export function isFullscreenSupported() {
  if (typeof document === 'undefined' || typeof navigator === 'undefined') return false;
  const isIPhone = /iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIPhone) {
    // iPhone Safari only supports fullscreen on <video> elements, not произвольный DOM elements
    return false;
  }
  return Boolean(
    document.fullscreenEnabled ||
    document.webkitFullscreenEnabled ||
    document.mozFullScreenEnabled ||
    document.msFullscreenEnabled
  );
}

export async function enterFullscreen(el) {
  if (!el) return;
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
    } else if (el.mozRequestFullScreen) {
      await el.mozRequestFullScreen();
    } else if (el.msRequestFullscreen) {
      await el.msRequestFullscreen();
    }
  } catch {
    // Gracefully handle gesture or security rejections
  }
}

export async function exitFullscreen() {
  if (typeof document === 'undefined') return;
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      await document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      await document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      await document.msExitFullscreen();
    }
  } catch {
    // Gracefully handle
  }
}

/**
 * Fullscreen Toggle Button (Part 15 Specification)
 * - Toggles fullscreen on container element
 * - Synchronizes with browser fullscreenchange events (Esc key, browser exits)
 * - Auto-triggers resize event to resize game table
 * - Attempts mobile landscape orientation lock on enter, unlocks on exit
 * - Hides gracefully on unsupported devices (e.g. iPhone Safari)
 */
export function FullscreenButton({ containerRef }) {
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(isFullscreenSupported());
    setFullscreenActive(isFullscreen());
  }, []);

  useEffect(() => {
    const handleSync = () => {
      const active = isFullscreen();
      setFullscreenActive(active);

      // Part 15 Rule 6: Persist in sessionStorage (ephemeral to tab session)
      try {
        if (active) {
          sessionStorage.setItem('uno_fullscreen_preferred', 'true');
        } else {
          sessionStorage.removeItem('uno_fullscreen_preferred');
        }
      } catch {
        // Ignore sessionStorage errors
      }

      // Part 15 Rule 4: Dispatch window resize so game table auto-resizes seamlessly
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 250);
    };

    document.addEventListener('fullscreenchange', handleSync);
    document.addEventListener('webkitfullscreenchange', handleSync);
    document.addEventListener('mozfullscreenchange', handleSync);
    document.addEventListener('MSFullscreenChange', handleSync);

    return () => {
      document.removeEventListener('fullscreenchange', handleSync);
      document.removeEventListener('webkitfullscreenchange', handleSync);
      document.removeEventListener('mozfullscreenchange', handleSync);
      document.removeEventListener('MSFullscreenChange', handleSync);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    const targetEl = containerRef?.current || document.documentElement;

    if (!isFullscreen()) {
      await enterFullscreen(targetEl);
      // Part 15 Rule 5: Attempt landscape orientation lock on fullscreen enter
      try {
        if (window.screen?.orientation?.lock) {
          window.screen.orientation.lock('landscape').catch(() => {});
        }
      } catch {
        // Ignore
      }
    } else {
      await exitFullscreen();
      // Part 15 Rule 5: Release orientation lock on fullscreen exit
      try {
        if (window.screen?.orientation?.unlock) {
          window.screen.orientation.unlock();
        }
      } catch {
        // Ignore
      }
    }
  };

  if (!supported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleToggleFullscreen}
      style={{
        width: 'clamp(36px, 5vmin, 44px)',
        height: 'clamp(36px, 5vmin, 44px)',
      }}
      className={`uno-tap-target rounded-full bg-slate-900/90 hover:bg-slate-800 border-2 shadow-lg flex items-center justify-center cursor-pointer transition hover:scale-105 ${
        fullscreenActive
          ? 'border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.45)]'
          : 'border-white/20 hover:border-emerald-400/60 text-slate-200 hover:text-emerald-300'
      }`}
      title={fullscreenActive ? 'Exit Fullscreen' : 'Enter Fullscreen'}
    >
      {fullscreenActive ? (
        <Minimize className="w-4 h-4 sm:w-5 sm:h-5" />
      ) : (
        <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
      )}
    </button>
  );
}

