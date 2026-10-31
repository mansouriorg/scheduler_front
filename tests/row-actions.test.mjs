// Checks the pages whose table rows can be edited and deleted: every Edit and Delete
// button says which record it acts on (screen readers read "Delete Dr. X", not just
// "Delete"), and the Delete button only opens the confirmation window.
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PAGES_WITH_ROW_ACTIONS = ['teachers'];

for (const page of PAGES_WITH_ROW_ACTIONS) {
  const source = readFileSync(new URL(`../app/${page}/page.tsx`, import.meta.url), 'utf8');
  const buttons = source.split('<button').slice(1).map((chunk) => chunk.split('</button>')[0]);

  test(`${page}: Edit and Delete buttons name the record they act on`, () => {
    const rowButtons = buttons.filter((button) => /startEdit\(|setToDelete\(/.test(button));
    assert.equal(rowButtons.length, 2, 'expected one Edit and one Delete button in each row');
    for (const button of rowButtons) {
      assert.match(button, /aria-label=\{`(Edit|Delete) \$\{/, `button without the record name: ${button.slice(0, 80)}`);
    }
  });

  test(`${page}: deleting is confirmed first`, () => {
    assert.match(source, /<ConfirmDialog\b/, 'the page has no confirmation window');
    const deleteButton = buttons.find((button) => button.includes('setToDelete('));
    assert.ok(deleteButton, 'no Delete button');
    assert.doesNotMatch(deleteButton, /api\./, 'the Delete button calls the API without asking');
  });
}
