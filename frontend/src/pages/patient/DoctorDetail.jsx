import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { Star, MapPin, Globe, Clock, Award, ArrowLeft } from 'lucide-react'
import { doctorService } from '@/services'
import { Card, Badge, Avatar, Spinner, MedicalDisclaimer } from '@/components/ui'

export default function DoctorDetailPage() {
  const { id } = useParams()
  const { data: doctor, isLoading } = useQuery({
    queryKey: ['doctor', id],
    queryFn: () => doctorService.detail(id).then((r) => r.data),
  })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  if (!doctor) return <p className="text-center text-gray-500">Doctor not found</p>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/patient/doctors" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to Doctors
      </Link>

      <Card>
        <div className="flex items-start gap-4">
          <Avatar name={`Dr. ${doctor.user?.first_name} ${doctor.user?.last_name}`} src={doctor.user?.avatar} size="xl" />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Dr. {doctor.user?.first_name} {doctor.user?.last_name}</h1>
            <p className="text-primary-600 font-medium">{doctor.specialization?.name}</p>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="font-medium">{doctor.average_rating}</span>
              <span className="text-gray-400 text-sm">({doctor.total_consultations} consultations)</span>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{doctor.user?.country}</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{doctor.years_of_experience} years exp.</span>
              <span className="flex items-center gap-1"><Globe className="w-4 h-4" />{doctor.languages_spoken?.join(', ')}</span>
            </div>
          </div>
        </div>

        {doctor.bio && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-2">About</h3>
            <p className="text-sm text-gray-600">{doctor.bio}</p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Consultation Fee</p>
            <p className="text-2xl font-bold text-gray-900">${doctor.consultation_fee}</p>
          </div>
          <Link to={`/patient/doctors/${id}/book`} className="btn-primary px-6 py-3">
            Book Consultation
          </Link>
        </div>
      </Card>
    </div>
  )
}
