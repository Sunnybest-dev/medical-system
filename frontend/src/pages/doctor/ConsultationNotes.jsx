import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus, X } from 'lucide-react'
import { appointmentService } from '@/services'
import { Card, Badge, EmptyState, Spinner, Avatar } from '@/components/ui'
import { Input, Textarea, Select } from '@/components/ui/FormFields'
import Button from '@/components/ui/Button'
import { formatDate } from '@/utils'
import toast from 'react-hot-toast'

export default function ConsultationNotes() {
  const [showForm, setShowForm] = useState(false)
  const qc = useQueryClient()

  const { data: notes, isLoading } = useQuery({
    queryKey: ['consultation-notes'],
    queryFn: () => appointmentService.getNotes().then((r) => r.data.results || r.data),
  })

  const { data: appointments } = useQuery({
    queryKey: ['doctor-appointments-for-notes'],
    queryFn: () => appointmentService.list({ status: 'confirmed' }).then((r) => r.data.results || r.data),
  })

  const { register, handleSubmit, reset } = useForm()

  const createMutation = useMutation({
    mutationFn: (data) => appointmentService.createNote(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consultation-notes'] })
      toast.success('Note created!')
      setShowForm(false)
      reset()
    },
    onError: () => toast.error('Failed to create note'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Consultation Notes</h1>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> New Note
        </Button>
      </div>

      {showForm && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Create Consultation Note</h2>
            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          <form onSubmit={handleSubmit(createMutation.mutate)} className="space-y-4">
            <Select label="Appointment" {...register('appointment', { required: true })}>
              <option value="">Select appointment</option>
              {appointments?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.patient?.first_name} {a.patient?.last_name} – {formatDate(a.scheduled_at)}
                </option>
              ))}
            </Select>
            <Textarea label="Subjective (Patient's complaints)" placeholder="Patient reports..." {...register('subjective', { required: true })} />
            <Textarea label="Objective (Examination findings)" placeholder="On examination..." {...register('objective')} />
            <Textarea label="Assessment" placeholder="Clinical assessment..." {...register('assessment', { required: true })} />
            <Textarea label="Plan (Treatment plan and recommendations)" placeholder="Recommended plan..." {...register('plan', { required: true })} />
            <Input label="Follow-up Date (optional)" type="date" {...register('follow_up_date')} />
            <Button type="submit" loading={createMutation.isPending}>Save Note</Button>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !notes?.length ? (
        <EmptyState icon={FileText} title="No consultation notes" description="Create notes after consultations" />
      ) : (
        <div className="space-y-4">
          {notes?.map((note) => (
            <Card key={note.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar name={note.patient_name} src={note.patient_avatar} size="sm" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{note.patient_name}</p>
                    <p className="text-xs text-gray-400">{formatDate(note.created_at)}</p>
                  </div>
                </div>
                <Badge variant={note.is_shared_with_patient ? 'success' : 'default'}>
                  {note.is_shared_with_patient ? 'Shared' : 'Private'}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium text-gray-700 dark:text-gray-300">S: </span><span className="text-gray-600 dark:text-gray-400">{note.subjective}</span></div>
                {note.objective && <div><span className="font-medium text-gray-700 dark:text-gray-300">O: </span><span className="text-gray-600 dark:text-gray-400">{note.objective}</span></div>}
                <div><span className="font-medium text-gray-700 dark:text-gray-300">A: </span><span className="text-gray-600 dark:text-gray-400">{note.assessment}</span></div>
                <div><span className="font-medium text-gray-700 dark:text-gray-300">P: </span><span className="text-gray-600 dark:text-gray-400">{note.plan}</span></div>
                {note.follow_up_date && (
                  <div><span className="font-medium text-gray-700 dark:text-gray-300">Follow-up: </span><span className="text-gray-600 dark:text-gray-400">{formatDate(note.follow_up_date)}</span></div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
