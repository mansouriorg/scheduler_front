'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Notice, type NoticeMessage } from '@/components/notice';
import { courseSchema, type CourseFormValues } from '@/lib/validations/course';
import { StatusRow } from '@/components/status-message';
import { getErrorMessage } from '@/lib/api-error';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api'; 

// The form rules (including credits) are in lib/validations/course.ts, with their tests.
type Course = CourseFormValues & { id: string };

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);
  // The course shown in the form for changes (null: the form adds a new course),
  // and the course waiting in the "Delete?" window.
  const [editing, setEditing] = useState<Course | null>(null);
  const [toDelete, setToDelete] = useState<Course | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setFocus,
    formState: { errors },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      offeredInTerms: ['SEMESTER_1'],
      componentsTemplate: [{ type: 'LECTURE', totalComponentHours: 0, hoursPerSession: 1.5, requiresRoomType: 'AMPHI', requiredEquipment: [] }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'componentsTemplate',
  });

  // Watch values to show a real-time progress bar of allocated hours
  const watchTotalHours = watch('totalHours') || 0;
  const watchComponents = watch('componentsTemplate') || [];
  const allocatedHours = watchComponents.reduce((sum, comp) => sum + (Number(comp.totalComponentHours) || 0), 0);

  // 2. Fetch Courses using Axios API
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await api.getCourses(); 
        setCourses(data);
        setLoadError(null);
      } catch (error) {
        console.error('Failed to fetch courses. Backend not running?', error);
        setLoadError(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourses();
  }, [refreshTrigger]);

  const retryLoad = () => {
    setIsLoading(true);
    setLoadError(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  // 3. Submit Form using Axios API
  const onSubmit = async (data: CourseFormValues) => {
    setIsSubmitting(true);
    setNotice(null);
    try {
      if (editing) {
        await api.updateCourse(editing.id, data);
        setNotice({ type: 'success', text: `${data.code} was updated.` });
        setEditing(null);
      } else {
        await api.createCourse(data);
        setNotice({ type: 'success', text: 'Course saved.' });
      }
      reset();
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', text: `Could not save the course. ${getErrorMessage(error)}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Puts a course from the table into the form, to change it. Each part (lecture,
  // TD, TP) becomes a row of the breakdown; only the fields the form has are kept.
  const startEdit = (course: Course) => {
    setEditing(course);
    setNotice(null);
    reset({
      code: course.code,
      title: course.title,
      credits: course.credits,
      totalHours: course.totalHours,
      offeredInTerms: course.offeredInTerms,
      componentsTemplate: course.componentsTemplate.map((part) => ({
        type: part.type,
        totalComponentHours: part.totalComponentHours,
        hoursPerSession: part.hoursPerSession,
        requiresRoomType: part.requiresRoomType,
        requiredEquipment: part.requiredEquipment,
      })),
    }, { keepDefaultValues: true }); // Cancel and Save then empty the form again
    // reset attaches the fields again on the next render; focus after that.
    setTimeout(() => setFocus('code'), 0);
  };

  const cancelEdit = () => {
    setEditing(null);
    reset();
  };

  // Runs when "Delete" is confirmed in the window. The server refuses while the
  // course has course offerings; its message (why, and what to do) is shown as it is.
  const confirmDelete = async () => {
    if (toDelete === null) return;
    setIsDeleting(true);
    try {
      await api.deleteCourse(toDelete.id);
      setNotice({ type: 'success', text: `${toDelete.code} was deleted.` });
      if (editing?.id === toDelete.id) cancelEdit();
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', text: `Could not delete ${toDelete.code}. ${getErrorMessage(error)}` });
    } finally {
      setIsDeleting(false);
      setToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="mb-6 text-2xl font-bold text-gray-900 sm:mb-8 sm:text-3xl">Master Course Catalog</h1>
        <Notice message={notice} onDismiss={setNotice} />
        <ConfirmDialog
          open={toDelete !== null}
          title={`Delete ${toDelete?.code ?? 'this course'}?`}
          message="This cannot be undone. A course with course offerings cannot be deleted; you will see a message instead."
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
          busy={isDeleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* LEFT COLUMN: THE WIZARD FORM */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">{editing ? `Edit ${editing.code}` : 'Add New Course Blueprint'}</h2>
            {editing && (
              <p className="-mt-4 mb-6 text-sm text-gray-600">
                Changes to the breakdown apply to course offerings you create from now on.
                Existing course offerings keep the classes they already have.
              </p>
            )}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="course-code" className="block text-sm font-medium text-gray-700 mb-1">Course Code</label>
                  <input {...register('code')} id="course-code" aria-invalid={errors.code ? true : undefined} aria-describedby={errors.code ? 'course-code-error' : undefined} className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm" placeholder="e.g. CS-101" />
                  {errors.code && <p id="course-code-error" className="mt-1 text-xs font-medium text-red-700">{errors.code.message}</p>}
                </div>
                <div>
                  <label htmlFor="course-total-hours" className="block text-sm font-medium text-gray-700 mb-1">Total Semester Hours</label>
                  {/* Added valueAsNumber: true */}
                  <input type="number" {...register('totalHours', { valueAsNumber: true })} id="course-total-hours" aria-invalid={errors.totalHours ? true : undefined} aria-describedby={errors.totalHours ? 'course-total-hours-error' : undefined} className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm" placeholder="e.g. 60" />
                  {errors.totalHours && <p id="course-total-hours-error" className="mt-1 text-xs font-medium text-red-700">{errors.totalHours.message}</p>}
                </div>
                <div className="col-span-2">
                  <label htmlFor="course-title" className="block text-sm font-medium text-gray-700 mb-1">Course Title</label>
                  <input {...register('title')} id="course-title" aria-invalid={errors.title ? true : undefined} aria-describedby={errors.title ? 'course-title-error' : undefined} className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm" placeholder="e.g. Intro to Programming" />
                  {errors.title && <p id="course-title-error" className="mt-1 text-xs font-medium text-red-700">{errors.title.message}</p>}
                </div>
                <div>
                  <label htmlFor="course-credits" className="block text-sm font-medium text-gray-700 mb-1">Credits</label>
                  <input type="number" {...register('credits', { valueAsNumber: true })} id="course-credits" aria-invalid={errors.credits ? true : undefined} aria-describedby={errors.credits ? 'course-credits-error' : undefined} className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm" placeholder="e.g. 6" />
                  {errors.credits && <p id="course-credits-error" className="mt-1 text-xs font-medium text-red-700">{errors.credits.message}</p>}
                </div>
              </div>

              {/* Semesters */}
              <div>
                <p id="course-terms-label" className="block text-sm font-medium text-gray-700 mb-2">Offered In</p>
                <div
                  role="group"
                  aria-labelledby="course-terms-label"
                  aria-describedby={errors.offeredInTerms ? 'course-terms-error' : undefined}
                  className="flex flex-wrap gap-x-4 gap-y-2"
                >
                  {['SEMESTER_1', 'SEMESTER_2', 'SUMMER'].map((term) => (
                    <label key={term} className="flex items-center space-x-2 text-sm text-gray-700">
                      <input type="checkbox" value={term} {...register('offeredInTerms')} className="h-4 w-4 rounded border-gray-500 accent-blue-600" />
                      <span>{term.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
                {errors.offeredInTerms && <p id="course-terms-error" className="mt-1 text-xs font-medium text-red-700">{errors.offeredInTerms.message}</p>}
              </div>

              <hr className="border-gray-200" />

              {/* Dynamic Course Components (Lecture, TP, TD) */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-800">Course Breakdown</h3>
                  <span className={`text-sm font-bold ${allocatedHours === watchTotalHours ? 'text-green-700' : 'text-orange-700'}`}>
                    Allocated: {allocatedHours} / {watchTotalHours || 0} hrs
                  </span>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg relative">
                      <button type="button" onClick={() => remove(index)} aria-label="Remove this part" className="absolute right-2 top-2 rounded p-1 text-sm font-bold text-red-700 hover:bg-red-50 hover:text-red-800">✕</button>
                      
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <label htmlFor={`course-part-${index}-type`} className="mb-1 block text-xs font-medium text-gray-700">Component Type</label>
                          <select {...register(`componentsTemplate.${index}.type` as const)} id={`course-part-${index}-type`} className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm">
                            <option value="LECTURE">Lecture (Cours)</option>
                            <option value="TD">Tutorial (TD)</option>
                            <option value="TP">Lab (TP)</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`course-part-${index}-total-component-hours`} className="mb-1 block text-xs font-medium text-gray-700">Hours for this Component</label>
                          {/* Added valueAsNumber: true */}
                          <input type="number" step="0.5" {...register(`componentsTemplate.${index}.totalComponentHours` as const, { valueAsNumber: true })} id={`course-part-${index}-total-component-hours`} className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm" placeholder="e.g. 30" />
                        </div>
                        <div>
                          <label htmlFor={`course-part-${index}-hours-per-session`} className="mb-1 block text-xs font-medium text-gray-700">Hours per Session</label>
                          {/* Added valueAsNumber: true */}
                          <input type="number" step="0.5" {...register(`componentsTemplate.${index}.hoursPerSession` as const, { valueAsNumber: true })} id={`course-part-${index}-hours-per-session`} className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm" placeholder="e.g. 1.5" />
                        </div>
                        <div>
                          <label htmlFor={`course-part-${index}-requires-room-type`} className="mb-1 block text-xs font-medium text-gray-700">Required Room</label>
                          <select {...register(`componentsTemplate.${index}.requiresRoomType` as const)} id={`course-part-${index}-requires-room-type`} className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm">
                            <option value="AMPHI">Amphi</option>
                            <option value="CLASSROOM">Classroom</option>
                            <option value="COMPUTER_LAB">Computer Lab</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => append({ type: 'TP', totalComponentHours: 0, hoursPerSession: 1.5, requiresRoomType: 'COMPUTER_LAB', requiredEquipment: [] })}
                  className="mt-4 text-sm text-blue-600 font-medium hover:text-blue-800"
                >
                  + Add Another Component (TD/TP)
                </button>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  type="submit"
                  disabled={isSubmitting || allocatedHours !== watchTotalHours}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editing ? 'Save Changes' : 'Save Course Blueprint'}
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-fit">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-semibold text-gray-800">Existing Courses</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                    <th className="p-4 font-medium">Code</th>
                    <th className="p-4 font-medium">Title</th>
                    <th className="p-4 font-medium">Hours</th>
                    <th className="p-4 font-medium">Credits</th>
                    <th className="p-4 font-medium">Breakdown</th>
                    <th className="sticky right-0 bg-gray-50 p-4 font-medium text-right shadow-[inset_1px_0_0_#f3f4f6]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {isLoading ? (
                    <StatusRow colSpan={6} message="Loading courses..." />
                  ) : loadError ? (
                    <StatusRow
                      colSpan={6}
                      tone="error"
                      message={`Could not load the courses. ${loadError}`}
                      onRetry={retryLoad}
                    />
                  ) : courses.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">No courses defined yet.</td></tr>
                  ) : (
                    courses.map((course) => (
                      <tr key={course.id} className={editing?.id === course.id ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}>
                        <td className="p-4 font-bold text-gray-900">{course.code}</td>
                        <td className="p-4 text-gray-700">{course.title}</td>
                        <td className="p-4 font-medium text-blue-600">{course.totalHours}h</td>
                        <td className="p-4 text-gray-700">{course.credits}</td>
                        <td className="p-4 text-gray-500 text-xs space-y-1">
                          {course.componentsTemplate.map((comp, idx) => (
                            <div key={idx}>• {comp.type}: {comp.totalComponentHours}h</div>
                          ))}
                        </td>
                        {/* Stays in view when the table scrolls sideways, so Edit and Delete are always visible. */}
                        <td className="sticky right-0 bg-inherit p-4 shadow-[inset_1px_0_0_#f3f4f6]">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(course)}
                              aria-label={`Edit ${course.code}`}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setToDelete(course)}
                              aria-label={`Delete ${course.code}`}
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