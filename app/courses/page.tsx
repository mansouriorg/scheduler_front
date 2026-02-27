'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api'; 

// 1. Zod Schema (Cleaned up for strict TypeScript matching)
const componentSchema = z.object({
  type: z.enum(['LECTURE', 'TD', 'TP']),
  totalComponentHours: z.number().min(1, 'Required'), // Removed coerce
  hoursPerSession: z.number().min(0.5, 'Required'), // Removed coerce
  requiresRoomType: z.enum(['AMPHI', 'CLASSROOM', 'COMPUTER_LAB', 'WORKSHOP', 'CHEMISTRY_LAB']),
  requiredEquipment: z.array(z.string()), // Removed default([])
});

const courseSchema = z.object({
  code: z.string().min(2, 'Code is required (e.g., DEV-101)'),
  title: z.string().min(2, 'Title is required'),
  totalHours: z.number().min(1, 'Total hours required'), // Removed coerce
  offeredInTerms: z.array(z.enum(['SEMESTER_1', 'SEMESTER_2', 'SUMMER'])).min(1, 'Select at least one term'),
  componentsTemplate: z.array(componentSchema).min(1, 'Add at least one teaching component'),
}).refine((data) => {
  // Advanced Validation: Ensure the sum of component hours equals the total course hours!
  const sum = data.componentsTemplate.reduce((acc, curr) => acc + curr.totalComponentHours, 0);
  return sum === data.totalHours;
}, {
  message: "The sum of component hours must exactly equal the Total Course Hours",
  path: ["totalHours"], 
});

type CourseFormValues = z.infer<typeof courseSchema>;
type Course = CourseFormValues & { id: string };

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
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
      } catch (error) {
        console.error('Failed to fetch courses. Backend not running?', error);
      }
    };
    fetchCourses();
  }, [refreshTrigger]);

  // 3. Submit Form using Axios API
  const onSubmit = async (data: CourseFormValues) => {
    setIsSubmitting(true);
    try {
      await api.createCourse(data); 

      alert('Course blueprint added successfully!');
      reset();
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      alert('Network error. Is your NestJS backend running?');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Master Course Catalog</h1>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* LEFT COLUMN: THE WIZARD FORM */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Add New Course Blueprint</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course Code</label>
                  <input {...register('code')} className="w-full rounded-lg border-gray-300 shadow-sm p-2.5 border" placeholder="e.g. CS-101" />
                  {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Semester Hours</label>
                  {/* Added valueAsNumber: true */}
                  <input type="number" {...register('totalHours', { valueAsNumber: true })} className="w-full rounded-lg border-gray-300 shadow-sm p-2.5 border" placeholder="e.g. 60" />
                  {errors.totalHours && <p className="text-red-500 text-xs mt-1">{errors.totalHours.message}</p>}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course Title</label>
                  <input {...register('title')} className="w-full rounded-lg border-gray-300 shadow-sm p-2.5 border" placeholder="e.g. Intro to Programming" />
                </div>
              </div>

              {/* Semesters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Offered In</label>
                <div className="flex space-x-4">
                  {['SEMESTER_1', 'SEMESTER_2', 'SUMMER'].map((term) => (
                    <label key={term} className="flex items-center space-x-2 text-sm text-gray-700">
                      <input type="checkbox" value={term} {...register('offeredInTerms')} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span>{term.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
                {errors.offeredInTerms && <p className="text-red-500 text-xs mt-1">{errors.offeredInTerms.message}</p>}
              </div>

              <hr className="border-gray-200" />

              {/* Dynamic Course Components (Lecture, TP, TD) */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-800">Course Breakdown</h3>
                  <span className={`text-sm font-bold ${allocatedHours === watchTotalHours ? 'text-green-600' : 'text-orange-500'}`}>
                    Allocated: {allocatedHours} / {watchTotalHours || 0} hrs
                  </span>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg relative">
                      <button type="button" onClick={() => remove(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-sm font-bold">✕</button>
                      
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Component Type</label>
                          <select {...register(`componentsTemplate.${index}.type` as const)} className="w-full rounded p-2 border text-sm">
                            <option value="LECTURE">Lecture (Cours)</option>
                            <option value="TD">Tutorial (TD)</option>
                            <option value="TP">Lab (TP)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Hours for this Component</label>
                          {/* Added valueAsNumber: true */}
                          <input type="number" step="0.5" {...register(`componentsTemplate.${index}.totalComponentHours` as const, { valueAsNumber: true })} className="w-full rounded p-2 border text-sm" placeholder="e.g. 30" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Hours per Session</label>
                          {/* Added valueAsNumber: true */}
                          <input type="number" step="0.5" {...register(`componentsTemplate.${index}.hoursPerSession` as const, { valueAsNumber: true })} className="w-full rounded p-2 border text-sm" placeholder="e.g. 1.5" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Required Room</label>
                          <select {...register(`componentsTemplate.${index}.requiresRoomType` as const)} className="w-full rounded p-2 border text-sm">
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

              <button
                type="submit"
                disabled={isSubmitting || allocatedHours !== watchTotalHours}
                className="w-full py-3 px-4 mt-6 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Course Blueprint'}
              </button>
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
                    <th className="p-4 font-medium">Breakdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {courses.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-500">No courses defined yet.</td></tr>
                  ) : (
                    courses.map((course) => (
                      <tr key={course.id} className="hover:bg-gray-50">
                        <td className="p-4 font-bold text-gray-900">{course.code}</td>
                        <td className="p-4 text-gray-700">{course.title}</td>
                        <td className="p-4 font-medium text-blue-600">{course.totalHours}h</td>
                        <td className="p-4 text-gray-500 text-xs space-y-1">
                          {course.componentsTemplate.map((comp, idx) => (
                            <div key={idx}>• {comp.type}: {comp.totalComponentHours}h</div>
                          ))}
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