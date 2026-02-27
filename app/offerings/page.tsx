'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api'; // <-- Import your centralized API client

// 1. Zod Validation Schema
const offeringSchema = z.object({
  termId: z.string().min(1, 'Please select an academic term'),
  cohortId: z.string().min(1, 'Please select a student cohort'),
  courseId: z.string().min(1, 'Please select a course'),
});

type OfferingFormValues = z.infer<typeof offeringSchema>;

export default function CourseOfferingsPage() {
  const [offerings, setOfferings] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [cohorts, setCohorts] = useState<any[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OfferingFormValues>({
    resolver: zodResolver(offeringSchema),
  });

  // 2. Fetch all dropdown data + existing offerings using Axios
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Promise.all lets us fetch all four datasets at the exact same time!
        const [termData, courseData, cohortData, offeringData] = await Promise.all([
          api.getTerms().catch(() => []),
          api.getCourses().catch(() => []),
          api.getCohorts().catch(() => []),
          api.getOfferings().catch(() => []),
        ]);

        setTerms(termData);
        setCourses(courseData);
        setCohorts(cohortData);
        setOfferings(offeringData);
      } catch (error) {
        console.error('Failed to fetch data', error);
      }
    };
    fetchData();
  }, [refreshTrigger]);

  // 3. Handle Form Submission
  const onSubmit = async (data: OfferingFormValues) => {
    setIsSubmitting(true);
    try {
      await api.createOffering(data); // <-- Clean POST request

      alert('Course Assigned! Schedulable class blocks have been successfully generated.');
      reset();
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error(error);
      alert('Failed to assign course. Is the backend running?');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Assign Courses to Cohorts</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: THE FORM */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">New Assignment</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Term</label>
                <select 
                  {...register('termId')} 
                  className="w-full rounded-lg border-gray-300 shadow-sm p-2.5 border bg-white focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Select Term --</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {errors.termId && <p className="text-red-500 text-xs mt-1">{errors.termId.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Cohort</label>
                <select 
                  {...register('cohortId')} 
                  className="w-full rounded-lg border-gray-300 shadow-sm p-2.5 border bg-white focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Select Group --</option>
                  {cohorts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.headcount} students)</option>)}
                </select>
                {errors.cohortId && <p className="text-red-500 text-xs mt-1">{errors.cohortId.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select 
                  {...register('courseId')} 
                  className="w-full rounded-lg border-gray-300 shadow-sm p-2.5 border bg-white focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Select Course --</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.code}: {c.title}</option>)}
                </select>
                {errors.courseId && <p className="text-red-500 text-xs mt-1">{errors.courseId.message}</p>}
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full py-2.5 px-4 mt-6 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Generating Blocks...' : 'Assign & Generate Blocks'}
              </button>
            </form>
          </div>

          {/* RIGHT COLUMN: THE DATA TABLE */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-semibold text-gray-800">Generated Offerings & Pending Classes</h2>
            </div>
            
            <div className="p-6 space-y-4 max-h-[700px] overflow-y-auto">
              {offerings.length === 0 ? (
                <p className="text-gray-500 text-center">No assignments yet. Link a course to a cohort above.</p>
              ) : (
                offerings.map((offering) => (
                  <div key={offering.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-start mb-3 border-b pb-2">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{offering.course.code} - {offering.course.title}</h3>
                        <p className="text-sm font-medium text-blue-600">
                          {offering.cohort.name} <span className="text-gray-400 font-normal">({offering.cohort.headcount} students)</span>
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
                            <span className="ml-2 text-orange-600/70">({cls.requiresRoomType})</span>
                          </div>
                        ))}
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