'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function Home() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
  
  // NEW: State for our Cohort Filter
  const [availableCohorts, setAvailableCohorts] = useState<string[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<string>('All');

  const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  const fetchSchedule = async () => {
    setIsLoadingSchedule(true);
    try {
      const offerings = await api.getOfferings();
      
      const scheduledClasses: any[] = [];
      
      offerings.forEach((offering: any) => {
        offering.classes?.forEach((cls: any) => {
          if (cls.startTime && cls.dayOfWeek) {
            scheduledClasses.push({
              id: cls.id,
              courseCode: offering.course.code,
              courseTitle: offering.course.title,
              cohortName: offering.cohort.name, // We use this for filtering!
              type: cls.type,
              dayOfWeek: cls.dayOfWeek,
              startTime: cls.startTime,
              endTime: cls.endTime,
              roomId: cls.assignedRoomId,
            });
          }
        });
      });

      // Sort by start time
      scheduledClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));
      setSchedule(scheduledClasses);

      // NEW: Extract all unique cohorts so we can populate the dropdown automatically
      const uniqueCohorts = Array.from(new Set(scheduledClasses.map(c => c.cohortName))).sort();
      setAvailableCohorts(uniqueCohorts as string[]);
      
    } catch (error) {
      console.error('Failed to fetch schedule:', error);
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setMessage({ text: '🧠 Python Brain is crunching millions of possibilities...', type: 'info' });
    
    try {
      const res = await api.generateSchedule();
      setMessage({ text: res.message || '✨ Schedule successfully generated!', type: 'success' });
      await fetchSchedule();
    } catch (error: any) {
      console.error(error);
      setMessage({ 
        text: error.response?.data?.message || 'Failed to generate schedule. Check if Python backend is running!', 
        type: 'error' 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // UPDATED: Now filters by the selected cohort!
  const getClassesForDay = (day: string) => {
    return schedule.filter((cls) => {
      const matchesDay = cls.dayOfWeek === day;
      const matchesCohort = selectedCohort === 'All' || cls.cohortName === selectedCohort;
      return matchesDay && matchesCohort;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER & CONTROLS */}
        <header className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
              University Command Center
            </h1>
            <p className="text-gray-500">
              {schedule.length > 0 
                ? `Viewing ${selectedCohort === 'All' ? schedule.length : getClassesForDay(DAYS[0]).length /* approximation */} scheduled class blocks.`
                : 'No classes scheduled yet. Click generate to start the AI engine.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            
            {/* NEW: Cohort Filter Dropdown */}
            {availableCohorts.length > 0 && (
              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                <span className="text-sm font-bold text-gray-500 pl-2">👥 View:</span>
                <select 
                  value={selectedCohort} 
                  onChange={(e) => setSelectedCohort(e.target.value)}
                  className="bg-white border-none text-sm font-semibold rounded-lg py-2 pr-8 focus:ring-2 focus:ring-indigo-500 cursor-pointer outline-none"
                >
                  <option value="All">All University Cohorts (Master View)</option>
                  <optgroup label="Specific Student Groups">
                    {availableCohorts.map(cohort => (
                      <option key={cohort} value={cohort}>{cohort}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all whitespace-nowrap ${
                isGenerating 
                  ? 'bg-indigo-400 cursor-not-allowed animate-pulse' 
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 hover:-translate-y-0.5'
              }`}
            >
              {isGenerating ? '🧠 Calculating...' : '✨ Auto-Generate'}
            </button>
          </div>
        </header>

        {/* FEEDBACK MESSAGE */}
        {message && (
          <div className={`mb-6 text-sm font-medium px-4 py-3 rounded-xl border ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 
            message.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 
            'bg-blue-50 text-blue-700 border-blue-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* THE SCHEDULE GRID */}
        {isLoadingSchedule ? (
          <div className="flex justify-center items-center h-64 text-gray-400 font-medium">
            Loading master schedule...
          </div>
        ) : schedule.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-500">
            <span className="text-4xl mb-4">📅</span>
            <p>The schedule is currently empty.</p>
            <p className="text-sm mt-1">Click the Auto-Generate button above to let the AI do the work.</p>
          </div>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-8 snap-x">
            {DAYS.map((day) => (
              <div key={day} className="min-w-[320px] flex-1 snap-start">
                <div className="bg-gray-800 text-white font-bold py-3 px-4 rounded-t-xl text-center tracking-widest text-sm mb-2 shadow-sm">
                  {day}
                </div>
                
                <div className="flex flex-col gap-3 h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                  {getClassesForDay(day).length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-4 bg-gray-100 rounded-lg border border-dashed border-gray-200">
                      No classes
                    </div>
                  ) : (
                    getClassesForDay(day).map((cls, idx) => (
                      <div 
                        key={`${cls.id}-${idx}`} 
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-indigo-300 transition-colors border-l-4 border-l-indigo-500"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="bg-indigo-50 text-indigo-700 text-xs font-black px-2 py-1 rounded">
                            {cls.startTime} - {cls.endTime}
                          </span>
                          <span className="bg-orange-50 text-orange-700 text-xs font-bold px-2 py-1 rounded uppercase">
                            {cls.type}
                          </span>
                        </div>
                        
                        <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1">
                          {cls.courseCode}: {cls.courseTitle}
                        </h3>
                        
                        {/* Highlight the cohort name if we are in Master View, otherwise it's redundant */}
                        {selectedCohort === 'All' && (
                          <div className="text-xs font-medium text-gray-500 mb-2">
                            👥 {cls.cohortName}
                          </div>
                        )}
                        
                        <div className="text-xs font-semibold text-gray-600 bg-gray-50 inline-block px-2 py-1 rounded border border-gray-100 mt-1">
                          📍 Room ID: {cls.roomId.slice(0, 8)}...
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Custom scrollbar styling */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e5e7eb; border-radius: 20px; }
      `}} />
    </div>
  );
}