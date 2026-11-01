// Shows a data table as one card per row where its box is narrower than the table
// needs: on phones, and in the narrow column next to a form on smaller laptops. A
// wider box shows the table. The box around the <table> has the @container class,
// and each size is the width of that box from which the table is shown (Tailwind
// container sizes: xl 36rem, 2xl 42rem, 3xl 48rem).
//
// In a card the first cell is the title, every other value has its column name in
// front of it (a label, hidden in the table), and the buttons come last. Tailwind
// only finds class names that are written out in full, so each size has its own set.

export type TableCards = {
  table: string; // the <table>
  head: string; // its <thead>: hidden in the cards
  body: string; // its <tbody>: the rows, and the rows that say "Loading..."
  row: string; // a <tr> of data: the inner space of its card
  title: string; // the first <td>: the title of the card
  cell: string; // a <td> with a label and a value
  label: string; // the column name in front of a value in a card
  actions: string; // the last <td>: the buttons
  buttons: string; // the box of the buttons in it
};

export const TABLE_CARDS = {
  xl: {
    table: 'block @xl:table',
    head: 'hidden @xl:table-header-group',
    body: 'block @xl:table-row-group [&>tr]:block @xl:[&>tr]:table-row [&>tr>td[colspan]]:block @xl:[&>tr>td[colspan]]:table-cell',
    row: 'px-4 py-3',
    title: 'block py-1 text-base @xl:table-cell @xl:p-4 @xl:text-sm',
    cell: 'grid grid-cols-[7rem_minmax(0,1fr)] items-baseline gap-x-3 py-1 @xl:table-cell @xl:p-4',
    label: 'text-xs font-medium uppercase tracking-wider text-gray-600 @xl:hidden',
    actions: 'block pt-2 @xl:table-cell @xl:p-4',
    buttons: '-ml-2 flex justify-start gap-1 @xl:ml-0 @xl:justify-end',
  },
  '2xl': {
    table: 'block @2xl:table',
    head: 'hidden @2xl:table-header-group',
    body: 'block @2xl:table-row-group [&>tr]:block @2xl:[&>tr]:table-row [&>tr>td[colspan]]:block @2xl:[&>tr>td[colspan]]:table-cell',
    row: 'px-4 py-3',
    title: 'block py-1 text-base @2xl:table-cell @2xl:p-4 @2xl:text-sm',
    cell: 'grid grid-cols-[7rem_minmax(0,1fr)] items-baseline gap-x-3 py-1 @2xl:table-cell @2xl:p-4',
    label: 'text-xs font-medium uppercase tracking-wider text-gray-600 @2xl:hidden',
    actions: 'block pt-2 @2xl:table-cell @2xl:p-4',
    buttons: '-ml-2 flex justify-start gap-1 @2xl:ml-0 @2xl:justify-end',
  },
  '3xl': {
    table: 'block @3xl:table',
    head: 'hidden @3xl:table-header-group',
    body: 'block @3xl:table-row-group [&>tr]:block @3xl:[&>tr]:table-row [&>tr>td[colspan]]:block @3xl:[&>tr>td[colspan]]:table-cell',
    row: 'px-4 py-3',
    title: 'block py-1 text-base @3xl:table-cell @3xl:p-4 @3xl:text-sm',
    cell: 'grid grid-cols-[7rem_minmax(0,1fr)] items-baseline gap-x-3 py-1 @3xl:table-cell @3xl:p-4',
    label: 'text-xs font-medium uppercase tracking-wider text-gray-600 @3xl:hidden',
    actions: 'block pt-2 @3xl:table-cell @3xl:p-4',
    buttons: '-ml-2 flex justify-start gap-1 @3xl:ml-0 @3xl:justify-end',
  },
} satisfies Record<string, TableCards>;
