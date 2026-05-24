import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Save } from 'lucide-react'
import { patientService, authService } from '@/services'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/ui'
import { Input, Select, Textarea } from '@/components/ui/FormFields'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { useEffect } from 'react'

export default function PatientProfile() {
  const { user, updateUser } = useAuthStore()
  const qc = useQueryClient()

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <User className="w-5 h-5 text-primary-600" /> My Profile
      </h1>

      {/* Personal Info */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">Personal Information</h2>
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
        <h2 className="font-semibold text-gray-900 mb-4">Health Profile</h2>
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
