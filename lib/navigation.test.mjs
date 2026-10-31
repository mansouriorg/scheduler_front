// Tests for the sidebar helpers. Run them with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isActivePath } from './navigation.ts';

test('marks the timetable link only on the home page', () => {
  assert.equal(isActivePath('/', '/'), true);
  assert.equal(isActivePath('/teachers', '/'), false);
});

test('marks a link on its own page and on its sub-pages', () => {
  assert.equal(isActivePath('/teachers', '/teachers'), true);
  assert.equal(isActivePath('/teachers/42', '/teachers'), true);
});

test('does not mark a link whose name only starts the same way', () => {
  assert.equal(isActivePath('/terms-archive', '/terms'), false);
  assert.equal(isActivePath('/courses', '/cohorts'), false);
});
