import { useQuery } from '@tanstack/react-query'
import { Users, UserCheck, Calendar, Activity, Clock } from 'lucide-react'
import { adminService } from '@/services'
import { Card, StatCard, Spinner } from '@/components/ui'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminService.getDashboard().then((r) => r.data),
  })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>

  const stats = data?.stats || {}

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Patients" value={stats.total_patients || 0} icon={Users} color="primary" />
        <StatCard title="Approved Doctors" value={stats.total_approved_doctors || 0} icon={UserCheck} color="green" />
        <StatCard title="Pending Verifications" value={stats.pending_verifications || 0} icon={Clock} color="yellow" />
        <StatCard title="Total Consultations" value={stats.total_consultations || 0} icon={Calendar} color="purple" />
      </div>

      {/* Top Symptoms */}
      {data?.top_symptoms?.length > 0 && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Most Reported Symptoms</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.top_symptoms} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )
}
