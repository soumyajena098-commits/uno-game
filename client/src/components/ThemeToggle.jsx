import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useGameStore } from '../store/useGameStore.js';

/**
 * Royal Casino Theme Toggle Button (Part 21)
 *
 * Toggles between Dark Mode (deep emerald casino felt at night)
 * and Light Mode (soft emerald casino felt by day).
 * Icon: ☀️ for light mode, 🌙 for dark mode.
 */
export default function ThemeToggle({ className = '', style = {} }) {
  const theme = useGameStore((s) => s.theme);
  const toggleTheme = useGameStore((s) => s.toggleTheme);
  const reduceMotion = useGameStore((s) => s.reduceMotion);

  const isDark = theme === 'dark';

  return (
    <motion.button
      type="button"
      whileTap={reduceMotion ? undefined : { scale: 0.9 }}
      whileHover={reduceMotion ? undefined : { scale: 1.05 }}
      onClick={toggleTheme}
      style={{
        width: 'clamp(36px, 5vmin, 44px)',
        height: 'clamp(36px, 5vmin, 44px)',
        borderColor: 'var(--gold-border, rgba(212, 175, 55, 0.45))',
        ...style,
      }}
      className={`uno-tap-target rounded-full bg-slate-900/90 hover:bg-slate-800 border-2 text-amber-300 shadow-lg flex items-center justify-center cursor-pointer transition select-none ${className}`}
      title={isDark ? 'Switch to Light Mode (Day Casino)' : 'Switch to Dark Mode (Night Casino)'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <motion.div
        key={theme}
        initial={reduceMotion ? false : { rotate: -30, opacity: 0, scale: 0.8 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        exit={{ rotate: 30, opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-center"
      >
        {isDark ? (
          <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
        ) : (
          <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
        )}
      </motion.div>
    </motion.button>
  );
}
