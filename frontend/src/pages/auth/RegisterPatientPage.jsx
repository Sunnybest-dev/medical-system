import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authService } from '@/services'
import { useAuthStore } from '@/store/authStore'
import { Input, Select } from '@/components/ui/FormFields'
import Button from '@/components/ui/Button'
import Logo from '@/components/ui/Logo'
import toast from 'react-hot-toast'

const schema = z.object({
  first_name: z.string().min(2, 'First name required'),
  last_name: z.string().min(2, 'Last name required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
  password_confirm: z.string(),
  phone_number: z.string().min(7, 'Phone required'),
  country: z.string().min(2, 'Country required'),
  date_of_birth: z.string().min(1, 'Date of birth required'),
  gender: z.enum(['male', 'female', 'other']),
}).refine((d) => d.password === d.password_confirm, {
  message: 'Passwords do not match',
  path: ['password_confirm'],
})

export default function RegisterPatientPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: authService.registerPatient,
    onSuccess: ({ data }) => {
      setAuth(data.user, data.tokens)
      toast.success('Account created! Please verify your email.')
      navigate('/patient')
    },
    onError: (err) => {
      const msg = err.response?.data
      toast.error(typeof msg === 'object' ? Object.values(msg).flat()[0] : 'Registration failed')
    },
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo size="lg" />
          <p className="text-gray-500 mt-2">Join Mxta for AI-powered healthcare</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit(mutate)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" placeholder="John" error={errors.first_name?.message} {...register('first_name')} />
              <Input label="Last Name" placeholder="Doe" error={errors.last_name?.message} {...register('last_name')} />
            </div>
            <Input label="Email Address" type="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Password" type="password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />
              <Input label="Confirm Password" type="password" placeholder="••••••••" error={errors.password_confirm?.message} {...register('password_confirm')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Phone Number" placeholder="+1234567890" error={errors.phone_number?.message} {...register('phone_number')} />
              <Input label="Country" placeholder="United States" error={errors.country?.message} {...register('country')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Date of Birth" type="date" error={errors.date_of_birth?.message} {...register('date_of_birth')} />
              <Select label="Gender" error={errors.gender?.message} {...register('gender')}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
            </div>

            <Button type="submit" loading={isPending} className="w-full" size="lg">
              Create Account
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
