// Tests for lib/table-cards.ts: the class names that show a table as cards where its
// box is narrow. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TABLE_CARDS } from './table-cards.ts';

test('every size has the same classes, only with its own size', () => {
  const xl = JSON.stringify(TABLE_CARDS.xl);
  for (const size of Object.keys(TABLE_CARDS)) {
    const classes = JSON.stringify(TABLE_CARDS[size]);
    assert.equal(classes.replaceAll(`@${size}:`, '@xl:'), xl, size);
    const prefixes = new Set(classes.match(/@[\w.]+:/g));
    assert.deepEqual([...prefixes], [`@${size}:`], `${size} uses another size`);
  }
});

test('the table, its rows and its cells all switch at the size', () => {
  for (const [size, cards] of Object.entries(TABLE_CARDS)) {
    assert.match(cards.table, new RegExp(`^block @${size}:table$`));
    assert.match(cards.head, new RegExp(`^hidden @${size}:table-header-group$`));
    assert.match(cards.body, new RegExp(`@${size}:\\[&>tr\\]:table-row`));
    // The rows that say "Loading..." or "No ... found" span all columns in the table.
    assert.match(cards.body, new RegExp(`@${size}:\\[&>tr>td\\[colspan\\]\\]:table-cell`));
    for (const part of ['title', 'cell', 'actions']) {
      assert.match(cards[part], new RegExp(`@${size}:table-cell`), `${size} ${part}`);
    }
    assert.match(cards.label, new RegExp(`@${size}:hidden`));
  }
});
