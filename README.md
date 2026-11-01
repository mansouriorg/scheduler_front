# university-scheduler-web

The admin website of the university scheduler, built with Next.js 16 (App Router),
React 19 and Tailwind CSS 4. Staff enter the data a timetable needs (locations,
rooms, teachers, courses, cohorts, terms and course offerings) and generate the
weekly timetable. All data is stored by brain_server, the NestJS API.

## Requirements

- Node.js and npm (developed with Node.js 24.19 and npm 11.17)
- brain_server running, by default on http://localhost:3001

## Setup

Run these once, inside this folder:

    npm install
    cp .env.example .env.local

Then check `NEXT_PUBLIC_API_URL` in `.env.local`. A plain `.env` file works too.

## Run

    npm run dev

Open http://localhost:3000.

## Settings

| Name                  | Meaning                 | Default                 |
|-----------------------|-------------------------|-------------------------|
| `NEXT_PUBLIC_API_URL` | address of brain_server | `http://localhost:3001` |

- Next.js copies `NEXT_PUBLIC_` values into the browser code when the dev server
  starts or when you build, so restart `npm run dev` (or build again) after a change.
- brain_server must allow this site's address in its `CORS_ORIGIN` setting.

## Pages

| Path          | File                      | What you do there                                   |
|---------------|---------------------------|-----------------------------------------------------|
| `/`           | `app/page.tsx`            | choose a term; see its timetable (each class with its room and teacher), or the week of one cohort, teacher or room; generate it or clear it |
| `/locations`  | `app/locations/page.tsx`  | add, edit, move, delete and list campuses, buildings and floors |
| `/classrooms` | `app/classrooms/page.tsx` | add, edit, delete and list rooms (capacity, type, floor, equipment) |
| `/teachers`   | `app/teachers/page.tsx`   | add, edit, delete and list professors (hours, time preference, times off) |
| `/courses`    | `app/courses/page.tsx`    | add, edit, delete and list courses: credits, hours, lecture/TD/TP parts |
| `/cohorts`    | `app/cohorts/page.tsx`    | add, edit, delete and list student groups and their headcount |
| `/terms`      | `app/terms/page.tsx`      | add, edit, delete and list academic terms and their dates |
| `/offerings`  | `app/offerings/page.tsx`  | choose which cohort takes which course in a term, and the teacher of each class; move or delete an offering |

- The API calls are in `lib/api.ts`.
- The sidebar and the phone menu are in `components/app-sidebar.tsx`; the page frame
  (skip link, main area) is in `app/layout.tsx`.
- Keyboard focus rings and the reduced-motion rule are in `app/globals.css`.
- The colors and theme are in `app/globals.css`.
- Shared parts (save messages, loading and error rows, the "Delete?" window) are in `components/`.
- Teachers and rooms can be edited and deleted from their tables. brain_server refuses to
  delete a teacher who teaches classes or a room that classes are booked in, to lower a
  teacher's maximum hours below the hours they already teach in a week, and to change
  a room so that a booked class no longer fits (type, seats or equipment); the page shows
  its reason. `tests/row-actions.test.mjs` checks that Edit and Delete buttons name the
  record and that deleting asks first.
- On the Locations page, campuses, buildings and floors can be edited, moved (a building
  to another campus, a floor to another building) and deleted. brain_server refuses to
  delete one that still has something inside, and the page shows its reason.
- Cohorts can be edited and deleted from their table. brain_server refuses to delete a
  cohort that has course offerings or students, and the page shows its reason.
- Terms can be edited and deleted from their table. brain_server refuses to delete a term
  that has course offerings, and the page shows its reason.
- Courses can be edited and deleted from their table. A changed breakdown (lecture, TD,
  TP) applies to course offerings created afterwards; existing offerings keep their
  classes. brain_server refuses to delete a course that has course offerings, and the
  page shows its reason.
- Course offerings can be moved to another term or cohort and deleted from their list;
  their course cannot change. A move takes the offering's classes out of the timetable,
  and a delete removes them with it (the "Delete?" window says how many). brain_server
  refuses to delete an offering with enrolled students, and to move it to a term where a
  teacher of its classes would teach too many hours a week; the page shows its reason.
- "Unschedule" on a course offering (shown while some of its classes are in the
  timetable) takes only those classes out of the timetable, after asking first; their
  teachers, the offering and the other classes stay, and Generate places them again
  around the others (`DELETE /course-offerings/:id/timetable` in brain_server). Each
  confirmation window has its own ids (`useId` in `components/confirm-dialog.tsx`), so a
  page can have two. `tests/clear-timetable.test.mjs` checks the button and the window.
- Each class of a course offering can have its own teacher ("Teachers" on an offering).
  Classes keep their day and time. brain_server saves all changes or none, and refuses
  (the page shows why) a teacher who would teach too many hours a week, or who is busy or
  away when a class takes place. `lib/class-teachers.ts` names the classes and finds the
  changes (`class-teachers.test.mjs`; `tests/offering-teachers.test.mjs` checks the button).
- In the Teachers form, each teacher in a list shows the hours a week they would teach in
  the offering's term with that class ("Dr. Amal Ben Salah: 10.5 of 12 hrs (Computer
  Science)"), counted as brain_server counts them: their classes of every term whose dates
  overlap it, and the choices in the form. Under each list, a line repeats it for the
  teacher chosen (the list may be too narrow to show it), and above Save the form says
  which teacher who gets a class would go over their maximum, so that saving would be
  refused. `teacherMinutes` in `lib/class-teachers.ts` counts; `lib/teacher-hours.ts`
  writes the texts.
- For a class already in the timetable, each teacher in its list who is away then (a
  time off) or teaches another class then (in the same weeks) is marked "not free at
  that time"; a line under the list says why for the teacher chosen, and the box above
  Save gives brain_server's own reason when that class gets a new teacher who is not
  free. `notFreeTeachers` in `lib/class-teachers.ts` finds them.
- "Times off" on the Teachers page sets the times each week when a teacher cannot teach
  (a day, from, to; every half hour from 08:00 to 18:30). They are saved all together;
  Generate keeps the teacher's classes out of them, and brain_server refuses (the page
  shows why) a time off that covers a class of the teacher already in the timetable.
  `lib/teacher-times.ts` lists, names and checks them (`teacher-times.test.mjs`).
- Under each teacher's maximum hours, the Teachers table shows how long they already
  teach a week in each term in which they have classes ("Fall 2026: 9 of 12 hrs"; in red
  when it is over the maximum), and Edit says the lowest maximum brain_server accepts.
  These are brain_server's own numbers (`weeklyHours` in `GET /professors`): every class
  counts, in the timetable or not, and the classes of terms whose dates overlap count
  together. `lib/teacher-hours.ts` writes them (`teacher-hours.test.mjs`).
- The "Time Preference" of a teacher (Morning 08:00 - 12:00, Afternoon 13:00 - 17:00,
  Evening 17:00 - 18:30) is a wish, not a rule: Generate puts their classes at that time
  when it can, and its message says how many are, and names the classes that are not.
- The data tables (Classrooms, Cohorts, Courses, Teachers, Terms) show each row as a card
  where the box of the table is too narrow for it: on phones, and next to the form on
  smaller laptops. Each value then has its column name in front of it. The class names are
  in `lib/table-cards.ts` (`table-cards.test.mjs`; `tests/table-cards.test.mjs` checks the
  pages).
- Every list page (Locations, Classrooms, Teachers, Cohorts, Courses, Academic Terms and
  Course Offerings) has a search box above its list (`components/table-search.tsx`). It
  keeps the rows that have what is typed, with or without capitals and accents: either as
  it is typed ("lab 3" finds "Lab 304"), or word by word in any order and column ("sami
  fall" finds Sami's offerings in Fall 2026). A number among the words must be a whole
  number: "year 2" finds "SE - Year 2", not "SE - Year 1" in "Fall 2026". It searches what
  the list shows: a campus and its buildings' names, codes and floors ("level 2"; a campus
  found by its name shows all its buildings); a room's name, type, building and floor, and
  equipment; a teacher's name and department; a cohort's name, headcount and current
  term; a course's code, title and kinds of class (TD, TP); a term's name, type and dates;
  an offering's course, cohort, term and teachers ("no teacher" finds the offerings with a
  class that has none). Next to the title it says how many rows it shows ("2 of 12
  teachers"); screen readers read it out. Escape or "Clear search" empties the box. The
  rules are in `lib/table-search.ts` (`table-search.test.mjs`; `tests/table-search.test.mjs`
  checks the pages).
- The tables (Classrooms, Teachers, Cohorts, Courses and Academic Terms) can be sorted: a
  click on a column heading with arrows (or Enter or Space on it) sorts the rows by that
  column, a second one reverses the order. Text goes A to Z ("Lab 2" before "Lab 10",
  capitals and accents aside), numbers lowest first, dates earliest first; empty values
  come last. Where a table is shown as cards, a "Sort by" list above the cards does the
  same. The line under the title says the order ("Sorted by Capacity, highest first"), and
  screen readers hear it there and on the heading (aria-sort). After a reload the rows are
  in the order brain_server sends them again. The rules are in `lib/table-sort.ts`
  (`table-sort.test.mjs`), the heading and the list in `components/table-sort.tsx`, and
  `tests/table-sort.test.mjs` checks the pages.
- The Classrooms table has a "Weekly Use" column: how many hours a week each room is used
  in the timetable of the term going on today (else the next term, else the latest one),
  out of the 63 hours of the timetable week (Monday to Saturday, 08:00 to 18:30, as
  scheduler-brain builds it), for example "9 of 63 hrs". Only that term's classes with a
  room and a time count. "Not used" and "nearly full" (from 80%) stand out, the term is
  said next to the title, and the column sorts like the others. It loads apart from the
  rooms: if the timetable cannot load, the rooms still show and the column says "Not
  known". `lib/room-use.ts` (`room-use.test.mjs`; `tests/room-use.test.mjs` checks the
  page).
- The Cohorts table has a "Weekly Hours" column: how many hours a week each cohort has
  classes in the timetable of the same term as Weekly Use, for example "13.5 hrs a week".
  Classes of that term that are not placed yet are said on a second line ("2 hrs not
  placed yet"), and "No classes" when the cohort has none in that term. The term is said
  next to the title, the column sorts like the others, and it loads apart from the
  cohorts ("Not known" when the timetable cannot load). With five columns the table is
  shown from a box of 42rem (`2xl`), and as cards below that. `lib/cohort-hours.ts`
  (`cohort-hours.test.mjs`; `tests/cohort-hours.test.mjs` checks the page).
- Course Offerings, a list of cards, has the "Sort by" list only, always shown: by course
  or cohort (A to Z), by term (by its start date), or by "Classes to place" (the classes
  that are not in the timetable yet; highest first puts the offerings Generate still has
  to place at the top). It works with the search box, and the line under the title says
  the order.
- After Generate, the home page shows a short summary ("12 classes were placed in the
  timetable of Fall 2026.") and, as a list under it, the notes from brain_server: the
  classes on Saturday, before their lecture, or outside the time their teacher prefers
  (`lib/generate-result.ts`, `generate-result.test.mjs`). The message box is read out by
  screen readers when it changes.
- `lib/api-error.ts` turns API errors into readable sentences.
- `npm run lint` reports no problems. The data that brain_server sends is typed where the
  pages read it (`lib/timetable.ts`, the types at the top of each page); request bodies are
  `unknown` in `lib/api.ts`, because brain_server checks them. Write no `any`: lint refuses it.
- Form rules are in `lib/validations/`; the course rules are tested in `course.test.mjs`.
- `lib/timetable.ts` counts the class blocks shown on the home page and names the room of
  each class with its building and floor, and its teacher (tested in `timetable.test.mjs`).
  It also names the terms and picks the one the home page shows first: the term going on
  today, else the next one, else the latest one.
- The View list of the home page shows every class of the term, or the week of one
  cohort, one teacher or one room (the cohorts, teachers and rooms of that term's
  timetable, by name). Another term, or Clear, shows every class again.
  `viewChoices` and `inView` in `lib/timetable.ts` make the list and choose the classes.
- The home page remembers the term and the View chosen last in this browser
  (localStorage), so a reload or the next visit shows the same week. If that term was
  deleted since, it starts with the term going on today and every class; a cohort,
  teacher or room that the term no longer has shows every class. Where the browser
  blocks the storage, the page works the same and only does not remember. Only these
  two values are kept, and only in this browser. `lib/home-choice.ts`
  (`home-choice.test.mjs`; `tests/home-choice.test.mjs` checks the page).
- Above the timetable, a list that opens on click says how many classes of the term (in
  the chosen view) are not in the timetable yet, and names each one with its length and
  teacher; Generate places them. `unplacedClasses` in `lib/timetable.ts` finds them.
- "Print week" on the home page prints the week shown (or saves it as a PDF from the
  browser's print window): one line says the term and the cohort, teacher or room
  (`printHeading` in `lib/timetable.ts`), then the six days side by side on a landscape
  page, each day as long as it needs, over more pages if it must. The menu, the
  controls and the messages are left out with Tailwind's `print:` classes (in
  `app/layout.tsx`, `components/app-sidebar.tsx` and `app/page.tsx`).
  `tests/print-week.test.mjs` checks the button and these classes. To print the colours
  too, turn on "Background graphics" (Chrome) or "Print backgrounds" (Safari).
- The home page works on one term at a time: it shows the timetable of the chosen term,
  Generate places only that term's classes, and "Clear timetable" takes the room, day and
  time off that term's classes after asking first (other terms stay); Generate then places
  them again. `tests/clear-timetable.test.mjs` checks that the button only opens the
  confirmation window, and that Generate and Clear send the chosen term.
- `lib/floor-options.ts` names the floors ("Building (CODE) - Level X") for the room form and table.
- Every page shows a loading state, a load error with "Try again", and a message after each save.

## Style rules

Use the same Tailwind classes on every page so the app stays consistent:

| Element        | Classes |
|----------------|---------|
| Page wrapper   | `min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8` |
| Page title     | `mb-6 text-2xl font-bold text-gray-900 sm:mb-8 sm:text-3xl` |
| Input / select | `w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm` |
| Checkbox       | `h-4 w-4 rounded border-gray-500 accent-blue-600` |
| Field error    | `mt-1 text-xs font-medium text-red-700` |
| Save button    | `w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50` |

Text must reach a contrast of 4.5:1 (field borders 3:1): on white, use gray-500 or darker for
small text, and red-700, green-700 or orange-700 for colored text.

Every field needs an `id`, and its label `htmlFor` with the same value. Its error message gets
`id="FIELD-error"`, and the field `aria-describedby` pointing at it while the error is shown
(and at its hint, `id="FIELD-hint"`, while there is one). `tests/form-labels.test.mjs` checks
this on every form page, for every id named in `aria-describedby`.

## Scripts

| Command         | What it does                        |
|-----------------|-------------------------------------|
| `npm run dev`   | development server with live reload |
| `npm run build` | production build                    |
| `npm start`     | run the production build            |
| `npm run lint`  | ESLint                              |
| `npm test`      | unit tests (Node.js test runner)    |
