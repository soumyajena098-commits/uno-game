/**
 * Zustand Store for UNO Multiplayer Real-Time State (Parts 1, 2 & 3 Complete)
 */

import { create } from 'zustand';
import { io } from 'socket.io-client';
import { soundEngine } from '../utils/sound.js';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? window.location.origin
    : 'http://localhost:3001');

// Ephemeral session-only player ID in memory (never stored in localStorage/sessionStorage)
const IN_MEMORY_PLAYER_ID = `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

function formatCardPlayedText(card, activeColor) {
  if (!card) return '';
  const colorStr = (card.color || activeColor || '').toUpperCase();
  if (card.type === 'number') return `${colorStr} ${card.value}`;
  if (card.type === 'skip') return `${colorStr} SKIP`;
  if (card.type === 'reverse') return `${colorStr} REVERSE`;
  if (card.type === 'draw2') return `${colorStr} +2`;
  if (card.type === 'wild') return `Wild (Color: ${(activeColor || '').toUpperCase()})`;
  if (card.type === 'wild4') return `Wild +4 (Color: ${(activeColor || '').toUpperCase()})`;
  return `${colorStr} ${card.type}`.trim();
}

export const useGameStore = create((set, get) => ({
  socket: null,
  connected: false,
  playerId: IN_MEMORY_PLAYER_ID,
  // Only the player name may be remembered for convenience on the landing screen (removable & never tied to any score)
  playerName: localStorage.getItem('uno_player_name') || '',
  soundEnabled: soundEngine.enabled,

  // Accessibility & Visual Preferences
  colorBlindMode: localStorage.getItem('uno_colorblind') === 'true',
  reduceMotion: localStorage.getItem('uno_reducemotion') === 'true',

  // Authoritative Room & Game State synced from server (ephemeral in-memory only)
  gameState: null,
  toasts: [],
  inGameNotifications: [], // Array of { id, message, icon, type, playerColor, durationMs, createdAt }
  floatingReactions: [], // Array of { id, playerId, playerName, emoji }

  // Local UI state
  pendingWildCard: null,
  lastPlayedAnnouncement: null,
  isChatOpen: false,
  chatPingEnabled: true,
  unreadChatCount: 0,
  mutedPlayerIds: [],

  setPlayerName: (name) => {
    const clean = String(name || '');
    if (clean.trim()) {
      localStorage.setItem('uno_player_name', clean);
    } else {
      localStorage.removeItem('uno_player_name');
    }
    set({ playerName: clean });
    const socket = get().socket;
    if (socket && clean.trim()) {
      socket.emit('set_player_name', { playerName: clean });
    }
  },

  clearSavedPlayerName: () => {
    localStorage.removeItem('uno_player_name');
    set({ playerName: '' });
  },

  clearEphemeralLeaderboard: () => {
    set((state) => {
      if (!state.gameState) return state;
      return {
        gameState: {
          ...state.gameState,
          roundSummary: null,
          finalLeaderboard: null,
          leaderboard: [],
        },
      };
    });
  },

  toggleColorBlindMode: () => {
    const next = !get().colorBlindMode;
    localStorage.setItem('uno_colorblind', String(next));
    set({ colorBlindMode: next });
  },

  toggleReduceMotion: () => {
    const next = !get().reduceMotion;
    localStorage.setItem('uno_reducemotion', String(next));
    set({ reduceMotion: next });
  },

  setChatOpen: (open) => {
    const val = Boolean(open);
    localStorage.setItem('uno_chat_open', String(val));
    set({
      isChatOpen: val,
      unreadChatCount: val ? 0 : get().unreadChatCount,
    });
  },

  toggleChatPing: () => {
    const next = !get().chatPingEnabled;
    localStorage.setItem('uno_chat_ping', String(next));
    set({ chatPingEnabled: next });
  },

  toggleMutePlayer: (targetId) => {
    set((state) => {
      const exists = state.mutedPlayerIds.includes(targetId);
      return {
        mutedPlayerIds: exists
          ? state.mutedPlayerIds.filter((id) => id !== targetId)
          : [...state.mutedPlayerIds, targetId],
      };
    });
  },

  toggleSound: () => {
    const next = !get().soundEnabled;
    soundEngine.setEnabled(next);
    set({ soundEnabled: next });
  },

  addToast: (message, type = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set((state) => ({
      toasts: [...state.toasts.slice(-4), { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3600);
  },

  addInGameNotification: ({ message, icon = '🃏', type = 'info', playerColor = null, durationMs = 2500 }) => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newNotif = {
      id,
      message,
      icon,
      type,
      playerColor,
      durationMs,
      createdAt: Date.now(),
    };
    set((state) => ({
      // If more than 3 notifications are queued, older ones fade out immediately (keep at most 3 total)
      inGameNotifications: [...state.inGameNotifications.slice(-2), newNotif],
    }));
    setTimeout(() => {
      get().removeInGameNotification(id);
    }, durationMs);
    return id;
  },

  removeInGameNotification: (id) => {
    set((state) => ({
      inGameNotifications: state.inGameNotifications.filter((n) => n.id !== id),
    }));
  },

  initSocket: () => {
    const existing = get().socket;
    if (existing) return existing;

    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      set({ connected: true });
      const currentRoomId = get().gameState?.roomId;
      if (currentRoomId) {
        socket.emit('join_room', {
          roomId: currentRoomId,
          playerName: get().playerName || 'Player',
          playerId: get().playerId,
        });
      }
    });

    socket.on('disconnect', () => {
      set({ connected: false });
    });

    socket.on('sync_state', (state) => {
      set({ gameState: state });
    });

    socket.on('turn_started', ({ playerId: activeId, endsAt, turnStartedAt, serverNow, turnSequence }) => {
      set((state) => {
        if (!state.gameState) return state;
        return {
          gameState: {
            ...state.gameState,
            activePlayerId: activeId,
            endsAt,
            turnDeadline: endsAt,
            turnStartedAt,
            serverNow,
            turnSequence,
            players: (state.gameState.players || []).map((p) => ({
              ...p,
              isTurn: !p.finished && p.id === activeId,
            })),
          },
        };
      });
    });

    socket.on('player_finished', ({ playerName, rank }) => {
      soundEngine.winFanfare();
      const msg = `🏆 ${playerName} emptied their hand — Finished Rank #${rank}!`;
      get().addToast(msg, 'success');
      get().addInGameNotification({
        message: msg,
        icon: '🏆',
        type: 'success',
        playerColor: '#10b981',
        durationMs: 3000,
      });
    });

    socket.on('reaction_sent', (reaction) => {
      set((state) => ({
        floatingReactions: [...state.floatingReactions.slice(-8), reaction],
      }));
      setTimeout(() => {
        set((state) => ({
          floatingReactions: state.floatingReactions.filter((r) => r.id !== reaction.id),
        }));
      }, 2400);
    });

    socket.on('player_played_card', (payload) => {
      soundEngine.playCard();
      const { card, activeColor, playerName } = payload || {};
      const cardText = formatCardPlayedText(card, activeColor);
      let icon = '🃏';
      let effectText = '';
      if (card?.type === 'reverse') {
        icon = '🔄';
        effectText = ' (Reversed ↺)';
      } else if (card?.type === 'skip') {
        icon = '🚫';
        effectText = ' (Skip 🚫)';
      } else if (card?.type === 'draw2') {
        icon = '💥';
        effectText = ' (+2 Cards)';
      } else if (card?.type === 'wild4') {
        icon = '💥';
        effectText = ' (+4 Cards)';
      } else if (card?.type === 'wild') {
        icon = '🌈';
      }

      const cardColor = card?.color || activeColor || 'blue';
      get().addInGameNotification({
        message: `${playerName || 'Player'} played ${cardText}${effectText}`,
        icon,
        type: 'play',
        playerColor: cardColor,
        durationMs: 2500,
      });

      const announcementId = `play_${Date.now()}`;
      set({
        lastPlayedAnnouncement: {
          ...payload,
          announcementId,
        },
      });

      setTimeout(() => {
        set((state) =>
          state.lastPlayedAnnouncement?.announcementId === announcementId
            ? { lastPlayedAnnouncement: null }
            : state
        );
      }, 2000);
    });

    socket.on('card_drawn', (payload) => {
      soundEngine.drawCard();
      const pName = payload?.playerName;
      if (pName) {
        const isMe = payload?.playerId === get().playerId;
        get().addInGameNotification({
          message: `${isMe ? 'You' : pName} drew a card`,
          icon: '📥',
          type: 'draw',
          durationMs: 2000,
        });
      }
    });

    socket.on('uno_called', ({ playerName }) => {
      soundEngine.callUno();
      const msg = `🚨 ${playerName} yelled UNO!`;
      get().addToast(msg, 'uno');
      get().addInGameNotification({
        message: msg,
        icon: '🚨',
        type: 'uno',
        playerColor: '#ef4444',
        durationMs: 3000,
      });
    });

    socket.on('uno_caught', ({ callerName, targetName }) => {
      soundEngine.errorBuzz();
      const msg = `⚡ ${callerName} caught ${targetName} not saying UNO! (+2 Penalty Cards)`;
      get().addToast(msg, 'error');
      get().addInGameNotification({
        message: msg,
        icon: '⚡',
        type: 'warning',
        playerColor: '#eab308',
        durationMs: 3000,
      });
    });

    socket.on('turn_timeout', ({ message }) => {
      soundEngine.errorBuzz();
      get().addToast(`⏱️ ${message}`, 'warning');
      get().addInGameNotification({
        message: `⏱️ ${message}`,
        icon: '⏱️',
        type: 'warning',
        durationMs: 2500,
      });
    });

    socket.on('round_over', ({ roundSummary }) => {
      soundEngine.winFanfare();
      const msg = `🏁 Round ${roundSummary.roundNumber} ended! 🥇 1st Place: ${roundSummary.winnerName}`;
      get().addToast(msg, 'success');
      get().addInGameNotification({
        message: msg,
        icon: '🏁',
        type: 'success',
        playerColor: '#eab308',
        durationMs: 3000,
      });
    });

    socket.on('game_over', ({ winner }) => {
      soundEngine.winFanfare();
      const msg = `🏆 ${winner.name} won the match with ${winner.totalScore} points!`;
      get().addToast(msg, 'success');
      get().addInGameNotification({
        message: msg,
        icon: '🏆',
        type: 'success',
        playerColor: '#eab308',
        durationMs: 3000,
      });
    });

    socket.on('system_message', (msg) => {
      const text = msg?.text || '';
      if (
        text.includes('joined the room') ||
        text.includes('left the room') ||
        text.includes('disconnected') ||
        text.includes('reconnected')
      ) {
        get().addInGameNotification({
          message: text,
          icon: text.includes('left') || text.includes('disconnected') ? '👋' : '👤',
          type: 'info',
          durationMs: 2000,
        });
      }
    });

    socket.on('room_destroyed', ({ reason }) => {
      // Immediately discard all client-side copies of scores, leaderboard, and room state
      set({
        gameState: null,
        pendingWildCard: null,
        lastPlayedAnnouncement: null,
        inGameNotifications: [],
        unreadChatCount: 0,
      });
      if (reason) {
        get().addToast(reason, 'info');
      }
    });

    socket.on('kicked_from_room', ({ message }) => {
      soundEngine.errorBuzz();
      get().addToast(message || 'Removed from room.', 'error');
      set({ gameState: null });
    });

    socket.on('chat_message', (msg) => {
      set((state) => {
        if (!state.gameState) return state;
        const existingMsgs = state.gameState.chatMessages || [];
        if (existingMsgs.some((m) => m.id === msg.id)) return state;
        const isMuted = state.mutedPlayerIds.includes(msg.playerId);
        const shouldIncrementUnread =
          !state.isChatOpen && !isMuted && msg.playerId !== state.playerId;

        if (shouldIncrementUnread && state.chatPingEnabled) {
          soundEngine.chatPing();
        }

        return {
          unreadChatCount: shouldIncrementUnread
            ? state.unreadChatCount + 1
            : state.unreadChatCount,
          gameState: {
            ...state.gameState,
            chatMessages: [...existingMsgs, msg],
          },
        };
      });
    });

    set({ socket });
    return socket;
  },

  createRoom: (playerName, settings = {}) =>
    new Promise((resolve) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('uno:user-gesture'));
      }
      const socket = get().initSocket();
      const cleanName = (playerName || get().playerName || 'Player_1').trim();
      get().setPlayerName(cleanName);

      let settled = false;
      const timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          soundEngine.errorBuzz();
          get().addToast('Creating room timed out. Please check your connection.', 'error');
          resolve({ error: 'Connection timed out. Please try again.' });
        }
      }, 5000);

      const doEmit = () => {
        socket.emit(
          'create_room',
          {
            playerName: cleanName,
            playerId: get().playerId,
            settings,
          },
          (res) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            if (res?.error) {
              soundEngine.errorBuzz();
              get().addToast(res.error, 'error');
            } else if (res?.state) {
              set({ gameState: res.state });
            }
            resolve(res);
          }
        );
      };

      if (socket.connected) {
        doEmit();
      } else {
        socket.once('connect', () => {
          if (!settled) doEmit();
        });
      }
    }),

  joinRoom: (roomId, playerName) =>
    new Promise((resolve) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('uno:user-gesture'));
      }
      const socket = get().initSocket();
      const cleanName = (playerName || get().playerName || 'Player').trim();
      get().setPlayerName(cleanName);
      const cleanRoomId = String(roomId || '').trim().toUpperCase();

      let settled = false;
      const timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          soundEngine.errorBuzz();
          get().addToast('Joining room timed out. Please check the room code & connection.', 'error');
          resolve({ error: 'Connection timed out. Please try again.' });
        }
      }, 5000);

      const doEmit = () => {
        socket.emit(
          'join_room',
          {
            roomId: cleanRoomId,
            playerName: cleanName,
            playerId: get().playerId,
          },
          (res) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            if (res?.error) {
              soundEngine.errorBuzz();
              get().addToast(res.error, 'error');
            } else if (res?.state) {
              set({ gameState: res.state });
            }
            resolve(res);
          }
        );
      };

      if (socket.connected) {
        doEmit();
      } else {
        socket.once('connect', () => {
          if (!settled) doEmit();
        });
      }
    }),

  leaveRoom: () => {
    const socket = get().socket;
    const roomId = get().gameState?.roomId;
    if (socket && roomId) {
      socket.emit('leave_room', { roomId, playerId: get().playerId });
    }
    set({ gameState: null, pendingWildCard: null, unreadChatCount: 0 });
  },

  selectGameMode: (playerMode, botDifficulty) => {
    const socket = get().socket;
    const roomId = get().gameState?.roomId;
    if (!socket || !roomId) return;
    socket.emit(
      'select_game_mode',
      {
        roomId,
        playerId: get().playerId,
        playerMode,
        botDifficulty,
      },
      (res) => {
        if (res?.error) get().addToast(res.error, 'error');
      }
    );
  },

  toggleReady: () => {
    const socket = get().socket;
    const roomId = get().gameState?.roomId;
    if (!socket || !roomId) return;
    socket.emit('toggle_ready', { roomId, playerId: get().playerId }, (res) => {
      if (res?.error) get().addToast(res.error, 'error');
    });
  },

  updateSettings: (settings) => {
    const socket = get().socket;
    const roomId = get().gameState?.roomId;
    if (!socket || !roomId) return;
    socket.emit('update_settings', { roomId, playerId: get().playerId, settings }, (res) => {
      if (res?.error) get().addToast(res.error, 'error');
    });
  },

  addBot: () => {
    const socket = get().socket;
    const roomId = get().gameState?.roomId;
    if (!socket || !roomId) return;
    socket.emit('add_bot', { roomId, playerId: get().playerId }, (res) => {
      if (res?.error) {
        soundEngine.errorBuzz();
        get().addToast(res.error, 'error');
      }
    });
  },

  removeBot: (botId) => {
    const socket = get().socket;
    const roomId = get().gameState?.roomId;
    if (!socket || !roomId) return;
    socket.emit('remove_bot', { roomId, playerId: get().playerId, botId }, (res) => {
      if (res?.error) {
        soundEngine.errorBuzz();
        get().addToast(res.error, 'error');
      }
    });
  },

  kickPlayer: (targetPlayerId) => {
    const socket = get().socket;
    const roomId = get().gameState?.roomId;
    if (!socket || !roomId) return;
    socket.emit(
      'kick_player',
      { roomId, hostPlayerId: get().playerId, targetPlayerId },
      (res) => {
        if (res?.error) get().addToast(res.error, 'error');
      }
    );
  },

  startGame: (isNextRound = false) => {
    const socket = get().socket;
    const roomId = get().gameState?.roomId;
    if (!socket || !roomId) return;
    socket.emit('start_game', { roomId, playerId: get().playerId, isNextRound }, (res) => {
      if (res?.error) {
        soundEngine.errorBuzz();
        get().addToast(res.error, 'error');
      }
    });
  },

  setPendingWildCard: (card) => set({ pendingWildCard: card }),

  playCard: (cardId, chosenColor) => {
    const socket = get().socket;
    const roomId = get().gameState?.roomId;
    if (!socket || !roomId) return;

    socket.emit(
      'play_card',
      {
        roomId,
        playerId: get().playerId,
        cardId,
        chosenColor,
      },
      (res) => {
        if (res?.error) {
          soundEngine.errorBuzz();
          get().addToast(res.error, 'error');
        }
        set({ pendingWildCard: null });
      }
    );
  },

  chooseColor: (color) => {
    const socket = get().socket;
    const roomId = get().gameState?.roomId;
    const pendingCard = get().pendingWildCard;

    if (pendingCard) {
      get().playCard(pendingCard.id, color);
      return;
    }

    if (!socket || !roomId) return;
    socket.emit('choose_color', { roomId, playerId: get().playerId, color }, (res) => {
      if (res?.error) {
        soundEngine.errorBuzz();
        get().addToast(res.error, 'error');
      }
    });
  },

  drawCard: () => {
    const socket = get().socket;
    const roomId = get().gameState?.roomId;
    if (!socket || !roomId) return;
    socket.emit('draw_card', { roomId, playerId: get().playerId }, (res) => {
      if (res?.error) {
        soundEngine.errorBuzz();
        get().addToast(res.error, 'error');
      }
    });
  },

  callUno: () => {
    const socket = get().socket;
    const roomId = get().gameState?.roomId;
    if (!socket || !roomId) return;
    socket.emit('call_uno', { roomId, playerId: get().playerId }, (res) => {
      if (res?.error) {
        soundEngine.errorBuzz();
        get().addToast(res.error, 'error');
      }
    });
  },

  catchUno: (targetId) => {
    const socket = get().socket;
    const roomId = get().gameState?.roomId;
    if (!socket || !roomId) return;
    socket.emit(
      'catch_uno',
      { roomId, callerId: get().playerId, targetId },
      (res) => {
        if (res?.error) {
          soundEngine.errorBuzz();
          get().addToast(res.error, 'error');
        }
      }
    );
  },

  sendReaction: (emoji) => {
    const socket = get().socket;
    const roomId = get().gameState?.roomId;
    if (!socket || !roomId) return;
    socket.emit('reaction_sent', { roomId, playerId: get().playerId, emoji });
  },

  returnToLobby: () => {
    const socket = get().socket;
    const roomId = get().gameState?.roomId;
    get().clearEphemeralLeaderboard();
    if (!socket || !roomId) return;
    socket.emit('play_again', { roomId, playerId: get().playerId });
  },

  sendChat: (text, isReaction = false) => {
    const socket = get().socket;
    const roomId = get().gameState?.roomId;
    if (!socket || !roomId) return;
    socket.emit('chat_message', {
      roomId,
      playerId: get().playerId,
      text,
      isReaction,
    });
  },
}));
