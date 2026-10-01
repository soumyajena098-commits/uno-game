import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useGameStore } from '../store/useGameStore.js';

/**
 * Fixed In-Game Notification Banner (Part 19)
 *
 * Anchored in the top-right corner, below the top-right button cluster.
 * Displays played cards, rank completions, wild colors, reverse, uno calls, etc.
 * Never overlaps the discard pile, player circles, or bottom hand cards.
 */
const COLOR_MAP = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  wild: '#a855f7',
};

export default function InGameNotificationBanner() {
  const inGameNotifications = useGameStore((s) => s.inGameNotifications || []);
  const removeInGameNotification = useGameStore((s) => s.removeInGameNotification);

  return (
    <aside
      aria-label="Game Events"
      aria-live="polite"
      role="status"
      style={{
        top: 'clamp(54px, 7.5vh, 76px)',
        right: 'clamp(10px, 2vw, 24px)',
      }}
      className="fixed z-40 flex flex-col items-end gap-2.5 pointer-events-none select-none max-w-[min(88vw,360px)]"
    >
      <AnimatePresence mode="popLayout">
        {inGameNotifications.map((notif) => {
          const resolvedColor =
            (notif.playerColor && COLOR_MAP[notif.playerColor.toLowerCase()]) ||
            notif.playerColor ||
            '#38bdf8';

          return (
            <motion.div
              key={notif.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.94 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.92, transition: { duration: 0.2, ease: 'easeIn' } }}
              transition={{ duration: 0.25, ease: 'easeOut', layout: { duration: 0.2 } }}
              style={{
                borderLeftColor: resolvedColor,
                borderLeftWidth: '5px',
                minWidth: 'clamp(240px, 26vw, 360px)',
                minHeight: 'clamp(48px, 6vh, 64px)',
                padding: '12px 16px',
              }}
              className="pointer-events-auto flex items-center justify-between gap-3 bg-slate-950/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_10px_32px_rgba(0,0,0,0.85)] max-w-full"
            >
            {/* Left: Icon & Message */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span
                style={{ fontSize: 'clamp(20px, 2.6vmin, 26px)' }}
                className="shrink-0 drop-shadow select-none flex items-center justify-center"
              >
                {notif.icon || '🃏'}
              </span>

              <p
                style={{ fontSize: 'clamp(14px, 1.8vmin, 18px)' }}
                className="font-display font-bold text-white leading-snug drop-shadow break-words"
              >
                {notif.message}
              </p>
            </div>

            {/* Right: Optional Quick Dismiss Button */}
            {removeInGameNotification && (
              <button
                type="button"
                onClick={() => removeInGameNotification(notif.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
                title="Dismiss"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        );
      })}
    </AnimatePresence>
  </aside>
);
}
