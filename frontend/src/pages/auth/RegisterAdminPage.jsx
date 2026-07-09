import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authService } from '@/services'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/FormFields'
import Button from '@/components/ui/Button'
import Logo from '@/components/ui/Logo'
import { Shield } from 'lucide-react'
import toast from 'react-hot-toast'

const schema = z.object({
  first_name: z.string().min(2, 'First name required'),
  last_name: z.string().min(2, 'Last name required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
  password_confirm: z.string(),
  admin_secret: z.string().min(1, 'Admin secret key required'),
}).refine(d => d.password === d.password_confirm, {
  message: 'Passwords do not match',
  path: ['password_confirm'],
})

export default function RegisterAdminPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => authService.registerAdmin(data),
    onSuccess: ({ data }) => {
      setAuth(data.user, data.tokens)
      toast.success('Admin account created!')
      navigate('/admin')
    },
    onError: (err) => {
      if (!err.response) {
        toast.error('Cannot reach server. It may be starting up — wait 30 seconds and try again.')
        return
      }
      const msg = err.response?.data
      if (err.response?.status === 429) {
        toast.error('Too many attempts. Please wait a minute and try again.')
        return
      }
      toast.error(typeof msg === 'object' ? Object.values(msg).flat()[0] : 'Registration failed')
    },
  })

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="lg" />
          <div className="mt-4 inline-flex items-center gap-2 bg-primary-50 border border-primary-200 text-primary-700 text-sm px-4 py-1.5 rounded-full">
            <Shield className="w-4 h-4" /> Admin Registration
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Create Admin Account</h2>

          <form onSubmit={handleSubmit(mutate)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" placeholder="John" error={errors.first_name?.message} {...register('first_name')} />
              <Input label="Last Name" placeholder="Doe" error={errors.last_name?.message} {...register('last_name')} />
            </div>
            <Input label="Email Address" type="email" placeholder="admin@mediai.com" error={errors.email?.message} {...register('email')} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Password" type="password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />
              <Input label="Confirm Password" type="password" placeholder="••••••••" error={errors.password_confirm?.message} {...register('password_confirm')} />
            </div>
            <div>
              <Input
                label="Admin Secret Key"
                type="password"
                placeholder="Enter the admin secret key"
                error={errors.admin_secret?.message}
                {...register('admin_secret')}
              />
              <p className="text-xs text-gray-400 mt-1">Contact your system administrator for the secret key.</p>
            </div>

            <Button type="submit" loading={isPending} className="w-full" size="lg">
              <Shield className="w-4 h-4" /> Create Admin Account
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
