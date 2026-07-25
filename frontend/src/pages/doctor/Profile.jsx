import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Upload, Save, CheckCircle, FileText, ExternalLink,
  Clock, AlertCircle, X, ImageIcon, FileBadge, IdCard, Camera,
} from 'lucide-react'
import { doctorService } from '@/services'
import { Card, Badge, Spinner } from '@/components/ui'
import { Input, Textarea } from '@/components/ui/FormFields'
import Button from '@/components/ui/Button'
import { verificationStatusConfig, cn } from '@/utils'
import toast from 'react-hot-toast'

// ─── constants ────────────────────────────────────────────────────────────────

const DOC_TYPES = [
  { value: 'government_id',  label: 'Government ID',              icon: IdCard },
  { value: 'medical_license', label: 'Medical License',           icon: FileBadge },
  { value: 'qualification',  label: 'Qualification Certificate',  icon: FileText },
  { value: 'profile_photo',  label: 'Profile Photo',              icon: Camera },
]

const DOC_ICON_MAP = {
  government_id:  IdCard,
  medical_license: FileBadge,
  qualification:  FileText,
  profile_photo:  Camera,
}

// 28 common medical specializations — matches the seed_specializations command
const BUILTIN_SPECIALIZATIONS = [
  'Cardiology', 'Dermatology', 'Emergency Medicine', 'Endocrinology',
  'Family Medicine', 'Gastroenterology', 'General Practice', 'Geriatrics',
  'Gynaecology', 'Haematology', 'Infectious Disease', 'Internal Medicine',
  'Nephrology', 'Neurology', 'Obstetrics', 'Oncology', 'Ophthalmology',
  'Orthopaedics', 'Otolaryngology (ENT)', 'Paediatrics', 'Pathology',
  'Psychiatry', 'Pulmonology', 'Radiology', 'Rheumatology',
  'Surgery (General)', 'Urology', 'Vascular Surgery',
]

// ─── UploadRow ─────────────────────────────────────────────────────────────────

function UploadRow({ onUploaded }) {
  const [uploadType, setUploadType] = useState('government_id')
  const [progress, setProgress]     = useState(0)
  const [uploading, setUploading]   = useState(false)
  const inputRef = useRef(null)

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Client-side guard (backend also validates)
    const allowed = ['image/jpeg', 'image/png', 'application/pdf']
    if (!allowed.includes(file.type)) {
      toast.error('Only JPG, PNG or PDF files are allowed.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File is too large. Maximum size is 10 MB.')
      return
    }

    const fd = new FormData()
    fd.append('file', file)
    fd.append('document_type', uploadType)

    setUploading(true)
    setProgress(0)

    doctorService
      .uploadDocument(fd, (evt) => {
        if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100))
      })
      .then((res) => {
        toast.success('Document uploaded successfully!')
        onUploaded(res.data)
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || 'Upload failed. Please try again.')
      })
      .finally(() => {
        setUploading(false)
        setProgress(0)
        // Reset the file input so the same file can be re-selected if needed
        if (inputRef.current) inputRef.current.value = ''
      })
  }

  return (
    <div className="space-y-3">
      {/* Type selector + trigger */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={uploadType}
          onChange={(e) => setUploadType(e.target.value)}
          className="input flex-1 min-w-[180px]"
          disabled={uploading}
        >
          {DOC_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <label className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer',
          uploading
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            : 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-500/20',
        )}>
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading…' : 'Choose & Upload'}
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFile}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Progress bar — only visible while uploading */}
      {uploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Uploading to Cloudinary…</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Accepted formats: PDF, JPG, PNG · Max size: 10 MB · You can upload multiple documents.
      </p>
    </div>
  )
}

// ─── DocumentGallery ───────────────────────────────────────────────────────────

function DocumentGallery({ documents }) {
  if (!documents?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
        <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No documents uploaded yet</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Upload your verification documents above
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {documents.map((doc) => {
        const Icon = DOC_ICON_MAP[doc.document_type] || FileText
        const typeLabel = DOC_TYPES.find(d => d.value === doc.document_type)?.label || doc.document_type
        const isImage = doc.file_url?.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)

        return (
          <div
            key={doc.id}
            className="group relative bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden hover:border-primary-300 dark:hover:border-primary-700 transition-all"
          >
            {/* Thumbnail / icon area */}
            <div className="h-28 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center overflow-hidden">
              {isImage ? (
                <img
                  src={doc.file_url}
                  alt={typeLabel}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              ) : (
                <Icon className="w-10 h-10 text-gray-400 dark:text-gray-500" />
              )}
            </div>

            {/* Info row */}
            <div className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{typeLabel}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {doc.is_verified ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                      <Clock className="w-3 h-3" /> Pending review
                    </span>
                  )}
                </div>
              </div>

              <a
                href={doc.file_url}
                target="_blank"
                rel="noreferrer"
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-primary-600 hover:border-primary-300 transition-colors"
                title="View document"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Lock badge — tells doctor they cannot delete */}
            <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
              Admin review
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── SpecializationField ───────────────────────────────────────────────────────

function SpecializationField({ register, setValue, currentName }) {
  const [mode, setMode] = useState('select') // 'select' | 'other'
  const [selectValue, setSelectValue] = useState('')

  // Fetch DB specializations (populated by seed_specializations command)
  const { data: dbSpecs } = useQuery({
    queryKey: ['specializations'],
    queryFn: () => doctorService.getSpecializations().then((r) => r.data?.results || r.data || []),
  })

  // Build the merged list: DB names first, then any BUILTIN not already in DB
  const dbNames = (dbSpecs || []).map((s) => s.name)
  const merged = [
    ...(dbSpecs || []),
    ...BUILTIN_SPECIALIZATIONS
      .filter((n) => !dbNames.includes(n))
      .map((n) => ({ id: null, name: n })),
  ].sort((a, b) => a.name.localeCompare(b.name))

  // Pre-select the doctor's current specialization
  useEffect(() => {
    if (!currentName) return
    const match = merged.find((s) => s.name === currentName)
    if (match) {
      setSelectValue(match.id || match.name)
      setMode('select')
    } else if (currentName) {
      setMode('other')
    }
  }, [currentName])

  const handleSelectChange = (e) => {
    const val = e.target.value
    if (val === '__other__') {
      setMode('other')
      setSelectValue('__other__')
      setValue('specialization_id', '')
      setValue('specialization_other', '')
    } else {
      setMode('select')
      setSelectValue(val)
      // If the option has a real UUID use it, otherwise pass the name as specialization_other
      const item = merged.find((s) => (s.id || s.name) === val)
      if (item?.id) {
        setValue('specialization_id', item.id)
        setValue('specialization_other', '')
      } else {
        setValue('specialization_id', '')
        setValue('specialization_other', item?.name || val)
      }
    }
  }

  return (
    <div className="space-y-2">
      <label className="label">Specialization</label>

      <select
        value={selectValue}
        onChange={handleSelectChange}
        className="input"
      >
        <option value="">— Select your specialization —</option>
        {merged.map((s) => (
          <option key={s.id || s.name} value={s.id || s.name}>
            {s.name}
          </option>
        ))}
        <option value="__other__">✏️ Other — type your own</option>
      </select>

      {/* Hidden fields consumed by react-hook-form */}
      <input type="hidden" {...register('specialization_id')} />
      <input type="hidden" {...register('specialization_other')} />

      {mode === 'other' && (
        <div className="flex items-center gap-2">
          <input
            className="input flex-1"
            placeholder="e.g. Paediatric Cardiology, Sports Medicine…"
            onChange={(e) => {
              setValue('specialization_other', e.target.value)
              setValue('specialization_id', '')
            }}
            defaultValue={
              !dbNames.includes(currentName) ? currentName : ''
            }
          />
          <button
            type="button"
            onClick={() => { setMode('select'); setSelectValue('') }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Back to list"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Can't find yours? Choose "Other" and type it in — it will be added to the system.
      </p>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function DoctorProfilePage() {
  const qc = useQueryClient()

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['doctor-profile'],
    queryFn: () => doctorService.getProfile().then((r) => r.data),
  })

  // Separate query for documents so the gallery refreshes independently
  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ['doctor-documents'],
    queryFn: () => doctorService.getDocuments().then((r) => r.data?.results || r.data || []),
  })

  const { register, handleSubmit, reset, setValue } = useForm()

  useEffect(() => {
    if (profile) {
      reset({
        medical_license_number:      profile.medical_license_number || '',
        medical_council_registration: profile.medical_council_registration || '',
        years_of_experience:         profile.years_of_experience ?? '',
        consultation_fee:            profile.consultation_fee ?? '',
        bio:                         profile.bio || '',
        specialization_id:           profile.specialization?.id || '',
        specialization_other:        '',
      })
    }
  }, [profile, reset])

  const updateMutation = useMutation({
    mutationFn: (data) => doctorService.updateProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctor-profile'] })
      toast.success('Profile updated successfully!')
    },
    onError: (err) => {
      const msg = err.response?.data
      if (typeof msg === 'object') {
        const first = Object.values(msg)[0]
        toast.error(Array.isArray(first) ? first[0] : String(first))
      } else {
        toast.error('Update failed. Please check your inputs.')
      }
    },
  })

  const onSubmit = (data) => {
    // Send only the relevant specialization field
    const payload = { ...data }
    if (payload.specialization_other) {
      delete payload.specialization_id
    } else {
      delete payload.specialization_other
    }
    updateMutation.mutate(payload)
  }

  const statusCfg = verificationStatusConfig[profile?.verification_status] || {}

  if (profileLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Doctor Profile</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Complete your profile to get verified and start accepting consultations
          </p>
        </div>
        <span className={cn('inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold', statusCfg.color)}>
          {statusCfg.label || 'Pending'}
        </span>
      </div>

      {/* Rejection notice */}
      {profile?.verification_status === 'rejected' && profile?.rejection_reason && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">Application Rejected</p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">{profile.rejection_reason}</p>
            <p className="text-xs text-red-500 dark:text-red-500 mt-1">
              Please update your documents and profile, then contact support for re-review.
            </p>
          </div>
        </div>
      )}

      {/* ── Professional Information ── */}
      <Card>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-5">Professional Information</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          <SpecializationField
            register={register}
            setValue={setValue}
            currentName={profile?.specialization?.name}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Medical License Number"
              placeholder="e.g. MED-123456"
              {...register('medical_license_number')}
            />
            <Input
              label="Council Registration No."
              placeholder="Optional"
              {...register('medical_council_registration')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Years of Experience"
              type="number"
              min={0}
              max={60}
              placeholder="e.g. 5"
              {...register('years_of_experience')}
            />
            <Input
              label="Consultation Fee (USD)"
              type="number"
              min={0}
              step="0.01"
              placeholder="e.g. 50.00"
              {...register('consultation_fee')}
            />
          </div>

          <Textarea
            label="Bio / About"
            placeholder="Tell patients about your experience, approach, and areas of expertise…"
            rows={4}
            {...register('bio')}
          />

          <Button type="submit" loading={updateMutation.isPending} size="sm">
            <Save className="w-4 h-4" /> Save Profile
          </Button>
        </form>
      </Card>

      {/* ── Verification Documents ── */}
      <Card>
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Verification Documents</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Upload all required documents. You can upload multiple files of different types.
            </p>
          </div>
          {documents?.length > 0 && (
            <span className="flex-shrink-0 text-xs bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-semibold px-2.5 py-1 rounded-full">
              {documents.length} file{documents.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-5 mt-3">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Documents are reviewed by our admin team. Once submitted, only an administrator can remove a document.
            Upload a corrected version if you need to replace one.
          </p>
        </div>

        {/* Upload row */}
        <UploadRow
          onUploaded={() => qc.invalidateQueries({ queryKey: ['doctor-documents'] })}
        />

        {/* Gallery */}
        <div className="mt-5">
          {docsLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <DocumentGallery documents={documents} />
          )}
        </div>
      </Card>
    </div>
  )
}
