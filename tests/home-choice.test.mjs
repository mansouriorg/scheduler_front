// Checks that the home page remembers the term and View chosen last in this browser
// (lib/home-choice.ts): it reads them once the terms are loaded, only while no term
// that still exists is chosen, and keeps every new choice. The term and View are one
// state, so that loading the terms does not read them: the effect that loads the page
// then needs no dependencies (lint). Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
// fetchSchedule, up to the effect that runs it when the page opens.
const fetchSchedule = source.slice(source.indexOf('const fetchSchedule = async'), source.indexOf('fetchSchedule();'));

test('home page: starts with the term and View kept, once the terms are loaded', () => {
  assert.match(source, /import \{ browserStorage, readHomeChoice, saveHomeChoice, startChoice, type HomeChoice \} from '@\/lib\/home-choice';/);
  assert.match(source, /const \[termAndView, setTermAndView\] = useState<HomeChoice>\(\{ termId: '', view: ALL_CLASSES \}\);/);
  assert.equal(source.split('readHomeChoice(').length - 1, 1, 'the choice is read in more than one place');
  assert.ok(fetchSchedule.includes('readHomeChoice(browserStorage())'), 'the choice is not read where the terms are loaded');
  assert.match(
    fetchSchedule,
    /setTermAndView\(\(current\) => \(termList\.some\(\(term: TermChoice\) => term\.id === current\.termId\) \? current : start\)\);/,
    'the choice kept would replace a term chosen on the page',
  );
  assert.match(fetchSchedule, /\{ termId: defaultTermId\(termList, localDay\(new Date\(\)\)\), view: ALL_CLASSES \}/, 'no fallback to the term of today');
  assert.doesNotMatch(fetchSchedule, /selectedTermId|selectedView/, 'loading reads the chosen term: the effect that loads the page would need it (lint)');
  assert.doesNotMatch(source, /setSelectedTermId|setSelectedView/, 'the term and View are set apart');
});

test('home page: keeps every choice of term and View', () => {
  assert.match(
    source,
    /useEffect\(\(\) => \{\s*if \(selectedTermId !== ''\) saveHomeChoice\(browserStorage\(\), \{ termId: selectedTermId, view: selectedView \}\);\s*\}, \[selectedTermId, selectedView\]\);/,
  );
  assert.doesNotMatch(source, /localStorage/, 'the page uses the storage itself instead of lib/home-choice.ts');
  // Another term starts with every class; Clear shows every class again.
  assert.match(source, /const chooseTerm = \(termId: string\) => \{\s*setTermAndView\(\{ termId, view: ALL_CLASSES \}\);/);
  assert.match(source, /setTermAndView\(\(current\) => \(\{ \.\.\.current, view: ALL_CLASSES \}\)\);/);
});
