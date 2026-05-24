import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus, X } from 'lucide-react'
import { appointmentService } from '@/services'
import { Card, Badge, EmptyState, Spinner, MedicalDisclaimer } from '@/components/ui'
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
    queryKey: ['completed-appointments'],
    queryFn: () => appointmentService.list({ status: 'confirmed' }).then((r) => r.data.results || r.data),
  })

  const { register, handleSubmit, reset } = useForm()

  const createMutation = useMutation({
    mutationFn: (data) => appointmentService.createNote(data),
    onSuccess: () => {
      qc.invalidateQueries(['consultation-notes'])
      toast.success('Note created!')
      setShowForm(false)
      reset()
    },
    onError: () => toast.error('Failed to create note'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Consultation Notes</h1>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> New Note
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Create Consultation Note</h2>
            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          <MedicalDisclaimer className="mb-4" />
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
            <Textarea label="Assessment (Clinical assessment – NOT a diagnosis)" placeholder="Clinical assessment..." {...register('assessment', { required: true })} />
            <Textarea label="Plan (Treatment plan and recommendations)" placeholder="Recommended plan..." {...register('plan', { required: true })} />
            <Input label="Follow-up Date (optional)" type="date" {...register('follow_up_date')} />
            <Button type="submit" loading={createMutation.isPending}>Save Note</Button>
          </form>
        </Card>
      )}

      {/* Notes List */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : notes?.length === 0 ? (
        <EmptyState icon={FileText} title="No consultation notes" description="Create notes after consultations" />
      ) : (
        <div className="space-y-4">
          {notes?.map((note) => (
            <Card key={note.id}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {note.appointment?.patient?.first_name} {note.appointment?.patient?.last_name}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(note.created_at)}</p>
                </div>
                <Badge variant={note.is_shared_with_patient ? 'success' : 'default'}>
                  {note.is_shared_with_patient ? 'Shared' : 'Private'}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium text-gray-700">S: </span><span className="text-gray-600">{note.subjective}</span></div>
                {note.objective && <div><span className="font-medium text-gray-700">O: </span><span className="text-gray-600">{note.objective}</span></div>}
                <div><span className="font-medium text-gray-700">A: </span><span className="text-gray-600">{note.assessment}</span></div>
                <div><span className="font-medium text-gray-700">P: </span><span className="text-gray-600">{note.plan}</span></div>
              </div>
              <p className="text-xs text-amber-600 mt-3 bg-amber-50 p-2 rounded">{note.disclaimer}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
