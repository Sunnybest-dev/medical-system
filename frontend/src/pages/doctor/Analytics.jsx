import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useAuthStore } from '@/store/authStore'
import { appointmentService } from '@/services'
import { Card, StatCard } from '@/components/ui'
import { Calendar, Users, Star, DollarSign } from 'lucide-react'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function DoctorAnalytics() {
  const { user } = useAuthStore()
  const profile = user?.doctor_profile

  const { data: appointments } = useQuery({
    queryKey: ['all-appointments'],
    queryFn: () => appointmentService.list().then((r) => r.data.results || r.data),
  })

  const statusCounts = appointments?.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1
    return acc
  }, {}) || {}

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

  const monthlyData = appointments?.reduce((acc, a) => {
    const month = new Date(a.scheduled_at).toLocaleString('default', { month: 'short' })
    const existing = acc.find((d) => d.month === month)
    if (existing) existing.count++
    else acc.push({ month, count: 1 })
    return acc
  }, []) || []

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Consultations" value={profile?.total_consultations || 0} icon={Users} color="primary" />
        <StatCard title="Rating" value={`${profile?.average_rating || '0.0'} ★`} icon={Star} color="yellow" />
        <StatCard title="Total Earnings" value={`$${profile?.total_earnings || 0}`} icon={DollarSign} color="green" />
        <StatCard title="Appointments" value={appointments?.length || 0} icon={Calendar} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Monthly Appointments</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Appointment Status</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          )}
        </Card>
      </div>
    </div>
  )
}
