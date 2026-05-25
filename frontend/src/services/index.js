import api from './api'

// Auth
export const authService = {
  loginPatient: (data) => api.post('/auth/login/', data),
  registerPatient: (data) => api.post('/auth/register/patient/', data),
  registerDoctor: (data) => api.post('/auth/register/doctor/', data),
  registerAdmin: (data) => api.post('/auth/register/admin/', data),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  me: () => api.get('/auth/me/'),
  updateMe: (data) => api.patch('/auth/me/', data),
  verifyEmail: (token) => api.post('/auth/verify-email/', { token }),
  forgotPassword: (email) => api.post('/auth/forgot-password/', { email }),
  resetPassword: (data) => api.post('/auth/reset-password/', data),
  changePassword: (data) => api.post('/auth/change-password/', data),
  googleAuth: (token, role) => api.post('/auth/google/', { token, role }),
}

// Patients
export const patientService = {
  getProfile: () => api.get('/patients/profile/'),
  updateProfile: (data) => api.patch('/patients/profile/', data),
  getDocuments: () => api.get('/patients/documents/'),
  uploadDocument: (formData) => api.post('/patients/documents/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteDocument: (id) => api.delete(`/patients/documents/${id}/`),
}

// Doctors
export const doctorService = {
  list: (params) => api.get('/doctors/', { params }),
  detail: (id) => api.get(`/doctors/${id}/`),
  getProfile: () => api.get('/doctors/profile/'),
  updateProfile: (data) => api.patch('/doctors/profile/', data),
  uploadDocument: (formData) => api.post('/doctors/documents/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAvailability: () => api.get('/doctors/availability/'),
  setAvailability: (data) => api.post('/doctors/availability/', data),
  updateAvailability: (id, data) => api.patch(`/doctors/availability/${id}/`, data),
  deleteAvailability: (id) => api.delete(`/doctors/availability/${id}/`),
  updateStatus: (status) => api.patch('/doctors/status/', { status }),
  getVacations: () => api.get('/doctors/vacations/'),
  addVacation: (data) => api.post('/doctors/vacations/', data),
  getSpecializations: () => api.get('/doctors/specializations/'),
  getRatings: (doctorId) => api.get(`/doctors/${doctorId}/ratings/`),
  rateDoctor: (doctorId, data) => api.post(`/doctors/${doctorId}/ratings/`, data),
}

// Appointments
export const appointmentService = {
  list: (params) => api.get('/appointments/', { params }),
  create: (data) => api.post('/appointments/', data),
  detail: (id) => api.get(`/appointments/${id}/`),
  updateStatus: (id, data) => api.patch(`/appointments/${id}/status/`, data),
  today: () => api.get('/appointments/today/'),
  getJitsiToken: (id) => api.get(`/appointments/${id}/jitsi-token/`),
  getNotes: () => api.get('/appointments/notes/'),
  createNote: (data) => api.post('/appointments/notes/', data),
  updateNote: (id, data) => api.patch(`/appointments/notes/${id}/`, data),
}

// AI Engine
export const aiService = {
  getSymptoms: () => api.get('/ai/symptoms/'),
  getFollowupQuestions: (symptoms) => api.post('/ai/followup-questions/', { symptoms }),
  performAssessment: (data) => api.post('/ai/assess/', data),
  getAssessmentHistory: () => api.get('/ai/assessments/'),
  getAssessmentDetail: (id) => api.get(`/ai/assessments/${id}/`),
  getMedicationInfo: (medication_name) => api.post('/ai/medication-info/', { medication_name }),
}

// Messaging
export const messagingService = {
  getConversations: () => api.get('/messages/conversations/'),
  getConversation: (id) => api.get(`/messages/conversations/${id}/`),
  createConversation: (data) => api.post('/messages/conversations/', data),
  getMessages: (conversationId) => api.get(`/messages/conversations/${conversationId}/messages/`),
  markRead: (conversationId) => api.post(`/messages/conversations/${conversationId}/read/`),
}

// Emergency
export const emergencyService = {
  create: (data) => api.post('/emergency/', data),
  list: () => api.get('/emergency/'),
  detail: (id) => api.get(`/emergency/${id}/`),
}

// Payments
export const paymentService = {
  list: () => api.get('/payments/'),
  initiate: (data) => api.post('/payments/initiate/', data),
  demoComplete: (id) => api.post(`/payments/${id}/demo-complete/`),
}

// Notifications
export const notificationService = {
  list: () => api.get('/notifications/'),
  markRead: (id) => api.post(`/notifications/${id}/read/`),
  markAllRead: () => api.post('/notifications/read-all/'),
}

// Admin
export const adminService = {
  getDashboard: () => api.get('/admin-panel/dashboard/'),
  getAnalytics: () => api.get('/admin-panel/analytics/'),
  getDoctorVerifications: (status) => api.get('/admin-panel/doctors/verify/', { params: { status } }),
  verifyDoctor: (id, data) => api.post(`/admin-panel/doctors/${id}/action/`, data),
  getUsers: (role) => api.get('/admin-panel/users/', { params: { role } }),
  userAction: (id, action) => api.post(`/admin-panel/users/${id}/action/`, { action }),
}
