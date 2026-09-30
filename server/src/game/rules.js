/**
 * Official UNO Rules & Move Validation Engine
 *
 * Enforces strict official UNO rules:
 * 1. Matching rule: A non-wild card must match the active color OR the top card's value/type.
 * 2. Wild card: Can be played on any turn (unless a pending stack requires +2/+4 when stacking is enabled).
 * 3. Wild Draw Four (+4) strict rule: Can ONLY be played if the player holds NO cards in hand
 *    that match the current active color (Wild cards do not count as matching color).
 * 4. Reverse in 2-player game: Acts immediately as a Skip (current player gets another turn / opponent loses turn).
 * 5. Optional Stacking rule: When enabled by host, +2 can stack on +2, and +4 can stack on +4.
 *    When OFF (default official rule), a player hit by +2 or +4 immediately draws the cards and loses their turn.
 * 6. Official End-of-Round Scoring:
 *    - Number cards (0–9): Face value (0–9 pts)
 *    - Skip / Reverse / Draw Two: 20 pts each
 *    - Wild / Wild +4: 50 pts each
 *    - Round winner receives the sum of all opponents' remaining card points.
 */

/**
 * Checks whether the player holds any card matching the current activeColor.
 * Note: Per official UNO rules, having a number/action card of the activeColor
 * prevents playing a Wild Draw Four (+4), whereas having another Wild card does not.
 *
 * @param {Array} hand - The player's current cards
 * @param {string} activeColor - 'red' | 'yellow' | 'green' | 'blue'
 * @returns {boolean}
 */
export function hasColorInHand(hand, activeColor) {
  if (!activeColor) return false;
  return hand.some((card) => card.color === activeColor);
}

/**
 * Validates whether `card` from `hand` can legally be played on `topCard` with `activeColor`.
 *
 * @param {Object} params
 * @param {Object} params.card - The card the player wants to play
 * @param {Array} params.hand - The player's full hand (used to validate Wild +4 legality)
 * @param {Object} params.topCard - The top card on the discard pile
 * @param {string} params.activeColor - Current active color ('red' | 'yellow' | 'green' | 'blue')
 * @param {number} [params.pendingDraw=0] - Pending draw stack (only > 0 when stacking rule is enabled)
 * @param {boolean} [params.allowStacking=false] - Whether host enabled +2/+4 stacking
 * @param {boolean} [params.strictWild4=true] - Whether Wild +4 is blocked when holding matching color
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validatePlayCard({
  card,
  hand,
  topCard,
  activeColor,
  pendingDraw = 0,
  allowStacking = false,
  strictWild4 = true,
}) {
  if (!card || !topCard) {
    return { valid: false, reason: 'Invalid card or discard state.' };
  }

  // If stacking is enabled and there is an active draw penalty stack,
  // player can only stack a matching draw card (+2 on +2, or +4 on +4/+2)
  if (allowStacking && pendingDraw > 0) {
    if (topCard.type === 'draw2' && card.type === 'draw2') {
      return { valid: true };
    }
    if (card.type === 'wild4') {
      return { valid: true };
    }
    return {
      valid: false,
      reason: `You must stack a +2/+4 card or draw ${pendingDraw} penalty cards!`,
    };
  }

  // Wild card can always be played
  if (card.type === 'wild') {
    return { valid: true };
  }

  // Wild Draw Four (+4): Strictly enforce that player has NO card of activeColor in hand
  if (card.type === 'wild4') {
    if (strictWild4 && hasColorInHand(hand, activeColor)) {
      return {
        valid: false,
        reason: `Illegal move! Wild +4 can only be played when you have no ${activeColor.toUpperCase()} cards in your hand.`,
      };
    }
    return { valid: true };
  }

  // Standard colored cards (numbers 0-9, skip, reverse, draw2)
  // Match by active color
  if (card.color === activeColor) {
    return { valid: true };
  }

  // Match by number or action symbol/type
  if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) {
    return { valid: true };
  }

  if (card.type !== 'number' && card.type === topCard.type) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: `Card must match the active color (${activeColor.toUpperCase()}) or top symbol (${String(topCard.value).toUpperCase()}).`,
  };
}

/**
 * Returns all playable cards in a player's hand given the current table state.
 */
export function getPlayableCards({
  hand,
  topCard,
  activeColor,
  pendingDraw = 0,
  allowStacking = false,
  strictWild4 = true,
}) {
  return hand.filter(
    (card) =>
      validatePlayCard({
        card,
        hand,
        topCard,
        activeColor,
        pendingDraw,
        allowStacking,
        strictWild4,
      }).valid
  );
}

/**
 * Calculates the point value of a single UNO card.
 */
export function getCardPoints(card) {
  if (!card) return 0;
  if (typeof card.score === 'number') return card.score;
  if (card.type === 'wild' || card.type === 'wild4') return 50;
  if (card.type === 'skip' || card.type === 'reverse' || card.type === 'draw2') return 20;
  return Number(card.value) || 0;
}

/**
 * Calculates the total points left in a player's hand.
 */
export function calculateHandPoints(hand = []) {
  return hand.reduce((sum, card) => sum + getCardPoints(card), 0);
}

/**
 * Calculates the points awarded to the round winner (sum of all opponents' remaining hands).
 */
export function calculateWinnerRoundScore(players, winnerId) {
  return players.reduce((total, player) => {
    if (player.id === winnerId) return total;
    return total + calculateHandPoints(player.hand || []);
  }, 0);
}
