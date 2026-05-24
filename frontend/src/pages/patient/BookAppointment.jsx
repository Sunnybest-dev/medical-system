import { useForm } from 'react-hook-form'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { doctorService, appointmentService } from '@/services'
import { Card, Spinner } from '@/components/ui'
import { Input, Textarea } from '@/components/ui/FormFields'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

export default function BookAppointment() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: doctor, isLoading } = useQuery({
    queryKey: ['doctor', id],
    queryFn: () => doctorService.detail(id).then((r) => r.data),
  })

  const { register, handleSubmit, formState: { errors } } = useForm()

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => appointmentService.create({ ...data, doctor: id }),
    onSuccess: () => {
      toast.success('Appointment booked successfully!')
      navigate('/patient/appointments')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Booking failed'),
  })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link to={`/patient/doctors/${id}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to Profile
      </Link>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Book Appointment</h1>
        <p className="text-sm text-gray-500">with Dr. {doctor?.user?.first_name} {doctor?.user?.last_name}</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit(mutate)} className="space-y-4">
          <Input
            label="Preferred Date & Time"
            type="datetime-local"
            error={errors.scheduled_at?.message}
            {...register('scheduled_at', { required: 'Please select a date and time' })}
          />
          <Textarea
            label="Chief Complaint / Reason for Visit"
            placeholder="Briefly describe your symptoms or reason for consultation..."
            error={errors.chief_complaint?.message}
            {...register('chief_complaint', { required: 'Please describe your reason for visit' })}
          />

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Consultation Fee</span>
              <span className="font-semibold">${doctor?.consultation_fee}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Payment</span>
              <span className="text-amber-600 font-medium">Demo Mode</span>
            </div>
          </div>

          <Button type="submit" loading={isPending} className="w-full" size="lg">
            Confirm Booking
          </Button>
        </form>
      </Card>
    </div>
  )
}
