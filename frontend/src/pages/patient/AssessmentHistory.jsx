import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Brain, ChevronRight, History } from 'lucide-react'
import { aiService } from '@/services'
import { Card, Badge, EmptyState, Spinner } from '@/components/ui'
import { formatDate, severityConfig } from '@/utils'

export default function AssessmentHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ['assessment-history'],
    queryFn: () => aiService.getAssessmentHistory().then((r) => r.data.results || r.data),
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <History className="w-5 h-5 text-primary-600" /> Assessment History
        </h1>
        <Link to="/patient/assess" className="btn-primary text-sm">New Assessment</Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : data?.length === 0 ? (
        <EmptyState icon={Brain} title="No assessments yet" description="Start your first AI health assessment" action={
          <Link to="/patient/assess" className="btn-primary mt-2 inline-block">Start Assessment</Link>
        } />
      ) : (
        <div className="space-y-3">
          {data?.map((assessment) => {
            const sev = severityConfig[assessment.severity_level]
            return (
              <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${sev?.bg}`}>
                    {sev?.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-gray-900 text-sm">
                        {assessment.symptoms?.map((s) => s.name).join(', ') || 'Assessment'}
                      </p>
                      <Badge className={sev?.badge}>{sev?.label}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(assessment.created_at)}</p>
                    {assessment.suggested_specialist && (
                      <p className="text-xs text-primary-600 mt-1">Suggested: {assessment.suggested_specialist}</p>
                    )}
                    {assessment.possible_conditions?.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        Possible: {assessment.possible_conditions.map((c) => c.name).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
