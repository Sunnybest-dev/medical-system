import { useQuery } from '@tanstack/react-query'
import { Users, UserCheck, Calendar, Clock, Activity, TrendingUp, Brain, AlertTriangle } from 'lucide-react'
import { adminService } from '@/services'
import { StatCard, Spinner, Card } from '@/components/ui'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Link } from 'react-router-dom'

const SEVERITY_COLORS = { green: '#10b981', yellow: '#f59e0b', red: '#ef4444' }
const BAR_COLOR = '#9333ea'

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminService.getDashboard().then(r => r.data),
  })
  const { data: analytics } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminService.getAnalytics().then(r => r.data),
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const stats = data?.stats || {}
  const severityData = analytics?.severity_distribution?.map(d => ({
    name: { green: 'Self-Care', yellow: 'See Doctor', red: 'Emergency' }[d.severity_level] || d.severity_level,
    value: d.count,
    color: SEVERITY_COLORS[d.severity_level] || '#9333ea',
  })) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Platform overview and management</p>
        </div>
        {stats.pending_verifications > 0 && (
          <Link to="/admin/doctors" className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors">
            <Clock className="w-4 h-4" />
            {stats.pending_verifications} pending verification{stats.pending_verifications !== 1 ? 's' : ''}
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Patients" value={stats.total_patients ?? 0} icon={Users} color="primary" />
        <StatCard title="Approved Doctors" value={stats.total_approved_doctors ?? 0} icon={UserCheck} color="green" />
        <StatCard title="Pending Verifications" value={stats.pending_verifications ?? 0} icon={Clock} color="yellow" />
        <StatCard title="Total Consultations" value={stats.total_consultations ?? 0} icon={Calendar} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Symptoms */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-primary-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Most Reported Symptoms</h2>
          </div>
          {data?.top_symptoms?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.top_symptoms} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#6b7280' }} width={110} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill={BAR_COLOR} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 dark:text-gray-600 text-sm">No symptom data yet</div>
          )}
        </Card>

        {/* AI Severity Distribution */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white">AI Assessment Severity</h2>
          </div>
          {severityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" outerRadius={85} innerRadius={45} dataKey="value" paddingAngle={3}>
                  {severityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 dark:text-gray-600 text-sm">No assessment data yet</div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: '/admin/doctors', icon: UserCheck, label: 'Review Doctor Applications', desc: 'Verify documents and approve doctors', color: 'bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400' },
          { to: '/admin/users', icon: Users, label: 'Manage Users', desc: 'Activate or deactivate accounts', color: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' },
          { to: '/admin/analytics', icon: TrendingUp, label: 'View Analytics', desc: 'Platform performance insights', color: 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400' },
        ].map(({ to, icon: Icon, label, desc, color }) => (
          <Link key={to} to={to} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
