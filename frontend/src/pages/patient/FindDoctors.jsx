import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search, Star, MapPin, Globe, DollarSign, Filter } from 'lucide-react'
import { doctorService } from '@/services'
import { Card, Badge, Avatar, Spinner, EmptyState } from '@/components/ui'
import { Input, Select } from '@/components/ui/FormFields'

export default function FindDoctors() {
  const [filters, setFilters] = useState({ search: '', country: '', language: '', min_rating: '' })

  const { data: specializations } = useQuery({
    queryKey: ['specializations'],
    queryFn: () => doctorService.getSpecializations().then((r) => r.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['doctors', filters],
    queryFn: () => doctorService.list(filters).then((r) => r.data.results || r.data),
    keepPreviousData: true,
  })

  const statusColors = {
    available: 'bg-emerald-500',
    busy: 'bg-amber-500',
    offline: 'bg-gray-400',
    emergency_duty: 'bg-red-500',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Find a Doctor</h1>
        <p className="text-sm text-gray-500 mt-0.5">Browse verified healthcare specialists</p>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search doctors..."
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            />
          </div>
          <input
            className="input"
            placeholder="Country"
            value={filters.country}
            onChange={(e) => setFilters((p) => ({ ...p, country: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Language"
            value={filters.language}
            onChange={(e) => setFilters((p) => ({ ...p, language: e.target.value }))}
          />
          <Select value={filters.min_rating} onChange={(e) => setFilters((p) => ({ ...p, min_rating: e.target.value }))}>
            <option value="">Any Rating</option>
            <option value="4">4+ Stars</option>
            <option value="4.5">4.5+ Stars</option>
          </Select>
        </div>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : data?.length === 0 ? (
        <EmptyState icon={Search} title="No doctors found" description="Try adjusting your filters" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(data || []).map((doctor) => (
            <Card key={doctor.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="relative">
                  <Avatar name={`Dr. ${doctor.user?.first_name} ${doctor.user?.last_name}`} src={doctor.user?.avatar} size="lg" />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${statusColors[doctor.online_status] || 'bg-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">Dr. {doctor.user?.first_name} {doctor.user?.last_name}</h3>
                  <p className="text-xs text-primary-600 font-medium">{doctor.specialization?.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-xs text-gray-600">{doctor.average_rating || '0.0'}</span>
                    <span className="text-xs text-gray-400">({doctor.total_consultations} consults)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin className="w-3.5 h-3.5" /> {doctor.user?.country || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Globe className="w-3.5 h-3.5" /> {doctor.languages_spoken?.join(', ') || 'English'}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <DollarSign className="w-3.5 h-3.5" /> ${doctor.consultation_fee} per consultation
                </div>
              </div>

              <div className="flex gap-2">
                <Link to={`/patient/doctors/${doctor.id}`} className="btn-secondary text-xs flex-1 text-center py-2">
                  View Profile
                </Link>
                <Link to={`/patient/doctors/${doctor.id}/book`} className="btn-primary text-xs flex-1 text-center py-2">
                  Book Now
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
