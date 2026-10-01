import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Maximize, Minimize } from 'lucide-react';

const FullscreenContext = createContext({
  isFullscreen: false,
  isSupported: true,
  toggleFullscreen: () => {},
  enterFullscreen: () => {},
  exitFullscreen: () => {},
});

export function isDocumentFullscreen() {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

export const isFullscreen = isDocumentFullscreen;

export function isFullscreenSupported() {
  if (typeof document === 'undefined' || typeof navigator === 'undefined') return false;
  const isIPhone = /iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIPhone) {
    // iPhone Safari only supports fullscreen on <video> elements
    return false;
  }
  return Boolean(
    document.fullscreenEnabled ||
    document.webkitFullscreenEnabled ||
    document.mozFullScreenEnabled ||
    document.msFullscreenEnabled
  );
}

export async function enterFullscreen(targetEl) {
  const el = targetEl || (typeof document !== 'undefined' ? document.documentElement : null);
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

    // Trap one back-press to exit fullscreen naturally on mobile (Part 19)
    try {
      if (typeof window !== 'undefined' && !window.history.state?.unoFullscreen) {
        window.history.pushState({ unoFullscreen: true }, '');
      }
    } catch {
      // Ignore
    }

    try {
      if (typeof window !== 'undefined' && window.screen?.orientation?.lock) {
        window.screen.orientation.lock('landscape').catch(() => {});
      }
    } catch {
      // Ignore
    }
  } catch {
    // Ignore
  }
}

let isHandlingPopState = false;

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

    try {
      if (typeof window !== 'undefined' && window.screen?.orientation?.unlock) {
        window.screen.orientation.unlock();
      }
    } catch {
      // Ignore
    }

    // Clean up trapped history state if present (avoid double-back when popstate already fired)
    try {
      if (!isHandlingPopState && typeof window !== 'undefined' && window.history.state?.unoFullscreen) {
        window.history.back();
      }
    } catch {
      // Ignore
    }
  } catch {
    // Ignore
  }
}

export function FullscreenProvider({ children }) {
  const [fullscreenActive, setFullscreenActive] = useState(() => isDocumentFullscreen());
  const [supported, setSupported] = useState(() => isFullscreenSupported());

  // Part 19 Rule B & D: Reset Fullscreen State on App Start / Reload
  // Never auto-restore fullscreen without a direct user gesture
  useEffect(() => {
    setSupported(isFullscreenSupported());
    if (isDocumentFullscreen()) {
      exitFullscreen();
    }
    setFullscreenActive(false);

    try {
      sessionStorage.removeItem('uno_fullscreen_preferred');
    } catch {
      // Ignore
    }
  }, []);

  const handleSync = useCallback(() => {
    const active = isDocumentFullscreen();
    setFullscreenActive(active);

    // Trigger window resize so game table auto-resizes seamlessly
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 250);
  }, []);

  // Listen for fullscreen change events across all vendor prefixes
  useEffect(() => {
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
  }, [handleSync]);

  // Part 19 Rule A & F: Detect Leaving Fullscreen on Visibility, Focus & PageShow Changes
  // If app is backgrounded, user switches tabs, or exits via 3-dot menu, drop fullscreen immediately
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isDocumentFullscreen()) {
        exitFullscreen();
      }
    };

    const handlePageShow = () => {
      if (isDocumentFullscreen()) {
        exitFullscreen();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  // Part 19 Rule E: Intercept Android Back Navigation to Exit Fullscreen First
  useEffect(() => {
    const handlePopState = () => {
      if (isDocumentFullscreen()) {
        // Exit fullscreen on first back press instead of navigating away
        isHandlingPopState = true;
        exitFullscreen().finally(() => {
          setTimeout(() => {
            isHandlingPopState = false;
          }, 120);
        });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleEnterFullscreen = useCallback(async (targetEl) => {
    await enterFullscreen(targetEl);
  }, []);

  const handleExitFullscreen = useCallback(async () => {
    await exitFullscreen();
  }, []);

  const toggleFullscreen = useCallback(
    async (targetEl) => {
      if (isDocumentFullscreen()) {
        await exitFullscreen();
      } else {
        await enterFullscreen(targetEl);
      }
    },
    []
  );

  return (
    <FullscreenContext.Provider
      value={{
        isFullscreen: fullscreenActive,
        isSupported: supported,
        toggleFullscreen,
        enterFullscreen: handleEnterFullscreen,
        exitFullscreen: handleExitFullscreen,
      }}
    >
      {children}
    </FullscreenContext.Provider>
  );
}

export function useFullscreen() {
  return useContext(FullscreenContext);
}

/**
 * Universal Fullscreen Toggle Button (Part 17 & 19)
 * Consumes global FullscreenContext so state persists across all screens and modals.
 */
export function FullscreenButton({ className, containerRef }) {
  const { isFullscreen, isSupported, toggleFullscreen } = useFullscreen();

  if (!isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => toggleFullscreen(containerRef?.current)}
      style={{
        width: 'clamp(36px, 5vmin, 44px)',
        height: 'clamp(36px, 5vmin, 44px)',
      }}
      className={`uno-tap-target rounded-full bg-slate-900/90 hover:bg-slate-800 border-2 shadow-lg flex items-center justify-center cursor-pointer transition hover:scale-105 shrink-0 ${
        isFullscreen
          ? 'border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.45)]'
          : 'border-white/20 hover:border-emerald-400/60 text-slate-200 hover:text-emerald-300'
      } ${className || ''}`}
      title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
    >
      {isFullscreen ? (
        <Minimize className="w-4 h-4 sm:w-5 sm:h-5" />
      ) : (
        <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
      )}
    </button>
  );
}
