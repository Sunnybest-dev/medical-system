import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle, XCircle, Eye, Clock, AlertTriangle, FileText,
  User, Stethoscope, Award, Globe, DollarSign, Search,
  ChevronDown, ChevronUp, ExternalLink, ShieldCheck, ShieldX, ShieldAlert, X
} from 'lucide-react'
import { adminService } from '@/services'
import { Badge, Avatar, Spinner, EmptyState } from '@/components/ui'
import Button from '@/components/ui/Button'
import { verificationStatusConfig, formatDate, cn } from '@/utils'
import toast from 'react-hot-toast'

const STATUS_TABS = [
  { key: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-600' },
  { key: 'under_review', label: 'Under Review', icon: Eye, color: 'text-blue-600' },
  { key: 'approved', label: 'Approved', icon: ShieldCheck, color: 'text-emerald-600' },
  { key: 'rejected', label: 'Rejected', icon: ShieldX, color: 'text-red-600' },
  { key: 'suspended', label: 'Suspended', icon: ShieldAlert, color: 'text-orange-600' },
]

const DOC_TYPE_LABELS = {
  government_id: 'Government ID',
  medical_license: 'Medical License',
  qualification: 'Qualification Certificate',
  profile_photo: 'Profile Photo',
}

function RejectModal({ doctor, onConfirm, onClose, loading }) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white">Reject Application</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          You are rejecting <strong>Dr. {doctor.user?.first_name} {doctor.user?.last_name}</strong>'s application. Please provide a reason.
        </p>
        <textarea
          rows={3}
          className="input resize-none"
          placeholder="e.g. Documents are unclear, license number could not be verified..."
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={() => onConfirm(reason)} loading={loading} disabled={!reason.trim()} className="flex-1">
            <XCircle className="w-4 h-4" /> Confirm Reject
          </Button>
        </div>
      </div>
    </div>
  )
}

function SuspendModal({ doctor, onConfirm, onClose, loading }) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white">Suspend Doctor</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Suspending <strong>Dr. {doctor.user?.first_name} {doctor.user?.last_name}</strong> will prevent them from accepting consultations.
        </p>
        <textarea
          rows={3}
          className="input resize-none"
          placeholder="Reason for suspension..."
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={() => onConfirm(reason)} loading={loading} disabled={!reason.trim()} className="flex-1">
            <ShieldAlert className="w-4 h-4" /> Confirm Suspend
          </Button>
        </div>
      </div>
    </div>
  )
}

function DoctorCard({ doctor, onAction, actionLoading }) {
  const [expanded, setExpanded] = useState(false)
  const [rejectModal, setRejectModal] = useState(false)
  const [suspendModal, setSuspendModal] = useState(false)
  const status = doctor.verification_status
  const cfg = verificationStatusConfig[status] || {}

  return (
    <>
      {rejectModal && (
        <RejectModal
          doctor={doctor}
          loading={actionLoading}
          onConfirm={reason => { onAction(doctor.id, 'reject', reason); setRejectModal(false) }}
          onClose={() => setRejectModal(false)}
        />
      )}
      {suspendModal && (
        <SuspendModal
          doctor={doctor}
          loading={actionLoading}
          onConfirm={reason => { onAction(doctor.id, 'suspend', reason); setSuspendModal(false) }}
          onClose={() => setSuspendModal(false)}
        />
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Card Header */}
        <div className="p-5">
          <div className="flex items-start gap-4">
            <Avatar name={`Dr. ${doctor.user?.first_name} ${doctor.user?.last_name}`} src={doctor.user?.avatar} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-lg">
                    Dr. {doctor.user?.first_name} {doctor.user?.last_name}
                  </p>
                  <p className="text-primary-600 dark:text-primary-400 font-medium text-sm">
                    {doctor.specialization?.name || 'No specialization set'}
                  </p>
                </div>
                <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold', cfg.color)}>
                  {cfg.label}
                </span>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {[
                  { icon: User, label: doctor.user?.email },
                  { icon: Globe, label: doctor.user?.country || 'N/A' },
                  { icon: Award, label: `${doctor.years_of_experience} yrs exp` },
                  { icon: DollarSign, label: `$${doctor.consultation_fee} / consult` },
                ].map(({ icon: Icon, label }, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{label}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                <span>License: <span className="font-mono text-gray-600 dark:text-gray-300">{doctor.medical_license_number}</span></span>
                <span>Applied: {doctor.created_at ? formatDate(doctor.created_at) : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Bio */}
          {doctor.bio && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl p-3 line-clamp-2">
              {doctor.bio}
            </p>
          )}

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Hide details' : 'View full details & documents'}
          </button>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="border-t border-gray-100 dark:border-gray-800 p-5 space-y-5 bg-gray-50 dark:bg-gray-800/30">

            {/* Education */}
            {doctor.education?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> Education
                </p>
                <div className="space-y-1">
                  {doctor.education.map((edu, i) => (
                    <div key={i} className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 rounded-lg px-3 py-2">
                      {typeof edu === 'string' ? edu : `${edu.degree} — ${edu.institution} (${edu.year})`}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {doctor.languages_spoken?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Languages</p>
                <div className="flex flex-wrap gap-2">
                  {doctor.languages_spoken.map((lang, i) => (
                    <span key={i} className="text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-full">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Submitted Documents ({doctor.documents?.length || 0})
              </p>
              {doctor.documents?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {doctor.documents.map(doc => (
                    <a
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-50 dark:bg-primary-950 rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                          </p>
                          {doc.is_verified && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Verified
                            </p>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-600 italic">No documents submitted</p>
              )}
            </div>

            {/* Rejection reason if rejected */}
            {doctor.rejection_reason && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-3">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Rejection Reason</p>
                <p className="text-sm text-red-700 dark:text-red-300">{doctor.rejection_reason}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Bar */}
        <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4 bg-white dark:bg-gray-900">
          {(status === 'pending' || status === 'under_review') && (
            <div className="flex flex-wrap gap-2">
              {status === 'pending' && (
                <Button size="sm" variant="secondary" onClick={() => onAction(doctor.id, 'review')} loading={actionLoading}>
                  <Eye className="w-4 h-4" /> Mark Under Review
                </Button>
              )}
              <Button size="sm" onClick={() => onAction(doctor.id, 'approve')} loading={actionLoading}>
                <CheckCircle className="w-4 h-4" /> Approve Doctor
              </Button>
              <Button size="sm" variant="danger" onClick={() => setRejectModal(true)}>
                <XCircle className="w-4 h-4" /> Reject
              </Button>
            </div>
          )}
          {status === 'approved' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-medium">Approved</span>
                {doctor.verified_at && <span className="text-gray-400 text-xs">on {formatDate(doctor.verified_at)}</span>}
              </div>
              <Button size="sm" variant="danger" onClick={() => setSuspendModal(true)}>
                <ShieldAlert className="w-4 h-4" /> Suspend
              </Button>
            </div>
          )}
          {status === 'rejected' && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <XCircle className="w-4 h-4" /> Application Rejected
              </span>
              <Button size="sm" variant="secondary" onClick={() => onAction(doctor.id, 'review')}>
                Reconsider
              </Button>
            </div>
          )}
          {status === 'suspended' && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1">
                <ShieldAlert className="w-4 h-4" /> Account Suspended
              </span>
              <Button size="sm" onClick={() => onAction(doctor.id, 'approve')}>
                <ShieldCheck className="w-4 h-4" /> Reinstate
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function AdminDoctors() {
  const [statusFilter, setStatusFilter] = useState('pending')
  const [search, setSearch] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['doctor-verifications', statusFilter],
    queryFn: () => adminService.getDoctorVerifications(statusFilter).then(r => r.data.results || r.data),
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, action, reason }) => adminService.verifyDoctor(id, { action, reason }),
    onSuccess: (_, vars) => {
      const labels = { approve: 'approved', reject: 'rejected', suspend: 'suspended', review: 'marked under review' }
      toast.success(`Doctor ${labels[vars.action] || vars.action} successfully`)
      qc.invalidateQueries(['doctor-verifications'])
      qc.invalidateQueries(['admin-dashboard'])
    },
    onError: () => toast.error('Action failed. Please try again.'),
  })

  const handleAction = (id, action, reason = '') => {
    actionMutation.mutate({ id, action, reason })
  }

  const filtered = (data || []).filter(d => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      d.user?.first_name?.toLowerCase().includes(q) ||
      d.user?.last_name?.toLowerCase().includes(q) ||
      d.user?.email?.toLowerCase().includes(q) ||
      d.specialization?.name?.toLowerCase().includes(q) ||
      d.medical_license_number?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Doctor Verification</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Review applications, check documents, and manage doctor accounts</p>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
              statusFilter === key
                ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary-300'
            )}
          >
            <Icon className={cn('w-4 h-4', statusFilter === key ? 'text-white' : color)} />
            {label}
            {data && statusFilter === key && (
              <span className={cn('ml-1 text-xs px-1.5 py-0.5 rounded-full', statusFilter === key ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500')}>
                {data.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Search by name, email, license number, specialization..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {search ? 'No doctors match your search' : `No doctors with "${statusFilter.replace('_', ' ')}" status`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(doctor => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              onAction={handleAction}
              actionLoading={actionMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}
