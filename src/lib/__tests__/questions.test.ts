/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { splitOption, STARTER_PAIRS } from '../questions.ts';
import { allPairs, BANK_SIZE, earlierStart, pairById, PAIRS_PER_DAY, pairsOut, pairsUpTo } from '../thisOrThat.ts';
import { VOLUMES } from '../thisOrThatBank.ts';

describe('this or that pairs', () => {
  const all = allPairs();

  it('has 50 a day for at least two years after the starters', () => {
    assert.ok(all.length >= STARTER_PAIRS.length + PAIRS_PER_DAY * 730, `only ${all.length}`);
    assert.equal(all.length, BANK_SIZE);
  });

  it('each have their own id, safe to use in a record id', () => {
    const ids = all.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.match(id, /^[a-z0-9-]+$/);
  });

  it('never asks the same pair twice, either way round', () => {
    const keys = all.map((p) => [splitOption(p.a).text.toLowerCase(), splitOption(p.b).text.toLowerCase()].sort().join('|'));
    assert.equal(new Set(keys).size, keys.length);
    for (const p of all) assert.notEqual(splitOption(p.a).text.toLowerCase(), splitOption(p.b).text.toLowerCase());
  });

  it('each option starts with an emoji followed by its words', () => {
    for (const p of all) {
      for (const option of [p.a, p.b]) {
        const { emoji, text } = splitOption(option);
        assert.ok(emoji && !/[a-z]/i.test(emoji), `${option} needs an emoji first`);
        assert.ok(text.length > 1, option);
      }
    }
    assert.deepEqual(splitOption('🏖️ Beach'), { emoji: '🏖️', text: 'Beach' });
  });

  it('keeps the starters first, under their old ids', () => {
    assert.deepEqual(all.slice(0, STARTER_PAIRS.length), STARTER_PAIRS);
  });

  it('keeps every pair under the same id, so saved picks still match', () => {
    // If one of these fails, an option or topic was edited or moved. Add new ones in a new volume instead.
    const at = (i: number) => `${all[i].id} ${all[i].a} / ${all[i].b}`;
    assert.equal(at(36), 'x0 🍝 Dinner in Italy any night / ⏪ Reliving our first date');
    assert.equal(at(10_036), 'x7ps 🛁 Bubble bath / 🕯️ Candlelit dinner');
    assert.equal(at(36_535), 'xs5v 🍤 Prawn crackers / 🍬 Sour strips');
  });

  it('mixes topics within each day', () => {
    const topicOf = new Map<string, string>();
    for (const t of VOLUMES[0]) for (const o of t.options.split(';')) topicOf.set(o.trim(), t.key);
    for (const day of [0, 100, 365, 729]) {
      const start = STARTER_PAIRS.length + day * PAIRS_PER_DAY;
      const topics = new Set(all.slice(start, start + PAIRS_PER_DAY).map((p) => topicOf.get(p.a)));
      assert.ok(topics.size >= 25, `day ${day} only has ${topics.size} topics`);
    }
  });

  it('works out only what is asked for, the same way', () => {
    assert.deepEqual(pairsUpTo(86), all.slice(0, 86));
    assert.equal(pairById('x0')?.a, all[36].a);
  });
});

describe('this or that days', () => {
  it('brings out 50 more each day and keeps the earlier ones', () => {
    assert.equal(pairsOut(undefined, '2026-11-01'), STARTER_PAIRS.length + 50);
    assert.equal(pairsOut('2026-11-01', '2026-11-01'), STARTER_PAIRS.length + 50);
    assert.equal(pairsOut('2026-11-01', '2026-11-03'), STARTER_PAIRS.length + 150);
    // A clock set back never takes pairs away below the first day.
    assert.equal(pairsOut('2026-11-05', '2026-11-01'), STARTER_PAIRS.length + 50);
    assert.equal(pairsOut('2026-11-01', '2030-01-01'), BANK_SIZE);
  });

  it('starts from whichever of you began first', () => {
    assert.equal(earlierStart('2026-11-03', '2026-11-01'), '2026-11-01');
    assert.equal(earlierStart(undefined, '2026-11-01'), '2026-11-01');
    assert.equal(earlierStart('2026-11-01', undefined), '2026-11-01');
  });
});
