import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useEffect } from 'react'

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPatientPage from '@/pages/auth/RegisterPatientPage'
import RegisterDoctorPage from '@/pages/auth/RegisterDoctorPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage'

// Patient Pages
import PatientLayout from '@/components/layout/PatientLayout'
import PatientDashboard from '@/pages/patient/Dashboard'
import PatientProfile from '@/pages/patient/Profile'
import AIAssessment from '@/pages/patient/AIAssessment'
import FindDoctors from '@/pages/patient/FindDoctors'
import DoctorDetailPage from '@/pages/patient/DoctorDetail'
import BookAppointment from '@/pages/patient/BookAppointment'
import PatientAppointments from '@/pages/patient/Appointments'
import PatientMessages from '@/pages/patient/Messages'
import MedicalRecords from '@/pages/patient/MedicalRecords'
import MedicationInfo from '@/pages/patient/MedicationInfo'
import EmergencyPage from '@/pages/patient/Emergency'
import VideoConsultation from '@/pages/patient/VideoConsultation'
import AssessmentHistory from '@/pages/patient/AssessmentHistory'

// Doctor Pages
import DoctorLayout from '@/components/layout/DoctorLayout'
import DoctorDashboard from '@/pages/doctor/Dashboard'
import DoctorProfilePage from '@/pages/doctor/Profile'
import DoctorAppointments from '@/pages/doctor/Appointments'
import DoctorAvailability from '@/pages/doctor/Availability'
import DoctorMessages from '@/pages/doctor/Messages'
import DoctorPatients from '@/pages/doctor/Patients'
import ConsultationNotes from '@/pages/doctor/ConsultationNotes'
import DoctorVideoConsultation from '@/pages/doctor/VideoConsultation'
import DoctorAnalytics from '@/pages/doctor/Analytics'

// Admin Pages
import AdminLayout from '@/components/layout/AdminLayout'
import AdminDashboard from '@/pages/admin/Dashboard'
import AdminDoctors from '@/pages/admin/Doctors'
import AdminUsers from '@/pages/admin/Users'
import AdminAnalytics from '@/pages/admin/Analytics'

// Landing
import LandingPage from '@/pages/LandingPage'
import RegisterAdminPage from '@/pages/auth/RegisterAdminPage'

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={`/${user?.role}`} replace />
  }
  return children
}

export default function App() {
  useEffect(() => {
    const base = import.meta.env.VITE_API_URL || 'https://medical-system-7381.onrender.com/api'
    const ping = () => fetch(`${base}/health/`).catch(() => {})
    ping()
    const interval = setInterval(ping, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPatientPage />} />
        <Route path="/register/doctor" element={<RegisterDoctorPage />} />
        <Route path="/register/admin" element={<RegisterAdminPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Patient Routes */}
        <Route path="/patient" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <PatientLayout />
          </ProtectedRoute>
        }>
          <Route index element={<PatientDashboard />} />
          <Route path="profile" element={<PatientProfile />} />
          <Route path="assess" element={<AIAssessment />} />
          <Route path="assess/history" element={<AssessmentHistory />} />
          <Route path="doctors" element={<FindDoctors />} />
          <Route path="doctors/:id" element={<DoctorDetailPage />} />
          <Route path="doctors/:id/book" element={<BookAppointment />} />
          <Route path="appointments" element={<PatientAppointments />} />
          <Route path="messages" element={<PatientMessages />} />
          <Route path="records" element={<MedicalRecords />} />
          <Route path="medication" element={<MedicationInfo />} />
          <Route path="emergency" element={<EmergencyPage />} />
          <Route path="video/:appointmentId" element={<VideoConsultation />} />
        </Route>

        {/* Doctor Routes */}
        <Route path="/doctor" element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <DoctorLayout />
          </ProtectedRoute>
        }>
          <Route index element={<DoctorDashboard />} />
          <Route path="profile" element={<DoctorProfilePage />} />
          <Route path="appointments" element={<DoctorAppointments />} />
          <Route path="availability" element={<DoctorAvailability />} />
          <Route path="messages" element={<DoctorMessages />} />
          <Route path="patients" element={<DoctorPatients />} />
          <Route path="notes" element={<ConsultationNotes />} />
          <Route path="video/:appointmentId" element={<DoctorVideoConsultation />} />
          <Route path="analytics" element={<DoctorAnalytics />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="doctors" element={<AdminDoctors />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="analytics" element={<AdminAnalytics />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
