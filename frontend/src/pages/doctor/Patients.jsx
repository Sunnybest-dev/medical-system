import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { appointmentService } from '@/services'
import { Card, Avatar, EmptyState, Spinner } from '@/components/ui'
import { formatDate } from '@/utils'

export default function DoctorPatients() {
  const { data, isLoading } = useQuery({
    queryKey: ['doctor-patients'],
    queryFn: () => appointmentService.list({ status: 'completed' }).then((r) => r.data.results || r.data),
  })

  // Deduplicate patients
  const patients = data ? [...new Map(data.map((a) => [a.patient?.id, a.patient])).values()] : []

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">My Patients</h1>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : patients.length === 0 ? (
        <EmptyState icon={Users} title="No patients yet" description="Completed consultations will appear here" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patients.map((patient) => (
            <Card key={patient?.id} className="flex items-center gap-4">
              <Avatar name={`${patient?.first_name} ${patient?.last_name}`} src={patient?.avatar} size="lg" />
              <div>
                <p className="font-semibold text-gray-900">{patient?.first_name} {patient?.last_name}</p>
                <p className="text-sm text-gray-500">{patient?.email}</p>
                <p className="text-xs text-gray-400">{patient?.country}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
