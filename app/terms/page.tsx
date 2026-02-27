'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
      } catch (error) {
        console.error('Failed to fetch terms', error);
      }
    };
    fetchTerms();
  }, [refreshTrigger]);

  // 3. Handle Form Submission using Axios API
  const onSubmit = async (data: TermFormValues) => {
    setIsSubmitting(true);
    try {
      // Prisma requires standard ISO DateTime strings, so we convert them before sending
      const payload = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      };

      await api.createTerm(payload); // <-- Clean POST request

      alert('Academic Term added successfully!');
      reset();
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      alert('Network error. Is your NestJS backend running?');
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Academic Terms</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: THE FORM */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Add New Semester</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Term Name</label>
                <input
                  {...register('name')}
                  className="w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Academic Year 26/27 - Fall"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Term Type</label>
                <select
                  {...register('type')}
                  className="w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="SEMESTER_1">Semester 1 (Fall)</option>
                  <option value="SEMESTER_2">Semester 2 (Spring)</option>
                  <option value="SUMMER">Summer Term</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    {...register('startDate')}
                    className="w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    {...register('endDate')}
                    className="w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate.message}</p>}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 mt-6 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
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
                  {terms.length === 0 ? (
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