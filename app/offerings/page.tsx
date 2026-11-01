'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Notice, type NoticeMessage } from '@/components/notice';
import { StatusBlock } from '@/components/status-message';
import { getErrorMessage } from '@/lib/api-error';
import { ConfirmDialog } from '@/components/confirm-dialog';
import Link from 'next/link';
import { CalendarX, GraduationCap, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api'; // <-- Import your centralized API client
import {
  classLabels,
  classTime,
  notFreeLine,
  notFreeTeachers,
  notFreeText,
  teacherChanges,
  teacherChoices,
  teacherMinutes,
  type NotFree,
  type OfferingClass,
} from '@/lib/class-teachers';
import { overMaximumText, teacherOptionText, withClassLine } from '@/lib/teacher-hours';
import type { TimeOff } from '@/lib/teacher-times';

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
  term: { name: string; startDate: string; endDate: string };
  course: { code: string; title: string };
  cohort: { name: string; headcount: number };
  classes: OfferingClass[];
};

// The terms, courses and cohorts in the lists of the form.
type TermOption = { id: string; name: string };
type CourseOption = { id: string; code: string; title: string };
type CohortOption = { id: string; name: string; headcount: number };

// A teacher in the lists of the Teachers form, with the most hours they may teach
// a week and the times each week when they cannot teach.
type Teacher = {
  id: string;
  name: string;
  department: string;
  maxHoursPerWeek: number;
  unavailability?: TimeOff[];
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

// What the "Unschedule?" window says: only the classes of this offering leave the
// timetable; everything else stays.
function unscheduleMessage(offering: Offering): string {
  const scheduled = scheduledCount(offering);
  const which = scheduled === 1 ? 'Its class in the timetable loses its' : `Its ${scheduled} classes in the timetable lose their`;
  return `${which} room, day and time. Their teachers, the offering and the other classes of the timetable stay. Generate places ${scheduled === 1 ? 'it' : 'them'} again around the other classes.`;
}

export default function CourseOfferingsPage() {
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  
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
  // The offering waiting in the "Unschedule?" window: its classes would leave the
  // timetable, and only them.
  const [toUnschedule, setToUnschedule] = useState<Offering | null>(null);
  const [isUnscheduling, setIsUnscheduling] = useState(false);
  // The offering whose classes are shown in the Teachers form (null: none),
  // and the teacher chosen for each class ('' for no teacher).
  const [teaching, setTeaching] = useState<Offering | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [isSavingTeachers, setIsSavingTeachers] = useState(false);

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
        // Load the five lists together. If one request fails, the page says so
        // instead of showing empty lists.
        const [termData, courseData, cohortData, offeringData, teacherData] = await Promise.all([
          api.getTerms(),
          api.getCourses(),
          api.getCohorts(),
          api.getOfferings(),
          api.getTeachers(),
        ]);

        setTerms(termData);
        setCourses(courseData);
        setCohorts(cohortData);
        setOfferings(offeringData);
        setTeachers(teacherData);
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
    setTeaching(null);
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

  // Shows the classes of an offering in the form, each with a list of
  // teachers. Only one form is open at a time, so Edit is left first.
  const startTeachers = (offering: Offering) => {
    if (editing) cancelEdit();
    setNotice(null);
    setTeaching(offering);
    setChoices(teacherChoices(offering.classes));
    // The lists appear on the next render; focus the first one after that.
    const first = offering.classes[0];
    if (first) setTimeout(() => document.getElementById(`class-teacher-${first.id}`)?.focus(), 0);
  };

  // Saves the teachers chosen in the form, all together. brain_server refuses,
  // and says why, when a teacher would teach more hours a week than allowed or
  // is busy at the time of a class that is already in the timetable; the form
  // then stays open, so that another teacher can be chosen.
  const saveTeachers = async () => {
    if (teaching === null) return;
    const changes = teacherChanges(teaching.classes, choices);
    if (changes.length === 0) {
      setNotice({ type: 'success', text: `Nothing changed: every class of ${offeringName(teaching)} keeps its teacher.` });
      setTeaching(null);
      return;
    }
    setIsSavingTeachers(true);
    setNotice(null);
    try {
      await api.assignTeachers(teaching.id, changes);
      setNotice({ type: 'success', text: `The teachers of ${offeringName(teaching)} were saved.` });
      setTeaching(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', text: `Could not save the teachers. ${getErrorMessage(error)}` });
    } finally {
      setIsSavingTeachers(false);
    }
  };

  // The name shown on a class: its teacher, or "No teacher" while it has none.
  const teacherName = (id: string | null) =>
    id ? (teachers.find((teacher) => teacher.id === id)?.name ?? 'Unknown teacher') : 'No teacher';

  // Runs when "Delete" is confirmed in the window. The server refuses while
  // students are enrolled; its message (why) is shown as it is.
  const confirmDelete = async () => {
    if (toDelete === null) return;
    setIsDeleting(true);
    try {
      await api.deleteOffering(toDelete.id);
      setNotice({ type: 'success', text: `${offeringName(toDelete)} was deleted.` });
      if (editing?.id === toDelete.id) cancelEdit();
      if (teaching?.id === toDelete.id) setTeaching(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', text: `Could not delete ${offeringName(toDelete)}. ${getErrorMessage(error)}` });
    } finally {
      setIsDeleting(false);
      setToDelete(null);
    }
  };

  // Runs when "Unschedule" is confirmed in the window. The forms of that offering
  // close: the times they show would be out of date.
  const confirmUnschedule = async () => {
    if (toUnschedule === null) return;
    setIsUnscheduling(true);
    try {
      const result = await api.clearOfferingTimetable(toUnschedule.id);
      setNotice({ type: 'success', text: result.message });
      if (editing?.id === toUnschedule.id) cancelEdit();
      if (teaching?.id === toUnschedule.id) setTeaching(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', text: `Could not unschedule ${offeringName(toUnschedule)}. ${getErrorMessage(error)}` });
    } finally {
      setIsUnscheduling(false);
      setToUnschedule(null);
    }
  };

  // "LECTURE", "TD 1", "TD 2": the names of the classes in the Teachers form.
  const teachingLabels = teaching ? classLabels(teaching.classes) : [];

  // For each class in the Teachers form: the minutes a week a teacher would teach
  // in the weeks of the offering's term with that class (their other classes
  // included, and the other choices in the form), shown in its list; the teachers
  // who are not free at its time (when it is in the timetable), and why; and, for
  // the teacher chosen, the lines under the list (null: none chosen, or free).
  const classHours = (teaching?.classes ?? []).map((cls) => {
    const without = teaching ? teacherMinutes(offerings, teaching, choices, cls.id) : new Map<string, number>();
    const minutesWith = (teacherId: string) => (without.get(teacherId) ?? 0) + cls.durationMinutes;
    const notFree = teaching ? notFreeTeachers(offerings, teaching, cls, teachers) : new Map<string, NotFree>();
    const chosen = teachers.find((teacher) => teacher.id === choices[cls.id]);
    const chosenNotFree = chosen ? (notFree.get(chosen.id) ?? null) : null;
    // The texts read with the list: when the class takes place, then these lines.
    const describedBy = [
      `class-teacher-${cls.id}-when`,
      chosen ? `class-teacher-${cls.id}-hours` : '',
      chosenNotFree ? `class-teacher-${cls.id}-time` : '',
    ];
    return {
      minutesWith,
      notFree,
      chosen: chosen ? withClassLine(minutesWith(chosen.id), chosen.maxHoursPerWeek) : null,
      chosenNotFree: chosenNotFree ? notFreeLine(chosenNotFree) : null,
      describedBy: describedBy.filter((id) => id !== '').join(' '),
    };
  });

  // What brain_server would refuse to save, one sentence each: a class that gets
  // a new teacher who is not free at its time, and a teacher who gets a class and
  // would then teach more than their maximum a week in the offering's term.
  const changes = teaching ? teacherChanges(teaching.classes, choices) : [];
  const notFreeNow = changes.flatMap(({ classId, professorId }) => {
    const index = teaching ? teaching.classes.findIndex((cls) => cls.id === classId) : -1;
    const teacher = teachers.find((one) => one.id === professorId);
    const reason = teacher ? classHours[index]?.notFree.get(teacher.id) : undefined;
    return teaching && teacher && reason ? [notFreeText(teacher.name, teaching, teaching.classes[index], reason)] : [];
  });
  const minutesNow = teaching ? teacherMinutes(offerings, teaching, choices) : new Map<string, number>();
  const gaining = changes.map((change) => change.professorId);
  const overMaximum = teachers
    .filter((teacher) => gaining.includes(teacher.id))
    .map((teacher) => (teaching ? overMaximumText(teacher, minutesNow.get(teacher.id) ?? 0, teaching.term.name) : null))
    .filter((text): text is string => text !== null);
  const refusals = [...notFreeNow, ...overMaximum];

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
        <ConfirmDialog
          open={toUnschedule !== null}
          title={`Take ${toUnschedule === null ? 'this offering' : offeringName(toUnschedule)} out of the timetable?`}
          message={toUnschedule === null ? '' : unscheduleMessage(toUnschedule)}
          confirmLabel={isUnscheduling ? 'Unscheduling...' : 'Unschedule'}
          busy={isUnscheduling}
          onConfirm={confirmUnschedule}
          onCancel={() => setToUnschedule(null)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: THE FORM */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            {teaching ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveTeachers();
                }}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Teachers for {offeringName(teaching)}</h2>
                  <p className="mt-2 text-sm text-gray-600">
                    Each class can have its own teacher. A class that is already in the timetable keeps its day and
                    time, so its teacher must be free then.
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    Next to each teacher: the hours a week they would teach in {teaching.term.name} with that class
                    (their other classes in those weeks included), and their maximum. For a class already in the
                    timetable, a teacher who is away or teaches another class at its time is marked not free.
                  </p>
                </div>
                {teachers.length === 0 && (
                  <p className="text-sm text-gray-700">
                    No teachers yet. Add them on the{' '}
                    <Link href="/teachers" className="font-medium text-blue-700 underline hover:text-blue-800">
                      Teachers page
                    </Link>{' '}
                    first.
                  </p>
                )}
                {teaching.classes.length === 0 && <p className="text-sm text-gray-700">This offering has no classes.</p>}
                {teaching.classes.map((cls, index) => (
                  <div key={cls.id}>
                    <label htmlFor={`class-teacher-${cls.id}`} className="block text-sm font-medium text-gray-700">{teachingLabels[index]}</label>
                    <p id={`class-teacher-${cls.id}-when`} className="mb-1 text-xs text-gray-600">
                      {cls.durationMinutes} mins, {classTime(cls) ?? 'not in the timetable yet'}
                    </p>
                    <select
                      id={`class-teacher-${cls.id}`}
                      aria-describedby={classHours[index].describedBy}
                      value={choices[cls.id] ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        setChoices((prev) => ({ ...prev, [cls.id]: value }));
                      }}
                      className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm"
                    >
                      <option value="">No teacher yet</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacherOptionText(
                            teacher,
                            classHours[index].minutesWith(teacher.id),
                            classHours[index].notFree.has(teacher.id),
                          )}
                        </option>
                      ))}
                    </select>
                    {classHours[index].chosen && (
                      <p
                        id={`class-teacher-${cls.id}-hours`}
                        className={`mt-1 text-xs ${classHours[index].chosen.over ? 'font-medium text-red-700' : 'text-gray-600'}`}
                      >
                        {classHours[index].chosen.text}
                      </p>
                    )}
                    {classHours[index].chosenNotFree && (
                      <p id={`class-teacher-${cls.id}-time`} className="mt-1 text-xs font-medium text-red-700">
                        {classHours[index].chosenNotFree}
                      </p>
                    )}
                  </div>
                ))}
                <div aria-live="polite">
                  {refusals.length > 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      <ul className="space-y-1 font-medium">
                        {refusals.map((text) => (
                          <li key={text}>{text}</li>
                        ))}
                      </ul>
                      <p className="mt-2">Saving would be refused: choose another teacher for some of those classes.</p>
                    </div>
                  )}
                </div>
                <div className="mt-6 space-y-3">
                  <button
                    type="submit"
                    disabled={isSavingTeachers}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSavingTeachers ? 'Saving...' : 'Save Teachers'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeaching(null)}
                    className="w-full rounded-lg border border-gray-500 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
            <>
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
            </>
            )}
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
                      editing?.id === offering.id || teaching?.id === offering.id
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
                        {offering.classes.map((cls) => (
                          <div key={cls.id} className="bg-orange-50 text-orange-800 border border-orange-200 rounded px-3 py-1.5 text-xs font-medium flex flex-wrap items-center shadow-sm">
                            <span className="font-bold mr-1">{cls.type}:</span> {cls.durationMinutes} mins 
                            <span className="ml-2 text-orange-700">({cls.requiresRoomType})</span>
                            <span className="ml-2 whitespace-nowrap border-l border-orange-200 pl-2 text-gray-800">{teacherName(cls.assignedProfessorId)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2">
                      <p className="text-xs text-gray-600">
                        {scheduledCount(offering)} of {classCount(offering.classes.length)} in the timetable
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => startTeachers(offering)}
                          aria-label={`Teachers for ${offeringName(offering)}`}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
                        >
                          <GraduationCap className="h-4 w-4" aria-hidden="true" />
                          Teachers
                        </button>
                        {scheduledCount(offering) > 0 && (
                          <button
                            type="button"
                            onClick={() => setToUnschedule(offering)}
                            aria-label={`Unschedule ${offeringName(offering)}`}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
                          >
                            <CalendarX className="h-4 w-4" aria-hidden="true" />
                            Unschedule
                          </button>
                        )}
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