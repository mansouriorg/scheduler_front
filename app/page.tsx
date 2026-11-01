'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { StatusBlock } from '@/components/status-message';
import { getErrorMessage } from '@/lib/api-error';
import { countClassesForCohort, roomLabel, teacherLabel } from '@/lib/timetable';
import { ConfirmDialog } from '@/components/confirm-dialog';

export default function Home() {
  const [isGenerating, setIsGenerating] = useState(false);
  // The "Clear the timetable?" window, and whether the clearing is running.
  const [confirmClear, setConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // NEW: State for our Cohort Filter
  const [availableCohorts, setAvailableCohorts] = useState<string[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<string>('All');

  const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  const fetchSchedule = async () => {
    setIsLoadingSchedule(true);
    try {
      // The offerings with their classes, and the teachers to name them.
      const [offerings, teachers] = await Promise.all([api.getOfferings(), api.getTeachers()]);
      
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
              room: roomLabel(cls.room), // for example Lab 304, Science Hub (SCI) - Level 3
              teacher: teacherLabel(cls.assignedProfessorId, teachers),
            });
          }
        });
      });

      // Sort by start time
      scheduledClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));
      setSchedule(scheduledClasses);
      setLoadError(null);

      // NEW: Extract all unique cohorts so we can populate the dropdown automatically
      const uniqueCohorts = Array.from(new Set(scheduledClasses.map(c => c.cohortName))).sort();
      setAvailableCohorts(uniqueCohorts as string[]);
      
    } catch (error) {
      console.error('Failed to fetch schedule:', error);
      setLoadError(getErrorMessage(error));
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
    } catch (error) {
      console.error(error);
      setMessage({ text: `Could not generate the timetable. ${getErrorMessage(error)}`, type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Runs when "Clear timetable" is confirmed in the window: every class loses its
  // room, day and time, so the next Generate places all of them again.
  const handleClear = async () => {
    setIsClearing(true);
    try {
      const res = await api.clearTimetable();
      setMessage({ text: res.message, type: 'success' });
      setSelectedCohort('All');
      await fetchSchedule();
    } catch (error) {
      console.error(error);
      setMessage({ text: `Could not clear the timetable. ${getErrorMessage(error)}`, type: 'error' });
    } finally {
      setIsClearing(false);
      setConfirmClear(false);
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

  // Number of class blocks shown with the current cohort filter, on all days.
  const visibleCount = countClassesForCohort(schedule, selectedCohort);

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans text-gray-900 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER & CONTROLS */}
        <header className="mb-8 flex flex-col justify-between gap-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8 lg:flex-row lg:items-center">
          <div>
            <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
              University Command Center
            </h1>
            <p className="text-gray-500">
              {isLoadingSchedule
                ? 'Loading the timetable...'
                : loadError
                  ? 'The timetable could not be loaded.'
                  : schedule.length > 0
                    ? `Viewing ${visibleCount} scheduled class blocks.`
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

            {schedule.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                disabled={isGenerating || isClearing}
                className="whitespace-nowrap rounded-xl border border-gray-300 bg-white px-5 py-3 font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear timetable
              </button>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || isClearing}
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

        <ConfirmDialog
          open={confirmClear}
          title="Clear the timetable?"
          message={`${
            schedule.length === 1
              ? 'The scheduled class loses its room, day and time.'
              : `All ${schedule.length} scheduled classes lose their room, day and time.`
          } The classes themselves, the course offerings and everything else stay, and Generate places the classes again.`}
          confirmLabel={isClearing ? 'Clearing...' : 'Clear timetable'}
          busy={isClearing}
          onConfirm={handleClear}
          onCancel={() => setConfirmClear(false)}
        />

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
          <div className="flex h-64 items-center justify-center rounded-2xl border border-gray-100 bg-white">
            <StatusBlock message="Loading the timetable..." />
          </div>
        ) : loadError ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-red-200 bg-white">
            <StatusBlock
              tone="error"
              message={`Could not load the timetable. ${loadError}`}
              onRetry={fetchSchedule}
            />
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
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-100 py-4 text-center text-sm text-gray-600">
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
                          📍 {cls.room}
                        </div>
                        <div className="mt-2 text-xs font-medium text-gray-700">
                          <span className="text-gray-500">Teacher:</span> {cls.teacher}
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