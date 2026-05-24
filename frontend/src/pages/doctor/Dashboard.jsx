import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Calendar, Users, Star, DollarSign, Clock, Video, AlertTriangle, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { appointmentService, doctorService } from '@/services'
import { Card, StatCard, Badge, Avatar } from '@/components/ui'
import { formatDateTime, appointmentStatusConfig } from '@/utils'

export default function DoctorDashboard() {
  const { user } = useAuthStore()
  const profile = user?.doctor_profile

  const { data: todayApts } = useQuery({
    queryKey: ['doctor-today'],
    queryFn: () => appointmentService.today().then((r) => r.data),
  })

  const isApproved = profile?.verification_status === 'approved'

  return (
    <div className="space-y-6">
      {/* Verification Banner */}
      {!isApproved && (
        <div className={`rounded-2xl p-4 flex items-start gap-3 ${
          profile?.verification_status === 'pending' ? 'bg-amber-50 border border-amber-200' :
          profile?.verification_status === 'rejected' ? 'bg-red-50 border border-red-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-gray-900">
              Account Status: <span className="capitalize">{profile?.verification_status?.replace('_', ' ') || 'Pending'}</span>
            </p>
            <p className="text-sm text-gray-600 mt-0.5">
              {profile?.verification_status === 'pending' && 'Please complete your profile and upload verification documents.'}
              {profile?.verification_status === 'under_review' && 'Your documents are being reviewed by our admin team.'}
              {profile?.verification_status === 'rejected' && `Rejected: ${profile?.rejection_reason || 'Please contact support.'}`}
            </p>
            {profile?.verification_status === 'pending' && (
              <Link to="/doctor/profile" className="text-sm text-primary-600 font-medium hover:underline mt-1 inline-block">
                Complete Profile →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Welcome */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
        <h1 className="text-xl font-bold">Welcome, Dr. {user?.first_name}! 👋</h1>
        <p className="text-primary-100 text-sm mt-1">
          {isApproved ? "You're ready to help patients today." : "Complete your verification to start accepting consultations."}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's Appointments" value={todayApts?.length || 0} icon={Calendar} color="primary" />
        <StatCard title="Total Consultations" value={profile?.total_consultations || 0} icon={Users} color="green" />
        <StatCard title="Rating" value={`${profile?.average_rating || '0.0'} ★`} icon={Star} color="yellow" />
        <StatCard title="Total Earnings" value={`$${profile?.total_earnings || '0'}`} icon={DollarSign} color="purple" />
      </div>

      {/* Today's Appointments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Today's Appointments</h2>
          <Link to="/doctor/appointments" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {todayApts?.length > 0 ? (
          <div className="space-y-3">
            {todayApts.map((apt) => (
              <Card key={apt.id} className="flex items-center gap-4">
                <Avatar name={`${apt.patient?.first_name} ${apt.patient?.last_name}`} src={apt.patient?.avatar} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{apt.patient?.first_name} {apt.patient?.last_name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatDateTime(apt.scheduled_at)}
                  </p>
                  {apt.chief_complaint && <p className="text-xs text-gray-400 truncate mt-0.5">{apt.chief_complaint}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={appointmentStatusConfig[apt.status]?.color}>{appointmentStatusConfig[apt.status]?.label}</Badge>
                  {apt.status === 'confirmed' && (
                    <Link to={`/doctor/video/${apt.id}`} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
                      <Video className="w-3.5 h-3.5" /> Join
                    </Link>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-8">
            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No appointments today</p>
          </Card>
        )}
      </div>
    </div>
  )
}
