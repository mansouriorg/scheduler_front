'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

export default function LocationsPage() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Form Hooks for Campus
  const { register: regCampus, handleSubmit: subCampus, reset: resetCampus, formState: { errors: errCampus, isSubmitting: isSubmittingCampus } } = useForm<z.infer<typeof campusSchema>>({ resolver: zodResolver(campusSchema) });
  
  // Form Hooks for Building
  const { register: regBuilding, handleSubmit: subBuilding, reset: resetBuilding, formState: { errors: errBuilding, isSubmitting: isSubmittingBuilding } } = useForm<z.infer<typeof buildingSchema>>({ resolver: zodResolver(buildingSchema) });
  
  // Form Hooks for Floor
  const { register: regFloor, handleSubmit: subFloor, reset: resetFloor, formState: { errors: errFloor, isSubmitting: isSubmittingFloor } } = useForm<z.infer<typeof floorSchema>>({ resolver: zodResolver(floorSchema) });

  // 2. Fetch All Location Data using Axios
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        // Use Promise.all with our clean API methods, and catch errors individually
        // so if one fails, the others still load.
        const [campusData, buildingData, floorData] = await Promise.all([
          api.getCampuses().catch(() => []),
          api.getBuildings().catch(() => []),
          api.getFloors().catch(() => []),
        ]);

        setCampuses(campusData);
        setBuildings(buildingData);
        setFloors(floorData);
      } catch (error) {
        console.error('Failed to fetch location data', error);
      }
    };
    fetchLocations();
  }, [refreshTrigger]);

  // 3. Dynamic Submit Handler
  // We use the string literal type to ensure we only call valid API endpoints
  const onSubmit = async (endpoint: 'Campus' | 'Building' | 'Floor', data: any, resetFunc: () => void) => {
    try {
      // Dynamically call the correct api method based on the string passed
      if (endpoint === 'Campus') await api.createCampus(data);
      if (endpoint === 'Building') await api.createBuilding(data);
      if (endpoint === 'Floor') await api.createFloor(data);

      resetFunc(); // Clear the specific form
      setRefreshTrigger((prev) => prev + 1); // Refresh all data tables and dropdowns
    } catch (error) {
      console.error(error);
      alert(`Network error. Is your NestJS backend running?`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Location & Facility Management</h1>

        {/* FORMS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          
          {/* Form 1: Add Campus */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">1. Add Campus</h2>
            <form onSubmit={subCampus((data) => onSubmit('Campus', data, resetCampus))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campus Name</label>
                <input {...regCampus('name')} className="w-full rounded-lg border-gray-300 shadow-sm p-2 border" placeholder="e.g. North Campus" />
                {errCampus.name && <p className="text-red-500 text-xs mt-1">{errCampus.name.message}</p>}
              </div>
              <button type="submit" disabled={isSubmittingCampus} className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">Save Campus</button>
            </form>
          </div>

          {/* Form 2: Add Building */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">2. Add Building</h2>
            <form onSubmit={subBuilding((data) => onSubmit('Building', data, resetBuilding))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Campus</label>
                <select {...regBuilding('campusId')} className="w-full rounded-lg border-gray-300 shadow-sm p-2 border bg-white">
                  <option value="">-- Choose a Campus --</option>
                  {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errBuilding.campusId && <p className="text-red-500 text-xs mt-1">{errBuilding.campusId.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Building Name</label>
                  <input {...regBuilding('name')} className="w-full rounded-lg border-gray-300 shadow-sm p-2 border" placeholder="e.g. Science Hub" />
                  {errBuilding.name && <p className="text-red-500 text-xs mt-1">{errBuilding.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Short Code</label>
                  <input {...regBuilding('code')} className="w-full rounded-lg border-gray-300 shadow-sm p-2 border" placeholder="e.g. SCI" />
                  {errBuilding.code && <p className="text-red-500 text-xs mt-1">{errBuilding.code.message}</p>}
                </div>
              </div>
              <button type="submit" disabled={isSubmittingBuilding || campuses.length === 0} className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition disabled:opacity-50">Save Building</button>
            </form>
          </div>

          {/* Form 3: Add Floor */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">3. Add Floor</h2>
            <form onSubmit={subFloor((data) => onSubmit('Floor', data, resetFloor))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Building</label>
                <select {...regFloor('buildingId')} className="w-full rounded-lg border-gray-300 shadow-sm p-2 border bg-white">
                  <option value="">-- Choose a Building --</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
                </select>
                {errFloor.buildingId && <p className="text-red-500 text-xs mt-1">{errFloor.buildingId.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Floor Level</label>
                <input {...regFloor('level')} className="w-full rounded-lg border-gray-300 shadow-sm p-2 border" placeholder="e.g. Ground, 1, 2, Basement" />
                {errFloor.level && <p className="text-red-500 text-xs mt-1">{errFloor.level.message}</p>}
              </div>
              <button type="submit" disabled={isSubmittingFloor || buildings.length === 0} className="w-full py-2 px-4 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50">Save Floor</button>
            </form>
          </div>

        </div>

        {/* DATA DISPLAY AREA */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xl font-semibold text-gray-800">Current Infrastructure Tree</h2>
          </div>
          <div className="p-6">
            {campuses.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No locations defined yet. Start by adding a Campus above!</p>
            ) : (
              <div className="space-y-6">
                {campuses.map(campus => (
                  <div key={campus.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h3 className="font-bold text-lg text-blue-800 mb-2">🏛 {campus.name}</h3>
                    <div className="pl-6 space-y-4">
                      {buildings.filter(b => b.campusId === campus.id).map(building => (
                        <div key={building.id} className="p-3 bg-white border border-gray-200 rounded-md shadow-sm">
                          <h4 className="font-semibold text-gray-800 text-md">🏢 {building.name} <span className="text-xs text-gray-500 font-normal">({building.code})</span></h4>
                          <div className="mt-2 pl-6 flex flex-wrap gap-2">
                            {floors.filter(f => f.buildingId === building.id).map(floor => (
                              <span key={floor.id} className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-bold rounded border border-teal-100">
                                Level: {floor.level}
                              </span>
                            ))}
                            {floors.filter(f => f.buildingId === building.id).length === 0 && (
                              <span className="text-xs text-gray-400 italic">No floors added yet</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {buildings.filter(b => b.campusId === campus.id).length === 0 && (
                        <span className="text-sm text-gray-400 italic">No buildings added to this campus yet.</span>
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