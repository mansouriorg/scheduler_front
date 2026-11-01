// Checks "Print week" on the home page: the button prints the week shown (one
// cohort, teacher or room, or all classes), and on paper the menu, the controls and
// the messages are left out, the six days stand side by side on a landscape page,
// and each day is as long as it needs instead of scrolling.
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const home = read('app/page.tsx');
const layout = read('app/layout.tsx');
const sidebar = read('components/app-sidebar.tsx');

// The class names of the first element whose opening tag contains `marker`.
const classesAt = (source, marker) => {
  const at = source.indexOf(marker);
  assert.ok(at >= 0, `not found: ${marker}`);
  const tag = source.slice(source.lastIndexOf('<', at), source.indexOf('>', at));
  const found = tag.match(/className=\{?[`"]([^`"]*)[`"]/);
  assert.ok(found, `no class names near: ${marker}`);
  return found[1].split(/\s+/);
};

test('home page: Print week prints the page, and shows only when the term has a timetable', () => {
  const buttons = home.split('<button').slice(1).map((chunk) => chunk.split('</button>')[0]);
  const print = buttons.find((button) => button.includes('Print week'));
  assert.ok(print, 'no Print week button');
  assert.match(print, /type="button"/);
  assert.match(print, /onClick=\{\(\) => window\.print\(\)\}/);
  const before = home.slice(0, home.indexOf('onClick={() => window.print()}'));
  const shownWhen = before.slice(before.lastIndexOf('{termSchedule.length > 0 && ('));
  assert.match(shownWhen, /^\{termSchedule\.length > 0 && \(\s*<button\s+type="button"\s*$/, 'the button shows without a timetable');
});

test('home page: on paper a line says whose week it is, and the controls and messages are left out', () => {
  assert.match(home, /className="hidden [^"]*print:block">\{printHeading\(termName, shown\?\.label, visibleCount\)\}/);
  // The title, the Viewing line, the controls, the message after Generate or Clear,
  // and the list of classes that are not in the timetable yet.
  for (const marker of ['sm:text-3xl', 'className="text-gray-500', 'sm:flex-wrap', 'px-4 py-3 rounded-xl border', 'border-amber-200']) {
    assert.ok(classesAt(home, marker).includes('print:hidden'), `printed although it should not be: ${marker}`);
  }
});

test('home page: on paper the six days stand side by side and do not scroll', () => {
  const grid = classesAt(home, 'snap-x');
  for (const name of ['print:grid', 'print:grid-cols-6', 'print:overflow-visible']) assert.ok(grid.includes(name), `the week has no ${name}`);
  assert.ok(classesAt(home, 'snap-start').includes('print:min-w-0'), 'a day keeps its width of 320 px on paper');
  const day = classesAt(home, 'h-[700px]');
  assert.ok(day.includes('print:h-auto') && day.includes('print:overflow-visible'), 'a day keeps its height of 700 px on paper and cuts its classes');
  assert.ok(classesAt(home, 'border-l-indigo-500').includes('print:break-inside-avoid'), 'a class can be cut between two pages');
  assert.match(home, /const PRINT_PAGE = '@page \{ size: landscape; margin: 10mm; \}';/);
  assert.match(home, /\$\{PRINT_PAGE\}/, 'the landscape page is not in the style of the page');
});

test('layout and menu: on paper there is no menu, and the page is not cut at the height of the screen', () => {
  const body = classesAt(layout, 'antialiased');
  for (const name of ['print:block', 'print:h-auto', 'print:overflow-visible']) assert.ok(body.includes(name), `the page has no ${name}`);
  assert.ok(classesAt(layout, 'id="main"').includes('print:overflow-visible'), 'the content scrolls on paper');
  assert.ok(classesAt(sidebar, 'px-4 py-3 text-white md:hidden').includes('print:hidden'), 'the phone bar is printed');
  assert.ok(classesAt(sidebar, 'bg-gray-950/50').includes('print:hidden'), 'the dark layer of the open menu is printed');
  assert.ok(classesAt(sidebar, 'md:static').includes('print:hidden'), 'the menu is printed');
});
