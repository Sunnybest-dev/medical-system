import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Calendar, Video, Clock, Check, X } from 'lucide-react'
import { appointmentService } from '@/services'
import { Card, Badge, Avatar, EmptyState, Spinner } from '@/components/ui'
import Button from '@/components/ui/Button'
import { formatDateTime, appointmentStatusConfig } from '@/utils'
import toast from 'react-hot-toast'

export default function DoctorAppointments() {
  const [filter, setFilter] = useState('all')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['doctor-appointments'],
    queryFn: () => appointmentService.list().then((r) => r.data.results || r.data),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => appointmentService.updateStatus(id, { status }),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries(['doctor-appointments']) },
    onError: () => toast.error('Failed to update'),
  })

  const filtered = filter === 'all' ? data : data?.filter((a) => a.status === filter)
  const tabs = ['all', 'pending', 'confirmed', 'completed', 'cancelled']

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Appointments</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === t ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : filtered?.length === 0 ? (
        <EmptyState icon={Calendar} title="No appointments" description="Appointments will appear here" />
      ) : (
        <div className="space-y-3">
          {filtered?.map((apt) => (
            <Card key={apt.id}>
              <div className="flex items-start gap-4">
                <Avatar name={`${apt.patient?.first_name} ${apt.patient?.last_name}`} src={apt.patient?.avatar} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{apt.patient?.first_name} {apt.patient?.last_name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {formatDateTime(apt.scheduled_at)}
                      </p>
                    </div>
                    <Badge className={appointmentStatusConfig[apt.status]?.color}>{appointmentStatusConfig[apt.status]?.label}</Badge>
                  </div>
                  {apt.chief_complaint && <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg p-2">{apt.chief_complaint}</p>}
                </div>
              </div>

              {apt.status === 'pending' && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                  <Button size="sm" onClick={() => statusMutation.mutate({ id: apt.id, status: 'confirmed' })} loading={statusMutation.isPending}>
                    <Check className="w-4 h-4" /> Confirm
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: apt.id, status: 'cancelled' })}>
                    <X className="w-4 h-4" /> Decline
                  </Button>
                </div>
              )}

              {apt.status === 'confirmed' && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                  <Link to={`/doctor/video/${apt.id}`} className="btn-primary text-sm flex items-center gap-2">
                    <Video className="w-4 h-4" /> Start Video Call
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: apt.id, status: 'completed' })}>
                    Mark Complete
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
