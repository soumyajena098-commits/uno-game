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
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[5]">
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
    </div>
  );
}

/**
 * Turn Hint (Part 18 Specification)
 * Floating hint box positioned directly on/near the discard pile:
 * - When you must play a card: "Tap a glowing card to play it" (arrow curves toward discard pile)
 * - When you must draw: "No matching card — tap Deck to draw" (arrow points at Deck)
 * - When color must be chosen: "Pick a color"
 * - Auto-dismisses after 3 seconds.
 * - Font >= 14px (clamp(14px, 2vmin, 18px)).
 * - Never wobbles cards.
 */
export function TurnHint({
  isMyTurn,
  hasPlayableCard,
  turnSequence,
  isAwaitingColor,
  hasDrawn,
  cardCount,
  saidUno,
}) {
  const [visible, setVisible] = useState(false);
  const [hintInfo, setHintInfo] = useState({ text: '', arrowType: 'play' });
  const dismissTimerRef = useRef(null);

  useEffect(() => {
    if (!isMyTurn) {
      setVisible(false);
      return;
    }

    let text = '';
    let arrowType = 'play';

    if (isAwaitingColor) {
      text = 'Pick a color';
      arrowType = 'color';
    } else if (cardCount === 1 && !saidUno) {
      text = 'Press UNO before anyone catches you!';
      arrowType = 'uno';
    } else if (hasDrawn) {
      text = 'Play your drawn card or Pass!';
      arrowType = 'pass';
    } else if (hasPlayableCard) {
      text = 'Tap a glowing card to play it';
      arrowType = 'play';
    } else {
      text = 'No matching card — tap Deck to draw';
      arrowType = 'draw';
    }

    setHintInfo({ text, arrowType });
    setVisible(true);

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, 3000);

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [isMyTurn, hasPlayableCard, turnSequence, isAwaitingColor, hasDrawn, cardCount, saidUno]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 360, damping: 22 }}
          onClick={() => setVisible(false)}
          className="pointer-events-auto cursor-pointer select-none my-1 z-30"
        >
          <div
            style={{ fontSize: 'clamp(14px, 2vmin, 18px)' }}
            className="px-4 py-1.5 sm:py-2 rounded-2xl border-2 backdrop-blur-xl shadow-[0_0_28px_rgba(251,191,36,0.65)] flex items-center gap-2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 border-white font-extrabold"
          >
            {hintInfo.arrowType === 'play' && (
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-950 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            )}

            {hintInfo.arrowType === 'draw' && (
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-950 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            )}

            {hintInfo.arrowType === 'color' && (
              <Sparkles className="w-5 h-5 text-purple-900 shrink-0 animate-spin" style={{ animationDuration: '4s' }} />
            )}

            <span className="font-display tracking-tight whitespace-nowrap">
              {hintInfo.text}
            </span>

            {hintInfo.arrowType === 'play' && (
              <span className="text-xs bg-slate-950 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
                ➜ Discard
              </span>
            )}
            {hintInfo.arrowType === 'draw' && (
              <span className="text-xs bg-slate-950 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                ◂ Deck
              </span>
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
      className={`uno-tap-target rounded-full border-2 flex items-center justify-center shadow-2xl cursor-pointer transition select-none ${
        saidUno
          ? 'bg-emerald-600 border-emerald-300 opacity-90 cursor-default'
          : eligible
          ? 'bg-gradient-to-br from-red-600 via-rose-700 to-[#8b1a1a] border-amber-300 ring-4 ring-yellow-400/90 shadow-[0_0_36px_rgba(212,175,55,0.95)] animate-pulse'
          : 'bg-gradient-to-br from-red-700 via-rose-800 to-[#5a0f0f] border-amber-400/60 opacity-90 hover:opacity-100 hover:scale-105 shadow-lg'
      }`}
      title={saidUno ? 'UNO Called!' : 'Call UNO!'}
    >
      <div className="flex items-center gap-1 font-display font-black text-amber-200 text-base sm:text-lg tracking-wider drop-shadow-md">
        <Flame className="w-4 h-4 fill-yellow-300 text-yellow-300 shrink-0" />
        <span className="relative px-1 border border-amber-300/60 rounded-full font-black">
          {saidUno ? 'CALLED' : 'UNO!'}
        </span>
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
 * Fullscreen API Integration & Global Fullscreen Button (Part 15 & 17)
 * Powered by global FullscreenContext so fullscreen state persists across Game and Results screens.
 */
export {
  FullscreenButton,
  useFullscreen,
  isFullscreen,
  isFullscreenSupported,
  enterFullscreen,
  exitFullscreen,
} from '../context/FullscreenContext.jsx';


