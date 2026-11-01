// Tests for lib/home-choice.ts: the home page remembers the term and View chosen last.
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOME_CHOICE_KEY, browserStorage, readHomeChoice, saveHomeChoice, startChoice } from './home-choice.ts';

// A storage like the browser's, in memory.
const memory = (items = {}) => ({
  items,
  getItem: (key) => (key in items ? items[key] : null),
  setItem: (key, value) => {
    items[key] = value;
  },
});
// A storage that the browser blocks: every use throws.
const blocked = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

test('keeps the term and View, and reads them back', () => {
  const storage = memory();
  saveHomeChoice(storage, { termId: 'fall-2026', view: 'teacher:p1' });
  assert.equal(storage.items[HOME_CHOICE_KEY], '{"termId":"fall-2026","view":"teacher:p1"}');
  assert.deepEqual(readHomeChoice(storage), { termId: 'fall-2026', view: 'teacher:p1' });
});

test('reads nothing when nothing is kept, or when what is kept is not a choice', () => {
  assert.equal(readHomeChoice(memory()), null);
  assert.equal(readHomeChoice(null), null);
  for (const text of ['not json', '42', 'null', '[]', '{"termId":"fall-2026"}', '{"termId":7,"view":"All"}']) {
    assert.equal(readHomeChoice(memory({ [HOME_CHOICE_KEY]: text })), null, text);
  }
});

test('a blocked storage, or none, changes nothing and throws nothing', () => {
  assert.equal(readHomeChoice(blocked), null);
  assert.doesNotThrow(() => saveHomeChoice(blocked, { termId: 'fall-2026', view: 'All' }));
  assert.doesNotThrow(() => saveHomeChoice(null, { termId: 'fall-2026', view: 'All' }));
  assert.equal(browserStorage(), null, 'outside a browser there is no storage');
});

test('starts with the term and View kept while that term exists, else with the fallback', () => {
  const fallback = { termId: 'spring-2027', view: 'All' };
  const saved = { termId: 'fall-2026', view: 'cohort:SE - Year 1' };
  assert.deepEqual(startChoice(['fall-2026', 'spring-2027'], saved, fallback), saved);
  assert.deepEqual(startChoice(['spring-2027'], saved, fallback), fallback, 'the term kept was deleted');
  assert.deepEqual(startChoice(['fall-2026', 'spring-2027'], null, fallback), fallback);
  assert.deepEqual(startChoice([], null, { termId: '', view: 'All' }), { termId: '', view: 'All' });
});
