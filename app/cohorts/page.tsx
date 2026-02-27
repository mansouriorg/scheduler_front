'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api'; 

// 1. Zod Validation Schema (Cleaned up for strict TypeScript matching)
const cohortSchema = z.object({
  name: z.string().min(2, 'Cohort name is required (e.g., SE - Year 1)'),
  headcount: z.number().min(1, 'Headcount must be at least 1').max(500, 'Headcount exceeds maximum limit'), // Removed coerce
  currentSemester: z.enum(['SEMESTER_1', 'SEMESTER_2', 'SUMMER']),
});

type CohortFormValues = z.infer<typeof cohortSchema>;
type Cohort = CohortFormValues & { id: string };

export default function CohortsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
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
      } catch (error) {
        console.error('Failed to fetch cohorts. Backend might be offline.', error);
      }
    };
    fetchCohorts();
  }, [refreshTrigger]);

  // 3. Handle Form Submission using the API client
  const onSubmit = async (data: CohortFormValues) => {
    setIsSubmitting(true);
    try {
      await api.createCohort(data); 

      alert('Cohort added successfully!');
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Student Cohort Management</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: THE FORM */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Add New Cohort</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              
              {/* Cohort Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group / Cohort Name</label>
                <input
                  {...register('name')}
                  className="w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Software Engineering - Year 1 - Grp A"
                />
                <p className="text-xs text-gray-500 mt-1">Be as specific as possible (Major - Year - Section).</p>
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              {/* Headcount Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Headcount</label>
                <input
                  type="number"
                  // Added valueAsNumber: true to pass a pure number to Zod
                  {...register('headcount', { valueAsNumber: true })}
                  className="w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. 45"
                />
                <p className="text-xs text-gray-500 mt-1">Crucial for matching with Room Capacity.</p>
                {errors.headcount && <p className="text-red-500 text-xs mt-1">{errors.headcount.message}</p>}
              </div>

              {/* Current Semester Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Active Semester</label>
                <select
                  {...register('currentSemester')}
                  className="w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="SEMESTER_1">Semester 1 (Fall)</option>
                  <option value="SEMESTER_2">Semester 2 (Spring)</option>
                  <option value="SUMMER">Summer Term</option>
                </select>
                {errors.currentSemester && <p className="text-red-500 text-xs mt-1">{errors.currentSemester.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 mt-6 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Cohort'}
              </button>
            </form>
          </div>

          {/* RIGHT COLUMN: THE DATA TABLE */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Active Cohorts</h2>
              <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                Total Groups: {cohorts.length}
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                    <th className="p-4 font-medium">Cohort Name</th>
                    <th className="p-4 font-medium">Headcount</th>
                    <th className="p-4 font-medium">Current Term</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {cohorts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-gray-500">
                        No cohorts registered. Add a student group to get started.
                      </td>
                    </tr>
                  ) : (
                    cohorts.map((cohort) => (
                      <tr key={cohort.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-medium text-gray-900">{cohort.name}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {cohort.headcount} Students
                          </span>
                        </td>
                        <td className="p-4 text-gray-600">
                          {cohort.currentSemester.replace('_', ' ')}
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