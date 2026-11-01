'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { StatusBlock } from '@/components/status-message';
import { getErrorMessage } from '@/lib/api-error';
import {
  ALL_CLASSES,
  countClassesInView,
  defaultTermId,
  inView,
  localDay,
  roomLabel,
  teacherLabel,
  termLabel,
  unplacedClasses,
  unplacedLabel,
  unplacedSummary,
  viewChoices,
  type OfferingRow,
  type TermChoice,
  type TimetableClass,
  type UnplacedClass,
} from '@/lib/timetable';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { generateNotice } from '@/lib/generate-result';

export default function Home() {
  const [isGenerating, setIsGenerating] = useState(false);
  // The "Clear the timetable?" window, and whether the clearing is running.
  const [confirmClear, setConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  // The feedback above the timetable; notes are shown as a list under the text.
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info'; notes?: string[] } | null>(null);
  const [schedule, setSchedule] = useState<TimetableClass[]>([]);
  // The classes that are not in the timetable yet (of every term).
  const [unplaced, setUnplaced] = useState<UnplacedClass[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // The term whose timetable is shown, generated and cleared, and the View list:
  // every class, or the week of one cohort, teacher or room (see lib/timetable.ts).
  const [terms, setTerms] = useState<TermChoice[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [selectedView, setSelectedView] = useState<string>(ALL_CLASSES);

  const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  const fetchSchedule = async () => {
    setIsLoadingSchedule(true);
    try {
      // The offerings with their classes, the teachers to name them, and the terms.
      const [offerings, teachers, termList] = await Promise.all([
        api.getOfferings(),
        api.getTeachers(),
        api.getTerms(),
      ]);
      
      const scheduledClasses: TimetableClass[] = [];
      
      offerings.forEach((offering: OfferingRow) => {
        offering.classes?.forEach((cls) => {
          if (cls.startTime && cls.dayOfWeek) {
            scheduledClasses.push({
              id: cls.id,
              termId: offering.termId,
              courseCode: offering.course.code,
              courseTitle: offering.course.title,
              cohortName: offering.cohort.name, // We use this for filtering!
              type: cls.type,
              dayOfWeek: cls.dayOfWeek,
              startTime: cls.startTime,
              endTime: cls.endTime,
              room: roomLabel(cls.room), // for example Lab 304, Science Hub (SCI) - Level 3
              teacher: teacherLabel(cls.assignedProfessorId, teachers),
              roomId: cls.assignedRoomId ?? null,
              teacherId: cls.assignedProfessorId,
            });
          }
        });
      });

      // Sort by start time
      scheduledClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));
      setSchedule(scheduledClasses);
      setUnplaced(unplacedClasses(offerings, teachers));
      setLoadError(null);

      // Keep the chosen term while it exists; otherwise start with the term
      // going on today, the next one, or the latest one.
      setTerms(termList);
      setSelectedTermId((current) =>
        termList.some((term: TermChoice) => term.id === current) ? current : defaultTermId(termList, localDay(new Date())),
      );
      
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
      const notice = generateNotice(await api.generateSchedule(selectedTermId));
      setMessage({ text: notice.text, notes: notice.notes, type: 'success' });
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
      const res = await api.clearTimetable(selectedTermId);
      setMessage({ text: res.message, type: 'success' });
      setSelectedView(ALL_CLASSES);
      await fetchSchedule();
    } catch (error) {
      console.error(error);
      setMessage({ text: `Could not clear the timetable. ${getErrorMessage(error)}`, type: 'error' });
    } finally {
      setIsClearing(false);
      setConfirmClear(false);
    }
  };

  // Another term: its own timetable, all its classes.
  const chooseTerm = (termId: string) => {
    setSelectedTermId(termId);
    setSelectedView(ALL_CLASSES);
    setMessage(null);
  };

  // The classes of the chosen term: the page shows, counts and clears only these.
  const termSchedule = schedule.filter((cls) => cls.termId === selectedTermId);
  const termName = terms.find((term) => term.id === selectedTermId)?.name ?? 'this term';
  // The cohorts, teachers and rooms of that timetable, for the View list. A view
  // that is not in the list any more (after Generate, for example) shows every class.
  const choices = viewChoices(termSchedule);
  const shown = [...choices.cohorts, ...choices.teachers, ...choices.rooms].find((choice) => choice.value === selectedView);
  const view = shown ? shown.value : ALL_CLASSES;

  // The classes of a day in the chosen view.
  const getClassesForDay = (day: string) => termSchedule.filter((cls) => cls.dayOfWeek === day && inView(cls, view));

  // Number of class blocks shown in the chosen view, on all days.
  const visibleCount = countClassesInView(termSchedule, view);

  // The classes of the chosen term, in the chosen view, that Generate still has to place.
  const termUnplaced = unplaced.filter((cls) => cls.termId === selectedTermId && inView(cls, view));

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans text-gray-900 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER & CONTROLS */}
        <header className="mb-8 flex flex-col gap-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
          <div>
            <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
              University Command Center
            </h1>
            <p className="text-gray-500">
              {isLoadingSchedule
                ? 'Loading the timetable...'
                : loadError
                  ? 'The timetable could not be loaded.'
                  : terms.length === 0
                    ? 'There is no term yet. Add one on the Academic Terms page first.'
                    : termSchedule.length > 0
                    ? `Viewing ${visibleCount} scheduled class ${visibleCount === 1 ? 'block' : 'blocks'}${shown ? ` of ${shown.label}` : ''}.`
                    : 'No classes scheduled yet. Click generate to start the AI engine.'}
            </p>
          </div>

          {/* The controls wrap onto more lines when they do not fit side by side. */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:flex-wrap">
            
            {terms.length > 0 && (
              <div className="flex max-w-full items-center gap-2 whitespace-nowrap rounded-xl border border-gray-200 bg-gray-50 p-2">
                <label htmlFor="timetable-term" className="text-sm font-bold text-gray-500 pl-2">
                  Term:
                </label>
                <select
                  id="timetable-term"
                  value={selectedTermId}
                  onChange={(e) => chooseTerm(e.target.value)}
                  className="min-w-0 cursor-pointer rounded-lg border-none bg-white py-2 pr-8 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {terms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {termLabel(term)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* The View list: every class, or the week of one cohort, teacher or room. */}
            {termSchedule.length > 0 && (
              <div className="flex max-w-full items-center gap-2 whitespace-nowrap rounded-xl border border-gray-200 bg-gray-50 p-2">
                <span className="text-sm font-bold text-gray-500 pl-2">👥 View:</span>
                <select
                  id="timetable-view"
                  aria-label="View"
                  value={view}
                  onChange={(e) => setSelectedView(e.target.value)}
                  className="min-w-0 cursor-pointer rounded-lg border-none bg-white py-2 pr-8 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={ALL_CLASSES}>All classes (master view)</option>
                  <optgroup label="Cohorts">
                    {choices.cohorts.map((choice) => (
                      <option key={choice.value} value={choice.value}>{choice.label}</option>
                    ))}
                  </optgroup>
                  {choices.teachers.length > 0 && (
                    <optgroup label="Teachers">
                      {choices.teachers.map((choice) => (
                        <option key={choice.value} value={choice.value}>{choice.label}</option>
                      ))}
                    </optgroup>
                  )}
                  {choices.rooms.length > 0 && (
                    <optgroup label="Rooms">
                      {choices.rooms.map((choice) => (
                        <option key={choice.value} value={choice.value}>{choice.label}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            )}

            {/* The two buttons stay together. */}
            <div className="flex flex-wrap items-center justify-center gap-4">
            {termSchedule.length > 0 && (
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
              disabled={isGenerating || isClearing || selectedTermId === ''}
              className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all whitespace-nowrap ${
                isGenerating 
                  ? 'bg-indigo-400 cursor-not-allowed animate-pulse' 
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 hover:-translate-y-0.5'
              }`}
            >
              {isGenerating ? '🧠 Calculating...' : '✨ Auto-Generate'}
            </button>
            </div>
          </div>
        </header>

        <ConfirmDialog
          open={confirmClear}
          title={`Clear the timetable of ${termName}?`}
          message={`${
            termSchedule.length === 1
              ? `The scheduled class of ${termName} loses its room, day and time.`
              : `All ${termSchedule.length} scheduled classes of ${termName} lose their room, day and time.`
          } Other terms, the classes themselves, the course offerings and everything else stay, and Generate places the classes again.`}
          confirmLabel={isClearing ? 'Clearing...' : 'Clear timetable'}
          busy={isClearing}
          onConfirm={handleClear}
          onCancel={() => setConfirmClear(false)}
        />

        {/* FEEDBACK MESSAGE */}
        {message && (
          <div role={message.type === 'error' ? 'alert' : 'status'} className={`mb-6 text-sm font-medium px-4 py-3 rounded-xl border ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 
            message.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 
            'bg-blue-50 text-blue-700 border-blue-200'
          }`}>
            {message.text}
            {message.notes && message.notes.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 font-normal">
                {message.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* The classes not in the timetable yet: open the list to see them. */}
        {isLoadingSchedule === false && loadError === null && termUnplaced.length > 0 && (
          <details className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <summary className="cursor-pointer font-semibold">
              {unplacedSummary(termUnplaced.length, shown ? shown.label : termName)}
            </summary>
            <p className="mt-2">Auto-Generate places them around the classes already in the timetable.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {termUnplaced.map((cls) => (
                <li key={cls.id}>{unplacedLabel(cls)}</li>
              ))}
            </ul>
          </details>
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
        ) : termSchedule.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-500">
            <span className="text-4xl mb-4">📅</span>
            <p>Nothing of {termName} is in the timetable yet.</p>
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
                        
                        {/* The cohort, unless the view shows only that cohort's classes. */}
                        {view.startsWith('cohort:') === false && (
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