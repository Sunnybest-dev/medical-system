import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authService } from '@/services'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/FormFields'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

const schema = z.object({
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  password_confirm: z.string(),
  phone_number: z.string().min(7),
  country: z.string().min(2),
}).refine((d) => d.password === d.password_confirm, {
  message: 'Passwords do not match',
  path: ['password_confirm'],
})

export default function RegisterDoctorPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const { mutate, isPending } = useMutation({
    mutationFn: authService.registerDoctor,
    onSuccess: ({ data }) => {
      setAuth(data.user, data.tokens)
      toast.success('Doctor account created! Complete your profile to get verified.')
      navigate('/doctor/profile')
    },
    onError: (err) => {
      const msg = err.response?.data
      toast.error(typeof msg === 'object' ? Object.values(msg).flat()[0] : 'Registration failed')
    },
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl font-bold">M</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Doctor Registration</h1>
          <p className="text-gray-500 mt-1">Join Mxta as a verified healthcare provider</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-sm text-blue-800">
            <strong>Note:</strong> After registration, you'll need to complete your profile and upload verification documents. Your account will be reviewed by our admin team before activation.
          </div>

          <form onSubmit={handleSubmit(mutate)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" placeholder="Jane" error={errors.first_name?.message} {...register('first_name')} />
              <Input label="Last Name" placeholder="Smith" error={errors.last_name?.message} {...register('last_name')} />
            </div>
            <Input label="Email Address" type="email" placeholder="doctor@hospital.com" error={errors.email?.message} {...register('email')} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Password" type="password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />
              <Input label="Confirm Password" type="password" placeholder="••••••••" error={errors.password_confirm?.message} {...register('password_confirm')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Phone Number" placeholder="+1234567890" error={errors.phone_number?.message} {...register('phone_number')} />
              <Input label="Country" placeholder="United States" error={errors.country?.message} {...register('country')} />
            </div>

            <Button type="submit" loading={isPending} className="w-full" size="lg">
              Create Doctor Account
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
