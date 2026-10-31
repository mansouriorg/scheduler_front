// Checks the form pages: every label points at its field, and every error message is
// linked to its field, so screen readers read them together. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const FORM_PAGES = ['classrooms', 'cohorts', 'courses', 'locations', 'offerings', 'teachers', 'terms'];

for (const page of FORM_PAGES) {
  const source = readFileSync(new URL(`../app/${page}/page.tsx`, import.meta.url), 'utf8');
  const ids = new Set([...source.matchAll(/\bid=("[^"]+"|\{`[^`]+`\})/g)].map((match) => match[1]));

  test(`${page}: every label is linked to a field that exists`, () => {
    for (const [, attributes, content] of source.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/g)) {
      const target = attributes.match(/htmlFor=("[^"]+"|\{`[^`]+`\})/);
      if (content.includes('<input')) continue; // the label wraps its own checkbox
      assert.ok(target, `label without htmlFor: ${content.trim().slice(0, 40)}`);
      assert.ok(ids.has(target[1]), `htmlFor ${target[1]} has no field with that id`);
    }
  });

  test(`${page}: every error message is linked to its field`, () => {
    const errorTags = source.match(/<p [^>]*text-red-700[^>]*>\{[\w.]+\.message\}/g) ?? [];
    const unlinked = errorTags.filter((tag) => tag.includes(' id=') === false);
    assert.deepEqual(unlinked, [], 'error message without an id');
    for (const [, described] of source.matchAll(/aria-describedby=\{[^}]*\? '([^']+)'/g)) {
      for (const describedId of described.split(' ')) {
        assert.ok(ids.has(`"${describedId}"`), `aria-describedby points at a missing id: ${describedId}`);
      }
    }
  });
}
