import { Flashcard } from "./types";

/**
 * Tokenizes French text into clickable words and non-clickable (punctuation, space) segments.
 * Correctly preserves French contractions, ligatures, and hyphens (e.g. l'histoire, d'aujourd'hui, qu'est-ce).
 */
export function tokenizeFrenchText(text: string): { text: string; isWord: boolean }[] {
  // Matches words with accented letters, ligatures, single apostrophes or hyphens inside
  const regex = /([a-zA-ZÀ-ÿœŒ]+(?:['’‐-][a-zA-ZÀ-ÿœŒ]+)*)|([^\w\sÀ-ÿœŒ'’‐-]+)|(\s+)/gu;
  
  const tokens: { text: string; isWord: boolean }[] = [];
  const matches = Array.from(text.matchAll(regex));
  
  for (const match of matches) {
    const word = match[1];
    const nonWord = match[2];
    const whitespace = match[3];
    
    if (word) {
      tokens.push({ text: word, isWord: true });
    } else if (nonWord) {
      tokens.push({ text: nonWord, isWord: false });
    } else if (whitespace) {
      tokens.push({ text: whitespace, isWord: false });
    }
  }
  
  if (tokens.length === 0 && text) {
    tokens.push({ text, isWord: false });
  }
  
  return tokens;
}

/**
 * Normalizes French words by stripping punctuation and lowercasing for search/matching.
 */
export function cleanFrenchWord(word: string): string {
  return word
    .toLowerCase()
    .trim()
    .normalize("NFD")
    // Keep standard French accent properties intact but clear trailing marks if any
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»’°]/g, "");
}

/**
 * Leitner Spaced Repetition Scheduling Helper.
 * Moves card through boxes 1-5 or resets on failure.
 */
export function scheduleLeitner(
  card: Flashcard, 
  isCorrect: boolean
): { box: number; nextReviewDate: number } {
  let newBox = card.box;
  
  if (isCorrect) {
    newBox = Math.min(5, card.box + 1);
  } else {
    newBox = 1; // Reset to Box 1 for reinforcement
  }
  
  // Review intervals in days based on Leitner Box
  const intervals: Record<number, number> = {
    1: 1,      // 1 day
    2: 3,      // 3 days
    3: 7,      // 7 days
    4: 14,     // 14 days
    5: 30,     // 30 days
  };
  
  const daysToAdd = intervals[newBox] || 1;
  const nextReviewDate = Date.now() + daysToAdd * 24 * 60 * 60 * 1000;
  
  return {
    box: newBox,
    nextReviewDate,
  };
}
