import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, Plus, Trash2, Wifi } from 'lucide-react'
import { doctorService } from '@/services'
import { Card, Badge } from '@/components/ui'
import { Select } from '@/components/ui/FormFields'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const STATUS_OPTIONS = [
  { value: 'available', label: 'Available', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'busy', label: 'Busy', color: 'bg-amber-100 text-amber-700' },
  { value: 'offline', label: 'Offline', color: 'bg-gray-100 text-gray-700' },
  { value: 'emergency_duty', label: 'Emergency Duty', color: 'bg-red-100 text-red-700' },
]

export default function DoctorAvailability() {
  const qc = useQueryClient()
  const { register, handleSubmit, reset } = useForm()

  const { data: availability } = useQuery({
    queryKey: ['availability'],
    queryFn: () => doctorService.getAvailability().then((r) => r.data.results || r.data),
  })

  const addMutation = useMutation({
    mutationFn: (data) => doctorService.setAvailability(data),
    onSuccess: () => { qc.invalidateQueries(['availability']); reset(); toast.success('Availability added!') },
    onError: () => toast.error('Failed to add availability'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => doctorService.deleteAvailability(id),
    onSuccess: () => { qc.invalidateQueries(['availability']); toast.success('Removed') },
  })

  const statusMutation = useMutation({
    mutationFn: (status) => doctorService.updateStatus(status),
    onSuccess: () => toast.success('Status updated!'),
    onError: () => toast.error('Failed to update status'),
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Availability Settings</h1>

      {/* Online Status */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Wifi className="w-4 h-4 text-primary-600" /> Online Status
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STATUS_OPTIONS.map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => statusMutation.mutate(value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${color} border-transparent hover:border-current`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Add Availability */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary-600" /> Set Available Hours
        </h2>
        <form onSubmit={handleSubmit(addMutation.mutate)} className="grid grid-cols-3 gap-3">
          <Select {...register('day_of_week', { required: true })}>
            <option value="">Day</option>
            {DAYS.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </Select>
          <input type="time" className="input" {...register('start_time', { required: true })} />
          <input type="time" className="input" {...register('end_time', { required: true })} />
          <Button type="submit" loading={addMutation.isPending} className="col-span-3">
            <Plus className="w-4 h-4" /> Add Time Slot
          </Button>
        </form>
      </Card>

      {/* Current Schedule */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">Current Schedule</h2>
        {availability?.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No availability set yet</p>
        ) : (
          <div className="space-y-2">
            {availability?.map((slot) => (
              <div key={slot.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="primary" className="capitalize">{slot.day_of_week}</Badge>
                  <span className="text-sm text-gray-700">{slot.start_time} – {slot.end_time}</span>
                </div>
                <button onClick={() => deleteMutation.mutate(slot.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
