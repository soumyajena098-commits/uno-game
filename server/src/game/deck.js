/**
 * Official UNO Deck Generator & Cryptographic Shuffler Module
 *
 * Official 108-Card UNO Deck Composition:
 * - 4 Colors: Red, Yellow, Green, Blue
 * - Per Color (25 cards each = 100 cards):
 *   - One '0' card (1)
 *   - Two each of '1' through '9' (18)
 *   - Two 'skip' cards (2)
 *   - Two 'reverse' cards (2)
 *   - Two 'draw2' (+2) cards (2)
 * - Wild Cards (8 cards total):
 *   - Four 'wild' cards (4)
 *   - Four 'wild4' (+4) cards (4)
 * Total = 108 cards.
 */

import crypto from 'crypto';

export const COLORS = ['red', 'yellow', 'green', 'blue'];
export const ACTION_TYPES = ['skip', 'reverse', 'draw2'];
export const WILD_TYPES = ['wild', 'wild4'];

/**
 * Generates a fresh 108-card official UNO deck with unique card IDs.
 */
export function createOfficialDeck() {
  const deck = [];
  let cardCounter = 1;

  for (const color of COLORS) {
    // One '0' per color (face value = 0 points)
    deck.push({
      id: `card_${cardCounter++}_${color}_0`,
      color,
      type: 'number',
      value: 0,
      score: 0,
    });

    // Two of each number 1–9 per color (face value = 1..9 points)
    for (let num = 1; num <= 9; num++) {
      for (let copy = 0; copy < 2; copy++) {
        deck.push({
          id: `card_${cardCounter++}_${color}_${num}_${copy}`,
          color,
          type: 'number',
          value: num,
          score: num,
        });
      }
    }

    // Two of each Action card per color: Skip, Reverse, Draw Two (20 points each)
    for (const action of ACTION_TYPES) {
      for (let copy = 0; copy < 2; copy++) {
        deck.push({
          id: `card_${cardCounter++}_${color}_${action}_${copy}`,
          color,
          type: action,
          value: action,
          score: 20,
        });
      }
    }
  }

  // Four Wild and Four Wild Draw Four (+4) cards (50 points each)
  for (let copy = 0; copy < 4; copy++) {
    deck.push({
      id: `card_${cardCounter++}_wild_${copy}`,
      color: 'wild',
      type: 'wild',
      value: 'wild',
      score: 50,
    });

    deck.push({
      id: `card_${cardCounter++}_wild4_${copy}`,
      color: 'wild',
      type: 'wild4',
      value: 'wild4',
      score: 50,
    });
  }

  return shuffleDeck(deck);
}

/**
 * Cryptographically safe Fisher-Yates shuffle using Node.js crypto.randomInt.
 * @param {Array} cards
 * @returns {Array}
 */
export function shuffleDeck(cards) {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Distributes cards evenly across all players in round-robin order (1 card at a time per player)
 * and verifies deck accounting fairness:
 *   cardsPerPlayer = Math.min(7, Math.floor((deckSize - 1) / playerCount))
 *   sum(playerHands) + 1 (top discard) + drawPile.length === 108
 *
 * @param {number} playerCount - Number of players in the match (1 to 6)
 * @returns {{ hands: Array<Array>, firstCard: Object, drawPile: Array, cardsPerPlayer: number, totalVerified: number }}
 */
export function dealFairHands(playerCount) {
  let deck = createOfficialDeck();
  const deckSize = deck.length; // 108

  // Formula: Math.floor((deckSize - 1) / playerCount) capped at 7
  const cardsPerPlayer = Math.min(7, Math.floor((deckSize - 1) / Math.max(1, playerCount)));
  const hands = Array.from({ length: playerCount }, () => []);

  // Round-robin dealing: 1 card to each player per pass
  for (let round = 0; round < cardsPerPlayer; round++) {
    for (let pIdx = 0; pIdx < playerCount; pIdx++) {
      const dealtCard = deck.pop();
      hands[pIdx].push({
        ...dealtCard,
        dealSequence: round * playerCount + pIdx,
      });
    }
  }

  // Flip the first top discard card (if Wild or Wild +4, return to deck, reshuffle remaining deck, and draw again)
  let firstCard = deck.pop();
  while (firstCard && (firstCard.type === 'wild' || firstCard.type === 'wild4')) {
    deck.unshift(firstCard);
    deck = shuffleDeck(deck);
    firstCard = deck.pop();
  }

  const totalHandsCount = hands.reduce((acc, h) => acc + h.length, 0);
  const totalVerified = totalHandsCount + (firstCard ? 1 : 0) + deck.length;

  return {
    hands,
    firstCard,
    drawPile: deck,
    cardsPerPlayer,
    totalVerified,
  };
}

/**
 * Draws `count` cards from the drawPile. If the drawPile runs out,
 * automatically reshuffles the discardPile (excluding the top discard card)
 * back into the drawPile per official UNO rules.
 */
export function drawCardsFromPile(drawPile, discardPile, count = 1) {
  let currentDraw = [...drawPile];
  let currentDiscard = [...discardPile];
  const drawnCards = [];
  let reshuffled = false;

  for (let i = 0; i < count; i++) {
    if (currentDraw.length === 0) {
      if (currentDiscard.length <= 1) {
        currentDraw = createOfficialDeck();
        reshuffled = true;
      } else {
        const topCard = currentDiscard[currentDiscard.length - 1];
        const cardsToReshuffle = currentDiscard.slice(0, -1).map((c) => ({
          ...c,
          color: c.type === 'wild' || c.type === 'wild4' ? 'wild' : c.color,
          declaredColor: undefined,
        }));
        currentDraw = shuffleDeck(cardsToReshuffle);
        currentDiscard = [topCard];
        reshuffled = true;
      }
    }

    const card = currentDraw.pop();
    if (card) {
      drawnCards.push(card);
    }
  }

  return {
    drawnCards,
    drawPile: currentDraw,
    discardPile: currentDiscard,
    reshuffled,
  };
}
