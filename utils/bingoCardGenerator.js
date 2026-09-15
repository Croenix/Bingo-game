/**
 * Utility for generating server-authoritative 75-ball Bingo cards.
 */

/**
 * Generate distinct random numbers within a given range [min, max]
 * @param {number} min
 * @param {number} max
 * @param {number} count
 * @returns {number[]}
 */
function getRandomNumbers(min, max, count) {
  const pool = [];
  for (let i = min; i <= max; i++) {
    pool.push(i);
  }
  
  const result = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(randomIndex, 1)[0]);
  }
  return result;
}

/**
 * Generate a single standard 75-ball Bingo card layout (5x5).
 * Columns:
 *  B: 1-15  (5 numbers)
 *  I: 16-30 (5 numbers)
 *  N: 31-45 (5 numbers, or 4 numbers + 10% chance for FREE center at row 2)
 *  G: 46-60 (5 numbers)
 *  O: 61-75 (5 numbers)
 * 
 * FREE center is granted on a 10% probability. For the remaining 90% of cards,
 * the center space receives a standard random number from 31-45.
 * 
 * @param {number} [freeCenterProbability=0.10] 10% chance for FREE center
 * @returns {{ numbers: number[], freeCenter: boolean }}
 */
function generateBingoCard(freeCenterProbability = 0.10) {
  const colB = getRandomNumbers(1, 15, 5);
  const colI = getRandomNumbers(16, 30, 5);
  const colG = getRandomNumbers(46, 60, 5);
  const colO = getRandomNumbers(61, 75, 5);

  // 10% chance for FREE center space
  const hasFreeCenter = Math.random() < freeCenterProbability;
  const colN = hasFreeCenter ? getRandomNumbers(31, 45, 4) : getRandomNumbers(31, 45, 5);

  const numbers = new Array(25);

  for (let row = 0; row < 5; row++) {
    numbers[row * 5 + 0] = colB[row];
    numbers[row * 5 + 1] = colI[row];

    if (hasFreeCenter) {
      if (row < 2) {
        numbers[row * 5 + 2] = colN[row];
      } else if (row === 2) {
        numbers[row * 5 + 2] = 0; // FREE center
      } else {
        numbers[row * 5 + 2] = colN[row - 1];
      }
    } else {
      numbers[row * 5 + 2] = colN[row]; // Standard number between 31-45
    }

    numbers[row * 5 + 3] = colG[row];
    numbers[row * 5 + 4] = colO[row];
  }

  return {
    numbers,
    freeCenter: hasFreeCenter
  };
}

/**
 * Generate a unique Bingo card for a player in a room, ensuring no identical layout exists among current room players.
 * @param {Array<{ bingoCard?: { numbers?: number[] } }>} existingPlayers
 * @param {number} [maxAttempts=50]
 * @returns {{ numbers: number[], freeCenter: boolean }}
 */
function generateUniqueBingoCard(existingPlayers = [], maxAttempts = 50) {
  const existingLayouts = new Set(
    existingPlayers
      .filter(p => p && p.bingoCard && Array.isArray(p.bingoCard.numbers))
      .map(p => p.bingoCard.numbers.join(','))
  );

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const card = generateBingoCard(0.10);
    const key = card.numbers.join(',');
    if (!existingLayouts.has(key)) {
      return card;
    }
  }

  // Fallback if max attempts reached
  return generateBingoCard(0.10);
}

/**
 * Validate that a card structure adheres strictly to server rules.
 * @param {any} card
 * @returns {boolean}
 */
function validateBingoCard(card) {
  if (!card || typeof card !== 'object') return false;
  if (!Array.isArray(card.numbers) || card.numbers.length !== 25) return false;

  const { numbers, freeCenter } = card;
  const isFree = Boolean(freeCenter);

  // Check column ranges
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const idx = row * 5 + col;
      const num = numbers[idx];

      if (row === 2 && col === 2 && isFree) {
        if (num !== 0 && num !== null) return false;
        continue;
      }

      if (typeof num !== 'number' || !Number.isInteger(num)) return false;

      if (col === 0 && (num < 1 || num > 15)) return false;
      if (col === 1 && (num < 16 || num > 30)) return false;
      if (col === 2 && (num < 31 || num > 45)) return false;
      if (col === 3 && (num < 46 || num > 60)) return false;
      if (col === 4 && (num < 61 || num > 75)) return false;
    }
  }

  // Check uniqueness of numbers
  const nonZero = numbers.filter(n => n !== 0 && n !== null);
  const uniqueSet = new Set(nonZero);
  const expectedUnique = isFree ? 24 : 25;
  if (uniqueSet.size !== expectedUnique) return false;

  return true;
}

module.exports = {
  generateBingoCard,
  generateUniqueBingoCard,
  validateBingoCard
};
