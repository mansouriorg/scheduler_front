import axios from 'axios';

// 1. Create a configured Axios instance
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Export dedicated API functions for every resource!
export const api = {
  // --- TEACHERS ---
  getTeachers: () => apiClient.get('/professors').then(res => res.data),
  createTeacher: (data: any) => apiClient.post('/professors', data).then(res => res.data),
  updateTeacher: (id: string, data: unknown) => apiClient.patch(`/professors/${encodeURIComponent(id)}`, data).then(res => res.data),
  deleteTeacher: (id: string) => apiClient.delete(`/professors/${encodeURIComponent(id)}`).then(res => res.data),

  // --- CLASSROOMS ---
  getRooms: () => apiClient.get('/rooms').then(res => res.data),
  createRoom: (data: any) => apiClient.post('/rooms', data).then(res => res.data),
  updateRoom: (id: string, data: unknown) => apiClient.patch(`/rooms/${encodeURIComponent(id)}`, data).then(res => res.data),
  deleteRoom: (id: string) => apiClient.delete(`/rooms/${encodeURIComponent(id)}`).then(res => res.data),

  // --- COURSES ---
  getCourses: () => apiClient.get('/courses').then(res => res.data),
  createCourse: (data: any) => apiClient.post('/courses', data).then(res => res.data),
  updateCourse: (id: string, data: unknown) => apiClient.patch(`/courses/${encodeURIComponent(id)}`, data).then(res => res.data),
  deleteCourse: (id: string) => apiClient.delete(`/courses/${encodeURIComponent(id)}`).then(res => res.data),

  // --- COHORTS & TERMS ---
  getCohorts: () => apiClient.get('/cohorts').then(res => res.data),
  createCohort: (data: any) => apiClient.post('/cohorts', data).then(res => res.data),
  updateCohort: (id: string, data: unknown) => apiClient.patch(`/cohorts/${encodeURIComponent(id)}`, data).then(res => res.data),
  deleteCohort: (id: string) => apiClient.delete(`/cohorts/${encodeURIComponent(id)}`).then(res => res.data),
  
  getTerms: () => apiClient.get('/terms').then(res => res.data),
  createTerm: (data: any) => apiClient.post('/terms', data).then(res => res.data),
  updateTerm: (id: string, data: unknown) => apiClient.patch(`/terms/${encodeURIComponent(id)}`, data).then(res => res.data),
  deleteTerm: (id: string) => apiClient.delete(`/terms/${encodeURIComponent(id)}`).then(res => res.data),

  // --- LOCATIONS ---
  getCampuses: () => apiClient.get('/campuses').then(res => res.data),
  createCampus: (data: any) => apiClient.post('/campuses', data).then(res => res.data),
  updateCampus: (id: string, data: unknown) => apiClient.patch(`/campuses/${encodeURIComponent(id)}`, data).then(res => res.data),
  deleteCampus: (id: string) => apiClient.delete(`/campuses/${encodeURIComponent(id)}`).then(res => res.data),
  
  getBuildings: () => apiClient.get('/buildings').then(res => res.data),
  createBuilding: (data: any) => apiClient.post('/buildings', data).then(res => res.data),
  updateBuilding: (id: string, data: unknown) => apiClient.patch(`/buildings/${encodeURIComponent(id)}`, data).then(res => res.data),
  deleteBuilding: (id: string) => apiClient.delete(`/buildings/${encodeURIComponent(id)}`).then(res => res.data),
  
  getFloors: () => apiClient.get('/floors').then(res => res.data),
  createFloor: (data: any) => apiClient.post('/floors', data).then(res => res.data),
  updateFloor: (id: string, data: unknown) => apiClient.patch(`/floors/${encodeURIComponent(id)}`, data).then(res => res.data),
  deleteFloor: (id: string) => apiClient.delete(`/floors/${encodeURIComponent(id)}`).then(res => res.data),

  // --- COURSE OFFERINGS ---
  getOfferings: () => apiClient.get('/course-offerings').then(res => res.data),
  createOffering: (data: any) => apiClient.post('/course-offerings', data).then(res => res.data),
  updateOffering: (id: string, data: unknown) => apiClient.patch(`/course-offerings/${encodeURIComponent(id)}`, data).then(res => res.data),
  deleteOffering: (id: string) => apiClient.delete(`/course-offerings/${encodeURIComponent(id)}`).then(res => res.data),

  // --- SCHEDULER (THE BRAIN BRIDGE) ---
  generateSchedule: () => apiClient.post('/scheduler/generate').then(res => res.data),
};