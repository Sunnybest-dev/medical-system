import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Brain, Calendar, Stethoscope, AlertTriangle, FileText, Pill, ArrowRight, Clock } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { appointmentService } from '@/services'
import { Card, StatCard, Badge, Avatar } from '@/components/ui'
import { formatDateTime, appointmentStatusConfig } from '@/utils'

export default function PatientDashboard() {
  const { user } = useAuthStore()
  const { data: todayData } = useQuery({
    queryKey: ['today-appointments'],
    queryFn: () => appointmentService.today().then((r) => r.data),
  })

  const quickActions = [
    { to: '/patient/assess', icon: Brain, label: 'AI Health Assessment', color: 'bg-primary-50 text-primary-600', desc: 'Check your symptoms' },
    { to: '/patient/doctors', icon: Stethoscope, label: 'Find a Doctor', color: 'bg-teal-50 text-teal-600', desc: 'Browse specialists' },
    { to: '/patient/medication', icon: Pill, label: 'Medication Info', color: 'bg-purple-50 text-purple-600', desc: 'Drug information' },
    { to: '/patient/records', icon: FileText, label: 'Medical Records', color: 'bg-amber-50 text-amber-600', desc: 'Your health history' },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <Avatar name={`${user?.first_name} ${user?.last_name}`} src={user?.avatar} size="lg" className="bg-white/20 text-white" />
          <div>
            <h1 className="text-xl font-bold">Good day, {user?.first_name}! 👋</h1>
            <p className="text-primary-100 text-sm mt-0.5">How are you feeling today?</p>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Link to="/patient/assess" className="bg-white text-primary-700 font-medium text-sm px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors flex items-center gap-2">
            <Brain className="w-4 h-4" /> Start AI Assessment
          </Link>
          <Link to="/patient/emergency" className="bg-red-500 text-white font-medium text-sm px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Emergency
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map(({ to, icon: Icon, label, color, desc }) => (
            <Link key={to} to={to} className="card hover:shadow-md transition-shadow group">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-gray-900">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Today's Appointments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Today's Appointments</h2>
          <Link to="/patient/appointments" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {todayData?.length > 0 ? (
          <div className="space-y-3">
            {todayData.map((apt) => (
              <Card key={apt.id} className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">Dr. {apt.doctor?.user?.first_name} {apt.doctor?.user?.last_name}</p>
                  <p className="text-xs text-gray-500">{apt.doctor?.specialization?.name} • {formatDateTime(apt.scheduled_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={appointmentStatusConfig[apt.status]?.color}>{appointmentStatusConfig[apt.status]?.label}</Badge>
                  {apt.status === 'confirmed' && (
                    <Link to={`/patient/video/${apt.id}`} className="btn-primary text-xs px-3 py-1.5">Join</Link>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-8">
            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No appointments today</p>
            <Link to="/patient/doctors" className="text-primary-600 text-sm hover:underline mt-1 inline-block">Book a consultation</Link>
          </Card>
        )}
      </div>

      {/* Health Tip */}
      <Card className="bg-emerald-50 border-emerald-100">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="font-medium text-emerald-900 text-sm">Health Tip</p>
            <p className="text-emerald-700 text-sm mt-0.5">Regular health check-ups can detect problems early. Use our AI Assessment to monitor your symptoms and consult a doctor when needed.</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
