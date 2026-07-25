import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, X, FileText, Brain, MessageSquare, Download, ChevronRight, Activity, Pill, AlertTriangle } from 'lucide-react'
import { appointmentService, patientService, messagingService } from '@/services'
import { Card, Avatar, EmptyState, Spinner, Badge } from '@/components/ui'
import { formatDate, severityConfig } from '@/utils'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { cn } from '@/utils'

const DOC_TYPES = {
  lab_report: { label: 'Lab Report', color: 'info' },
  scan: { label: 'Scan', color: 'primary' },
  prescription: { label: 'Prescription', color: 'success' },
  xray: { label: 'X-Ray', color: 'warning' },
  other: { label: 'Other', color: 'default' },
}

function PatientDetailPanel({ patient, onClose }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState('overview')

  const { data, isLoading } = useQuery({
    queryKey: ['patient-detail', patient.id],
    queryFn: () => patientService.getPatientDetail(patient.id).then(r => r.data),
  })

  const messageMutation = useMutation({
    mutationFn: () => messagingService.createConversation({ doctor_id: undefined, patient_id: patient.id }),
    onSuccess: () => { navigate('/doctor/messages'); onClose() },
    onError: (err) => toast.error(err?.response?.data?.error || 'Could not start conversation'),
  })

  // For doctor to start a conversation they POST with the patient's user id
  const startChat = useMutation({
    mutationFn: () => messagingService.getConversations().then(r => {
      const convs = r.data.results || r.data
      const existing = convs.find(c => c.patient?.id === patient.id)
      if (existing) return existing
      // create via the create endpoint — backend uses request.user as patient,
      // so for doctor side we need a different approach: just navigate to messages
      return null
    }),
    onSuccess: () => { navigate('/doctor/messages'); onClose() },
  })

  const profile = data?.profile
  const documents = data?.documents || []
  const assessments = data?.assessments || []

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'documents', label: `Documents (${documents.length})` },
    { id: 'assessments', label: `AI Reports (${assessments.length})` },
  ]

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 h-full overflow-y-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-4 flex items-center gap-4">
          <div className="relative">
            <Avatar name={`${patient.first_name} ${patient.last_name}`} src={patient.avatar} size="lg" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 dark:text-white text-lg">{patient.first_name} {patient.last_name}</h2>
            <p className="text-sm text-gray-500">{patient.email}</p>
            <p className="text-xs text-gray-400">{patient.country}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { navigate('/doctor/messages'); onClose() }}
              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors"
            >
              <MessageSquare className="w-4 h-4" /> Message
            </button>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 px-4">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn('px-4 py-3 text-sm font-medium border-b-2 transition-colors', tab === t.id
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300')}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <div className="p-4 space-y-4 flex-1">

            {/* Overview Tab */}
            {tab === 'overview' && (
              <div className="space-y-4">
                {/* Health Profile */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Health Profile</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      ['Blood Group', profile?.blood_group || '—'],
                      ['Height', profile?.height_cm ? `${profile.height_cm} cm` : '—'],
                      ['Weight', profile?.weight_kg ? `${profile.weight_kg} kg` : '—'],
                      ['Gender', patient.gender || '—'],
                      ['Date of Birth', patient.date_of_birth ? formatDate(patient.date_of_birth) : '—'],
                      ['Phone', patient.phone_number || '—'],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="font-medium text-gray-900 dark:text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Medical Info */}
                {[
                  { label: 'Allergies', value: profile?.allergies, icon: AlertTriangle, color: 'text-red-500' },
                  { label: 'Existing Conditions', value: profile?.existing_conditions, icon: Activity, color: 'text-amber-500' },
                  { label: 'Current Medications', value: profile?.current_medications, icon: Pill, color: 'text-blue-500' },
                ].map(({ label, value, icon: Icon, color }) => value ? (
                  <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                    <p className={cn('text-xs font-semibold mb-1 flex items-center gap-1', color)}>
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{value}</p>
                  </div>
                ) : null)}

                {/* Emergency Contact */}
                {profile?.emergency_contact_name && (
                  <div className="bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">Emergency Contact</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{profile.emergency_contact_name}</p>
                    <p className="text-sm text-gray-500">{profile.emergency_contact_phone} · {profile.emergency_contact_relationship}</p>
                  </div>
                )}
              </div>
            )}

            {/* Documents Tab */}
            {tab === 'documents' && (
              documents.length === 0 ? (
                <EmptyState icon={FileText} title="No documents uploaded" description="Patient hasn't uploaded any medical records yet" />
              ) : (
                <div className="space-y-3">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-200 dark:border-gray-600">
                        <FileText className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant={DOC_TYPES[doc.document_type]?.color || 'default'}>
                            {DOC_TYPES[doc.document_type]?.label || doc.document_type}
                          </Badge>
                          <span className="text-xs text-gray-400">{formatDate(doc.uploaded_at)}</span>
                        </div>
                        {doc.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{doc.notes}</p>}
                      </div>
                      <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-primary-600 transition-colors">
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* AI Assessments Tab */}
            {tab === 'assessments' && (
              assessments.length === 0 ? (
                <EmptyState icon={Brain} title="No AI assessments" description="Patient hasn't run any AI health assessments yet" />
              ) : (
                <div className="space-y-3">
                  {assessments.map(a => {
                    const sev = severityConfig[a.severity_level]
                    return (
                      <div key={a.id} className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0', sev?.bg)}>{sev?.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant={a.severity_level === 'red' ? 'danger' : a.severity_level === 'yellow' ? 'warning' : 'success'}>
                                {sev?.label}
                              </Badge>
                              <span className="text-xs text-gray-400">{formatDate(a.created_at)}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {a.symptoms_list?.map(s => s.name).join(', ') || 'No symptoms listed'}
                            </p>
                          </div>
                        </div>
                        {a.possible_conditions?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Possible Conditions</p>
                            <div className="flex flex-wrap gap-1.5">
                              {a.possible_conditions.map((c, i) => (
                                <span key={i} className="text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                  {c.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {a.recommendations && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-200 dark:border-gray-700 pt-2">{a.recommendations}</p>
                        )}
                        {a.suggested_specialist && (
                          <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">Suggested: {a.suggested_specialist}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DoctorPatients() {
  const [selected, setSelected] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['doctor-patients'],
    queryFn: () => appointmentService.list().then((r) => r.data.results || r.data),
  })

  const patients = data
    ? [...new Map(data.filter(a => a.patient?.id).map((a) => [a.patient.id, a.patient])).values()]
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Patients</h1>
        <span className="text-sm text-gray-500">{patients.length} patient{patients.length !== 1 ? 's' : ''}</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : patients.length === 0 ? (
        <EmptyState icon={Users} title="No patients yet" description="Patients from your appointments will appear here" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patients.map((patient) => (
            <button
              key={patient.id}
              onClick={() => setSelected(patient)}
              className="text-left w-full"
            >
              <Card className="flex items-center gap-4 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800 transition-all cursor-pointer group">
                <Avatar name={`${patient.first_name} ${patient.last_name}`} src={patient.avatar} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white">{patient.first_name} {patient.last_name}</p>
                  <p className="text-sm text-gray-500 truncate">{patient.email}</p>
                  <p className="text-xs text-gray-400">{patient.country}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0" />
              </Card>
            </button>
          ))}
        </div>
      )}

      {selected && <PatientDetailPanel patient={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
