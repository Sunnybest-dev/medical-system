import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Save, Camera } from 'lucide-react'
import { patientService, authService } from '@/services'
import { useAuthStore } from '@/store/authStore'
import { Card, Avatar } from '@/components/ui'
import { Input, Select, Textarea } from '@/components/ui/FormFields'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { useEffect, useRef } from 'react'

export default function PatientProfile() {
  const { user, updateUser } = useAuthStore()
  const qc = useQueryClient()
  const avatarRef = useRef(null)

  const { data: profile } = useQuery({
    queryKey: ['patient-profile'],
    queryFn: () => patientService.getProfile().then((r) => r.data),
  })

  const { register: regUser, handleSubmit: handleUser, reset: resetUser } = useForm()
  const { register: regProfile, handleSubmit: handleProfile, reset: resetProfile } = useForm()

  useEffect(() => {
    if (user) resetUser({ first_name: user.first_name, last_name: user.last_name, phone_number: user.phone_number, country: user.country })
  }, [user])

  useEffect(() => {
    if (profile) resetProfile(profile)
  }, [profile])

  const userMutation = useMutation({
    mutationFn: (data) => authService.updateMe(data),
    onSuccess: ({ data }) => { updateUser(data); toast.success('Profile updated!') },
    onError: () => toast.error('Update failed'),
  })

  const profileMutation = useMutation({
    mutationFn: (data) => patientService.updateProfile(data),
    onSuccess: () => { qc.invalidateQueries(['patient-profile']); toast.success('Health profile updated!') },
    onError: () => toast.error('Update failed'),
  })

  const avatarMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData()
      fd.append('avatar', file)
      return authService.uploadAvatar(fd)
    },
    onSuccess: ({ data }) => { updateUser({ avatar: data.avatar }); toast.success('Profile photo updated!') },
    onError: () => toast.error('Photo upload failed'),
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <User className="w-5 h-5 text-primary-600" /> My Profile
      </h1>

      {/* Avatar */}
      <Card>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Profile Photo</h2>
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar name={`${user?.first_name} ${user?.last_name}`} src={user?.avatar} size="xl" />
            {avatarMutation.isPending && (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Upload a clear photo of yourself</p>
            <label className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-xl cursor-pointer transition-colors">
              <Camera className="w-4 h-4" />
              {avatarMutation.isPending ? 'Uploading...' : 'Change Photo'}
              <input
                ref={avatarRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => e.target.files[0] && avatarMutation.mutate(e.target.files[0])}
              />
            </label>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG or WebP · Max 5 MB</p>
          </div>
        </div>
      </Card>

      {/* Personal Info */}
      <Card>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h2>
        <form onSubmit={handleUser(userMutation.mutate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" {...regUser('first_name')} />
            <Input label="Last Name" {...regUser('last_name')} />
          </div>
          <Input label="Phone Number" {...regUser('phone_number')} />
          <Input label="Country" {...regUser('country')} />
          <Button type="submit" loading={userMutation.isPending} size="sm">
            <Save className="w-4 h-4" /> Save Changes
          </Button>
        </form>
      </Card>

      {/* Health Profile */}
      <Card>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Health Profile</h2>
        <form onSubmit={handleProfile(profileMutation.mutate)} className="space-y-4">
          <Select label="Blood Group" {...regProfile('blood_group')}>
            <option value="">Select blood group</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </Select>
          <Textarea label="Allergies" placeholder="List any known allergies..." rows={2} {...regProfile('allergies')} />
          <Textarea label="Existing Medical Conditions" placeholder="List any existing conditions..." rows={2} {...regProfile('existing_conditions')} />
          <Textarea label="Current Medications" placeholder="List current medications..." rows={2} {...regProfile('current_medications')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Height (cm)" type="number" {...regProfile('height_cm')} />
            <Input label="Weight (kg)" type="number" {...regProfile('weight_kg')} />
          </div>
          <div className="border-t border-gray-100 pt-4">
            <h3 className="font-medium text-gray-900 mb-3">Emergency Contact</h3>
            <div className="space-y-3">
              <Input label="Contact Name" {...regProfile('emergency_contact_name')} />
              <Input label="Contact Phone" {...regProfile('emergency_contact_phone')} />
              <Input label="Relationship" {...regProfile('emergency_contact_relationship')} />
            </div>
          </div>
          <Button type="submit" loading={profileMutation.isPending} size="sm">
            <Save className="w-4 h-4" /> Save Health Profile
          </Button>
        </form>
      </Card>
    </div>
  )
}
