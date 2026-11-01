'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Notice, type NoticeMessage } from '@/components/notice';
import { StatusBlock } from '@/components/status-message';
import { getErrorMessage } from '@/lib/api-error';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api'; // <-- Import your centralized API client

// 1. Zod Validation Schema
const offeringSchema = z.object({
  termId: z.string().min(1, 'Please select an academic term'),
  cohortId: z.string().min(1, 'Please select a student cohort'),
  courseId: z.string().min(1, 'Please select a course'),
});

type OfferingFormValues = z.infer<typeof offeringSchema>;

// The parts of an offering that Edit and Delete use.
type Offering = {
  id: string;
  termId: string;
  courseId: string;
  cohortId: string;
  term: { name: string };
  course: { code: string; title: string };
  cohort: { name: string };
  classes: { startTime: string | null }[];
};

// "DEV-101 for SE - Year 1 in Fall 2026": how buttons and messages name an offering.
const offeringName = (offering: Offering) =>
  `${offering.course.code} for ${offering.cohort.name} in ${offering.term.name}`;

// How many classes of the offering have a room and a time in the timetable.
const scheduledCount = (offering: Offering) =>
  offering.classes.filter((cls) => cls.startTime !== null).length;

// "1 class", "3 classes".
const classCount = (count: number) => (count === 1 ? '1 class' : `${count} classes`);

// What the "Delete?" window says, including the classes that go with the offering.
function deleteMessage(offering: Offering): string {
  const total = offering.classes.length;
  const scheduled = scheduledCount(offering);
  const parts = ['This cannot be undone.'];
  if (total > 0) {
    parts.push(total === 1 ? 'Its class is deleted with it.' : `Its ${total} classes are deleted with it.`);
  }
  if (scheduled > 0) {
    parts.push(
      scheduled === total
        ? `${total === 1 ? 'It is' : 'They are'} in the timetable and will disappear from it.`
        : `${scheduled} of them ${scheduled === 1 ? 'is' : 'are'} in the timetable and will disappear from it.`,
    );
  }
  parts.push('An offering with enrolled students cannot be deleted; you will see a message instead.');
  return parts.join(' ');
}

export default function CourseOfferingsPage() {
  const [offerings, setOfferings] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [cohorts, setCohorts] = useState<any[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);
  // The offering shown in the form for changes (null: the form adds a new one),
  // and the offering waiting in the "Delete?" window.
  const [editing, setEditing] = useState<Offering | null>(null);
  const [toDelete, setToDelete] = useState<Offering | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<OfferingFormValues>({
    resolver: zodResolver(offeringSchema),
  });

  // 2. Fetch all dropdown data + existing offerings using Axios
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Load the four lists together. If one request fails, the page says so
        // instead of showing empty lists.
        const [termData, courseData, cohortData, offeringData] = await Promise.all([
          api.getTerms(),
          api.getCourses(),
          api.getCohorts(),
          api.getOfferings(),
        ]);

        setTerms(termData);
        setCourses(courseData);
        setCohorts(cohortData);
        setOfferings(offeringData);
        setLoadError(null);
      } catch (error) {
        console.error('Failed to fetch data', error);
        setLoadError(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [refreshTrigger]);

  const retryLoad = () => {
    setIsLoading(true);
    setLoadError(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  // 3. Handle Form Submission
  const onSubmit = async (data: OfferingFormValues) => {
    setIsSubmitting(true);
    setNotice(null);
    try {
      if (editing) {
        // Only the term and the cohort can change; the course stays.
        await api.updateOffering(editing.id, { termId: data.termId, cohortId: data.cohortId });
        const moved = data.termId !== editing.termId || data.cohortId !== editing.cohortId;
        const takenOut = moved ? scheduledCount(editing) : 0;
        const termName = terms.find((term) => term.id === data.termId)?.name ?? editing.term.name;
        const cohortName = cohorts.find((cohort) => cohort.id === data.cohortId)?.name ?? editing.cohort.name;
        const name = `${editing.course.code} for ${cohortName} in ${termName}`;
        setNotice({
          type: 'success',
          text:
            takenOut === 0
              ? `${name} was updated.`
              : `${name} was updated. ${takenOut === 1 ? 'Its class was' : `Its ${takenOut} classes were`} taken out of the timetable; generate the timetable again to place ${takenOut === 1 ? 'it' : 'them'}.`,
        });
        setEditing(null);
      } else {
        await api.createOffering(data); // <-- Clean POST request
        setNotice({ type: 'success', text: 'Course assigned. Its class blocks are ready to be scheduled.' });
      }
      reset();
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error(error);
      const what = editing ? 'Could not save the changes.' : 'Could not assign the course.';
      setNotice({ type: 'error', text: `${what} ${getErrorMessage(error)}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Puts an offering from the list into the form, to move it to another term or
  // cohort. The course select is hidden while editing: the course cannot change.
  const startEdit = (offering: Offering) => {
    setEditing(offering);
    setNotice(null);
    reset({
      termId: offering.termId,
      cohortId: offering.cohortId,
      courseId: offering.courseId,
    }, { keepDefaultValues: true }); // Cancel and Save then empty the form again
    // reset attaches the fields again on the next render; focus after that.
    setTimeout(() => setFocus('termId'), 0);
  };

  const cancelEdit = () => {
    setEditing(null);
    reset();
  };

  // Runs when "Delete" is confirmed in the window. The server refuses while
  // students are enrolled; its message (why) is shown as it is.
  const confirmDelete = async () => {
    if (toDelete === null) return;
    setIsDeleting(true);
    try {
      await api.deleteOffering(toDelete.id);
      setNotice({ type: 'success', text: `${offeringName(toDelete)} was deleted.` });
      if (editing?.id === toDelete.id) cancelEdit();
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', text: `Could not delete ${offeringName(toDelete)}. ${getErrorMessage(error)}` });
    } finally {
      setIsDeleting(false);
      setToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="mb-6 text-2xl font-bold text-gray-900 sm:mb-8 sm:text-3xl">Assign Courses to Cohorts</h1>
        <Notice message={notice} onDismiss={setNotice} />
        <ConfirmDialog
          open={toDelete !== null}
          title={`Delete ${toDelete === null ? 'this offering' : offeringName(toDelete)}?`}
          message={toDelete === null ? '' : deleteMessage(toDelete)}
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
          busy={isDeleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: THE FORM */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">{editing ? `Edit ${offeringName(editing)}` : 'New Assignment'}</h2>
            {editing && scheduledCount(editing) > 0 && (
              <p className="-mt-4 mb-6 text-sm text-gray-600">
                If you change the term or the cohort, its {classCount(scheduledCount(editing))} in the timetable will be
                taken out of it. Generate the timetable again to place {scheduledCount(editing) === 1 ? 'it' : 'them'}.
              </p>
            )}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="offering-term-id" className="block text-sm font-medium text-gray-700 mb-1">Academic Term</label>
                <select 
                  {...register('termId')} 
                  id="offering-term-id"
                  aria-invalid={errors.termId ? true : undefined}
                  aria-describedby={errors.termId ? 'offering-term-id-error' : undefined}
                  className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm"
                >
                  <option value="">-- Select Term --</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {errors.termId && <p id="offering-term-id-error" className="mt-1 text-xs font-medium text-red-700">{errors.termId.message}</p>}
              </div>

              <div>
                <label htmlFor="offering-cohort-id" className="block text-sm font-medium text-gray-700 mb-1">Student Cohort</label>
                <select 
                  {...register('cohortId')} 
                  id="offering-cohort-id"
                  aria-invalid={errors.cohortId ? true : undefined}
                  aria-describedby={errors.cohortId ? 'offering-cohort-id-error' : undefined}
                  className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm"
                >
                  <option value="">-- Select Group --</option>
                  {cohorts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.headcount} students)</option>)}
                </select>
                {errors.cohortId && <p id="offering-cohort-id-error" className="mt-1 text-xs font-medium text-red-700">{errors.cohortId.message}</p>}
              </div>

              {editing ? (
                <div>
                  <p className="block text-sm font-medium text-gray-700 mb-1">Course</p>
                  <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900">
                    {editing.course.code}: {editing.course.title}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    The course of an offering cannot change. To offer another course, add a new assignment.
                  </p>
                </div>
              ) : (
              <div>
                <label htmlFor="offering-course-id" className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select 
                  {...register('courseId')} 
                  id="offering-course-id"
                  aria-invalid={errors.courseId ? true : undefined}
                  aria-describedby={errors.courseId ? 'offering-course-id-error' : undefined}
                  className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm"
                >
                  <option value="">-- Select Course --</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.code}: {c.title}</option>)}
                </select>
                {errors.courseId && <p id="offering-course-id-error" className="mt-1 text-xs font-medium text-red-700">{errors.courseId.message}</p>}
              </div>
              )}

              <div className="mt-6 space-y-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting
                    ? editing ? 'Saving...' : 'Generating Blocks...'
                    : editing ? 'Save Changes' : 'Assign & Generate Blocks'}
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
              </div>
            </form>
          </div>

          {/* RIGHT COLUMN: THE DATA TABLE */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-semibold text-gray-800">Generated Offerings & Pending Classes</h2>
            </div>
            
            <div className="p-6 space-y-4 max-h-[700px] overflow-y-auto">
              {isLoading ? (
                <StatusBlock message="Loading assignments..." />
              ) : loadError ? (
                <StatusBlock
                  tone="error"
                  message={`Could not load the assignments. ${loadError}`}
                  onRetry={retryLoad}
                />
              ) : offerings.length === 0 ? (
                <p className="text-gray-500 text-center">No assignments yet. Link a course to a cohort above.</p>
              ) : (
                offerings.map((offering) => (
                  <div
                    key={offering.id}
                    className={
                      editing?.id === offering.id
                        ? 'rounded-lg border border-blue-400 bg-blue-50 p-4 shadow-sm'
                        : 'border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:border-blue-300 transition-colors'
                    }
                  >
                    <div className="flex justify-between items-start mb-3 border-b pb-2">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{offering.course.code} - {offering.course.title}</h3>
                        <p className="text-sm font-medium text-blue-600">
                          {offering.cohort.name} <span className="text-gray-500 font-normal">({offering.cohort.headcount} students)</span>
                        </p>
                      </div>
                      <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded font-bold border border-indigo-100">
                        {offering.term.name}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Generated Schedulable Blocks:</h4>
                      <div className="flex flex-wrap gap-2">
                        {offering.classes.map((cls: any) => (
                          <div key={cls.id} className="bg-orange-50 text-orange-800 border border-orange-200 rounded px-3 py-1.5 text-xs font-medium flex items-center shadow-sm">
                            <span className="font-bold mr-1">{cls.type}:</span> {cls.durationMinutes} mins 
                            <span className="ml-2 text-orange-700">({cls.requiresRoomType})</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2">
                      <p className="text-xs text-gray-600">
                        {scheduledCount(offering)} of {classCount(offering.classes.length)} in the timetable
                      </p>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(offering)}
                          aria-label={`Edit ${offeringName(offering)}`}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setToDelete(offering)}
                          aria-label={`Delete ${offeringName(offering)}`}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}