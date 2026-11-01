import { diffDays, type DateKey } from './dates.ts';
import { splitOption, STARTER_PAIRS } from './questions.ts';
import { VOLUMES, type Topic } from './thisOrThatBank.ts';

export type Pair = { id: string; a: string; b: string };

/** How many new pairs arrive each day. Ones you haven't picked stay for the next day. */
export const PAIRS_PER_DAY = 50;

/** How many pairs the bank holds (a test keeps this right), so counts don't need them all worked out. */
export const BANK_SIZE = 36_555;

/** A small seeded random number generator, so the order is the same on every phone. */
function seeded(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const words = (option: string) => splitOption(option).text.toLowerCase();
const pairKey = (a: string, b: string) => {
  const x = words(a);
  const y = words(b);
  return x < y ? `${x}|${y}` : `${y}|${x}`;
};

/** One topic's pairs, dealt out one at a time in a shuffled order. */
type Deck = { topic: number; options: string[]; names: string[]; codes: number[]; dealt: number; random: () => number };

function deck(topic: Topic, index: number): Deck {
  const options: string[] = [];
  const names: string[] = [];
  for (const raw of topic.options.split(';')) {
    const option = raw.trim();
    const name = option && words(option);
    if (name && !names.includes(name)) {
      names.push(name);
      options.push(option);
    }
  }
  const codes: number[] = [];
  for (let i = 0; i < options.length; i++) {
    for (let j = i + 1; j < options.length; j++) codes.push(i * 1024 + j);
  }
  return { topic: index, options, names, codes, dealt: 0, random: seeded(hash(topic.key)) };
}

/**
 * The deck's next pair: a shuffle done one card at a time, a coin flip for which
 * side is which, and a key that's the same either way round.
 */
function deal(d: Deck): [string, string, string] {
  const i = d.codes.length - 1 - d.dealt++;
  const j = Math.floor(d.random() * (i + 1));
  [d.codes[i], d.codes[j]] = [d.codes[j], d.codes[i]];
  const x = d.codes[i] >> 10;
  const y = d.codes[i] & 1023;
  const key = d.names[x] < d.names[y] ? `${d.names[x]}|${d.names[y]}` : `${d.names[y]}|${d.names[x]}`;
  return d.random() < 0.5 ? [d.options[y], d.options[x], key] : [d.options[x], d.options[y], key];
}

/**
 * Which deck deals next: the one furthest behind its even share of the volume,
 * so every topic is spread over the whole two years and each day gets a mix.
 */
function before(x: Deck, y: Deck) {
  const diff = (2 * x.dealt + 1) * y.codes.length - (2 * y.dealt + 1) * x.codes.length;
  return diff < 0 || (diff === 0 && x.topic < y.topic);
}

/**
 * Every pair, in the order they arrive. The starters come first. Then each volume
 * pairs up every two options within a topic and deals the topics out in turn.
 * Pairs are only worked out as far as they're needed, which keeps opening the app quick.
 */
const pairs: Pair[] = [...STARTER_PAIRS];
const seen = new Set(pairs.map((p) => pairKey(p.a, p.b)));
const pairIndex = new Map(pairs.map((p, i) => [p.id, i]));
let volume = -1;
let heap: Deck[] = [];
let made = 0;

function grow(count: number) {
  while (pairs.length < count) {
    if (!heap.length) {
      if (++volume >= VOLUMES.length) return;
      heap = VOLUMES[volume].map(deck).filter((d) => d.codes.length);
      heap.sort((x, y) => (before(x, y) ? -1 : 1));
      continue;
    }
    // A small binary heap: the top deck deals, then sinks back into place.
    const top = heap[0];
    const [a, b, key] = deal(top);
    if (top.dealt === top.codes.length) {
      const last = heap.pop()!;
      if (heap.length) heap[0] = last;
    }
    for (let i = 0; ; ) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < heap.length && before(heap[l], heap[m])) m = l;
      if (r < heap.length && before(heap[r], heap[m])) m = r;
      if (m === i) break;
      [heap[i], heap[m]] = [heap[m], heap[i]];
      i = m;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    const id = `x${(made++).toString(36)}`;
    pairIndex.set(id, pairs.length);
    pairs.push({ id, a, b });
  }
}

/** The first `count` pairs (fewer only once the bank runs out). Picks are saved under each id. */
export function pairsUpTo(count: number): Pair[] {
  grow(count);
  return pairs.slice(0, count);
}

/** Every pair in the bank, for tests and counts. */
export function allPairs(): Pair[] {
  grow(Infinity);
  return pairs;
}

/** A pair by its id, if it's among the ones worked out so far. */
export function pairById(id: string): Pair | undefined {
  const i = pairIndex.get(id);
  return i === undefined ? undefined : pairs[i];
}

/**
 * How many pairs are out by `today`: the starters plus 50 a day from the day you
 * began. Anything you haven't picked stays out, so nothing is ever lost.
 */
export function pairsOut(start: DateKey | undefined, today: DateKey): number {
  const days = start ? Math.max(0, diffDays(start, today)) : 0;
  return Math.min(BANK_SIZE, STARTER_PAIRS.length + PAIRS_PER_DAY * (days + 1));
}

/** The earlier of two start days, since an earlier start only ever brings more pairs out. */
export function earlierStart(a: DateKey | undefined, b: DateKey | undefined): DateKey | undefined {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}
