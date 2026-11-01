'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Notice, type NoticeMessage } from '@/components/notice';
import { StatusBlock } from '@/components/status-message';
import { getErrorMessage } from '@/lib/api-error';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api'; // <-- 1. Import the API client

// 1. Zod Validation Schemas
const campusSchema = z.object({
  name: z.string().min(2, 'Campus name is required'),
});

const buildingSchema = z.object({
  name: z.string().min(2, 'Building name is required'),
  code: z.string().min(1, 'Code is required (e.g., STB)'),
  campusId: z.string().min(1, 'Please select a campus'),
});

const floorSchema = z.object({
  level: z.string().min(1, 'Floor level is required (e.g., 1, Ground)'),
  buildingId: z.string().min(1, 'Please select a building'),
});

// Types
type Campus = z.infer<typeof campusSchema> & { id: string };
type Building = z.infer<typeof buildingSchema> & { id: string };
type Floor = z.infer<typeof floorSchema> & { id: string };

// A campus, building or floor: the one being changed in its form, or the one
// waiting in the "Delete?" window.
type LocationTarget =
  | { kind: 'Campus'; record: Campus }
  | { kind: 'Building'; record: Building }
  | { kind: 'Floor'; record: Floor };
type LocationKind = LocationTarget['kind'];

export default function LocationsPage() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);
  const [editing, setEditing] = useState<LocationTarget | null>(null);
  const [toDelete, setToDelete] = useState<LocationTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Hooks for Campus
  const { register: regCampus, handleSubmit: subCampus, reset: resetCampus, setFocus: focusCampus, formState: { errors: errCampus, isSubmitting: isSubmittingCampus } } = useForm<z.infer<typeof campusSchema>>({ resolver: zodResolver(campusSchema) });
  
  // Form Hooks for Building
  const { register: regBuilding, handleSubmit: subBuilding, reset: resetBuilding, setFocus: focusBuilding, formState: { errors: errBuilding, isSubmitting: isSubmittingBuilding } } = useForm<z.infer<typeof buildingSchema>>({ resolver: zodResolver(buildingSchema) });
  
  // Form Hooks for Floor
  const { register: regFloor, handleSubmit: subFloor, reset: resetFloor, setFocus: focusFloor, formState: { errors: errFloor, isSubmitting: isSubmittingFloor } } = useForm<z.infer<typeof floorSchema>>({ resolver: zodResolver(floorSchema) });

  // 2. Fetch All Location Data using Axios
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        // Load the three lists together. If one request fails, the page says so
        // instead of showing empty lists.
        const [campusData, buildingData, floorData] = await Promise.all([
          api.getCampuses(),
          api.getBuildings(),
          api.getFloors(),
        ]);

        setCampuses(campusData);
        setBuildings(buildingData);
        setFloors(floorData);
        setLoadError(null);
      } catch (error) {
        console.error('Failed to fetch location data', error);
        setLoadError(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };
    fetchLocations();
  }, [refreshTrigger]);

  const retryLoad = () => {
    setIsLoading(true);
    setLoadError(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  // 3. Dynamic Submit Handler
  // We use the string literal type to ensure we only call valid API endpoints
  const onSubmit = async (endpoint: 'Campus' | 'Building' | 'Floor', data: Record<string, string>, resetFunc: () => void) => {
    setNotice(null);
    try {
      if (editing?.kind === endpoint) {
        // Saves the changes to the campus, building or floor shown in the form.
        const name = nameOf(editing);
        if (endpoint === 'Campus') await api.updateCampus(editing.record.id, data);
        if (endpoint === 'Building') await api.updateBuilding(editing.record.id, data);
        if (endpoint === 'Floor') await api.updateFloor(editing.record.id, data);
        setEditing(null);
        resetFunc(); // Clear the specific form
        setNotice({ type: 'success', text: `${name} was updated.` });
      } else {
        // Dynamically call the correct api method based on the string passed
        if (endpoint === 'Campus') await api.createCampus(data);
        if (endpoint === 'Building') await api.createBuilding(data);
        if (endpoint === 'Floor') await api.createFloor(data);
        resetFunc(); // Clear the specific form
        setNotice({ type: 'success', text: `${endpoint} saved.` });
      }
      setRefreshTrigger((prev) => prev + 1); // Refresh all data tables and dropdowns
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', text: `Could not save the ${endpoint.toLowerCase()}. ${getErrorMessage(error)}` });
    }
  };

  // "Level 2 of Science Hub": how a floor is named in buttons and messages.
  const floorName = (floor: Floor) =>
    `Level ${floor.level} of ${buildings.find((b) => b.id === floor.buildingId)?.name ?? 'an unknown building'}`;

  const nameOf = (target: LocationTarget) =>
    target.kind === 'Floor' ? floorName(target.record) : target.record.name;

  // Empties one of the three forms.
  const resetForm = (kind: LocationKind) => {
    if (kind === 'Campus') resetCampus();
    if (kind === 'Building') resetBuilding();
    if (kind === 'Floor') resetFloor();
  };

  // Puts a campus, building or floor from the tree into its form, to change it.
  // Its campus or building can be changed there too, which moves it.
  const startEdit = (target: LocationTarget) => {
    if (editing && editing.kind !== target.kind) resetForm(editing.kind);
    setEditing(target);
    setNotice(null);
    if (target.kind === 'Campus') {
      // keepDefaultValues: Cancel and Save then empty the form again. reset attaches
      // the fields again on the next render, so the focus waits for that.
      resetCampus({ name: target.record.name }, { keepDefaultValues: true });
      setTimeout(() => focusCampus('name'), 0);
    } else if (target.kind === 'Building') {
      const { name, code, campusId } = target.record;
      resetBuilding({ name, code, campusId }, { keepDefaultValues: true });
      setTimeout(() => focusBuilding('name'), 0);
    } else {
      const { level, buildingId } = target.record;
      resetFloor({ level, buildingId }, { keepDefaultValues: true });
      setTimeout(() => focusFloor('level'), 0);
    }
  };

  const cancelEdit = () => {
    if (editing) resetForm(editing.kind);
    setEditing(null);
  };

  // Runs when "Delete" is confirmed in the window. The server refuses while
  // something is inside; its message (why, and what to do) is shown as it is.
  const confirmDelete = async () => {
    if (toDelete === null) return;
    const name = nameOf(toDelete);
    setIsDeleting(true);
    try {
      if (toDelete.kind === 'Campus') await api.deleteCampus(toDelete.record.id);
      if (toDelete.kind === 'Building') await api.deleteBuilding(toDelete.record.id);
      if (toDelete.kind === 'Floor') await api.deleteFloor(toDelete.record.id);
      setNotice({ type: 'success', text: `${name} was deleted.` });
      if (editing?.record.id === toDelete.record.id) cancelEdit();
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', text: `Could not delete ${name}. ${getErrorMessage(error)}` });
    } finally {
      setIsDeleting(false);
      setToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="mb-6 text-2xl font-bold text-gray-900 sm:mb-8 sm:text-3xl">Location & Facility Management</h1>
        <Notice message={notice} onDismiss={setNotice} />
        <ConfirmDialog
          open={toDelete !== null}
          title={`Delete ${toDelete ? nameOf(toDelete) : 'this place'}?`}
          message="This cannot be undone. A campus with buildings, a building with floors or a floor with rooms cannot be deleted; you will see a message instead."
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
          busy={isDeleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />

        {/* FORMS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          
          {/* Form 1: Add Campus */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">{editing?.kind === 'Campus' ? `Edit ${nameOf(editing)}` : '1. Add Campus'}</h2>
            <form onSubmit={subCampus((data) => onSubmit('Campus', data, resetCampus))} className="space-y-4">
              <div>
                <label htmlFor="campus-name" className="block text-sm font-medium text-gray-700 mb-1">Campus Name</label>
                <input {...regCampus('name')} id="campus-name" aria-invalid={errCampus.name ? true : undefined} aria-describedby={errCampus.name ? 'campus-name-error' : undefined} className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm" placeholder="e.g. North Campus" />
                {errCampus.name && <p id="campus-name-error" className="mt-1 text-xs font-medium text-red-700">{errCampus.name.message}</p>}
              </div>
              <button type="submit" disabled={isSubmittingCampus} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{editing?.kind === 'Campus' ? 'Save Changes' : 'Save Campus'}</button>
              {editing?.kind === 'Campus' && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="w-full rounded-lg border border-gray-500 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </form>
          </div>

          {/* Form 2: Add Building */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">{editing?.kind === 'Building' ? `Edit ${nameOf(editing)}` : '2. Add Building'}</h2>
            <form onSubmit={subBuilding((data) => onSubmit('Building', data, resetBuilding))} className="space-y-4">
              <div>
                <label htmlFor="building-campus-id" className="block text-sm font-medium text-gray-700 mb-1">Select Campus</label>
                <select {...regBuilding('campusId')} id="building-campus-id" aria-invalid={errBuilding.campusId ? true : undefined} aria-describedby={errBuilding.campusId ? 'building-campus-id-error' : undefined} className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm">
                  <option value="">-- Choose a Campus --</option>
                  {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errBuilding.campusId && <p id="building-campus-id-error" className="mt-1 text-xs font-medium text-red-700">{errBuilding.campusId.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="building-name" className="block text-sm font-medium text-gray-700 mb-1">Building Name</label>
                  <input {...regBuilding('name')} id="building-name" aria-invalid={errBuilding.name ? true : undefined} aria-describedby={errBuilding.name ? 'building-name-error' : undefined} className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm" placeholder="e.g. Science Hub" />
                  {errBuilding.name && <p id="building-name-error" className="mt-1 text-xs font-medium text-red-700">{errBuilding.name.message}</p>}
                </div>
                <div>
                  <label htmlFor="building-code" className="block text-sm font-medium text-gray-700 mb-1">Short Code</label>
                  <input {...regBuilding('code')} id="building-code" aria-invalid={errBuilding.code ? true : undefined} aria-describedby={errBuilding.code ? 'building-code-error' : undefined} className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm" placeholder="e.g. SCI" />
                  {errBuilding.code && <p id="building-code-error" className="mt-1 text-xs font-medium text-red-700">{errBuilding.code.message}</p>}
                </div>
              </div>
              <button type="submit" disabled={isSubmittingBuilding || campuses.length === 0} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{editing?.kind === 'Building' ? 'Save Changes' : 'Save Building'}</button>
              {editing?.kind === 'Building' && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="w-full rounded-lg border border-gray-500 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </form>
          </div>

          {/* Form 3: Add Floor */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">{editing?.kind === 'Floor' ? `Edit ${nameOf(editing)}` : '3. Add Floor'}</h2>
            <form onSubmit={subFloor((data) => onSubmit('Floor', data, resetFloor))} className="space-y-4">
              <div>
                <label htmlFor="floor-building-id" className="block text-sm font-medium text-gray-700 mb-1">Select Building</label>
                <select {...regFloor('buildingId')} id="floor-building-id" aria-invalid={errFloor.buildingId ? true : undefined} aria-describedby={errFloor.buildingId ? 'floor-building-id-error' : undefined} className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm">
                  <option value="">-- Choose a Building --</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
                </select>
                {errFloor.buildingId && <p id="floor-building-id-error" className="mt-1 text-xs font-medium text-red-700">{errFloor.buildingId.message}</p>}
              </div>
              <div>
                <label htmlFor="floor-level" className="block text-sm font-medium text-gray-700 mb-1">Floor Level</label>
                <input {...regFloor('level')} id="floor-level" aria-invalid={errFloor.level ? true : undefined} aria-describedby={errFloor.level ? 'floor-level-error' : undefined} className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm" placeholder="e.g. Ground, 1, 2, Basement" />
                {errFloor.level && <p id="floor-level-error" className="mt-1 text-xs font-medium text-red-700">{errFloor.level.message}</p>}
              </div>
              <button type="submit" disabled={isSubmittingFloor || buildings.length === 0} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{editing?.kind === 'Floor' ? 'Save Changes' : 'Save Floor'}</button>
              {editing?.kind === 'Floor' && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="w-full rounded-lg border border-gray-500 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </form>
          </div>

        </div>

        {/* DATA DISPLAY AREA */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xl font-semibold text-gray-800">Current Infrastructure Tree</h2>
          </div>
          <div className="p-6">
            {isLoading ? (
              <StatusBlock message="Loading locations..." />
            ) : loadError ? (
              <StatusBlock
                tone="error"
                message={`Could not load the locations. ${loadError}`}
                onRetry={retryLoad}
              />
            ) : campuses.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No locations defined yet. Start by adding a Campus above!</p>
            ) : (
              <div className="space-y-6">
                {campuses.map(campus => (
                  <div key={campus.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-lg text-blue-800">🏛 {campus.name}</h3>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit({ kind: 'Campus', record: campus })}
                          aria-label={`Edit ${campus.name}`}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setToDelete({ kind: 'Campus', record: campus })}
                          aria-label={`Delete ${campus.name}`}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="pl-6 space-y-4">
                      {buildings.filter(b => b.campusId === campus.id).map(building => (
                        <div key={building.id} className="p-3 bg-white border border-gray-200 rounded-md shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="font-semibold text-gray-800 text-md">🏢 {building.name} <span className="text-xs text-gray-500 font-normal">({building.code})</span></h4>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => startEdit({ kind: 'Building', record: building })}
                                aria-label={`Edit ${building.name}`}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
                              >
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setToDelete({ kind: 'Building', record: building })}
                                aria-label={`Delete ${building.name}`}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                Delete
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 pl-6 flex flex-wrap gap-2">
                            {floors.filter(f => f.buildingId === building.id).map(floor => (
                              <span key={floor.id} className="inline-flex items-center gap-1 rounded border border-teal-100 bg-teal-50 py-0.5 pl-3 pr-1 text-xs font-bold text-teal-700">
                                Level: {floor.level}
                                <button
                                  type="button"
                                  onClick={() => startEdit({ kind: 'Floor', record: floor })}
                                  aria-label={`Edit ${floorName(floor)}`}
                                  title="Edit"
                                  className="rounded p-1.5 text-blue-700 transition-colors hover:bg-white"
                                >
                                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setToDelete({ kind: 'Floor', record: floor })}
                                  aria-label={`Delete ${floorName(floor)}`}
                                  title="Delete"
                                  className="rounded p-1.5 text-red-700 transition-colors hover:bg-white"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              </span>
                            ))}
                            {floors.filter(f => f.buildingId === building.id).length === 0 && (
                              <span className="text-xs text-gray-500 italic">No floors added yet</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {buildings.filter(b => b.campusId === campus.id).length === 0 && (
                        <span className="text-sm text-gray-500 italic">No buildings added to this campus yet.</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}