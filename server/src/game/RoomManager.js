/**
 * Authoritative UNO Room & Game State Manager (Parts 1, 2 & 3 Complete Specification)
 *
 * Implements:
 * - Elimination-Style Win Condition (Part 3):
 *   - When a player empties their hand (0 cards), they are marked as SAFE / FINISHED
 *     with their finish rank (#1, #2, #3...) and removed from active turn rotation.
 *   - Remaining players continue playing in the same round until only ONE player is left with cards.
 *   - Rank-based scoring at round end:
 *     - 1st place: + (sum of all other players' remaining cards, min +50)
 *     - 2nd place (if not last): + 50 bonus
 *     - 3rd place (if not last): + 30 bonus
 *     - 4th place (if not last): + 20 bonus
 *     - 5th place (if not last): + 10 bonus
 *     - Last place: 0 points
 * - Live Ranking Sidebar ('update_rankings', 'player_finished', 'round_ended')
 * - Floating Avatar Emoji Reactions ('reaction_sent')
 * - Rematch flow ('request_rematch')
 * - Game Modes: '1vBot', '2P', '3P', '4P', '5P', '6P'
 * - Hard 60-second turn timer with auto-draw & auto-play
 */

import { dealFairHands, drawCardsFromPile, COLORS } from './deck.js';
import {
  validatePlayCard,
  calculateHandPoints,
} from './rules.js';
import { BOT_NAMES, computeBotDecision, chooseBestColorForHand } from './bot.js';

export const TURN_DURATION_MS = 60000;
export const IDLE_ROOM_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes idle timeout
export const MAX_PLAYERS_PER_ROOM = 6;

export const MODE_REQUIRED_PLAYERS = {
  '1vBot': 2,
  '2P': 2,
  '3P': 3,
  '4P': 4,
  '5P': 5,
  '6P': 6,
};

const RANK_BONUS_POINTS = {
  2: 50,
  3: 30,
  4: 20,
  5: 10,
};

export function sanitizeText(str, maxLength = 200) {
  return String(str || '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

export function validatePlayerName(name) {
  const trimmed = String(name || '').trim();
  if (trimmed.length < 2 || trimmed.length > 15) {
    return {
      valid: false,
      reason: 'Name must be between 2 and 15 characters.',
    };
  }
  if (!/^[a-zA-Z0-9_ ]+$/.test(trimmed)) {
    return {
      valid: false,
      reason: 'Name can only contain letters, numbers, spaces, and underscores (_).',
    };
  }
  return { valid: true, cleanName: trimmed };
}

export class RoomManager {
  constructor(io, options = {}) {
    this.io = io;
    this.idleTimeoutMs = options.idleTimeoutMs || IDLE_ROOM_TIMEOUT_MS;
    /** @type {Map<string, Object>} */
    this.rooms = new Map();
    /** @type {Map<string, {roomId: string, playerId: string}>} */
    this.socketToPlayer = new Map();
  }

  /**
   * Updates room activity timestamp and resets the 30-minute idle destruction timer.
   */
  touchRoom(room) {
    if (!room || room.destroyed) return;
    room.updatedAt = Date.now();
    if (room.idleTimerRef) {
      clearTimeout(room.idleTimerRef);
    }
    room.idleTimerRef = setTimeout(() => {
      this.cleanupRoom(room.roomId, 'Room expired due to inactivity.');
    }, this.idleTimeoutMs);
    if (typeof room.idleTimerRef?.unref === 'function') {
      room.idleTimerRef.unref();
    }
  }

  /**
   * Part 9 Ephemeral Leaderboard Requirement:
   * Permanently wipes room.leaderboard, room.chat, player scores, and removes the room from memory.
   * Nothing is ever written to disk or database.
   */
  cleanupRoom(roomId, reason = 'Room closed and all ephemeral scores deleted.') {
    const cleanId = String(roomId || '').trim();
    const room = this.rooms.get(cleanId);
    if (!room) return false;

    this.clearRoomTimers(room);
    if (room.idleTimerRef) {
      clearTimeout(room.idleTimerRef);
      room.idleTimerRef = null;
    }
    if (room.disconnectTimerRef) {
      clearTimeout(room.disconnectTimerRef);
      room.disconnectTimerRef = null;
    }

    // Notify any connected sockets before destroying the room
    if (this.io) {
      this.io.to(cleanId).emit('room_destroyed', {
        roomId: cleanId,
        reason,
      });
    }

    // Remove socket mappings for all players in this room
    for (const [sockId, mapping] of this.socketToPlayer.entries()) {
      if (mapping.roomId === cleanId) {
        this.socketToPlayer.delete(sockId);
      }
    }

    // Zero out and wipe all in-memory scores, leaderboards, hands, and chat messages
    if (Array.isArray(room.players)) {
      for (const p of room.players) {
        p.score = 0;
        p.roundsWon = 0;
        p.hand = [];
        p.finishRank = null;
      }
      room.players.length = 0;
    }
    if (Array.isArray(room.leaderboard)) {
      room.leaderboard.length = 0;
    }
    if (Array.isArray(room.chat)) {
      room.chat.length = 0;
    }
    if (Array.isArray(room.chatMessages)) {
      room.chatMessages.length = 0;
    }
    if (Array.isArray(room.actionLog)) {
      room.actionLog.length = 0;
    }
    if (Array.isArray(room.finishOrder)) {
      room.finishOrder.length = 0;
    }

    room.leaderboard = [];
    room.finalLeaderboard = null;
    room.roundSummary = null;
    room.chat = [];
    room.chatMessages = [];
    room.actionLog = [];
    room.drawPile = [];
    room.discardPile = [];
    room.destroyed = true;

    this.rooms.delete(cleanId);
    return true;
  }

  closeRoom({ roomId, playerId }) {
    const cleanId = String(roomId || '').trim().toUpperCase();
    const room = this.rooms.get(cleanId);
    if (!room) return { error: 'Room not found.' };
    if (playerId && room.hostId !== playerId) {
      return { error: 'Only the room host can close the room.' };
    }
    this.cleanupRoom(cleanId, 'Host closed the room.');
    return { success: true };
  }

  generateRoomCode() {
    let code = '';
    do {
      code = String(Math.floor(100000 + Math.random() * 900000));
    } while (this.rooms.has(code));
    return code;
  }

  emitSystemMessage(room, text) {
    const sysMsg = {
      id: `sys_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'system',
      playerId: 'system',
      playerName: 'System',
      text,
      timestamp: Date.now(),
    };
    room.chatMessages.push(sysMsg);
    if (room.chatMessages.length > 80) {
      room.chatMessages.shift();
    }
    this.io.to(room.roomId).emit('system_message', sysMsg);
    this.io.to(room.roomId).emit('chat_message', sysMsg);
  }

  /**
   * Builds the live ranking list for the sidebar:
   * 1. Players who have already finished (sorted by finishRank 1, 2, 3...)
   * 2. Active remaining players (sorted by fewest cards left, then highest score)
   */
  buildLiveRankings(room) {
    const finished = room.players
      .filter((p) => p.finished)
      .sort((a, b) => (a.finishRank || 99) - (b.finishRank || 99))
      .map((p) => ({
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        avatarColor: p.avatarColor,
        finished: true,
        rank: p.finishRank,
        cardCount: 0,
        score: p.score,
        statusLabel:
          p.finishRank === room.players.length
            ? '❌ Last Place'
            : `✅ Finished — Rank #${p.finishRank}`,
      }));

    const active = room.players
      .filter((p) => !p.finished)
      .sort((a, b) => {
        if (a.hand.length !== b.hand.length) return a.hand.length - b.hand.length;
        return b.score - a.score;
      })
      .map((p, idx) => ({
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        avatarColor: p.avatarColor,
        finished: false,
        rank: finished.length + idx + 1,
        cardCount: p.hand.length,
        score: p.score,
        statusLabel: `${p.hand.length} ${p.hand.length === 1 ? 'card' : 'cards'} left`,
      }));

    return [...finished, ...active];
  }

  createRoom({ playerName, playerId, socketId, settings = {} }) {
    const nameCheck = validatePlayerName(playerName || 'Player_1');
    const cleanName = nameCheck.valid ? nameCheck.cleanName : sanitizeText(playerName, 15) || 'Player_1';
    const roomId = this.generateRoomCode();
    const pid = playerId || `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const playerMode = settings.playerMode || '2P';
    const requiredPlayers = MODE_REQUIRED_PLAYERS[playerMode] || 2;

    const hostPlayer = {
      id: pid,
      socketId,
      name: cleanName,
      isBot: false,
      isHost: true,
      connected: true,
      ready: true,
      hand: [],
      score: 0,
      roundsWon: 0,
      saidUno: false,
      unoVulnerable: false,
      finished: false,
      finishRank: null,
      avatarColor: '#ef4444',
    };

    const now = Date.now();
    const chatMessages = [];
    const room = {
      id: roomId,
      roomId,
      status: 'lobby',
      hostId: pid,
      createdAt: now,
      updatedAt: now,
      idleTimerRef: null,
      disconnectTimerRef: null,
      settings: {
        playerMode,
        requiredPlayers,
        botDifficulty: settings.botDifficulty || 'hard',
        gameMode: settings.gameMode || 'points',
        targetScore: Number(settings.targetScore) || 500,
        totalRounds: Number(settings.totalRounds) || 1,
        allowStacking: Boolean(settings.allowStacking),
        strictWild4: settings.strictWild4 !== undefined ? Boolean(settings.strictWild4) : true,
      },
      players: [hostPlayer],
      finishOrder: [], // Array of playerIds in order of emptying their hand
      currentRound: 0,
      direction: 1,
      currentTurnIndex: 0,
      turnStartTime: null,
      turnDeadline: null,
      turnTimerRef: null,
      botTimerRef: null,
      drawPile: [],
      discardPile: [],
      activeColor: 'red',
      pendingDraw: 0,
      awaitingColorChoice: false,
      pendingWildCardId: null,
      hasDrawnThisTurn: false,
      drawnPlayableCardId: null,
      lastPlayedBy: null,
      deckVerification: null,
      lastAction: `${cleanName} created Room ${roomId}.`,
      actionLog: [],
      chatMessages,
      chat: chatMessages, // in-memory only, cleared on room destroy
      leaderboard: [], // in-memory only, cleared on room destroy
      roundSummary: null,
      finalLeaderboard: null,
    };

    this.rooms.set(roomId, room);
    this.socketToPlayer.set(socketId, { roomId, playerId: pid });
    this.touchRoom(room);

    this.appendLog(room, `${cleanName} created Room ${roomId}.`);
    this.emitSystemMessage(room, `${cleanName} created Room ${roomId}.`);

    if (playerMode === '1vBot') {
      this.addBot({ roomId, playerId: pid });
    }

    return { room, player: hostPlayer };
  }

  joinRoom({ roomId, playerName, playerId, socketId }) {
    const cleanCode = String(roomId || '').trim().toUpperCase();
    const room = this.rooms.get(cleanCode);

    if (!room) {
      return { error: `Room "${cleanCode}" does not exist. Please check the 6-digit code.` };
    }

    const nameCheck = validatePlayerName(playerName || 'Player');
    const cleanName = nameCheck.valid ? nameCheck.cleanName : sanitizeText(playerName, 15) || 'Player';
    const pid = playerId || `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    let existingPlayer = room.players.find(
      (p) => !p.isBot && (p.id === pid || (!p.connected && p.name.toLowerCase() === cleanName.toLowerCase()))
    );

    if (existingPlayer) {
      existingPlayer.socketId = socketId;
      existingPlayer.connected = true;
      if (cleanName) existingPlayer.name = cleanName;
      this.socketToPlayer.set(socketId, { roomId: cleanCode, playerId: existingPlayer.id });
      this.appendLog(room, `${existingPlayer.name} reconnected.`);
      this.emitSystemMessage(room, `${existingPlayer.name} reconnected.`);
      this.broadcastState(cleanCode);
      return { room, player: existingPlayer, reconnected: true };
    }

    if (room.status !== 'lobby') {
      return { error: 'Game is already in progress in this room.' };
    }

    if (room.settings.playerMode === '1vBot') {
      return { error: 'This room is set to 1 vs Bot mode.' };
    }

    if (room.players.length >= room.settings.requiredPlayers || room.players.length >= MAX_PLAYERS_PER_ROOM) {
      return {
        error: `Room is full (${room.players.length}/${room.settings.requiredPlayers} players).`,
      };
    }

    const avatarPalette = ['#ef4444', '#3b82f6', '#10b981', '#eab308', '#a855f7', '#ec4899'];
    const newPlayer = {
      id: pid,
      socketId,
      name: cleanName,
      isBot: false,
      isHost: false,
      connected: true,
      ready: true,
      hand: [],
      score: 0,
      roundsWon: 0,
      saidUno: false,
      unoVulnerable: false,
      finished: false,
      finishRank: null,
      avatarColor: avatarPalette[room.players.length % avatarPalette.length],
    };

    room.players.push(newPlayer);
    this.socketToPlayer.set(socketId, { roomId: cleanCode, playerId: pid });
    this.appendLog(room, `${newPlayer.name} joined the room.`);
    this.emitSystemMessage(room, `${newPlayer.name} joined the room.`);
    this.broadcastState(cleanCode);

    return { room, player: newPlayer, reconnected: false };
  }

  selectGameMode({ roomId, playerId, playerMode, botDifficulty }) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'lobby') return { error: 'Cannot change mode now.' };
    if (room.hostId !== playerId) return { error: 'Only the host can select the game mode.' };

    if (playerMode && MODE_REQUIRED_PLAYERS[playerMode]) {
      room.settings.playerMode = playerMode;
      room.settings.requiredPlayers = MODE_REQUIRED_PLAYERS[playerMode];

      if (playerMode === '1vBot') {
        const humanPlayers = room.players.filter((p) => !p.isBot);
        if (humanPlayers.length === 1) {
          const existingBots = room.players.filter((p) => p.isBot);
          if (existingBots.length === 0) {
            this.addBot({ roomId, playerId });
          } else if (existingBots.length > 1) {
            room.players = [humanPlayers[0], existingBots[0]];
          }
        }
      } else {
        while (
          room.players.length > room.settings.requiredPlayers &&
          room.players.some((p) => p.isBot)
        ) {
          for (let i = room.players.length - 1; i >= 0; i--) {
            if (room.players[i].isBot) {
              room.players.splice(i, 1);
              break;
            }
          }
        }
        if (room.players.length > room.settings.requiredPlayers) {
          room.settings.requiredPlayers = room.players.length;
          room.settings.playerMode = `${room.players.length}P`;
        }
      }
    }

    if (botDifficulty && ['easy', 'medium', 'hard'].includes(botDifficulty)) {
      room.settings.botDifficulty = botDifficulty;
    }

    this.appendLog(
      room,
      `Mode set to ${room.settings.playerMode} (${room.settings.requiredPlayers} players).`
    );
    this.emitSystemMessage(
      room,
      `Mode set to ${room.settings.playerMode} (${room.settings.requiredPlayers} players).`
    );
    this.broadcastState(roomId);
    return { success: true };
  }

  toggleReady({ roomId, playerId }) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'lobby') return { error: 'Not in lobby.' };

    const player = room.players.find((p) => p.id === playerId && !p.isBot);
    if (!player) return { error: 'Player not found.' };

    player.ready = !player.ready;
    this.appendLog(room, `${player.name} is ${player.ready ? 'Ready ✅' : 'Not Ready'}.`);
    this.broadcastState(roomId);
    return { success: true, ready: player.ready };
  }

  updateSettings({ roomId, playerId, settings }) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'lobby') return { error: 'Cannot change settings now.' };
    if (room.hostId !== playerId) return { error: 'Only the room host can update settings.' };

    if (settings.playerMode && MODE_REQUIRED_PLAYERS[settings.playerMode]) {
      return this.selectGameMode({
        roomId,
        playerId,
        playerMode: settings.playerMode,
        botDifficulty: settings.botDifficulty,
      });
    }

    if (settings.botDifficulty && ['easy', 'medium', 'hard'].includes(settings.botDifficulty)) {
      room.settings.botDifficulty = settings.botDifficulty;
    }
    if (settings.gameMode && ['points', 'rounds'].includes(settings.gameMode)) {
      room.settings.gameMode = settings.gameMode;
    }
    if (settings.targetScore !== undefined) {
      room.settings.targetScore = Math.max(50, Math.min(2000, Number(settings.targetScore) || 500));
    }
    if (settings.totalRounds !== undefined) {
      room.settings.totalRounds = Math.max(1, Math.min(20, Number(settings.totalRounds) || 1));
    }
    if (settings.allowStacking !== undefined) {
      room.settings.allowStacking = Boolean(settings.allowStacking);
    }
    if (settings.strictWild4 !== undefined) {
      room.settings.strictWild4 = Boolean(settings.strictWild4);
    }

    this.appendLog(room, 'Host updated match rules.');
    this.broadcastState(roomId);
    return { success: true };
  }

  addBot({ roomId, playerId }) {
    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found.' };
    if (room.hostId !== playerId) return { error: 'Only the host can add bots.' };
    if (room.status !== 'lobby') return { error: 'Cannot add bots after game starts.' };
    if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
      return { error: 'Room is already at the maximum of 6 players.' };
    }

    if (room.players.length + 1 > room.settings.requiredPlayers) {
      const nextCount = room.players.length + 1;
      room.settings.requiredPlayers = nextCount;
      room.settings.playerMode = `${nextCount}P`;
    }

    const usedNames = new Set(room.players.map((p) => p.name));
    const botName =
      BOT_NAMES.find((name) => !usedNames.has(name)) ||
      `Bot #${room.players.filter((p) => p.isBot).length + 1} 🤖`;

    const avatarPalette = ['#ef4444', '#3b82f6', '#10b981', '#eab308', '#a855f7', '#ec4899'];
    const botPlayer = {
      id: `bot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      socketId: null,
      name: botName,
      isBot: true,
      isHost: false,
      connected: true,
      ready: true,
      hand: [],
      score: 0,
      roundsWon: 0,
      saidUno: false,
      unoVulnerable: false,
      finished: false,
      finishRank: null,
      avatarColor: avatarPalette[room.players.length % avatarPalette.length],
    };

    room.players.push(botPlayer);
    this.appendLog(room, `${botName} was added.`);
    this.emitSystemMessage(room, `${botName} was added to the room.`);
    this.broadcastState(roomId);
    return { bot: botPlayer };
  }

  removeBot({ roomId, playerId, botId }) {
    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found.' };
    if (room.hostId !== playerId) return { error: 'Only the host can remove bots.' };
    if (room.status !== 'lobby') return { error: 'Cannot remove bots during a game.' };

    let targetIndex = -1;
    if (botId) {
      targetIndex = room.players.findIndex((p) => p.id === botId && p.isBot);
    } else {
      for (let i = room.players.length - 1; i >= 0; i--) {
        if (room.players[i].isBot) {
          targetIndex = i;
          break;
        }
      }
    }

    if (targetIndex === -1) {
      return { error: 'No bot found to remove.' };
    }

    const [removed] = room.players.splice(targetIndex, 1);
    this.appendLog(room, `${removed.name} was removed by host.`);
    this.emitSystemMessage(room, `${removed.name} was removed.`);
    this.broadcastState(roomId);
    return { removed };
  }

  kickPlayer({ roomId, hostPlayerId, targetPlayerId }) {
    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found.' };
    if (room.hostId !== hostPlayerId) return { error: 'Only the host can kick players.' };
    if (hostPlayerId === targetPlayerId) return { error: 'Host cannot kick themselves.' };

    const targetIdx = room.players.findIndex((p) => p.id === targetPlayerId);
    if (targetIdx === -1) return { error: 'Player not found.' };

    const [kicked] = room.players.splice(targetIdx, 1);
    if (kicked.socketId) {
      this.io.to(kicked.socketId).emit('kicked_from_room', {
        roomId,
        message: 'You were removed from the room by the host.',
      });
      this.socketToPlayer.delete(kicked.socketId);
    }

    this.appendLog(room, `${kicked.name} was removed from the room.`);
    this.emitSystemMessage(room, `${kicked.name} was removed from the room.`);
    this.broadcastState(roomId);
    return { success: true };
  }

  /**
   * Starts the UNO game (or starts a new round).
   */
  startGame({ roomId, playerId, isNextRound = false }) {
    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found.' };
    if (!isNextRound && room.hostId !== playerId) {
      return { error: 'Only the host can start the game.' };
    }
    if (room.players.length < 2) {
      return { error: 'At least 2 players (or 1 human + 1 bot) are required to start!' };
    }
    if (!isNextRound && room.players.length !== room.settings.requiredPlayers) {
      return {
        error: `Mode ${room.settings.playerMode} requires ${room.settings.requiredPlayers} players (currently ${room.players.length}/${room.settings.requiredPlayers}).`,
      };
    }
    if (!isNextRound && room.players.some((p) => !p.isBot && !p.ready)) {
      return { error: 'All human players must click Ready ✅ before starting!' };
    }

    this.clearRoomTimers(room);

    if (!isNextRound) {
      room.currentRound = 1;
      room.finalLeaderboard = null;
      for (const p of room.players) {
        p.score = 0;
        p.roundsWon = 0;
      }
    } else {
      room.currentRound += 1;
    }

    room.status = 'playing';
    room.finishOrder = [];
    room.direction = 1;
    room.pendingDraw = 0;
    room.awaitingColorChoice = false;
    room.pendingWildCardId = null;
    room.hasDrawnThisTurn = false;
    room.drawnPlayableCardId = null;
    room.roundSummary = null;

    const { hands, firstCard, drawPile, cardsPerPlayer, totalVerified } = dealFairHands(
      room.players.length
    );

    room.players.forEach((player, idx) => {
      player.hand = hands[idx];
      player.saidUno = false;
      player.unoVulnerable = false;
      player.finished = false;
      player.finishRank = null;
    });

    room.drawPile = drawPile;
    room.discardPile = [firstCard];
    room.activeColor = firstCard.color;
    room.deckVerification = {
      cardsPerPlayer,
      drawPileLeft: drawPile.length,
      totalVerified,
    };
    room.lastPlayedBy = {
      playerId: 'deck',
      playerName: 'Starting Deck',
      card: firstCard,
      chosenColor: firstCard.color,
      isWildChoice: false,
      timestamp: Date.now(),
    };

    room.currentTurnIndex = (room.currentRound - 1) % room.players.length;

    let startMsg = `Round ${room.currentRound} started! Dealt ${cardsPerPlayer} cards each. Top card: ${firstCard.color.toUpperCase()} ${String(firstCard.value).toUpperCase()}.`;

    if (firstCard.type === 'reverse') {
      room.direction = -1;
      if (room.players.length === 2) {
        room.currentTurnIndex = this.getNextPlayerIndex(room, room.currentTurnIndex, 1);
      }
      startMsg += ' Direction reversed!';
    } else if (firstCard.type === 'skip') {
      const skipped = room.players[room.currentTurnIndex];
      room.currentTurnIndex = this.getNextPlayerIndex(room, room.currentTurnIndex, 1);
      startMsg += ` ${skipped.name} is skipped!`;
    } else if (firstCard.type === 'draw2') {
      const target = room.players[room.currentTurnIndex];
      const { drawnCards, drawPile: nextDraw, discardPile: nextDiscard } = drawCardsFromPile(
        room.drawPile,
        room.discardPile,
        2
      );
      room.drawPile = nextDraw;
      room.discardPile = nextDiscard;
      target.hand.push(...drawnCards);
      room.currentTurnIndex = this.getNextPlayerIndex(room, room.currentTurnIndex, 1);
      startMsg += ` ${target.name} draws 2 cards and is skipped!`;
    }

    this.appendLog(room, startMsg);
    this.emitSystemMessage(room, startMsg);
    this.startTurnTimer(room);
    this.broadcastState(roomId);

    return { success: true };
  }

  /**
   * Handles a player playing a card from their hand.
   */
  playCard({ roomId, playerId, cardId, chosenColor, isAutoPlay = false }) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing') {
      return { error: 'Game is not currently active.' };
    }

    const activePlayer = room.players[room.currentTurnIndex];
    if (!activePlayer || activePlayer.id !== playerId || activePlayer.finished) {
      return { error: 'It is not your turn!' };
    }

    if (room.awaitingColorChoice) {
      return { error: 'Please select a color for your Wild card first.' };
    }

    const cardIndex = activePlayer.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      return { error: 'Card not found in your hand.' };
    }

    const card = activePlayer.hand[cardIndex];
    const topCard = room.discardPile[room.discardPile.length - 1];

    const validation = validatePlayCard({
      card,
      hand: activePlayer.hand,
      topCard,
      activeColor: room.activeColor,
      pendingDraw: room.pendingDraw,
      allowStacking: room.settings.allowStacking,
      strictWild4: room.settings.strictWild4,
    });

    if (!validation.valid) {
      return { error: validation.reason || 'Illegal card play.' };
    }

    // Remove card from player's hand
    activePlayer.hand.splice(cardIndex, 1);

    // Check UNO status when player reaches 1 card
    if (activePlayer.hand.length === 1) {
      if (activePlayer.isBot || isAutoPlay || activePlayer.saidUno) {
        activePlayer.saidUno = true;
        activePlayer.unoVulnerable = false;
        this.appendLog(room, `🔥 ${activePlayer.name} yelled UNO!`);
        this.emitSystemMessage(room, `🔥 ${activePlayer.name} yelled UNO!`);
        this.io.to(roomId).emit('uno_called', {
          playerId: activePlayer.id,
          playerName: activePlayer.name,
        });
      } else {
        activePlayer.unoVulnerable = true;
      }
    } else {
      activePlayer.saidUno = false;
      activePlayer.unoVulnerable = false;
    }

    if (
      (card.type === 'wild' || card.type === 'wild4') &&
      !chosenColor &&
      !activePlayer.isBot &&
      !isAutoPlay
    ) {
      room.discardPile.push(card);
      room.awaitingColorChoice = true;
      room.pendingWildCardId = card.id;
      this.appendLog(
        room,
        `${activePlayer.name} played ${card.type.toUpperCase()} and is choosing a color...`
      );
      this.broadcastState(roomId);
      return { success: true, awaitingColorChoice: true };
    }

    const resolvedColor =
      card.type === 'wild' || card.type === 'wild4'
        ? COLORS.includes(chosenColor)
          ? chosenColor
          : chooseBestColorForHand(activePlayer.hand)
        : card.color;

    const playedCardEntry = {
      ...card,
      declaredColor: resolvedColor,
      playedByName: activePlayer.name,
      playedById: activePlayer.id,
    };

    room.discardPile.push(playedCardEntry);
    room.activeColor = resolvedColor;
    room.awaitingColorChoice = false;
    room.pendingWildCardId = null;

    return this.resolveCardEffectAndAdvance(room, activePlayer, playedCardEntry, isAutoPlay);
  }

  chooseColor({ roomId, playerId, color }) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing') return { error: 'Game is not active.' };

    const activePlayer = room.players[room.currentTurnIndex];
    if (!activePlayer || activePlayer.id !== playerId) {
      return { error: 'Not your turn.' };
    }

    if (!room.awaitingColorChoice) {
      return { error: 'No Wild card is awaiting a color selection.' };
    }

    if (!COLORS.includes(color)) {
      return { error: 'Invalid color selected.' };
    }

    const topCard = room.discardPile[room.discardPile.length - 1];
    topCard.declaredColor = color;
    topCard.playedByName = activePlayer.name;
    topCard.playedById = activePlayer.id;
    room.activeColor = color;
    room.awaitingColorChoice = false;
    room.pendingWildCardId = null;

    return this.resolveCardEffectAndAdvance(room, activePlayer, topCard, false);
  }

  /**
   * Resolves card effects AND implements Part 3 Elimination-Style Finish Logic:
   * - When a player reaches 0 cards, they are marked `finished = true` with `finishRank = #1, #2...`
   * - If more than 1 active player still holds cards, the round CONTINUES among the remaining active players!
   * - When only 1 player remains with cards, that player receives Last Place and the round ends.
   */
  resolveCardEffectAndAdvance(room, activePlayer, card, isAutoPlay = false) {
    const { roomId } = room;
    const isWildCard = card.type === 'wild' || card.type === 'wild4';

    room.lastPlayedBy = {
      playerId: activePlayer.id,
      playerName: activePlayer.name,
      card,
      chosenColor: room.activeColor,
      isWildChoice: isWildCard,
      timestamp: Date.now(),
    };

    const playedPayload = {
      playerId: activePlayer.id,
      playerName: activePlayer.name,
      card,
      activeColor: room.activeColor,
      isWildChoice: isWildCard,
      timestamp: room.lastPlayedBy.timestamp,
    };
    this.io.to(roomId).emit('player_played_card', playedPayload);
    this.io.to(roomId).emit('card_played', playedPayload);

    // Check if activePlayer just emptied their hand (0 cards)
    let playerJustFinished = false;
    if (activePlayer.hand.length === 0 && !activePlayer.finished) {
      playerJustFinished = true;
      room.finishOrder.push(activePlayer.id);
      activePlayer.finished = true;
      activePlayer.finishRank = room.finishOrder.length;
      activePlayer.saidUno = false;
      activePlayer.unoVulnerable = false;

      if (activePlayer.finishRank === 1) {
        activePlayer.roundsWon += 1;
      }

      const finishMsg = `🏅 ${activePlayer.name} emptied their hand! SAFE — Finished Rank #${activePlayer.finishRank}!`;
      this.appendLog(room, finishMsg);
      this.emitSystemMessage(room, finishMsg);

      this.io.to(roomId).emit('player_finished', {
        playerId: activePlayer.id,
        playerName: activePlayer.name,
        rank: activePlayer.finishRank,
        finishOrder: room.finishOrder,
      });
    }

    // Count how many players still have cards in this round
    const remainingActivePlayers = room.players.filter((p) => !p.finished);

    // If only ONE (or zero) player remains with cards, the round ends!
    if (remainingActivePlayers.length <= 1) {
      if (remainingActivePlayers.length === 1) {
        const lastPlayer = remainingActivePlayers[0];
        room.finishOrder.push(lastPlayer.id);
        lastPlayer.finished = true;
        lastPlayer.finishRank = room.players.length; // Last place
      }
      return this.handleEliminationRoundEnd(room, card);
    }

    // Otherwise, more than 1 player still has cards -> apply card effect to the remaining active rotation!
    // Note: if only 2 active players were playing when Reverse was played (or before activePlayer finished),
    // Reverse acts as a Skip.
    const activeCountBefore = remainingActivePlayers.length + (playerJustFinished ? 1 : 0);

    let actionText = `${activePlayer.name} ${isAutoPlay ? 'auto-played' : 'played'} ${
      isWildCard
        ? `${card.type === 'wild4' ? 'Wild +4' : 'Wild'} (Color chosen: ${room.activeColor.toUpperCase()})`
        : `${card.color.toUpperCase()} ${String(card.value).toUpperCase()}`
    }.`;

    let stepsToAdvance = 1;

    if (card.type === 'reverse') {
      if (activeCountBefore === 2) {
        stepsToAdvance = 2;
        actionText += ' (2-Player Reverse acts as SKIP!)';
      } else {
        room.direction *= -1;
        stepsToAdvance = 1;
        actionText += ` Direction flipped to ${
          room.direction === 1 ? 'Clockwise ↻' : 'Counter-Clockwise ↺'
        }!`;
      }
    } else if (card.type === 'skip') {
      const skippedIdx = this.getNextPlayerIndex(room, room.currentTurnIndex, 1);
      const skippedPlayer = room.players[skippedIdx];
      stepsToAdvance = 2;
      actionText += ` ${skippedPlayer.name} was skipped!`;
    } else if (card.type === 'draw2') {
      if (room.settings.allowStacking) {
        room.pendingDraw += 2;
        stepsToAdvance = 1;
        actionText += ` Stack is now +${room.pendingDraw}!`;
      } else {
        const victimIndex = this.getNextPlayerIndex(room, room.currentTurnIndex, 1);
        const victim = room.players[victimIndex];
        const { drawnCards, drawPile, discardPile } = drawCardsFromPile(
          room.drawPile,
          room.discardPile,
          2
        );
        room.drawPile = drawPile;
        room.discardPile = discardPile;
        victim.hand.push(...drawnCards);
        victim.saidUno = false;
        victim.unoVulnerable = false;
        stepsToAdvance = 2;
        actionText += ` ${victim.name} drew 2 cards and lost their turn!`;
      }
    } else if (card.type === 'wild4') {
      if (room.settings.allowStacking) {
        room.pendingDraw += 4;
        stepsToAdvance = 1;
        actionText += ` Stack is now +${room.pendingDraw}!`;
      } else {
        const victimIndex = this.getNextPlayerIndex(room, room.currentTurnIndex, 1);
        const victim = room.players[victimIndex];
        const { drawnCards, drawPile, discardPile } = drawCardsFromPile(
          room.drawPile,
          room.discardPile,
          4
        );
        room.drawPile = drawPile;
        room.discardPile = discardPile;
        victim.hand.push(...drawnCards);
        victim.saidUno = false;
        victim.unoVulnerable = false;
        stepsToAdvance = 2;
        actionText += ` ${victim.name} drew 4 cards and lost their turn!`;
      }
    }

    this.appendLog(room, actionText);
    if (isWildCard || card.type === 'draw2' || card.type === 'skip') {
      this.emitSystemMessage(room, actionText);
    }

    room.currentTurnIndex = this.getNextPlayerIndex(room, room.currentTurnIndex, stepsToAdvance);
    room.hasDrawnThisTurn = false;
    room.drawnPlayableCardId = null;

    this.startTurnTimer(room);
    this.broadcastState(roomId);
    return { success: true };
  }

  /**
   * Computes Part 3 Elimination-Style Round End Scores & Standings when only 1 player remains with cards.
   * Scoring Rules:
   * - 1st place: + (sum of leftover cards + 50 minimum bonus so 1st is always highest)
   * - 2nd place (if not last): + 50 bonus
   * - 3rd place (if not last): + 30 bonus
   * - 4th place (if not last): + 20 bonus
   * - 5th place (if not last): + 10 bonus
   * - Last place: 0 points
   */
  async handleEliminationRoundEnd(room, lastCard) {
    this.clearRoomTimers(room);
    const { roomId } = room;
    const totalPlayers = room.players.length;

    // Sum of all leftover card values held at round end
    const totalLeftoverCardPoints = room.players.reduce(
      (sum, p) => sum + calculateHandPoints(p.hand),
      0
    );

    const firstPlacePlayer =
      room.players.find((p) => p.finishRank === 1) || room.players[0];

    // Award points to each player based on their finishRank
    const roundPointsByPlayer = {};
    for (const p of room.players) {
      const rank = p.finishRank || totalPlayers;
      let earned = 0;

      if (rank === 1) {
        // 1st place gets sum of all remaining cards (plus 50 base if multi-player so 1st > 2nd)
        earned = totalLeftoverCardPoints + (totalPlayers > 2 ? 50 : 0);
      } else if (rank < totalPlayers) {
        // Intermediate finishers get their rank bonus (+50 for 2nd, +30 for 3rd, +20 for 4th, +10 for 5th)
        earned = RANK_BONUS_POINTS[rank] || 10;
      } else {
        // Last place gets 0 points
        earned = 0;
      }

      p.score += earned;
      roundPointsByPlayer[p.id] = earned;
    }

    // Build standings ordered by round finish rank (1st, 2nd, 3rd... Last) — include avatarColor & initial
    const standings = [...room.players]
      .sort((a, b) => (a.finishRank || totalPlayers) - (b.finishRank || totalPlayers))
      .map((p) => ({
        id: p.id,
        name: p.name,
        initial: (p.name || 'P').trim().charAt(0).toUpperCase(),
        avatarColor: p.avatarColor || '#3b82f6',
        isBot: p.isBot,
        rank: p.finishRank || totalPlayers,
        isLastPlace: (p.finishRank || totalPlayers) === totalPlayers,
        roundsWon: p.roundsWon,
        roundPointsEarned: roundPointsByPlayer[p.id] || 0,
        totalScore: p.score,
        cardsLeft: p.hand.length,
        handPointsRemaining: calculateHandPoints(p.hand),
      }));

    // Check overall match end condition (500 points or fixed rounds)
    const highestTotalScore = Math.max(...room.players.map((p) => p.score));
    const isGameOver =
      room.settings.gameMode === 'points'
        ? highestTotalScore >= room.settings.targetScore
        : room.currentRound >= room.settings.totalRounds;

    room.roundSummary = {
      roundNumber: room.currentRound,
      winnerId: firstPlacePlayer.id,
      winnerName: firstPlacePlayer.name,
      roundPointsEarned: roundPointsByPlayer[firstPlacePlayer.id] || totalLeftoverCardPoints,
      winningCard: lastCard,
      standings,
      isGameOver,
    };

    room.leaderboard = standings;
    this.touchRoom(room);

    this.io.to(roomId).emit('round_ended', {
      roomId,
      roundSummary: room.roundSummary,
    });

    if (isGameOver) {
      room.status = 'game_over';
      // For final match winner, sort by highest totalScore across rounds (tie-breaker: finishRank)
      const matchStandings = [...standings]
        .sort((a, b) => {
          if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
          return a.rank - b.rank;
        })
        .map((entry, idx) => ({ ...entry, matchRank: idx + 1 }));

      room.finalLeaderboard = matchStandings;
      room.leaderboard = matchStandings;
      const winMsg = `🏆 MATCH OVER! ${matchStandings[0].name} wins with ${matchStandings[0].totalScore} points!`;
      this.appendLog(room, winMsg);
      this.emitSystemMessage(room, winMsg);

      // Part 9: Ephemeral Leaderboard — Never persisted to any database, file, or disk.
      this.io.to(roomId).emit('game_over', {
        roomId,
        winner: matchStandings[0],
        roundSummary: room.roundSummary,
        leaderboard: matchStandings,
      });
    } else {
      room.status = 'round_over';
      const roundMsg = `🏁 Round ${room.currentRound} finished! 🥇 1st: ${firstPlacePlayer.name} (+${
        roundPointsByPlayer[firstPlacePlayer.id]
      } pts).`;
      this.appendLog(room, roundMsg);
      this.emitSystemMessage(room, roundMsg);
      this.io.to(roomId).emit('round_over', {
        roomId,
        roundSummary: room.roundSummary,
      });
    }

    this.broadcastState(roomId);
    return { success: true, isGameOver };
  }

  drawCard({ roomId, playerId, autoPlayIfPossible = false }) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing') return { error: 'Game is not active.' };

    const activePlayer = room.players[room.currentTurnIndex];
    if (!activePlayer || activePlayer.id !== playerId || activePlayer.finished) {
      return { error: 'It is not your turn!' };
    }

    if (room.awaitingColorChoice) {
      return { error: 'Please choose a color for your played Wild card first.' };
    }

    if (room.pendingDraw > 0) {
      const count = room.pendingDraw;
      const { drawnCards, drawPile, discardPile } = drawCardsFromPile(
        room.drawPile,
        room.discardPile,
        count
      );
      room.drawPile = drawPile;
      room.discardPile = discardPile;
      activePlayer.hand.push(...drawnCards);
      activePlayer.saidUno = false;
      activePlayer.unoVulnerable = false;
      room.pendingDraw = 0;

      this.appendLog(room, `${activePlayer.name} drew ${count} stacked penalty cards!`);
      this.emitSystemMessage(room, `${activePlayer.name} drew ${count} stacked penalty cards!`);
      room.currentTurnIndex = this.getNextPlayerIndex(room, room.currentTurnIndex, 1);
      room.hasDrawnThisTurn = false;
      room.drawnPlayableCardId = null;

      this.startTurnTimer(room);
      this.broadcastState(roomId);
      return { success: true, drewCount: count };
    }

    if (room.hasDrawnThisTurn) {
      this.appendLog(room, `${activePlayer.name} kept their drawn card and passed.`);
      room.currentTurnIndex = this.getNextPlayerIndex(room, room.currentTurnIndex, 1);
      room.hasDrawnThisTurn = false;
      room.drawnPlayableCardId = null;
      this.startTurnTimer(room);
      this.broadcastState(roomId);
      return { success: true, passed: true };
    }

    const { drawnCards, drawPile, discardPile, reshuffled } = drawCardsFromPile(
      room.drawPile,
      room.discardPile,
      1
    );
    room.drawPile = drawPile;
    room.discardPile = discardPile;

    if (reshuffled) {
      this.appendLog(room, '♻️ Discard pile reshuffled into the draw deck.');
      this.emitSystemMessage(room, '♻️ Discard pile reshuffled into the draw deck.');
    }

    const drawnCard = drawnCards[0];
    if (!drawnCard) {
      return { error: 'No cards left to draw.' };
    }

    activePlayer.hand.push(drawnCard);
    activePlayer.saidUno = false;
    activePlayer.unoVulnerable = false;

    const topCard = room.discardPile[room.discardPile.length - 1];
    const isDrawnPlayable = validatePlayCard({
      card: drawnCard,
      hand: activePlayer.hand,
      topCard,
      activeColor: room.activeColor,
      pendingDraw: room.pendingDraw,
      allowStacking: room.settings.allowStacking,
      strictWild4: room.settings.strictWild4,
    }).valid;

    this.io.to(roomId).emit('card_drawn', {
      playerId: activePlayer.id,
      playerName: activePlayer.name,
      count: 1,
    });

    if (isDrawnPlayable) {
      if (autoPlayIfPossible || activePlayer.isBot) {
        const chosenColor =
          drawnCard.type === 'wild' || drawnCard.type === 'wild4'
            ? chooseBestColorForHand(activePlayer.hand)
            : undefined;
        this.appendLog(room, `${activePlayer.name} drew a playable card and played it!`);
        return this.playCard({
          roomId,
          playerId: activePlayer.id,
          cardId: drawnCard.id,
          chosenColor,
          isAutoPlay: true,
        });
      }

      room.hasDrawnThisTurn = true;
      room.drawnPlayableCardId = drawnCard.id;
      this.appendLog(
        room,
        `${activePlayer.name} drew a playable card (${drawnCard.color.toUpperCase()} ${String(
          drawnCard.value
        ).toUpperCase()})!`
      );
      this.broadcastState(roomId);
      return {
        success: true,
        drawnCard,
        canPlayDrawn: true,
      };
    }

    this.appendLog(room, `${activePlayer.name} drew a card and passed turn.`);
    room.currentTurnIndex = this.getNextPlayerIndex(room, room.currentTurnIndex, 1);
    room.hasDrawnThisTurn = false;
    room.drawnPlayableCardId = null;

    this.startTurnTimer(room);
    this.broadcastState(roomId);

    return {
      success: true,
      drawnCard,
      canPlayDrawn: false,
    };
  }

  callUno({ roomId, playerId }) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing') return { error: 'Game is not active.' };

    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.finished) return { error: 'Player not active.' };

    if (player.hand.length > 2) {
      return { error: 'You can only call UNO when you have 1 or 2 cards left!' };
    }

    player.saidUno = true;
    player.unoVulnerable = false;

    this.appendLog(room, `🚨 ${player.name} called UNO!`);
    this.emitSystemMessage(room, `🚨 ${player.name} called UNO!`);
    this.io.to(roomId).emit('uno_called', {
      playerId: player.id,
      playerName: player.name,
    });
    this.broadcastState(roomId);
    return { success: true };
  }

  catchUno({ roomId, callerId, targetId }) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing') return { error: 'Game is not active.' };

    const caller = room.players.find((p) => p.id === callerId);
    const vulnerablePlayer = targetId
      ? room.players.find((p) => p.id === targetId && !p.finished && p.unoVulnerable && p.hand.length === 1)
      : room.players.find((p) => !p.finished && p.unoVulnerable && p.hand.length === 1);

    if (!vulnerablePlayer) {
      return { error: 'No player is currently vulnerable to an UNO penalty!' };
    }

    const { drawnCards, drawPile, discardPile } = drawCardsFromPile(
      room.drawPile,
      room.discardPile,
      2
    );
    room.drawPile = drawPile;
    room.discardPile = discardPile;

    vulnerablePlayer.hand.push(...drawnCards);
    vulnerablePlayer.unoVulnerable = false;
    vulnerablePlayer.saidUno = false;

    const msg = `⚡ ${caller ? caller.name : 'Opponent'} caught ${
      vulnerablePlayer.name
    } not saying UNO! ${vulnerablePlayer.name} draws 2 penalty cards!`;
    this.appendLog(room, msg);
    this.emitSystemMessage(room, msg);

    this.io.to(roomId).emit('uno_caught', {
      callerName: caller?.name || 'Opponent',
      targetId: vulnerablePlayer.id,
      targetName: vulnerablePlayer.name,
    });

    this.broadcastState(roomId);
    return { success: true };
  }

  /**
   * Broadcasts a floating emoji reaction from a player's seat (`reaction_sent`).
   */
  sendReaction({ roomId, playerId, emoji }) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    const cleanEmoji = sanitizeText(emoji, 12) || '👍';
    this.io.to(roomId).emit('reaction_sent', {
      id: `react_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      playerId: player.id,
      playerName: player.name,
      emoji: cleanEmoji,
      timestamp: Date.now(),
    });
  }

  startTurnTimer(room) {
    this.clearRoomTimers(room);

    if (room.status !== 'playing') return;

    const activePlayer = room.players[room.currentTurnIndex];
    if (!activePlayer || activePlayer.finished) return;

    const now = Date.now();
    room.turnStartedAt = now;
    room.turnStartTime = now;
    room.turnDuration = TURN_DURATION_MS;
    room.endsAt = now + TURN_DURATION_MS;
    room.turnDeadline = room.endsAt;
    room.turnSequence = (room.turnSequence || 0) + 1;

    console.log(
      `[TURN_STARTED] ts=${new Date(now).toISOString()} room=${room.roomId} seq=${
        room.turnSequence
      } player=${activePlayer.name} (${activePlayer.id}) endsAt=${room.endsAt}`
    );

    this.io.to(room.roomId).emit('turn_started', {
      playerId: activePlayer.id,
      playerName: activePlayer.name,
      turnStartedAt: room.turnStartedAt,
      endsAt: room.endsAt,
      turnDeadline: room.endsAt,
      turnDuration: TURN_DURATION_MS,
      serverNow: now,
      turnSequence: room.turnSequence,
    });

    room.turnTimerRef = setTimeout(() => {
      this.handleTurnTimeout(room.roomId);
    }, TURN_DURATION_MS);

    if (activePlayer.isBot) {
      const thinkDelay = Math.floor(1100 + Math.random() * 900);
      room.botTimerRef = setTimeout(() => {
        this.executeBotTurn(room.roomId, activePlayer.id);
      }, thinkDelay);
    }
  }

  handleTurnTimeout(roomId) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing') return;

    const activePlayer = room.players[room.currentTurnIndex];
    if (!activePlayer || activePlayer.finished) return;

    console.log(
      `[TURN_TIMEOUT] ts=${new Date().toISOString()} room=${roomId} seq=${
        room.turnSequence || 0
      } player=${activePlayer.name} (${activePlayer.id})`
    );

    if (room.awaitingColorChoice) {
      const autoColor = chooseBestColorForHand(activePlayer.hand);
      const msg = `${activePlayer.name} ran out of time — auto-selected ${autoColor.toUpperCase()}.`;
      this.appendLog(room, `⏱️ ${msg}`);
      this.emitSystemMessage(room, msg);
      this.io.to(roomId).emit('turn_timeout', {
        playerId: activePlayer.id,
        playerName: activePlayer.name,
        message: msg,
        timestamp: Date.now(),
      });
      this.chooseColor({ roomId, playerId: activePlayer.id, color: autoColor });
      return;
    }

    if (room.hasDrawnThisTurn && room.drawnPlayableCardId) {
      const cardToAutoPlay = activePlayer.hand.find((c) => c.id === room.drawnPlayableCardId);
      if (cardToAutoPlay) {
        const autoColor =
          cardToAutoPlay.type === 'wild' || cardToAutoPlay.type === 'wild4'
            ? chooseBestColorForHand(activePlayer.hand)
            : undefined;
        const msg = `${activePlayer.name} ran out of time — auto-played.`;
        this.appendLog(room, `⏱️ ${msg}`);
        this.emitSystemMessage(room, msg);
        this.io.to(roomId).emit('turn_timeout', {
          playerId: activePlayer.id,
          playerName: activePlayer.name,
          message: msg,
          timestamp: Date.now(),
        });
        this.playCard({
          roomId,
          playerId: activePlayer.id,
          cardId: cardToAutoPlay.id,
          chosenColor: autoColor,
          isAutoPlay: true,
        });
        return;
      }
    }

    const timeoutMsg = `${activePlayer.name} ran out of time — auto-played.`;
    this.appendLog(room, `⏱️ ${timeoutMsg}`);
    this.emitSystemMessage(room, timeoutMsg);
    this.io.to(roomId).emit('turn_timeout', {
      playerId: activePlayer.id,
      playerName: activePlayer.name,
      message: timeoutMsg,
      timestamp: Date.now(),
    });

    // Auto-draw a card from the deck and auto-play if playable (otherwise pass turn)
    this.drawCard({
      roomId,
      playerId: activePlayer.id,
      autoPlayIfPossible: true,
    });
  }

  executeBotTurn(roomId, botId) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing') return;

    const activePlayer = room.players[room.currentTurnIndex];
    if (!activePlayer || activePlayer.id !== botId || activePlayer.finished) return;

    if (room.settings.botDifficulty !== 'easy') {
      const vulnerableHuman = room.players.find(
        (p) => p.id !== botId && !p.finished && p.unoVulnerable && p.hand.length === 1
      );
      if (vulnerableHuman) {
        this.catchUno({ roomId, callerId: botId, targetId: vulnerableHuman.id });
      }
    }

    const nextIdx = this.getNextPlayerIndex(room, room.currentTurnIndex, 1);
    const nextPlayer = room.players[nextIdx];
    const topCard = room.discardPile[room.discardPile.length - 1];

    const decision = computeBotDecision({
      hand: activePlayer.hand,
      topCard,
      activeColor: room.activeColor,
      pendingDraw: room.pendingDraw,
      allowStacking: room.settings.allowStacking,
      strictWild4: room.settings.strictWild4,
      nextPlayerCardCount: nextPlayer ? nextPlayer.hand.length : 7,
      difficulty: room.settings.botDifficulty || 'hard',
    });

    if (decision.callUno) {
      activePlayer.saidUno = true;
    }

    if (decision.action === 'play' && decision.card) {
      this.playCard({
        roomId,
        playerId: botId,
        cardId: decision.card.id,
        chosenColor: decision.chosenColor,
        isAutoPlay: false,
      });
    } else {
      this.drawCard({
        roomId,
        playerId: botId,
        autoPlayIfPossible: true,
      });
    }
  }

  returnToLobby({ roomId, startFreshMatch = false }) {
    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found.' };

    this.clearRoomTimers(room);
    room.status = 'lobby';
    room.finishOrder = [];
    room.currentRound = 0;
    room.drawPile = [];
    room.discardPile = [];
    room.pendingDraw = 0;
    room.awaitingColorChoice = false;
    room.leaderboard = [];
    room.roundSummary = null;
    room.finalLeaderboard = null;

    room.players = room.players.filter((p) => p.isBot || p.connected);
    for (const p of room.players) {
      p.hand = [];
      p.score = 0;
      p.roundsWon = 0;
      p.ready = true;
      p.saidUno = false;
      p.unoVulnerable = false;
      p.finished = false;
      p.finishRank = null;
    }

    this.touchRoom(room);
    this.appendLog(room, 'Scores reset to 0 — ready for a fresh match!');
    this.emitSystemMessage(room, 'Scores reset to 0 — ready for a fresh match!');

    if (startFreshMatch) {
      return this.startGame({
        roomId,
        playerId: room.hostId,
        isNextRound: false,
      });
    }

    this.broadcastState(roomId);
    return { success: true };
  }

  sendChatMessage({ roomId, playerId, text, isReaction = false }) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    this.touchRoom(room);
    const cleanText = sanitizeText(text, 200);
    if (!cleanText) return;

    if (isReaction) {
      this.sendReaction({ roomId, playerId, emoji: cleanText });
    }

    const msg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: isReaction ? 'reaction' : 'user',
      playerId: player.id,
      playerName: player.name,
      avatarColor: player.avatarColor,
      isBot: player.isBot,
      text: cleanText,
      timestamp: Date.now(),
    };

    room.chatMessages.push(msg);
    if (room.chatMessages.length > 80) {
      room.chatMessages.shift();
    }

    this.io.to(roomId).emit('chat_message', msg);
  }

  handleDisconnect(socketId) {
    const mapping = this.socketToPlayer.get(socketId);
    if (!mapping) return;

    const { roomId, playerId } = mapping;
    this.socketToPlayer.delete(socketId);

    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    player.connected = false;
    player.socketId = null;

    const connectedHumans = room.players.filter((p) => !p.isBot && p.connected);
    if (connectedHumans.length === 0) {
      // Part 9: Immediately destroy room and wipe all in-memory scores when last human player disconnects
      this.cleanupRoom(roomId, 'All players disconnected — room and scores permanently deleted.');
      return;
    }

    if (room.hostId === player.id) {
      room.hostId = connectedHumans[0].id;
      for (const p of room.players) {
        p.isHost = p.id === room.hostId;
      }
      this.appendLog(room, `${connectedHumans[0].name} is now the room host.`);
      this.emitSystemMessage(room, `${connectedHumans[0].name} is now the room host.`);
    }

    this.appendLog(room, `${player.name} disconnected.`);
    this.emitSystemMessage(room, `${player.name} disconnected.`);
    this.broadcastState(roomId);
  }

  leaveRoom({ roomId, playerId, socketId }) {
    if (socketId) {
      this.socketToPlayer.delete(socketId);
    }
    const room = this.rooms.get(roomId);
    if (!room) return;

    const leaving = room.players.find((p) => p.id === playerId);
    room.players = room.players.filter((p) => p.id !== playerId);

    const connectedHumans = room.players.filter((p) => !p.isBot && p.connected);

    // Part 9: Destroy room & wipe all scores if no human players remain OR if host closes/leaves after game ends
    if (
      connectedHumans.length === 0 ||
      (room.hostId === playerId &&
        (room.status === 'round_over' || room.status === 'game_over'))
    ) {
      this.cleanupRoom(roomId, 'Room closed and all ephemeral scores deleted.');
      return;
    }

    if (room.hostId === playerId) {
      room.hostId = connectedHumans[0].id;
      for (const p of room.players) {
        p.isHost = p.id === room.hostId;
      }
    }

    if (leaving) {
      this.appendLog(room, `${leaving.name} left the room.`);
      this.emitSystemMessage(room, `${leaving.name} left the room.`);
    }
    this.broadcastState(roomId);
  }

  /**
   * Advances `steps` active (non-finished) players in the current direction (`1` or `-1`).
   * Automatically skips players who have already finished (`p.finished === true`).
   */
  getNextPlayerIndex(room, currentIndex, steps = 1) {
    const total = room.players.length;
    if (total === 0) return 0;

    let idx = currentIndex;
    let remainingSteps = steps;
    let safety = 0;

    while (remainingSteps > 0 && safety < total * 4) {
      idx = (((idx + room.direction) % total) + total) % total;
      if (!room.players[idx].finished) {
        remainingSteps--;
      }
      safety++;
    }

    return idx;
  }

  appendLog(room, message) {
    room.lastAction = message;
    room.actionLog.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: message,
      timestamp: Date.now(),
    });
    if (room.actionLog.length > 40) {
      room.actionLog.pop();
    }
  }

  clearRoomTimers(room) {
    if (room.turnTimerRef) {
      clearTimeout(room.turnTimerRef);
      room.turnTimerRef = null;
      console.log(
        `[TURN_ENDED] ts=${new Date().toISOString()} room=${room.roomId} seq=${
          room.turnSequence || 0
        }`
      );
    }
    if (room.botTimerRef) {
      clearTimeout(room.botTimerRef);
      room.botTimerRef = null;
    }
  }

  getSanitizedStateForPlayer(room, viewerPlayerId) {
    const topCard = room.discardPile[room.discardPile.length - 1] || null;
    const viewer = room.players.find((p) => p.id === viewerPlayerId);
    const activeRemainingCount = room.players.filter((p) => !p.finished).length;
    const nextTurnIndex =
      room.status === 'playing' && activeRemainingCount > 1
        ? this.getNextPlayerIndex(room, room.currentTurnIndex, 1)
        : -1;

    const playersList = room.players.map((p, index) => ({
      id: p.id,
      name: p.name,
      initial: p.name.trim().charAt(0).toUpperCase() || 'P',
      isBot: p.isBot,
      isHost: p.id === room.hostId,
      connected: p.connected,
      ready: p.ready,
      cardCount: p.hand.length,
      score: p.score,
      roundsWon: p.roundsWon,
      saidUno: p.saidUno,
      unoVulnerable: p.unoVulnerable,
      finished: Boolean(p.finished),
      finishRank: p.finishRank || null,
      avatarColor: p.avatarColor,
      isTurn: room.status === 'playing' && !p.finished && room.currentTurnIndex === index,
      isNext:
        room.status === 'playing' &&
        !p.finished &&
        index === nextTurnIndex &&
        index !== room.currentTurnIndex,
    }));

    return {
      roomId: room.roomId,
      status: room.status,
      hostId: room.hostId,
      settings: room.settings,
      currentRound: room.currentRound,
      direction: room.direction,
      currentTurnIndex: room.currentTurnIndex,
      activePlayerId: room.players[room.currentTurnIndex]?.id || null,
      nextPlayerId: room.players[nextTurnIndex]?.id || null,
      activeRemainingCount,
      finishOrder: room.finishOrder,
      turnStartedAt: room.turnStartedAt || room.turnStartTime,
      turnStartTime: room.turnStartTime,
      endsAt: room.endsAt || room.turnDeadline,
      turnDeadline: room.endsAt || room.turnDeadline,
      turnDuration: TURN_DURATION_MS,
      turnDurationMs: TURN_DURATION_MS,
      serverNow: Date.now(),
      turnSequence: room.turnSequence || 0,
      drawPileCount: room.drawPile.length,
      discardPileCount: room.discardPile.length,
      topCard,
      recentDiscards: room.discardPile.slice(-5),
      lastPlayedBy: room.lastPlayedBy,
      deckVerification: room.deckVerification,
      activeColor: room.activeColor,
      pendingDraw: room.pendingDraw,
      awaitingColorChoice: room.awaitingColorChoice,
      hasDrawnThisTurn: room.hasDrawnThisTurn,
      drawnPlayableCardId:
        room.players[room.currentTurnIndex]?.id === viewerPlayerId
          ? room.drawnPlayableCardId
          : null,
      lastAction: room.lastAction,
      actionLog: room.actionLog,
      chatMessages: room.chatMessages,
      leaderboard: room.leaderboard || [],
      roundSummary: room.roundSummary,
      finalLeaderboard: room.finalLeaderboard,
      myHand: viewer ? viewer.hand : [],
      players: playersList,
    };
  }

  broadcastState(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    for (const player of room.players) {
      if (!player.isBot && player.connected && player.socketId) {
        const state = this.getSanitizedStateForPlayer(room, player.id);
        this.io.to(player.socketId).emit('sync_state', state);
      }
    }
  }
}

export function cleanupRoom(roomManager, roomId, reason) {
  if (!roomManager || typeof roomManager.cleanupRoom !== 'function') return false;
  return roomManager.cleanupRoom(roomId, reason);
}
