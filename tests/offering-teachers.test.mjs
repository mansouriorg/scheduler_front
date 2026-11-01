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

test('offerings: each teacher in a list shows the hours with that class and whether they are free; the warnings are read when they change', () => {
  assert.match(
    source,
    /teacherOptionText\(\s*teacher,\s*classHours\[index\]\.minutesWith\(teacher\.id\),\s*classHours\[index\]\.notFree\.has\(teacher\.id\),?\s*\)/,
  );
  // The lines under a list are read with it: each one named in describedBy has an element.
  assert.match(source, /aria-describedby=\{classHours\[index\]\.describedBy\}/);
  const describedBy = source.match(/const describedBy = \[([\s\S]*?)\];/)?.[1] ?? '';
  for (const line of ['when', 'hours', 'time']) {
    const id = `\`class-teacher-\${cls.id}-${line}\``;
    assert.ok(describedBy.includes(id), `describedBy has no ${line}`);
    assert.ok(source.includes(`id={${id}}`), `no element for ${line}`);
  }
  assert.match(source, /<div aria-live="polite">\s*\{refusals\.length > 0 && \(/);
});
