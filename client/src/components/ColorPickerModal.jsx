import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

const COLOR_OPTIONS = [
  {
    id: 'red',
    label: 'Red',
    bg: 'from-red-500 to-red-700',
    ring: 'hover:ring-red-400',
  },
  {
    id: 'yellow',
    label: 'Yellow',
    bg: 'from-amber-400 to-yellow-600',
    ring: 'hover:ring-yellow-300',
  },
  {
    id: 'green',
    label: 'Green',
    bg: 'from-emerald-500 to-green-700',
    ring: 'hover:ring-emerald-400',
  },
  {
    id: 'blue',
    label: 'Blue',
    bg: 'from-blue-500 to-indigo-700',
    ring: 'hover:ring-blue-400',
  },
];

export default function ColorPickerModal({ isOpen, onSelectColor, onCancel, cardType }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ scale: 0.85, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 20 }}
            className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-white/15 p-6 shadow-2xl text-center"
          >
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
                title="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              {cardType === 'wild4' ? 'WILD DRAW FOUR (+4)' : 'WILD CARD'}
            </div>

            <h3 className="font-display text-2xl font-bold text-white mb-1">
              Declare Next Color
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Choose the active suit color for the table:
            </p>

            <div className="grid grid-cols-2 gap-4">
              {COLOR_OPTIONS.map((c) => (
                <motion.button
                  key={c.id}
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSelectColor(c.id)}
                  className={`h-24 rounded-2xl bg-gradient-to-br ${c.bg} border-2 border-white/40 shadow-lg flex flex-col items-center justify-center gap-1 hover:ring-4 ${c.ring} transition cursor-pointer`}
                >
                  <span className="font-display text-xl font-bold text-white drop-shadow">
                    {c.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
