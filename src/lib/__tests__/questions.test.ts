/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { splitOption, THIS_OR_THAT } from '../questions.ts';

describe('this or that pairs', () => {
  it('each have their own id, safe to use in a record id', () => {
    const ids = THIS_OR_THAT.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.match(id, /^[a-z-]+$/);
  });

  it('each option starts with an emoji followed by its words', () => {
    for (const p of THIS_OR_THAT) {
      for (const option of [p.a, p.b]) {
        const { emoji, text } = splitOption(option);
        assert.ok(emoji && !/[a-z]/i.test(emoji), `${option} needs an emoji first`);
        assert.ok(text.length > 1, option);
      }
    }
    assert.deepEqual(splitOption('🏖️ Beach'), { emoji: '🏖️', text: 'Beach' });
  });
});
