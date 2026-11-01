import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Reads one of the text banks in content/: one entry per line, # lines are notes. */
export function loadLines(name: string): string[] {
  return readFileSync(join(import.meta.dirname, 'content', name), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

export const QUESTIONS = loadLines('questions.txt');
export const DATE_IDEAS = loadLines('date-ideas.txt');
/** How many fresh date ideas each two weeks brings. */
export const IDEAS_PER_FORTNIGHT = 3;

const DAY_MS = 24 * 60 * 60_000;

/** Whole days from the space's first day to `date` (both YYYY-MM-DD), never below 0. */
export function daysSince(start: string, date: string): number {
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${start.slice(0, 10)}T00:00:00Z`)) / DAY_MS);
  return Math.max(0, days);
}

/**
 * The day's question and this fortnight's date ideas. Day 0 is the day the space
 * was made, so both partners see the same question and none repeats until the
 * bank runs out (738 questions is just over two years).
 */
export function contentFor(start: string, date: string) {
  const day = daysSince(start, date);
  const index = day % QUESTIONS.length;
  const fortnight = Math.floor(day / 14);
  const first = (fortnight * IDEAS_PER_FORTNIGHT) % DATE_IDEAS.length;
  const dateIdeas = Array.from({ length: IDEAS_PER_FORTNIGHT }, (_, i) => DATE_IDEAS[(first + i) % DATE_IDEAS.length]);
  return { date, day, question: { number: index + 1, text: QUESTIONS[index] }, fortnight, dateIdeas };
}
