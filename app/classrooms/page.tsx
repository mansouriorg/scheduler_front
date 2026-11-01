'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Notice, type NoticeMessage } from '@/components/notice';
import { StatusRow } from '@/components/status-message';
import { TABLE_CARDS } from '@/lib/table-cards';
import { getErrorMessage } from '@/lib/api-error';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { buildFloorOptions, findFloorLabel, type FloorOption } from '@/lib/floor-options';
import { api } from '@/lib/api'; 

// 1. Zod Validation Schema (Cleaned up for strict TypeScript matching)
const roomSchema = z.object({
  name: z.string().min(2, 'Room name is required'),
  capacity: z.number().min(1, 'Capacity must be at least 1').max(1000, 'Capacity too high'), // Removed z.coerce
  roomType: z.enum(['AMPHI', 'CLASSROOM', 'COMPUTER_LAB', 'WORKSHOP', 'CHEMISTRY_LAB']),
  equipment: z.array(z.enum(['COMPUTERS', 'MAC_COMPUTERS', 'PROJECTOR', 'CHEMISTRY_HOOD', 'WHITEBOARD', 'SMARTBOARD'])), // Removed .default([])
  floorId: z.string().min(1, 'Please choose a floor'),
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

// Where the box of the table is narrower than 48rem, each room is shown as a
// card (see lib/table-cards.ts).
const cards = TABLE_CARDS['3xl'];

export default function ClassroomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [floorOptions, setFloorOptions] = useState<FloorOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);
  // The room shown in the form for changes (null: the form adds a new room),
  // and the room waiting in the "Delete?" window.
  const [editing, setEditing] = useState<Room | null>(null);
  const [toDelete, setToDelete] = useState<Room | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
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
        // Rooms, floors and buildings load together: the floors and buildings name
        // each room's location and fill the floor list of the form.
        const [data, floorData, buildingData] = await Promise.all([
          api.getRooms(),
          api.getFloors(),
          api.getBuildings(),
        ]);
        setRooms(data);
        setFloorOptions(buildFloorOptions(floorData, buildingData));
        setLoadError(null);
      } catch (error) {
        console.error('Failed to fetch rooms', error);
        setLoadError(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };
    fetchRooms();
  }, [refreshTrigger]);

  const retryLoad = () => {
    setIsLoading(true);
    setLoadError(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  // 3. Handle Form Submission using Axios
  const onSubmit = async (data: RoomFormValues) => {
    setIsSubmitting(true);
    setNotice(null);
    try {
      if (editing) {
        await api.updateRoom(editing.id, data);
        setNotice({ type: 'success', text: `${data.name} was updated.` });
        setEditing(null);
      } else {
        await api.createRoom(data);
        setNotice({ type: 'success', text: 'Room saved.' });
      }
      reset();
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', text: `Could not save the room. ${getErrorMessage(error)}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Puts a room from the table into the form, to change it.
  const startEdit = (room: Room) => {
    setEditing(room);
    setNotice(null);
    reset({
      name: room.name,
      capacity: room.capacity,
      roomType: room.roomType,
      equipment: room.equipment,
      floorId: room.floorId,
    }, { keepDefaultValues: true }); // Cancel and Save then empty the form again
    // reset attaches the fields again on the next render; focus after that.
    setTimeout(() => setFocus('name'), 0);
  };

  const cancelEdit = () => {
    setEditing(null);
    reset();
  };

  // Runs when "Delete" is confirmed in the window. The server refuses while
  // classes are booked in the room; its message (why) is shown as it is.
  const confirmDelete = async () => {
    if (toDelete === null) return;
    setIsDeleting(true);
    try {
      await api.deleteRoom(toDelete.id);
      setNotice({ type: 'success', text: `${toDelete.name} was deleted.` });
      if (editing?.id === toDelete.id) cancelEdit();
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', text: `Could not delete ${toDelete.name}. ${getErrorMessage(error)}` });
    } finally {
      setIsDeleting(false);
      setToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="mb-6 text-2xl font-bold text-gray-900 sm:mb-8 sm:text-3xl">Classroom & Lab Management</h1>
        <Notice message={notice} onDismiss={setNotice} />
        <ConfirmDialog
          open={toDelete !== null}
          title={`Delete ${toDelete?.name ?? 'this room'}?`}
          message="This cannot be undone. A room that is booked for classes in the timetable cannot be deleted; you will see a message instead."
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
          busy={isDeleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: THE FORM */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">{editing ? `Edit ${editing.name}` : 'Add New Space'}</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              
              {/* Name Field */}
              <div>
                <label htmlFor="room-name" className="block text-sm font-medium text-gray-700 mb-1">Room Name / Number</label>
                <input
                  {...register('name')}
                  id="room-name"
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? 'room-name-error' : undefined}
                  className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm"
                  placeholder="e.g. Amphi A, Lab 304"
                />
                {errors.name && <p id="room-name-error" className="mt-1 text-xs font-medium text-red-700">{errors.name.message}</p>}
              </div>

              {/* Grid for Capacity and Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="room-capacity" className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    // Added valueAsNumber: true here so RHF passes a pure number to Zod!
                    {...register('capacity', { valueAsNumber: true })}
                    id="room-capacity"
                    aria-invalid={errors.capacity ? true : undefined}
                    aria-describedby={errors.capacity ? 'room-capacity-error' : undefined}
                    className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm"
                    placeholder="e.g. 40"
                  />
                  {errors.capacity && <p id="room-capacity-error" className="mt-1 text-xs font-medium text-red-700">{errors.capacity.message}</p>}
                </div>

                <div>
                  <label htmlFor="room-room-type" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    {...register('roomType')}
                    id="room-room-type"
                    className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm"
                  >
                    <option value="CLASSROOM">Classroom</option>
                    <option value="AMPHI">Amphi</option>
                    <option value="COMPUTER_LAB">Computer Lab</option>
                    <option value="CHEMISTRY_LAB">Chemistry Lab</option>
                    <option value="WORKSHOP">Workshop</option>
                  </select>
                </div>
              </div>

              {/* Floor: chosen from the floors added on the Locations page */}
              <div>
                <label htmlFor="room-floor-id" className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                <select
                  {...register('floorId')}
                  id="room-floor-id"
                  aria-invalid={errors.floorId ? true : undefined}
                  aria-describedby={errors.floorId ? 'room-floor-id-hint room-floor-id-error' : 'room-floor-id-hint'}
                  className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm"
                >
                  <option value="">{floorOptions.length === 0 ? '-- No floors yet --' : '-- Choose a floor --'}</option>
                  {floorOptions.map((floor) => (
                    <option key={floor.id} value={floor.id}>{floor.label}</option>
                  ))}
                </select>
                <p id="room-floor-id-hint" className="text-xs text-gray-500 mt-1">
                  Floors are added on the{' '}
                  <Link href="/locations" className="font-medium text-blue-700 underline hover:text-blue-800">
                    Locations
                  </Link>{' '}
                  page.
                </p>
                {errors.floorId && <p id="room-floor-id-error" className="mt-1 text-xs font-medium text-red-700">{errors.floorId.message}</p>}
              </div>

              {/* Equipment Checkboxes */}
              <div>
                <p id="room-equipment-label" className="block text-sm font-medium text-gray-700 mb-2 mt-4">Available Equipment</p>
                <div role="group" aria-labelledby="room-equipment-label" className="grid grid-cols-2 gap-2">
                  {EQUIPMENT_OPTIONS.map((item) => (
                    <label key={item.value} className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        value={item.value}
                        {...register('equipment')}
                        className="h-4 w-4 rounded border-gray-500 accent-blue-600"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : editing ? 'Save Changes' : 'Save Classroom'}
              </button>
              {editing && (
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

          {/* RIGHT COLUMN: THE DATA TABLE */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-semibold text-gray-800">Available Rooms & Labs</h2>
            </div>
            
            <div className="@container overflow-x-auto">
              <table className={`w-full text-left border-collapse ${cards.table}`}>
                <thead className={cards.head}>
                  <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                    <th className="p-4 font-medium">Name</th>
                    <th className="p-4 font-medium">Type</th>
                    <th className="p-4 font-medium">Capacity</th>
                    <th className="p-4 font-medium">Location</th>
                    <th className="p-4 font-medium">Equipment</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-gray-100 text-sm ${cards.body}`}>
                  {isLoading ? (
                    <StatusRow colSpan={6} message="Loading rooms..." />
                  ) : loadError ? (
                    <StatusRow
                      colSpan={6}
                      tone="error"
                      message={`Could not load the rooms. ${loadError}`}
                      onRetry={retryLoad}
                    />
                  ) : rooms.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        No rooms found. Add one to see them here!
                      </td>
                    </tr>
                  ) : (
                    rooms.map((room) => (
                      <tr key={room.id} className={`${cards.row} ${editing?.id === room.id ? 'bg-blue-50' : 'hover:bg-gray-50 transition-colors'}`}>
                        <td className={`${cards.title} font-medium text-gray-900`}>{room.name}</td>
                        <td className={`${cards.cell} text-gray-600`}>
                          <span className={cards.label}>Type</span>
                          <span>
                            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-50 text-purple-700">
                              {room.roomType.replace('_', ' ')}
                            </span>
                          </span>
                        </td>
                        <td className={`${cards.cell} text-gray-600`}>
                          <span className={cards.label}>Capacity</span>
                          <span>{room.capacity} seats</span>
                        </td>
                        <td className={`${cards.cell} text-gray-600`}>
                          <span className={cards.label}>Location</span>
                          <span>{findFloorLabel(floorOptions, room.floorId)}</span>
                        </td>
                        <td className={cards.cell}>
                          <span className={cards.label}>Equipment</span>
                          <div className="flex flex-wrap gap-1">
                            {room.equipment.map((eq) => (
                              <span key={eq} className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">
                                {eq.replace('_', ' ')}
                              </span>
                            ))}
                            {room.equipment.length === 0 && <span className="text-gray-500 italic">None</span>}
                          </div>
                        </td>
                        <td className={cards.actions}>
                          <div className={cards.buttons}>
                            <button
                              type="button"
                              onClick={() => startEdit(room)}
                              aria-label={`Edit ${room.name}`}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setToDelete(room)}
                              aria-label={`Delete ${room.name}`}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              Delete
                            </button>
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