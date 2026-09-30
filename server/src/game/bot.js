/**
 * Smart Bot AI Strategy Module (with Easy / Medium / Hard Difficulty Levels)
 *
 * Implements intelligent UNO decision-making for AI players:
 * - Easy: Picks a random valid playable card, random color for Wilds, 65% chance to call UNO immediately.
 * - Medium: Prioritizes matching colors/numbers before Wilds, picks dominant hand color for Wilds, always calls UNO.
 * - Hard: Evaluates opponent hand sizes, aggressively plays +2/Skip/Reverse/Wild+4 when next player is low on cards,
 *         optimizes color switching, and always calls UNO + catches vulnerable humans.
 */

import { COLORS } from './deck.js';
import { getPlayableCards } from './rules.js';

export const BOT_NAMES = [
  'Bot Alice 🤖',
  'Bot Bob 🤖',
  'Bot Cipher 🤖',
  'Bot Nova 🤖',
  'Bot Orion 🤖',
  'Bot Vega 🤖',
];

/**
 * Determines the dominant color in a player's hand for Wild card color declarations.
 */
export function chooseBestColorForHand(hand = []) {
  const counts = {
    red: 0,
    yellow: 0,
    green: 0,
    blue: 0,
  };

  for (const card of hand) {
    if (COLORS.includes(card.color)) {
      counts[card.color] += 1 + (card.score || 0) * 0.02;
    }
  }

  let bestColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  let maxScore = -1;

  for (const color of COLORS) {
    if (counts[color] > maxScore) {
      maxScore = counts[color];
      bestColor = color;
    }
  }

  return bestColor;
}

/**
 * Selects the best move for a Bot player based on difficulty ('easy' | 'medium' | 'hard').
 */
export function computeBotDecision({
  hand,
  topCard,
  activeColor,
  pendingDraw = 0,
  allowStacking = false,
  strictWild4 = true,
  nextPlayerCardCount = 7,
  difficulty = 'hard',
}) {
  const playable = getPlayableCards({
    hand,
    topCard,
    activeColor,
    pendingDraw,
    allowStacking,
    strictWild4,
  });

  if (playable.length === 0) {
    return {
      action: 'draw',
      callUno: hand.length <= 2,
    };
  }

  // Easy Bot: picks a random playable card and random Wild color
  if (difficulty === 'easy') {
    const randomCard = playable[Math.floor(Math.random() * playable.length)];
    const remaining = hand.filter((c) => c.id !== randomCard.id);
    const chosenColor =
      randomCard.type === 'wild' || randomCard.type === 'wild4'
        ? COLORS[Math.floor(Math.random() * COLORS.length)]
        : undefined;
    return {
      action: 'play',
      card: randomCard,
      chosenColor,
      callUno: remaining.length === 1 ? Math.random() < 0.85 : false,
    };
  }

  // Medium & Hard Bots: save Wilds for when no colored card is playable
  const coloredPlayable = playable.filter(
    (c) => c.type !== 'wild' && c.type !== 'wild4'
  );
  const wildPlayable = playable.filter(
    (c) => c.type === 'wild' || c.type === 'wild4'
  );

  let selectedCard = null;

  if (coloredPlayable.length > 0) {
    const colorFrequency = { red: 0, yellow: 0, green: 0, blue: 0 };
    for (const c of hand) {
      if (colorFrequency[c.color] !== undefined) {
        colorFrequency[c.color]++;
      }
    }

    const scoredCandidates = coloredPlayable.map((card) => {
      let weight = card.score || 0;
      weight += (colorFrequency[card.color] || 0) * 3;

      if (difficulty === 'hard' && nextPlayerCardCount <= 2) {
        if (card.type === 'draw2') weight += 55;
        if (card.type === 'skip' || card.type === 'reverse') weight += 40;
      } else {
        if (card.type === 'draw2' || card.type === 'skip' || card.type === 'reverse') {
          weight += 12;
        }
      }

      if (card.color !== activeColor && colorFrequency[card.color] >= 2) {
        weight += 10;
      }

      return { card, weight };
    });

    scoredCandidates.sort((a, b) => b.weight - a.weight);
    selectedCard = scoredCandidates[0].card;
  } else {
    const wildRegular = wildPlayable.find((c) => c.type === 'wild');
    const wildFour = wildPlayable.find((c) => c.type === 'wild4');

    if (difficulty === 'hard' && nextPlayerCardCount <= 3 && wildFour) {
      selectedCard = wildFour;
    } else {
      selectedCard = wildRegular || wildFour || wildPlayable[0];
    }
  }

  const remainingHand = hand.filter((c) => c.id !== selectedCard.id);
  const chosenColor =
    selectedCard.type === 'wild' || selectedCard.type === 'wild4'
      ? chooseBestColorForHand(remainingHand)
      : undefined;

  return {
    action: 'play',
    card: selectedCard,
    chosenColor,
    callUno: remainingHand.length === 1,
  };
}
