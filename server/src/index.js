/**
 * Multiplayer UNO Backend Server (Express + Socket.IO — Parts 1–9)
 * Ephemeral In-Memory Rooms & Leaderboards Only (Zero Persistent Storage)
 */

import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { RoomManager, validatePlayerName } from './game/RoomManager.js';

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || '*';

const app = express();
app.use(
  cors({
    origin: CLIENT_URL === '*' ? true : CLIENT_URL.split(','),
    credentials: true,
  })
);
app.use(express.json());

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL === '*' ? true : CLIENT_URL.split(','),
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const roomManager = new RoomManager(io);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    activeRooms: roomManager.rooms.size,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const room = roomManager.rooms.get(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({
    roomId: room.roomId,
    status: room.status,
    playerCount: room.players.length,
    maxPlayers: room.settings.requiredPlayers || 6,
    settings: room.settings,
  });
});

io.on('connection', (socket) => {
  socket.on('set_player_name', (payload = {}, callback) => {
    const check = validatePlayerName(payload.playerName);
    if (typeof callback === 'function') callback(check);
  });

  socket.on('create_room', (payload = {}, callback) => {
    const { playerName, playerId, settings } = payload;
    const { room, player } = roomManager.createRoom({
      playerName,
      playerId,
      socketId: socket.id,
      settings,
    });

    socket.join(room.roomId);
    const state = roomManager.getSanitizedStateForPlayer(room, player.id);
    socket.emit('sync_state', state);

    if (typeof callback === 'function') {
      callback({ success: true, roomId: room.roomId, playerId: player.id, state });
    }
  });

  socket.on('join_room', (payload = {}, callback) => {
    const { roomId, playerName, playerId } = payload;
    const result = roomManager.joinRoom({
      roomId,
      playerName,
      playerId,
      socketId: socket.id,
    });

    if (result.error) {
      if (typeof callback === 'function') callback({ error: result.error });
      return;
    }

    socket.join(result.room.roomId);
    const state = roomManager.getSanitizedStateForPlayer(result.room, result.player.id);
    socket.emit('sync_state', state);

    if (typeof callback === 'function') {
      callback({
        success: true,
        roomId: result.room.roomId,
        playerId: result.player.id,
        reconnected: result.reconnected,
        state,
      });
    }
  });

  socket.on('leave_room', (payload = {}, callback) => {
    const { roomId, playerId } = payload;
    socket.leave(roomId);
    roomManager.leaveRoom({ roomId, playerId, socketId: socket.id });
    if (typeof callback === 'function') callback({ success: true });
  });

  socket.on('close_room', (payload = {}, callback) => {
    const { roomId, playerId } = payload;
    const res = roomManager.closeRoom({ roomId, playerId });
    if (typeof callback === 'function') callback(res);
  });

  socket.on('select_game_mode', (payload = {}, callback) => {
    const res = roomManager.selectGameMode(payload);
    if (typeof callback === 'function') callback(res);
  });

  socket.on('toggle_ready', (payload = {}, callback) => {
    const res = roomManager.toggleReady(payload);
    if (typeof callback === 'function') callback(res);
  });

  socket.on('update_settings', (payload = {}, callback) => {
    const res = roomManager.updateSettings(payload);
    if (typeof callback === 'function') callback(res);
  });

  socket.on('add_bot', (payload = {}, callback) => {
    const res = roomManager.addBot(payload);
    if (typeof callback === 'function') callback(res);
  });

  socket.on('remove_bot', (payload = {}, callback) => {
    const res = roomManager.removeBot(payload);
    if (typeof callback === 'function') callback(res);
  });

  socket.on('kick_player', (payload = {}, callback) => {
    const res = roomManager.kickPlayer(payload);
    if (typeof callback === 'function') callback(res);
  });

  socket.on('start_game', (payload = {}, callback) => {
    const res = roomManager.startGame(payload);
    if (typeof callback === 'function') callback(res);
  });

  socket.on('play_card', (payload = {}, callback) => {
    const res = roomManager.playCard(payload);
    if (typeof callback === 'function') callback(res);
  });

  socket.on('draw_card', (payload = {}, callback) => {
    const res = roomManager.drawCard(payload);
    if (typeof callback === 'function') callback(res);
  });

  socket.on('choose_color', (payload = {}, callback) => {
    const res = roomManager.chooseColor(payload);
    if (typeof callback === 'function') callback(res);
  });

  socket.on('call_uno', (payload = {}, callback) => {
    const res = roomManager.callUno(payload);
    if (typeof callback === 'function') callback(res);
  });

  socket.on('catch_uno', (payload = {}, callback) => {
    const res = roomManager.catchUno(payload);
    if (typeof callback === 'function') callback(res);
  });

  socket.on('reaction_sent', (payload = {}) => {
    roomManager.sendReaction(payload);
  });

  socket.on('play_again', (payload = {}, callback) => {
    const res = roomManager.returnToLobby(payload);
    if (typeof callback === 'function') callback(res);
  });

  socket.on('request_rematch', (payload = {}, callback) => {
    const res = roomManager.returnToLobby(payload);
    if (typeof callback === 'function') callback(res);
  });

  socket.on('return_to_lobby', (payload = {}, callback) => {
    const res = roomManager.returnToLobby(payload);
    if (typeof callback === 'function') callback(res);
  });

  socket.on('chat_message', (payload = {}) => {
    roomManager.sendChatMessage(payload);
  });

  socket.on('send_chat', (payload = {}) => {
    roomManager.sendChatMessage(payload);
  });

  socket.on('disconnect', () => {
    roomManager.handleDisconnect(socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 UNO Multiplayer Server listening on http://localhost:${PORT}`);
});
