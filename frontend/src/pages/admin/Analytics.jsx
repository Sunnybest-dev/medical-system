import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { adminService } from '@/services'
import { Card, Spinner } from '@/components/ui'
import { TrendingUp, Activity, Stethoscope, Brain } from 'lucide-react'

const COLORS = ['#9333ea', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6']
const SEVERITY_COLORS = { green: '#10b981', yellow: '#f59e0b', red: '#ef4444' }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 text-sm">
      {label && <p className="font-semibold text-gray-900 dark:text-white mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export default function AdminAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminService.getAnalytics().then(r => r.data),
  })
  const { data: dashboard } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminService.getDashboard().then(r => r.data),
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const severityData = (data?.severity_distribution || []).map(d => ({
    name: { green: 'Self-Care', yellow: 'See Doctor', red: 'Emergency' }[d.severity_level] || d.severity_level,
    value: d.count,
    color: SEVERITY_COLORS[d.severity_level] || '#9333ea',
  }))

  const specData = (data?.specialization_demand || []).map(d => ({
    name: d.doctor__specialization__name || 'Unknown',
    count: d.count,
  }))

  const topSymptoms = dashboard?.top_symptoms || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Insights into platform usage and health trends</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Specialization Demand */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-950 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Top Specializations</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">By completed consultations</p>
            </div>
          </div>
          {specData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={specData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#9ca3af' }} width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Consultations" fill="#9333ea" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 dark:text-gray-600 text-sm">No consultation data yet</div>
          )}
        </Card>

        {/* Severity Distribution */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-950 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">AI Assessment Severity</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Distribution of patient severity levels</p>
            </div>
          </div>
          {severityData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={severityData} cx="50%" cy="50%" outerRadius={80} innerRadius={50} dataKey="value" paddingAngle={4}>
                    {severityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {severityData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    {d.name}: <span className="font-semibold text-gray-900 dark:text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 dark:text-gray-600 text-sm">No assessment data yet</div>
          )}
        </Card>

        {/* Top Symptoms */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-950 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Most Reported Symptoms</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Top symptoms reported by patients</p>
            </div>
          </div>
          {topSymptoms.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topSymptoms}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Reports" fill="#9333ea" radius={[6, 6, 0, 0]}>
                  {topSymptoms.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 dark:text-gray-600 text-sm">No symptom data yet</div>
          )}
        </Card>
      </div>
    </div>
  )
}
