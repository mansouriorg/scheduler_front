'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Notice, type NoticeMessage } from '@/components/notice';
import { StatusRow } from '@/components/status-message';
import { getErrorMessage } from '@/lib/api-error';
import { api } from '@/lib/api'; // <-- 1. Import the API client

// 1. Zod Validation Schema with Date Logic
const termSchema = z.object({
  name: z.string().min(2, 'Term name is required (e.g., Fall 2026)'),
  type: z.enum(['SEMESTER_1', 'SEMESTER_2', 'SUMMER']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
}).refine((data) => {
  // Ensure the end date comes AFTER the start date
  return new Date(data.endDate) > new Date(data.startDate);
}, {
  message: "The End Date must be after the Start Date.",
  path: ["endDate"], // Attaches the error specifically to the endDate field
});

type TermFormValues = z.infer<typeof termSchema>;
type Term = TermFormValues & { id: string };

export default function TermsPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TermFormValues>({
    resolver: zodResolver(termSchema),
    defaultValues: {
      type: 'SEMESTER_1',
    },
  });

  // 2. Fetch Terms from Backend using Axios API
  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const data = await api.getTerms(); // <-- Clean API call
        // Sort terms by start date so the newest is at the top
        const sorted = data.sort((a: Term, b: Term) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        setTerms(sorted);
        setLoadError(null);
      } catch (error) {
        console.error('Failed to fetch terms', error);
        setLoadError(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };
    fetchTerms();
  }, [refreshTrigger]);

  const retryLoad = () => {
    setIsLoading(true);
    setLoadError(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  // 3. Handle Form Submission using Axios API
  const onSubmit = async (data: TermFormValues) => {
    setIsSubmitting(true);
    setNotice(null);
    try {
      // Prisma requires standard ISO DateTime strings, so we convert them before sending
      const payload = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      };

      await api.createTerm(payload); // <-- Clean POST request

      setNotice({ type: 'success', text: 'Term saved.' });
      reset();
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', text: `Could not save the term. ${getErrorMessage(error)}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to format dates nicely in the table
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="mb-6 text-2xl font-bold text-gray-900 sm:mb-8 sm:text-3xl">Academic Terms</h1>
        <Notice message={notice} onDismiss={setNotice} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: THE FORM */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Add New Semester</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              
              <div>
                <label htmlFor="term-name" className="block text-sm font-medium text-gray-700 mb-1">Term Name</label>
                <input
                  {...register('name')}
                  id="term-name"
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? 'term-name-error' : undefined}
                  className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm"
                  placeholder="e.g. Academic Year 26/27 - Fall"
                />
                {errors.name && <p id="term-name-error" className="mt-1 text-xs font-medium text-red-700">{errors.name.message}</p>}
              </div>

              <div>
                <label htmlFor="term-type" className="block text-sm font-medium text-gray-700 mb-1">Term Type</label>
                <select
                  {...register('type')}
                  id="term-type"
                  className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm"
                >
                  <option value="SEMESTER_1">Semester 1 (Fall)</option>
                  <option value="SEMESTER_2">Semester 2 (Spring)</option>
                  <option value="SUMMER">Summer Term</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="term-start-date" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    {...register('startDate')}
                    id="term-start-date"
                    aria-invalid={errors.startDate ? true : undefined}
                    aria-describedby={errors.startDate ? 'term-start-date-error' : undefined}
                    className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm"
                  />
                  {errors.startDate && <p id="term-start-date-error" className="mt-1 text-xs font-medium text-red-700">{errors.startDate.message}</p>}
                </div>

                <div>
                  <label htmlFor="term-end-date" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    {...register('endDate')}
                    id="term-end-date"
                    aria-invalid={errors.endDate ? true : undefined}
                    aria-describedby={errors.endDate ? 'term-end-date-error' : undefined}
                    className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm"
                  />
                  {errors.endDate && <p id="term-end-date-error" className="mt-1 text-xs font-medium text-red-700">{errors.endDate.message}</p>}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Term'}
              </button>
            </form>
          </div>

          {/* RIGHT COLUMN: THE DATA TABLE */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-semibold text-gray-800">Term Schedule</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                    <th className="p-4 font-medium">Term Name</th>
                    <th className="p-4 font-medium">Type</th>
                    <th className="p-4 font-medium">Start Date</th>
                    <th className="p-4 font-medium">End Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {isLoading ? (
                    <StatusRow colSpan={4} message="Loading terms..." />
                  ) : loadError ? (
                    <StatusRow
                      colSpan={4}
                      tone="error"
                      message={`Could not load the terms. ${loadError}`}
                      onRetry={retryLoad}
                    />
                  ) : terms.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        No terms found. Create a semester to begin scheduling.
                      </td>
                    </tr>
                  ) : (
                    terms.map((term) => (
                      <tr key={term.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-bold text-gray-900">{term.name}</td>
                        <td className="p-4 text-gray-600">
                           <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700">
                             {term.type.replace('_', ' ')}
                           </span>
                        </td>
                        <td className="p-4 text-gray-600">{formatDate(term.startDate)}</td>
                        <td className="p-4 text-gray-600">{formatDate(term.endDate)}</td>
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