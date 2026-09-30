import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from './store/useGameStore.js';
import HomePage from './pages/HomePage.jsx';
import LobbyPage from './pages/LobbyPage.jsx';
import GamePage from './pages/GamePage.jsx';

export default function App() {
  const { initSocket, toasts } = useGameStore();

  useEffect(() => {
    initSocket();
  }, [initSocket]);

  return (
    <div className="relative min-h-screen">
      {/* Global Real-Time Toast Notifications */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none w-full max-w-md px-4">
        <AnimatePresence>
          {toasts.map((toast) => {
            const styleMap = {
              error: 'bg-rose-600/95 border-rose-300 text-white',
              warning: 'bg-amber-500/95 border-yellow-200 text-slate-950',
              success: 'bg-emerald-500/95 border-emerald-200 text-slate-950',
              uno: 'bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 border-white text-slate-950',
              info: 'bg-slate-900/95 border-white/20 text-white',
            };
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.9 }}
                className={`px-4 py-2.5 rounded-2xl border shadow-2xl font-display font-bold text-xs sm:text-sm text-center backdrop-blur-md ${
                  styleMap[toast.type] || styleMap.info
                }`}
              >
                {toast.message}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Application Routes */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/join/:roomId" element={<HomePage />} />
        <Route path="/lobby/:roomId" element={<LobbyPage />} />
        <Route path="/game/:roomId" element={<GamePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
