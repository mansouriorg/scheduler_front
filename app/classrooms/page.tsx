'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api'; 

// 1. Zod Validation Schema (Cleaned up for strict TypeScript matching)
const roomSchema = z.object({
  name: z.string().min(2, 'Room name is required'),
  capacity: z.number().min(1, 'Capacity must be at least 1').max(1000, 'Capacity too high'), // Removed z.coerce
  roomType: z.enum(['AMPHI', 'CLASSROOM', 'COMPUTER_LAB', 'WORKSHOP', 'CHEMISTRY_LAB']),
  equipment: z.array(z.enum(['COMPUTERS', 'MAC_COMPUTERS', 'PROJECTOR', 'CHEMISTRY_HOOD', 'WHITEBOARD', 'SMARTBOARD'])), // Removed .default([])
  floorId: z.string().min(1, 'Floor ID is required for relation'),
});

type RoomFormValues = z.infer<typeof roomSchema>;

// Extend the type for the table data
type Room = RoomFormValues & { id: string };

// Constants for UI mapping
const EQUIPMENT_OPTIONS = [
  { value: 'COMPUTERS', label: 'PC Computers' },
  { value: 'MAC_COMPUTERS', label: 'Mac Computers' },
  { value: 'PROJECTOR', label: 'Projector' },
  { value: 'CHEMISTRY_HOOD', label: 'Chemistry Hood' },
  { value: 'WHITEBOARD', label: 'Whiteboard' },
  { value: 'SMARTBOARD', label: 'Smartboard' },
];

export default function ClassroomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      roomType: 'CLASSROOM',
      equipment: [], // This safely handles the default value instead of Zod
    },
  });

  // 2. Fetch Rooms from Backend using Axios
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await api.getRooms(); 
        setRooms(data);
      } catch (error) {
        console.error('Failed to fetch rooms', error);
      }
    };
    fetchRooms();
  }, [refreshTrigger]);

  // 3. Handle Form Submission using Axios
  const onSubmit = async (data: RoomFormValues) => {
    setIsSubmitting(true);
    try {
      await api.createRoom(data); 

      alert('Room added successfully!');
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Classroom & Lab Management</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: THE FORM */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Add New Space</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Name / Number</label>
                <input
                  {...register('name')}
                  className="w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Amphi A, Lab 304"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              {/* Grid for Capacity and Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    // Added valueAsNumber: true here so RHF passes a pure number to Zod!
                    {...register('capacity', { valueAsNumber: true })}
                    className="w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. 40"
                  />
                  {errors.capacity && <p className="text-red-500 text-xs mt-1">{errors.capacity.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    {...register('roomType')}
                    className="w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="CLASSROOM">Classroom</option>
                    <option value="AMPHI">Amphi</option>
                    <option value="COMPUTER_LAB">Computer Lab</option>
                    <option value="CHEMISTRY_LAB">Chemistry Lab</option>
                    <option value="WORKSHOP">Workshop</option>
                  </select>
                </div>
              </div>

              {/* Floor ID (Temporary manual input) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Floor ID</label>
                <input
                  {...register('floorId')}
                  className="w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  placeholder="Paste a Floor UUID here"
                />
                <p className="text-xs text-gray-500 mt-1">Links this room to a physical building floor.</p>
                {errors.floorId && <p className="text-red-500 text-xs mt-1">{errors.floorId.message}</p>}
              </div>

              {/* Equipment Checkboxes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">Available Equipment</label>
                <div className="grid grid-cols-2 gap-2">
                  {EQUIPMENT_OPTIONS.map((item) => (
                    <label key={item.value} className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        value={item.value}
                        {...register('equipment')}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 mt-6 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Classroom'}
              </button>
            </form>
          </div>

          {/* RIGHT COLUMN: THE DATA TABLE */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-semibold text-gray-800">Available Rooms & Labs</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                    <th className="p-4 font-medium">Name</th>
                    <th className="p-4 font-medium">Type</th>
                    <th className="p-4 font-medium">Capacity</th>
                    <th className="p-4 font-medium">Equipment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {rooms.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        No rooms found. Add one to see them here!
                      </td>
                    </tr>
                  ) : (
                    rooms.map((room) => (
                      <tr key={room.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-medium text-gray-900">{room.name}</td>
                        <td className="p-4 text-gray-600">
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-50 text-purple-700">
                            {room.roomType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600">{room.capacity} seats</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {room.equipment.map((eq) => (
                              <span key={eq} className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">
                                {eq.replace('_', ' ')}
                              </span>
                            ))}
                            {room.equipment.length === 0 && <span className="text-gray-400 italic">None</span>}
                          </div>
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