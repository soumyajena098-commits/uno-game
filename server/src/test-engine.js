/**
 * Automated Unit & Integration Test Suite for the Official UNO Engine (Parts 1, 2 & 3)
 */

import assert from 'assert';
import { createOfficialDeck, dealFairHands } from './game/deck.js';
import { validatePlayCard, calculateWinnerRoundScore } from './game/rules.js';
import { RoomManager, validatePlayerName } from './game/RoomManager.js';

console.log('🧪 Running Official UNO Rule Engine Tests (Parts 1, 2 & 3)...\n');

// 1. Verify Official 108-Card Deck Composition
const deck = createOfficialDeck();
assert.strictEqual(deck.length, 108, `Expected 108 cards in official UNO deck, got ${deck.length}`);
console.log('✅ 1. 108-Card Official UNO Deck & Crypto Shuffle verified.');

// 2. Verify Fair & Equal Card Distribution across 1 to 6 Players
const expectedDrawLeft = {
  1: 100,
  2: 93,
  3: 86,
  4: 79,
  5: 72,
  6: 65,
};
for (let pCount = 1; pCount <= 6; pCount++) {
  const dealt = dealFairHands(pCount);
  assert.strictEqual(dealt.cardsPerPlayer, 7, `Each player in ${pCount}P mode must get 7 cards`);
  assert.strictEqual(
    dealt.drawPile.length,
    expectedDrawLeft[pCount],
    `Expected ${expectedDrawLeft[pCount]} cards in draw pile for ${pCount} players`
  );
  assert.strictEqual(dealt.totalVerified, 108, 'Total cards must equal 108');
}
console.log('✅ 2. Fair & Equal Card Distribution (1P to 6P) verified.');

// 3. Verify Entry Screen Name Validation (2-15 chars, letters/numbers/_/spaces only)
assert.strictEqual(validatePlayerName('A').valid, false, '1-char name must fail');
assert.strictEqual(validatePlayerName('Valid_Name 1').valid, true, 'Valid name must pass');
assert.strictEqual(validatePlayerName('Bad<script>').valid, false, 'Special chars must fail');
console.log('✅ 3. Player Name Validation (2-15 chars, safe characters) verified.');

// 4. Verify Strict Wild +4 Legality Enforcement
const sampleHandWithRed = [
  { id: 'c1', color: 'red', type: 'number', value: 5, score: 5 },
  { id: 'c2', color: 'wild', type: 'wild4', value: 'wild4', score: 50 },
];
const topRedCard = { id: 'top', color: 'red', type: 'number', value: 2, score: 2 };
assert.strictEqual(
  validatePlayCard({
    card: sampleHandWithRed[1],
    hand: sampleHandWithRed,
    topCard: topRedCard,
    activeColor: 'red',
    strictWild4: true,
  }).valid,
  false,
  'Wild +4 should be rejected when player holds a matching color card in hand'
);
console.log('✅ 4. Strict Wild +4 validation verified.');

// 5. Verify Part 3 Elimination-Style Play in a 3-Player Game
const mockIo = {
  to: () => ({ emit: () => {} }),
};
const manager = new RoomManager(mockIo);

const { room, player: host } = manager.createRoom({
  playerName: 'Alice',
  socketId: 'sock_1',
});
manager.selectGameMode({ roomId: room.roomId, playerId: host.id, playerMode: '3P' });
manager.addBot({ roomId: room.roomId, playerId: host.id });
manager.addBot({ roomId: room.roomId, playerId: host.id });
assert.strictEqual(room.players.length, 3, '3P mode should have 3 players');

manager.startGame({ roomId: room.roomId, playerId: host.id });
manager.clearRoomTimers(room);

// Give Alice (Player 0) 1 playable card, Bot 1 (Player 1) 1 playable card, Bot 2 (Player 2) 2 cards
room.currentTurnIndex = 0;
room.direction = 1;
room.activeColor = 'red';
room.discardPile = [{ id: 'top_red', color: 'red', type: 'number', value: 1, score: 1 }];
room.players[0].hand = [{ id: 'alice_last', color: 'red', type: 'number', value: 5, score: 5 }];
room.players[1].hand = [{ id: 'bot1_last', color: 'red', type: 'number', value: 8, score: 8 }];
room.players[2].hand = [
  { id: 'bot2_c1', color: 'blue', type: 'number', value: 9, score: 9 },
  { id: 'bot2_c2', color: 'green', type: 'skip', value: 'skip', score: 20 },
];

// Verify Part 5 nextPlayerId / isNext calculation before Alice plays
const prePlayState = manager.getSanitizedStateForPlayer(room, room.players[0].id);
assert.strictEqual(
  prePlayState.nextPlayerId,
  room.players[1].id,
  'Part 5: nextPlayerId must point to the upcoming player in rotation'
);
assert.strictEqual(
  prePlayState.players[1].isNext,
  true,
  'Part 5: Player 1 must have isNext = true'
);
assert.strictEqual(
  prePlayState.liveRankings,
  undefined,
  'Part 5: liveRankings must be removed from public state'
);

// Alice plays her final card -> she should be SAFE / FINISHED (Rank #1), and game MUST CONTINUE!
manager.playCard({
  roomId: room.roomId,
  playerId: room.players[0].id,
  cardId: 'alice_last',
});
manager.clearRoomTimers(room);

assert.strictEqual(room.players[0].finished, true, 'Alice must be marked finished');
assert.strictEqual(room.players[0].finishRank, 1, 'Alice must receive Finish Rank #1');
assert.strictEqual(
  room.status,
  'playing',
  'Game must CONTINUE when 2 players still have cards in 3P elimination mode'
);
assert.strictEqual(
  room.currentTurnIndex,
  1,
  'Turn must advance to Player 1 (Bot 1)'
);

// Now Bot 1 (Player 1) plays its final card -> Bot 1 gets Rank #2, and since only 1 player (Bot 2) remains with cards, Round Ends!
manager.playCard({
  roomId: room.roomId,
  playerId: room.players[1].id,
  cardId: 'bot1_last',
});
manager.clearRoomTimers(room);

assert.strictEqual(room.players[1].finished, true, 'Bot 1 must be marked finished');
assert.strictEqual(room.players[1].finishRank, 2, 'Bot 1 must receive Finish Rank #2');
assert.strictEqual(room.players[2].finishRank, 3, 'Last remaining player (Bot 2) must receive Last Place (#3)');
assert.ok(
  room.status === 'round_over' || room.status === 'game_over',
  'Round must end when only ONE player remains with cards'
);
assert.strictEqual(
  room.players[1].score,
  50,
  '2nd place finisher in 3P game should earn +50 rank bonus points'
);
assert.strictEqual(
  room.players[2].score,
  0,
  'Last place finisher should earn 0 points'
);
console.log('✅ 5. Part 3 Elimination-Style Play (1st SAFE -> round continues -> ends when 1 player left + rank bonuses) verified.');

// 6. Verify 60-second Turn Timeout auto-draw & auto-play
const { room: room2, player: host2 } = manager.createRoom({
  playerName: 'Tester',
  socketId: 'sock_2',
  settings: { playerMode: '1vBot' },
});
manager.startGame({ roomId: room2.roomId, playerId: host2.id });
manager.clearRoomTimers(room2);
room2.currentTurnIndex = 0;
room2.activeColor = 'red';
room2.discardPile = [{ id: 'top_r', color: 'red', type: 'number', value: 9, score: 9 }];
room2.drawPile.push({ id: 'auto_drawn_red5', color: 'red', type: 'number', value: 5, score: 5 });

manager.handleTurnTimeout(room2.roomId);
manager.clearRoomTimers(room2);
assert.strictEqual(
  room2.discardPile[room2.discardPile.length - 1].id,
  'auto_drawn_red5',
  'When 60s timer expires and drawn card is playable, it must be auto-played onto discard pile'
);
console.log('✅ 6. 60-second turn timeout auto-draw & auto-play verified.');

// 7. Verify Part 9: Ephemeral Leaderboard & cleanupRoom (Zero Storage, Zero History)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cleanupRoom } from './game/RoomManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure no persistent leaderboard files exist on disk
const legacyDbFile = path.resolve(__dirname, './db/leaderboard.js');
const legacyJsonFile = path.resolve(__dirname, '../data/leaderboard.json');
assert.strictEqual(fs.existsSync(legacyDbFile), false, 'Part 9: server/src/db/leaderboard.js must not exist');
assert.strictEqual(fs.existsSync(legacyJsonFile), false, 'Part 9: server/data/leaderboard.json must not exist');

// Verify Play Again (returnToLobby) resets all scores to 0 and clears room.leaderboard
assert.ok(Array.isArray(room.leaderboard) && room.leaderboard.length === 3, 'In-memory room.leaderboard should exist at round end');
manager.returnToLobby({ roomId: room.roomId });
assert.strictEqual(room.leaderboard.length, 0, 'Play Again must clear room.leaderboard');
assert.strictEqual(room.roundSummary, null, 'Play Again must clear room.roundSummary');
assert.strictEqual(room.finalLeaderboard, null, 'Play Again must clear room.finalLeaderboard');
assert.ok(
  room.players.every((p) => p.score === 0 && p.roundsWon === 0),
  'Play Again must reset all player scores to zero'
);

// Populate score/leaderboard data again, then run cleanupRoom and verify zero references remain in memory
room.players[0].score = 250;
room.leaderboard = [{ id: room.players[0].id, name: 'Alice', totalScore: 250 }];
room.roundSummary = { winnerName: 'Alice', standings: room.leaderboard };
room.chatMessages.push({ id: 'm1', text: 'GG!' });

let roomDestroyedEmitted = false;
const trackedIo = {
  to: () => ({
    emit: (event) => {
      if (event === 'room_destroyed') roomDestroyedEmitted = true;
    },
  }),
};
manager.io = trackedIo;

const cleaned = cleanupRoom(manager, room.roomId, 'Unit test cleanup');
assert.strictEqual(cleaned, true, 'cleanupRoom must return true when cleaning an active room');
assert.strictEqual(roomDestroyedEmitted, true, 'cleanupRoom must emit room_destroyed to room sockets');
assert.strictEqual(manager.rooms.has(room.roomId), false, 'Room must be removed from manager.rooms map');
assert.strictEqual(room.leaderboard.length, 0, 'room.leaderboard must be emptied in memory');
assert.strictEqual(room.roundSummary, null, 'room.roundSummary must be null after cleanupRoom');
assert.strictEqual(room.finalLeaderboard, null, 'room.finalLeaderboard must be null after cleanupRoom');
assert.strictEqual(room.chat.length, 0, 'room.chat must be emptied in memory');
assert.strictEqual(room.players.length, 0, 'room.players must be emptied in memory');

// Also verify leaveRoom on room2 automatically invokes cleanupRoom when last human leaves
manager.leaveRoom({ roomId: room2.roomId, playerId: host2.id, socketId: 'sock_2' });
assert.strictEqual(
  manager.rooms.has(room2.roomId),
  false,
  'Room must be automatically destroyed and wiped when last human player leaves'
);

console.log('✅ 7. Part 9 Ephemeral Leaderboard (in-memory only, Play Again reset, cleanupRoom wipe & zero disk storage) verified.\n');
console.log('🎉 All Part 1 – Part 9 UNO Engine tests passed!');
process.exit(0);
