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
| `/`           | `app/page.tsx`            | choose a term; see its timetable (each class with its room and teacher), filter by cohort, generate it or clear it |
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
- Each class of a course offering can have its own teacher ("Teachers" on an offering).
  Classes keep their day and time. brain_server saves all changes or none, and refuses
  (the page shows why) a teacher who would teach too many hours a week, or who is busy or
  away when a class takes place. `lib/class-teachers.ts` names the classes and finds the
  changes (`class-teachers.test.mjs`; `tests/offering-teachers.test.mjs` checks the button).
- "Times off" on the Teachers page sets the times each week when a teacher cannot teach
  (a day, from, to; every half hour from 08:00 to 18:30). They are saved all together;
  Generate keeps the teacher's classes out of them, and brain_server refuses (the page
  shows why) a time off that covers a class of the teacher already in the timetable.
  `lib/teacher-times.ts` lists, names and checks them (`teacher-times.test.mjs`).
- `lib/api-error.ts` turns API errors into readable sentences.
- Form rules are in `lib/validations/`; the course rules are tested in `course.test.mjs`.
- `lib/timetable.ts` counts the class blocks shown on the home page and names the room of
  each class with its building and floor, and its teacher (tested in `timetable.test.mjs`).
  It also names the terms and picks the one the home page shows first: the term going on
  today, else the next one, else the latest one.
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
`id="FIELD-error"`, and the field `aria-describedby` pointing at it while the error is shown.
`tests/form-labels.test.mjs` checks this on every form page.

## Scripts

| Command         | What it does                        |
|-----------------|-------------------------------------|
| `npm run dev`   | development server with live reload |
| `npm run build` | production build                    |
| `npm start`     | run the production build            |
| `npm run lint`  | ESLint                              |
| `npm test`      | unit tests (Node.js test runner)    |
