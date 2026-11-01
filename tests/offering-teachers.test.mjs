// Checks the Teachers button on the Course Offerings page: it says which
// offering it is for, it only opens the Teachers form, and only that form saves,
// with the classes whose teacher changed.
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../app/offerings/page.tsx', import.meta.url), 'utf8');
const buttons = source.split('<button').slice(1).map((chunk) => chunk.split('</button>')[0]);
const teachersButton = buttons.find((button) => button.includes('startTeachers('));

test('offerings: the Teachers button names the offering and only opens the form', () => {
  assert.ok(teachersButton, 'no Teachers button');
  assert.match(teachersButton, /aria-label=\{`Teachers for \$\{offeringName\(offering\)\}`\}/);
  assert.doesNotMatch(teachersButton, /api\./, 'the button saves without the form');
});

test('offerings: the Teachers form saves only the changed classes, in one request', () => {
  assert.equal(source.split('api.assignTeachers(').length - 1, 1, 'teachers are saved from more than one place');
  assert.match(source, /teacherChanges\(teaching\.classes, choices\)/);
});
