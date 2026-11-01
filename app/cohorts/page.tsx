'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Notice, type NoticeMessage } from '@/components/notice';
import { StatusRow } from '@/components/status-message';
import { TABLE_CARDS } from '@/lib/table-cards';
import { NoMatchRow, TableSearchBar } from '@/components/table-search';
import { filterBySearch, noMatchText, searchCount } from '@/lib/table-search';
import { SortHeader, SortSelect } from '@/components/table-sort';
import { sortRows, sortText, type Sort, type SortColumn } from '@/lib/table-sort';
import { defaultTermId, localDay, type TermChoice } from '@/lib/timetable';
import { cohortHours, cohortHoursText, notPlacedText, type CohortHours, type CohortHoursOffering } from '@/lib/cohort-hours';
import { getErrorMessage } from '@/lib/api-error';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api'; 

// 1. Zod Validation Schema (Cleaned up for strict TypeScript matching)
const cohortSchema = z.object({
  name: z.string().min(2, 'Cohort name is required (e.g., SE - Year 1)'),
  headcount: z.number().min(1, 'Headcount must be at least 1').max(500, 'Headcount exceeds maximum limit'), // Removed coerce
  currentSemester: z.enum(['SEMESTER_1', 'SEMESTER_2', 'SUMMER']),
});

type CohortFormValues = z.infer<typeof cohortSchema>;
type Cohort = CohortFormValues & { id: string };

// Where the box of the table is narrower than 36rem, each cohort is shown as a
// card (see lib/table-cards.ts).
const cards = TABLE_CARDS['2xl'];

export default function CohortsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);
  // What is typed in the search box above the list (see lib/table-search.ts).
  const [search, setSearch] = useState('');
  // The column the table is sorted by, and which way (null: as brain_server sends it).
  const [sort, setSort] = useState<Sort>(null);
  // How many hours a week each cohort has classes in the timetable of one term (see
  // lib/cohort-hours.ts); null until it is loaded, or when it could not be loaded.
  const [weeklyHours, setWeeklyHours] = useState<CohortHours | null>(null);
  // The cohort shown in the form for changes (null: the form adds a new cohort),
  // and the cohort waiting in the "Delete?" window.
  const [editing, setEditing] = useState<Cohort | null>(null);
  const [toDelete, setToDelete] = useState<Cohort | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<CohortFormValues>({
    resolver: zodResolver(cohortSchema),
    defaultValues: {
      currentSemester: 'SEMESTER_1',
    },
  });

  // 2. Fetch Cohorts using the API client
  useEffect(() => {
    const fetchCohorts = async () => {
      try {
        const data = await api.getCohorts(); 
        setCohorts(data);
        setLoadError(null);
      } catch (error) {
        console.error('Failed to fetch cohorts. Backend might be offline.', error);
        setLoadError(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };
    fetchCohorts();
  }, [refreshTrigger]);

  // The weekly hours of each cohort in the term going on today (else the next term, else
  // the latest one). They load apart from the cohorts, so that the table does not wait
  // for them; if they cannot load, only the Weekly Hours column says "Not known".
  useEffect(() => {
    const fetchWeeklyHours = async () => {
      try {
        const [offerings, terms]: [CohortHoursOffering[], TermChoice[]] = await Promise.all([
          api.getOfferings(),
          api.getTerms(),
        ]);
        const termId = defaultTermId(terms, localDay(new Date()));
        const term = terms.find((candidate) => candidate.id === termId);
        setWeeklyHours(term ? cohortHours(offerings, term.id, term.name) : { termName: '', placed: {}, unplaced: {} });
      } catch (error) {
        console.error('Failed to fetch the weekly hours of the cohorts', error);
        setWeeklyHours(null);
      }
    };
    fetchWeeklyHours();
  }, [refreshTrigger]);

  const retryLoad = () => {
    setIsLoading(true);
    setLoadError(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  // 3. Handle Form Submission using the API client
  const onSubmit = async (data: CohortFormValues) => {
    setIsSubmitting(true);
    setNotice(null);
    try {
      if (editing) {
        await api.updateCohort(editing.id, data);
        setNotice({ type: 'success', text: `${data.name} was updated.` });
        setEditing(null);
      } else {
        await api.createCohort(data);
        setNotice({ type: 'success', text: 'Cohort saved.' });
      }
      reset();
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', text: `Could not save the cohort. ${getErrorMessage(error)}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Puts a cohort from the table into the form, to change it.
  const startEdit = (cohort: Cohort) => {
    setEditing(cohort);
    setNotice(null);
    reset({
      name: cohort.name,
      headcount: cohort.headcount,
      currentSemester: cohort.currentSemester,
    }, { keepDefaultValues: true }); // Cancel and Save then empty the form again
    // reset attaches the fields again on the next render; focus after that.
    setTimeout(() => setFocus('name'), 0);
  };

  const cancelEdit = () => {
    setEditing(null);
    reset();
  };

  // Runs when "Delete" is confirmed in the window. The server refuses while the
  // cohort has course offerings or students; its message (why, and what to do)
  // is shown as it is.
  const confirmDelete = async () => {
    if (toDelete === null) return;
    setIsDeleting(true);
    try {
      await api.deleteCohort(toDelete.id);
      setNotice({ type: 'success', text: `${toDelete.name} was deleted.` });
      if (editing?.id === toDelete.id) cancelEdit();
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', text: `Could not delete ${toDelete.name}. ${getErrorMessage(error)}` });
    } finally {
      setIsDeleting(false);
      setToDelete(null);
    }
  };

  // The minutes a week of the cohort's classes in the timetable, and of those that are
  // not in it yet (0 while not known).
  const minutesPlaced = (cohort: Cohort) => weeklyHours?.placed[cohort.id] ?? 0;
  const minutesUnplaced = (cohort: Cohort) => weeklyHours?.unplaced[cohort.id] ?? 0;

  // The columns the table can be sorted by (see lib/table-sort.ts).
  const sortColumns: SortColumn<Cohort>[] = [
    { key: 'name', label: 'Cohort Name', kind: 'text', value: (cohort) => cohort.name },
    { key: 'headcount', label: 'Headcount', kind: 'number', value: (cohort) => cohort.headcount },
    { key: 'hours', label: 'Weekly Hours', kind: 'number', value: (cohort) => minutesPlaced(cohort) },
    { key: 'term', label: 'Current Term', kind: 'text', value: (cohort) => cohort.currentSemester.replace('_', ' ') },
  ];

  // The cohorts that have what is typed in the search box, in their name, headcount or
  // current term, in the order chosen with the column headings.
  const shownCohorts = sortRows(
    filterBySearch(cohorts, search, (cohort) => [
      cohort.name,
      `${cohort.headcount} students`,
      cohort.currentSemester.replace('_', ' '),
    ]),
    sortColumns,
    sort,
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="mb-6 text-2xl font-bold text-gray-900 sm:mb-8 sm:text-3xl">Student Cohort Management</h1>
        <Notice message={notice} onDismiss={setNotice} />
        <ConfirmDialog
          open={toDelete !== null}
          title={`Delete ${toDelete?.name ?? 'this cohort'}?`}
          message="This cannot be undone. A cohort with course offerings or students cannot be deleted; you will see a message instead."
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
          busy={isDeleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: THE FORM */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">{editing ? `Edit ${editing.name}` : 'Add New Cohort'}</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              
              {/* Cohort Name Field */}
              <div>
                <label htmlFor="cohort-name" className="block text-sm font-medium text-gray-700 mb-1">Group / Cohort Name</label>
                <input
                  {...register('name')}
                  id="cohort-name"
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? 'cohort-name-hint cohort-name-error' : 'cohort-name-hint'}
                  className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm"
                  placeholder="e.g. Software Engineering - Year 1 - Grp A"
                />
                <p id="cohort-name-hint" className="text-xs text-gray-500 mt-1">Be as specific as possible (Major - Year - Section).</p>
                {errors.name && <p id="cohort-name-error" className="mt-1 text-xs font-medium text-red-700">{errors.name.message}</p>}
              </div>

              {/* Headcount Field */}
              <div>
                <label htmlFor="cohort-headcount" className="block text-sm font-medium text-gray-700 mb-1">Total Headcount</label>
                <input
                  type="number"
                  // Added valueAsNumber: true to pass a pure number to Zod
                  {...register('headcount', { valueAsNumber: true })}
                  id="cohort-headcount"
                  aria-invalid={errors.headcount ? true : undefined}
                  aria-describedby={errors.headcount ? 'cohort-headcount-hint cohort-headcount-error' : 'cohort-headcount-hint'}
                  className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm"
                  placeholder="e.g. 45"
                />
                <p id="cohort-headcount-hint" className="text-xs text-gray-500 mt-1">Crucial for matching with Room Capacity.</p>
                {errors.headcount && <p id="cohort-headcount-error" className="mt-1 text-xs font-medium text-red-700">{errors.headcount.message}</p>}
              </div>

              {/* Current Semester Field */}
              <div>
                <label htmlFor="cohort-current-semester" className="block text-sm font-medium text-gray-700 mb-1">Active Semester</label>
                <select
                  {...register('currentSemester')}
                  id="cohort-current-semester"
                  aria-invalid={errors.currentSemester ? true : undefined}
                  aria-describedby={errors.currentSemester ? 'cohort-current-semester-error' : undefined}
                  className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm"
                >
                  <option value="SEMESTER_1">Semester 1 (Fall)</option>
                  <option value="SEMESTER_2">Semester 2 (Spring)</option>
                  <option value="SUMMER">Summer Term</option>
                </select>
                {errors.currentSemester && <p id="cohort-current-semester-error" className="mt-1 text-xs font-medium text-red-700">{errors.currentSemester.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : editing ? 'Save Changes' : 'Save Cohort'}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="w-full rounded-lg border border-gray-500 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </form>
          </div>

          {/* RIGHT COLUMN: THE DATA TABLE */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <TableSearchBar
              title="Active Cohorts"
              inputId="search-cohorts"
              label="Search cohorts"
              placeholder="Name or term"
              value={search}
              onChange={setSearch}
              count={searchCount(shownCohorts.length, cohorts.length, search, 'cohort', 'cohorts')}
              sorted={sortText(sortColumns, sort)}
              badge={
                <>
                  <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                    Total Groups: {cohorts.length}
                  </span>
                  {weeklyHours && weeklyHours.termName && (
                    <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                      Weekly hours in {weeklyHours.termName}
                    </span>
                  )}
                </>
              }
            />
            
            <div className="@container overflow-x-auto">
              <SortSelect id="sort-cohorts" columns={sortColumns} sort={sort} onSort={setSort} className={cards.sort} />
              <table className={`w-full text-left border-collapse ${cards.table}`}>
                <thead className={cards.head}>
                  <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                    <SortHeader columns={sortColumns} columnKey="name" sort={sort} onSort={setSort} />
                    <SortHeader columns={sortColumns} columnKey="headcount" sort={sort} onSort={setSort} />
                    <SortHeader columns={sortColumns} columnKey="hours" sort={sort} onSort={setSort} />
                    <SortHeader columns={sortColumns} columnKey="term" sort={sort} onSort={setSort} />
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-gray-100 text-sm ${cards.body}`}>
                  {isLoading ? (
                    <StatusRow colSpan={5} message="Loading cohorts..." />
                  ) : loadError ? (
                    <StatusRow
                      colSpan={5}
                      tone="error"
                      message={`Could not load the cohorts. ${loadError}`}
                      onRetry={retryLoad}
                    />
                  ) : cohorts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        No cohorts registered. Add a student group to get started.
                      </td>
                    </tr>
                  ) : shownCohorts.length === 0 ? (
                    <NoMatchRow colSpan={5} text={noMatchText(search, 'cohort')} inputId="search-cohorts" onClear={() => setSearch('')} />
                  ) : (
                    shownCohorts.map((cohort) => (
                      <tr key={cohort.id} className={`${cards.row} ${editing?.id === cohort.id ? 'bg-blue-50' : 'hover:bg-gray-50 transition-colors'}`}>
                        <td className={`${cards.title} font-medium text-gray-900`}>{cohort.name}</td>
                        <td className={cards.cell}>
                          <span className={cards.label}>Headcount</span>
                          <span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {cohort.headcount} Students
                            </span>
                          </span>
                        </td>
                        <td className={`${cards.cell} text-gray-600`}>
                          <span className={cards.label}>Weekly Hours</span>
                          {weeklyHours === null ? (
                            <span className="text-gray-500">Not known</span>
                          ) : (
                            <span>
                              <span className={minutesPlaced(cohort) === 0 && minutesUnplaced(cohort) === 0 ? 'text-gray-500' : undefined}>
                                {cohortHoursText(minutesPlaced(cohort), minutesUnplaced(cohort))}
                              </span>
                              {notPlacedText(minutesUnplaced(cohort)) && (
                                <span className="block text-xs font-medium text-amber-800">{notPlacedText(minutesUnplaced(cohort))}</span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className={`${cards.cell} text-gray-600`}>
                          <span className={cards.label}>Current Term</span>
                          <span>{cohort.currentSemester.replace('_', ' ')}</span>
                        </td>
                        <td className={cards.actions}>
                          <div className={cards.buttons}>
                            <button
                              type="button"
                              onClick={() => startEdit(cohort)}
                              aria-label={`Edit ${cohort.name}`}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setToDelete(cohort)}
                              aria-label={`Delete ${cohort.name}`}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}