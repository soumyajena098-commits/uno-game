import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Shuffle,
  Minimize2,
  Music,
  Link2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_PLAYLIST_URL =
  import.meta.env.VITE_YOUTUBE_PLAYLIST_URL ||
  'https://www.youtube.com/playlist?list=PLofht4PTcKYnaH8w5olJCI-wUVxuoMHqM';

/**
 * Preloaded embed-enabled YouTube ambient / lofi / chill synth tracks
 * used alongside the YouTube playlist so random tracks play reliably
 * even if a specific playlist item is region-restricted.
 */
const CURATED_YOUTUBE_TRACKS = [
  { id: 'jfKfPfyJRdk', title: 'lofi hip hop radio — beats to relax/game to' },
  { id: '4xDzrJKXOOY', title: 'Synthwave Radio — Chill Retro Gaming Beats' },
  { id: '5yx6BWlEVcY', title: 'Chillhop Essentials — Cozy Tabletop Vibes' },
  { id: 'DWcJFNfaw9c', title: 'Ambient Space Lofi — Midnight Lounge' },
  { id: 'rUxyKA_-grg', title: 'Sleepy Fish — Chill Gaming Study Beats' },
  { id: '7NOSDKb0HlU', title: 'Lofi Girl — Late Night Card Table Session' },
  { id: 'n61ULEU7CO0', title: 'Best of Lofi Hip Hop — Instrumental Mix' },
];

function parseYouTubeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (
      !parsed.hostname.includes('youtube.com') &&
      !parsed.hostname.includes('youtu.be')
    ) {
      return null;
    }
    const listId = parsed.searchParams.get('list');
    const videoId =
      parsed.searchParams.get('v') ||
      (parsed.hostname.includes('youtu.be') ? parsed.pathname.slice(1) : null);

    if (!listId && !videoId) return null;
    return { listId, videoId, rawUrl: trimmed };
  } catch {
    return null;
  }
}

const MusicContext = createContext(null);

export function useMusic() {
  return useContext(MusicContext);
}

export function MusicProvider({ children }) {
  const [playlistUrl, setPlaylistUrl] = useState(
    () => localStorage.getItem('uno_youtube_playlist_url') || DEFAULT_PLAYLIST_URL
  );

  const parsedConfig = parseYouTubeUrl(playlistUrl);
  const [apiFailed, setApiFailed] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = Number(localStorage.getItem('uno_music_volume'));
    return Number.isFinite(saved) && saved >= 0 && saved <= 100 ? saved : 25;
  });
  const [muted, setMuted] = useState(
    () => localStorage.getItem('uno_music_muted') === 'true'
  );
  const [shuffle, setShuffle] = useState(
    () => localStorage.getItem('uno_music_shuffle') !== 'false'
  );
  const [isExpanded, setIsExpanded] = useState(
    () => localStorage.getItem('uno_music_expanded') === 'true'
  );
  const [isDucked, setIsDucked] = useState(false);

  const [trackIndex, setTrackIndex] = useState(() => {
    const savedIdx = Number(localStorage.getItem('uno_music_track_idx'));
    if (Number.isFinite(savedIdx) && savedIdx >= 0 && savedIdx < CURATED_YOUTUBE_TRACKS.length) {
      return savedIdx;
    }
    return Math.floor(Math.random() * CURATED_YOUTUBE_TRACKS.length);
  });

  const [currentTrack, setCurrentTrack] = useState(
    () => CURATED_YOUTUBE_TRACKS[trackIndex] || CURATED_YOUTUBE_TRACKS[0]
  );

  const playerRef = useRef(null);
  const isReadyRef = useRef(false);
  const wasPlayingBeforeHiddenRef = useRef(false);
  const isPlayingRef = useRef(false);
  const volumeRef = useRef(volume);
  const mutedRef = useRef(muted);
  const duckTimeoutRef = useRef(null);
  const fallbackTimerRef = useRef(null);
  const usePlaylistModeRef = useRef(Boolean(parsedConfig?.listId));

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    volumeRef.current = volume;
    localStorage.setItem('uno_music_volume', String(volume));
    if (playerRef.current && isReadyRef.current) {
      try {
        const effectiveVol = isDucked ? Math.max(4, Math.round(volume * 0.28)) : volume;
        playerRef.current.setVolume(effectiveVol);
      } catch {
        // Ignore player call errors
      }
    }
  }, [volume, isDucked]);

  useEffect(() => {
    mutedRef.current = muted;
    localStorage.setItem('uno_music_muted', String(muted));
    if (playerRef.current && isReadyRef.current) {
      try {
        if (muted) {
          playerRef.current.mute();
        } else {
          playerRef.current.unMute();
        }
      } catch {
        // Ignore player call errors
      }
    }
  }, [muted]);

  useEffect(() => {
    localStorage.setItem('uno_music_shuffle', String(shuffle));
    if (playerRef.current && isReadyRef.current) {
      try {
        playerRef.current.setShuffle(shuffle);
      } catch {
        // Ignore
      }
    }
  }, [shuffle]);

  useEffect(() => {
    localStorage.setItem('uno_music_expanded', String(isExpanded));
  }, [isExpanded]);

  const syncMetadataFromPlayer = useCallback(() => {
    if (!playerRef.current || !isReadyRef.current) return;
    try {
      const data = playerRef.current.getVideoData?.();
      if (data && data.video_id) {
        setCurrentTrack({
          id: data.video_id,
          title: data.title || currentTrack.title || 'UNO Ambient Radio',
        });
      }
    } catch {
      // Ignore metadata error
    }
  }, [currentTrack.title]);

  const playNextTrack = useCallback(
    (direction = 1) => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }

      setTrackIndex((prev) => {
        let nextIdx;
        if (shuffle && CURATED_YOUTUBE_TRACKS.length > 1) {
          do {
            nextIdx = Math.floor(Math.random() * CURATED_YOUTUBE_TRACKS.length);
          } while (nextIdx === prev);
        } else {
          nextIdx =
            (prev + direction + CURATED_YOUTUBE_TRACKS.length) %
            CURATED_YOUTUBE_TRACKS.length;
        }

        localStorage.setItem('uno_music_track_idx', String(nextIdx));
        const track = CURATED_YOUTUBE_TRACKS[nextIdx];
        setCurrentTrack(track);

        if (playerRef.current && isReadyRef.current) {
          try {
            if (usePlaylistModeRef.current && parsedConfig?.listId) {
              if (direction >= 0) {
                playerRef.current.nextVideo();
              } else {
                playerRef.current.previousVideo();
              }
            } else {
              playerRef.current.loadVideoById(track.id);
            }
          } catch {
            try {
              playerRef.current.loadVideoById(track.id);
            } catch {
              // Ignore
            }
          }
        }
        return nextIdx;
      });
    },
    [shuffle, parsedConfig?.listId]
  );

  // Load YouTube IFrame API lazily once
  useEffect(() => {
    if (!parsedConfig) return;

    let scriptTag = document.getElementById('youtube-iframe-api-script');
    if (!window.YT && !scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'youtube-iframe-api-script';
      scriptTag.src = 'https://www.youtube.com/iframe_api';
      scriptTag.async = true;
      scriptTag.onerror = () => {
        console.warn('[MusicPlayer] Failed to load YouTube IFrame API.');
        setApiFailed(true);
      };
      document.head.appendChild(scriptTag);
    }

    const createHiddenPlayer = () => {
      if (playerRef.current || !window.YT || !window.YT.Player) return;

      try {
        const randomStartIdx = Math.floor(Math.random() * 12);
        const initialTrack = CURATED_YOUTUBE_TRACKS[trackIndex] || CURATED_YOUTUBE_TRACKS[0];

        playerRef.current = new window.YT.Player('uno-hidden-yt-player', {
          width: '1',
          height: '1',
          videoId: parsedConfig.videoId || initialTrack.id,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              isReadyRef.current = true;
              try {
                event.target.setVolume(volumeRef.current);
                if (mutedRef.current) {
                  event.target.mute();
                } else {
                  event.target.unMute();
                }

                if (parsedConfig.listId) {
                  usePlaylistModeRef.current = true;
                  event.target.cuePlaylist({
                    list: parsedConfig.listId,
                    listType: 'playlist',
                    index: randomStartIdx,
                  });
                  event.target.setShuffle(true);
                  event.target.setLoop(true);
                }
              } catch {
                // Fallback to curated video IDs if playlist cue fails
                usePlaylistModeRef.current = false;
              }
            },
            onStateChange: (event) => {
              const YTState = window.YT?.PlayerState;
              if (!YTState) return;

              if (event.data === YTState.PLAYING) {
                if (fallbackTimerRef.current) {
                  clearTimeout(fallbackTimerRef.current);
                }
                setIsPlaying(true);
                syncMetadataFromPlayer();
              } else if (event.data === YTState.PAUSED) {
                if (!document.hidden) {
                  setIsPlaying(false);
                }
              } else if (event.data === YTState.ENDED) {
                playNextTrack(1);
              } else if (event.data === YTState.BUFFERING || event.data === YTState.UNSTARTED) {
                if (fallbackTimerRef.current) {
                  clearTimeout(fallbackTimerRef.current);
                }
                // 3-second watchdog in case a video stalls or cannot stream
                fallbackTimerRef.current = setTimeout(() => {
                  if (
                    playerRef.current &&
                    playerRef.current.getPlayerState?.() !== YTState.PLAYING &&
                    isPlayingRef.current
                  ) {
                    usePlaylistModeRef.current = false;
                    playNextTrack(1);
                  }
                }, 3500);
              }
            },
            onError: () => {
              // If playlist or video is region-locked/deleted, switch to curated track pool & auto-skip
              usePlaylistModeRef.current = false;
              playNextTrack(1);
            },
          },
        });
      } catch (err) {
        console.warn('[MusicPlayer] Error initializing YouTube player:', err);
        setApiFailed(true);
      }
    };

    if (window.YT && window.YT.Player) {
      createHiddenPlayer();
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === 'function') prevCallback();
        createHiddenPlayer();
      };
    }
  }, [parsedConfig, playNextTrack, syncMetadataFromPlayer, trackIndex]);

  // Start music when user clicks Create Game or Join Game (`uno:user-gesture`)
  useEffect(() => {
    const handleUserGesture = () => {
      setHasInteracted(true);
      if (playerRef.current && isReadyRef.current && !isPlayingRef.current) {
        try {
          playerRef.current.setVolume(volumeRef.current);
          playerRef.current.playVideo();
          setIsPlaying(true);
        } catch {
          // Ignore autoplay restriction
        }
      }
    };

    window.addEventListener('uno:user-gesture', handleUserGesture);
    return () => window.removeEventListener('uno:user-gesture', handleUserGesture);
  }, []);

  // Duck music briefly when UNO is called, a player finishes, or round ends (`uno:music-duck`)
  useEffect(() => {
    const handleDuck = () => {
      setIsDucked(true);
      if (duckTimeoutRef.current) {
        clearTimeout(duckTimeoutRef.current);
      }
      duckTimeoutRef.current = setTimeout(() => {
        setIsDucked(false);
      }, 2600);
    };

    window.addEventListener('uno:music-duck', handleDuck);
    return () => {
      window.removeEventListener('uno:music-duck', handleDuck);
      if (duckTimeoutRef.current) clearTimeout(duckTimeoutRef.current);
    };
  }, []);

  // Auto-pause when browser tab is hidden and resume when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!playerRef.current || !isReadyRef.current) return;
      try {
        if (document.hidden) {
          if (isPlayingRef.current) {
            wasPlayingBeforeHiddenRef.current = true;
            playerRef.current.pauseVideo();
          }
        } else if (wasPlayingBeforeHiddenRef.current) {
          wasPlayingBeforeHiddenRef.current = false;
          playerRef.current.playVideo();
          setIsPlaying(true);
        }
      } catch {
        // Ignore
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const togglePlay = useCallback(() => {
    setHasInteracted(true);
    if (!playerRef.current || !isReadyRef.current) return;
    try {
      if (isPlayingRef.current) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        playerRef.current.setVolume(volumeRef.current);
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch {
      // Fallback
    }
  }, []);

  const updateCustomPlaylistUrl = useCallback((newUrl) => {
    localStorage.setItem('uno_youtube_playlist_url', newUrl);
    setPlaylistUrl(newUrl);
    const nextParsed = parseYouTubeUrl(newUrl);
    if (nextParsed && playerRef.current && isReadyRef.current) {
      try {
        if (nextParsed.listId) {
          usePlaylistModeRef.current = true;
          playerRef.current.loadPlaylist({
            list: nextParsed.listId,
            listType: 'playlist',
            index: 0,
          });
          playerRef.current.setShuffle(true);
        } else if (nextParsed.videoId) {
          usePlaylistModeRef.current = false;
          playerRef.current.loadVideoById(nextParsed.videoId);
        }
      } catch {
        // Ignore
      }
    }
  }, []);

  const value = {
    isValid: Boolean(parsedConfig && !apiFailed),
    isPlaying,
    hasInteracted,
    volume,
    setVolume,
    muted,
    setMuted,
    shuffle,
    setShuffle,
    isExpanded,
    setIsExpanded,
    isDucked,
    currentTrack,
    togglePlay,
    nextTrack: () => playNextTrack(1),
    prevTrack: () => playNextTrack(-1),
    playlistUrl,
    updateCustomPlaylistUrl,
  };

  return (
    <MusicContext.Provider value={value}>
      {/* Hidden 1x1 off-screen YouTube IFrame container — video is completely invisible */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <div id="uno-hidden-yt-player" />
      </div>
      {children}
    </MusicContext.Provider>
  );
}

/**
 * MusicBox Widget — Positioned on the right-hand side above the Chat button.
 * Never overlaps the Chat button or the game table.
 */
export function MusicBox() {
  const music = useMusic();
  const [showUrlEditor, setShowUrlEditor] = useState(false);
  const [urlInput, setUrlInput] = useState(music?.playlistUrl || '');

  // If playlist link is missing/invalid or YouTube API failed, hide gracefully
  if (!music || !music.isValid) return null;

  const {
    isPlaying,
    hasInteracted,
    volume,
    setVolume,
    muted,
    setMuted,
    shuffle,
    setShuffle,
    isExpanded,
    setIsExpanded,
    isDucked,
    currentTrack,
    togglePlay,
    nextTrack,
    prevTrack,
    updateCustomPlaylistUrl,
  } = music;

  const thumbnailUrl = `https://i.ytimg.com/vi/${currentTrack.id}/hqdefault.jpg`;

  const handleSavePlaylist = (e) => {
    e.preventDefault();
    updateCustomPlaylistUrl(urlInput.trim());
    setShowUrlEditor(false);
  };

  const renderExpandedMusicCard = (isMobileSheet = false) => (
    <div
      style={
        isMobileSheet
          ? {
              width: '100vw',
              borderRadius: '20px 20px 0 0',
              paddingBottom: 'calc(0.9rem + env(safe-area-inset-bottom, 0px))',
            }
          : {
              width: 'clamp(268px, 25vw, 320px)',
            }
      }
      className="rounded-2xl bg-slate-950/95 backdrop-blur-2xl border border-white/20 p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.75)] text-white"
    >
      {isMobileSheet && (
        <div
          onClick={() => setIsExpanded(false)}
          className="pb-2.5 flex flex-col items-center justify-center cursor-pointer"
        >
          <div className="w-10 h-1.5 rounded-full bg-slate-600" />
        </div>
      )}

      {/* Top Row: Thumbnail + Now Playing Label + Scrolling Marquee Title + Collapse */}
      <div className="flex items-center gap-2.5">
        <div
          style={{
            width: 'clamp(38px, 5vmin, 46px)',
            height: 'clamp(38px, 5vmin, 46px)',
          }}
          className="relative rounded-xl overflow-hidden bg-slate-800 border border-white/15 shrink-0"
        >
          <img
            src={thumbnailUrl}
            alt={currentTrack.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
            <Music className="w-4 h-4 text-amber-300 drop-shadow" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span
              style={{ fontSize: 'var(--font-xs)' }}
              className="font-display font-extrabold uppercase tracking-wider text-amber-300"
            >
              {isDucked
                ? 'Now Playing (Ducked)'
                : isPlaying
                ? 'Now Playing'
                : 'Paused'}
            </span>
          </div>

          {/* Scrolling Marquee Track Title */}
          <div className="overflow-hidden whitespace-nowrap mt-0.5">
            <motion.p
              key={currentTrack.id}
              animate={{ x: ['0%', '-45%', '0%'] }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{ fontSize: 'var(--font-sm)' }}
              className="font-bold text-slate-100 inline-block pr-6"
            >
              {currentTrack.title}
            </motion.p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowUrlEditor((v) => !v)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-white/10 cursor-pointer transition"
            title="Change YouTube Playlist Link"
          >
            <Link2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition"
            title="Collapse Music Box"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Optional Playlist URL Editor Popover */}
      <AnimatePresence>
        {showUrlEditor && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleSavePlaylist}
            className="mt-2 pt-2 border-t border-white/10 flex items-center gap-1.5 overflow-hidden"
          >
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste YouTube Playlist URL..."
              style={{ fontSize: 'var(--font-xs)' }}
              className="flex-1 bg-slate-900 border border-white/15 rounded-lg px-2 py-1 text-white focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              style={{ fontSize: 'var(--font-xs)' }}
              className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-bold cursor-pointer"
            >
              Load
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Controls Row: Prev | Play/Pause | Next | Shuffle | Mute + Volume Slider */}
      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevTrack}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 cursor-pointer transition"
            title="Previous Track"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="p-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shadow cursor-pointer transition"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-slate-950" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-slate-950" />
            )}
          </button>

          <button
            type="button"
            onClick={nextTrack}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 cursor-pointer transition"
            title="Next Random Track"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setShuffle((s) => !s)}
            className={`p-2 rounded-lg cursor-pointer transition ${
              shuffle
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/40'
                : 'bg-slate-900 text-slate-500 hover:text-slate-300'
            }`}
            title={shuffle ? 'Shuffle ON' : 'Shuffle OFF'}
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Volume Mute + Slider */}
        <div className="flex items-center gap-1.5 flex-1 max-w-[120px]">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="p-1 text-slate-300 hover:text-white cursor-pointer"
            title={muted ? 'Unmute Music' : 'Mute Music'}
          >
            {muted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-amber-300" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : volume}
            onChange={(e) => {
              const nextVol = Number(e.target.value);
              setVolume(nextVol);
              if (nextVol > 0 && muted) setMuted(false);
            }}
            className="w-full h-1.5 accent-amber-400 bg-slate-800 rounded-lg cursor-pointer"
            title={`Volume: ${muted ? 0 : volume}%`}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative flex flex-col items-end pointer-events-auto">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          /* Collapsed Music-Note Icon + Optional First-Time "Play background music" Prompt */
          <motion.div
            key="music-collapsed"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-2"
          >
            {!hasInteracted && !isPlaying && (
              <button
                type="button"
                onClick={togglePlay}
                style={{ fontSize: 'var(--font-xs)' }}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/95 hover:bg-slate-800 border border-amber-400/40 text-amber-300 font-bold shadow-xl cursor-pointer transition"
              >
                🔊 Play background music
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              style={{
                width: 'var(--fab-size)',
                height: 'var(--fab-size)',
              }}
              className={`uno-tap-target relative rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center justify-center cursor-pointer transition hover:scale-105 ${
                isPlaying
                  ? 'bg-slate-900/95 border-amber-400/70 text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                  : 'bg-slate-900/90 border-white/20 text-slate-200 hover:text-white'
              }`}
              title="Open YouTube Background Music Player"
            >
              <span style={{ fontSize: 'clamp(1rem, 2.2vmin, 1.35rem)' }} className="leading-none">
                🎵
              </span>
              {isPlaying && (
                <span className="absolute -bottom-1 -right-1 flex items-end gap-0.5 px-1 py-0.5 rounded-full bg-emerald-500 border border-slate-950">
                  <span className="w-0.5 h-2 bg-slate-950 animate-pulse" />
                  <span className="w-0.5 h-2.5 bg-slate-950 animate-pulse" />
                  <span className="w-0.5 h-1.5 bg-slate-950 animate-pulse" />
                </span>
              )}
            </button>
          </motion.div>
        ) : (
          /* Expanded Music Box: Desktop Floating Card + Mobile Bottom Sheet */
          <motion.div
            key="music-expanded"
            initial={{ opacity: 0, scale: 0.92, x: 16 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.92, x: 16 }}
            transition={{ duration: 0.2 }}
          >
            {/* Desktop Floating Card */}
            <div className="hidden md:block">
              {renderExpandedMusicCard(false)}
            </div>

            {/* Mobile Bottom Sheet (< 768px) */}
            <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-xs">
              {renderExpandedMusicCard(true)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
