import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Save, CheckCircle } from 'lucide-react'
import { doctorService } from '@/services'
import { Card, Badge } from '@/components/ui'
import { Input, Select, Textarea } from '@/components/ui/FormFields'
import Button from '@/components/ui/Button'
import { verificationStatusConfig } from '@/utils'
import toast from 'react-hot-toast'

const DOC_TYPES = [
  { value: 'government_id', label: 'Government ID' },
  { value: 'medical_license', label: 'Medical License' },
  { value: 'qualification', label: 'Qualification Certificate' },
  { value: 'profile_photo', label: 'Profile Photo' },
]

export default function DoctorProfilePage() {
  const qc = useQueryClient()
  const [uploadType, setUploadType] = useState('government_id')

  const { data: profile } = useQuery({
    queryKey: ['doctor-profile'],
    queryFn: () => doctorService.getProfile().then((r) => r.data),
  })

  const { data: specializations } = useQuery({
    queryKey: ['specializations'],
    queryFn: () => doctorService.getSpecializations().then((r) => r.data),
  })

  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    if (profile) reset({
      medical_license_number: profile.medical_license_number,
      medical_council_registration: profile.medical_council_registration,
      years_of_experience: profile.years_of_experience,
      consultation_fee: profile.consultation_fee,
      bio: profile.bio,
      specialization: profile.specialization?.id,
    })
  }, [profile])

  const updateMutation = useMutation({
    mutationFn: (data) => doctorService.updateProfile(data),
    onSuccess: () => { qc.invalidateQueries(['doctor-profile']); toast.success('Profile updated!') },
    onError: () => toast.error('Update failed'),
  })

  const uploadMutation = useMutation({
    mutationFn: (fd) => doctorService.uploadDocument(fd),
    onSuccess: () => { qc.invalidateQueries(['doctor-profile']); toast.success('Document uploaded!') },
    onError: () => toast.error('Upload failed'),
  })

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    fd.append('document_type', uploadType)
    uploadMutation.mutate(fd)
  }

  const statusCfg = verificationStatusConfig[profile?.verification_status] || {}

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Doctor Profile</h1>
        <Badge className={statusCfg.color}>{statusCfg.label || 'Pending'}</Badge>
      </div>

      {/* Professional Info */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">Professional Information</h2>
        <form onSubmit={handleSubmit(updateMutation.mutate)} className="space-y-4">
          <Select label="Specialization" {...register('specialization')}>
            <option value="">Select specialization</option>
            {(specializations?.results || specializations || []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Medical License Number" {...register('medical_license_number')} />
            <Input label="Council Registration Number" {...register('medical_council_registration')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Years of Experience" type="number" {...register('years_of_experience')} />
            <Input label="Consultation Fee (USD)" type="number" {...register('consultation_fee')} />
          </div>
          <Textarea label="Bio / About" placeholder="Tell patients about yourself..." {...register('bio')} />
          <Button type="submit" loading={updateMutation.isPending} size="sm">
            <Save className="w-4 h-4" /> Save Profile
          </Button>
        </form>
      </Card>

      {/* Document Upload */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">Verification Documents</h2>
        <p className="text-sm text-gray-500 mb-4">Upload required documents for account verification. Accepted: PDF, JPG, PNG</p>

        <div className="flex gap-3 mb-4">
          <Select value={uploadType} onChange={(e) => setUploadType(e.target.value)} className="flex-1">
            {DOC_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <label className="btn-primary flex items-center gap-2 cursor-pointer whitespace-nowrap">
            <Upload className="w-4 h-4" />
            {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} disabled={uploadMutation.isPending} />
          </label>
        </div>

        {/* Uploaded docs */}
        {profile?.documents?.length > 0 && (
          <div className="space-y-2">
            {profile.documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle className={`w-4 h-4 ${doc.is_verified ? 'text-emerald-500' : 'text-gray-300'}`} />
                <span className="text-sm text-gray-700 flex-1 capitalize">{doc.document_type.replace('_', ' ')}</span>
                <Badge variant={doc.is_verified ? 'success' : 'default'}>{doc.is_verified ? 'Verified' : 'Pending'}</Badge>
                <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline">View</a>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
