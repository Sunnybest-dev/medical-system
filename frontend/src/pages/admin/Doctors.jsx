import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Eye, Clock, AlertTriangle } from 'lucide-react'
import { adminService } from '@/services'
import { Card, Badge, Avatar, Spinner, EmptyState } from '@/components/ui'
import Button from '@/components/ui/Button'
import { verificationStatusConfig, formatDate } from '@/utils'
import toast from 'react-hot-toast'

export default function AdminDoctors() {
  const [statusFilter, setStatusFilter] = useState('pending')
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [reason, setReason] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['doctor-verifications', statusFilter],
    queryFn: () => adminService.getDoctorVerifications(statusFilter).then((r) => r.data.results || r.data),
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, action, reason }) => adminService.verifyDoctor(id, { action, reason }),
    onSuccess: (_, vars) => {
      toast.success(`Doctor ${vars.action}d successfully`)
      qc.invalidateQueries(['doctor-verifications'])
      setSelectedDoc(null)
      setReason('')
    },
    onError: () => toast.error('Action failed'),
  })

  const tabs = ['pending', 'under_review', 'approved', 'rejected', 'suspended']

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Doctor Verification</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t} onClick={() => setStatusFilter(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === t ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : data?.length === 0 ? (
        <EmptyState icon={CheckCircle} title="No doctors in this category" />
      ) : (
        <div className="space-y-4">
          {data?.map((doctor) => (
            <Card key={doctor.id}>
              <div className="flex items-start gap-4">
                <Avatar name={`Dr. ${doctor.user?.first_name} ${doctor.user?.last_name}`} src={doctor.user?.avatar} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">Dr. {doctor.user?.first_name} {doctor.user?.last_name}</p>
                      <p className="text-sm text-primary-600">{doctor.specialization?.name || 'No specialization'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{doctor.user?.email} • {doctor.user?.country}</p>
                    </div>
                    <Badge className={verificationStatusConfig[doctor.verification_status]?.color}>
                      {verificationStatusConfig[doctor.verification_status]?.label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-gray-600">
                    <span>License: {doctor.medical_license_number}</span>
                    <span>Experience: {doctor.years_of_experience} years</span>
                    <span>Fee: ${doctor.consultation_fee}</span>
                    <span>Registered: {formatDate(doctor.created_at)}</span>
                  </div>

                  {/* Documents */}
                  {doctor.documents?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {doctor.documents.map((doc) => (
                        <a key={doc.id} href={doc.file_url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-lg transition-colors">
                          <Eye className="w-3 h-3" />
                          {doc.document_type.replace('_', ' ')}
                          {doc.is_verified && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {(statusFilter === 'pending' || statusFilter === 'under_review') && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => actionMutation.mutate({ id: doctor.id, action: 'review' })} variant="secondary">
                      <Clock className="w-4 h-4" /> Mark Under Review
                    </Button>
                    <Button size="sm" onClick={() => actionMutation.mutate({ id: doctor.id, action: 'approve' })} loading={actionMutation.isPending}>
                      <CheckCircle className="w-4 h-4" /> Approve
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setSelectedDoc(doctor.id)}>
                      <XCircle className="w-4 h-4" /> Reject
                    </Button>
                  </div>

                  {selectedDoc === doctor.id && (
                    <div className="flex gap-2">
                      <input
                        className="input flex-1 text-sm"
                        placeholder="Rejection reason..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                      <Button size="sm" variant="danger" onClick={() => actionMutation.mutate({ id: doctor.id, action: 'reject', reason })}>
                        Confirm Reject
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {statusFilter === 'approved' && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Button size="sm" variant="danger" onClick={() => {
                    const r = prompt('Suspension reason:')
                    if (r) actionMutation.mutate({ id: doctor.id, action: 'suspend', reason: r })
                  }}>
                    <AlertTriangle className="w-4 h-4" /> Suspend Doctor
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
