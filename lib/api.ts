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

  // --- CLASSROOMS ---
  getRooms: () => apiClient.get('/rooms').then(res => res.data),
  createRoom: (data: any) => apiClient.post('/rooms', data).then(res => res.data),

  // --- COURSES ---
  getCourses: () => apiClient.get('/courses').then(res => res.data),
  createCourse: (data: any) => apiClient.post('/courses', data).then(res => res.data),

  // --- COHORTS & TERMS ---
  getCohorts: () => apiClient.get('/cohorts').then(res => res.data),
  createCohort: (data: any) => apiClient.post('/cohorts', data).then(res => res.data),
  
  getTerms: () => apiClient.get('/terms').then(res => res.data),
  createTerm: (data: any) => apiClient.post('/terms', data).then(res => res.data),

  // --- LOCATIONS ---
  getCampuses: () => apiClient.get('/campuses').then(res => res.data),
  createCampus: (data: any) => apiClient.post('/campuses', data).then(res => res.data),
  
  getBuildings: () => apiClient.get('/buildings').then(res => res.data),
  createBuilding: (data: any) => apiClient.post('/buildings', data).then(res => res.data),
  
  getFloors: () => apiClient.get('/floors').then(res => res.data),
  createFloor: (data: any) => apiClient.post('/floors', data).then(res => res.data),

  // --- COURSE OFFERINGS ---
  getOfferings: () => apiClient.get('/course-offerings').then(res => res.data),
  createOffering: (data: any) => apiClient.post('/course-offerings', data).then(res => res.data),

  // --- SCHEDULER (THE BRAIN BRIDGE) ---
  generateSchedule: () => apiClient.post('/scheduler/generate').then(res => res.data),
};