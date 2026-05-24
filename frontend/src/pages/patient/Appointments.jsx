import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Calendar, Video, Clock, X } from 'lucide-react'
import { appointmentService } from '@/services'
import { Card, Badge, Avatar, EmptyState, Spinner } from '@/components/ui'
import Button from '@/components/ui/Button'
import { formatDateTime, appointmentStatusConfig } from '@/utils'
import toast from 'react-hot-toast'

export default function PatientAppointments() {
  const [filter, setFilter] = useState('all')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentService.list().then((r) => r.data.results || r.data),
  })

  const cancelMutation = useMutation({
    mutationFn: (id) => appointmentService.updateStatus(id, { status: 'cancelled', reason: 'Cancelled by patient' }),
    onSuccess: () => { toast.success('Appointment cancelled'); qc.invalidateQueries(['appointments']) },
    onError: () => toast.error('Failed to cancel'),
  })

  const filtered = filter === 'all' ? data : data?.filter((a) => a.status === filter)

  const tabs = ['all', 'pending', 'confirmed', 'completed', 'cancelled']

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">My Appointments</h1>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === t ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : filtered?.length === 0 ? (
        <EmptyState icon={Calendar} title="No appointments found" description="Book a consultation with a doctor" action={
          <Link to="/patient/doctors" className="btn-primary mt-2 inline-block">Find Doctors</Link>
        } />
      ) : (
        <div className="space-y-3">
          {filtered?.map((apt) => (
            <Card key={apt.id}>
              <div className="flex items-start gap-4">
                <Avatar name={`Dr. ${apt.doctor?.user?.first_name} ${apt.doctor?.user?.last_name}`} src={apt.doctor?.user?.avatar} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">Dr. {apt.doctor?.user?.first_name} {apt.doctor?.user?.last_name}</p>
                      <p className="text-sm text-gray-500">{apt.doctor?.specialization?.name}</p>
                    </div>
                    <Badge className={appointmentStatusConfig[apt.status]?.color}>
                      {appointmentStatusConfig[apt.status]?.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDateTime(apt.scheduled_at)}</span>
                    <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5" />Video</span>
                  </div>
                  {apt.chief_complaint && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{apt.chief_complaint}</p>
                  )}
                </div>
              </div>

              {(apt.status === 'confirmed' || apt.status === 'pending') && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                  {apt.status === 'confirmed' && (
                    <Link to={`/patient/video/${apt.id}`} className="btn-primary text-sm flex items-center gap-2">
                      <Video className="w-4 h-4" /> Join Video Call
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancelMutation.mutate(apt.id)}
                    loading={cancelMutation.isPending}
                  >
                    <X className="w-4 h-4" /> Cancel
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
