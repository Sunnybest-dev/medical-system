import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { adminService } from '@/services'
import { Card, Spinner } from '@/components/ui'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function AdminAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminService.getAnalytics().then((r) => r.data),
  })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>

  const severityLabels = { green: 'Self-Care', yellow: 'See Doctor', red: 'Emergency' }
  const severityData = data?.severity_distribution?.map((d) => ({
    name: severityLabels[d.severity_level] || d.severity_level,
    value: d.count,
  })) || []

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Platform Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Specialization Demand */}
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Top Specializations by Consultations</h2>
          {data?.specialization_demand?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.specialization_demand} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="doctor__specialization__name" type="category" tick={{ fontSize: 11 }} width={130} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-8">No data yet</p>}
        </Card>

        {/* Severity Distribution */}
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">AI Assessment Severity Distribution</h2>
          {severityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {severityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-8">No assessment data yet</p>}
        </Card>
      </div>
    </div>
  )
}
