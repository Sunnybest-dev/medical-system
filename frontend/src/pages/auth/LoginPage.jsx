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
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
})

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: authService.loginPatient,
    onSuccess: ({ data }) => {
      setAuth(data.user, data.tokens)
      toast.success(`Welcome back, ${data.user.first_name}!`)
      const role = data.user.role
      navigate(role === 'admin' ? '/admin' : role === 'doctor' ? '/doctor' : '/patient')
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Invalid credentials')
    },
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo size="lg" />
          <p className="text-gray-500 mt-2">AI-Powered Telehealth Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign In</h2>

          <form onSubmit={handleSubmit(mutate)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-primary-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" loading={isPending} className="w-full" size="lg">
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-600 font-medium hover:underline">Register as Patient</Link>
            </p>
            <p className="text-sm text-gray-500">
              Are you a doctor?{' '}
              <Link to="/register/doctor" className="text-primary-600 font-medium hover:underline">Register as Doctor</Link>
            </p>
            <p className="text-sm text-gray-500">
              Admin?{' '}
              <Link to="/register/admin" className="text-primary-600 font-medium hover:underline">Create Admin Account</Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
