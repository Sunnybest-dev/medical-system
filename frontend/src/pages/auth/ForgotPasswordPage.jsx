import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authService } from '@/services'
import { Input } from '@/components/ui/FormFields'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const { register, handleSubmit } = useForm()
  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: ({ email }) => authService.forgotPassword(email),
    onSuccess: () => toast.success('Reset link sent if email exists'),
    onError: () => toast.error('Something went wrong'),
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Forgot Password</h2>
        <p className="text-gray-500 text-sm mb-6">Enter your email and we'll send a reset link.</p>

        {isSuccess ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-emerald-800 text-sm">
            ✅ If this email exists, a reset link has been sent. Check your inbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit(mutate)} className="space-y-4">
            <Input label="Email Address" type="email" placeholder="you@example.com" {...register('email')} />
            <Button type="submit" loading={isPending} className="w-full">Send Reset Link</Button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link to="/login" className="text-primary-600 hover:underline">Back to Sign In</Link>
        </p>
      </div>
    </div>
  )
}
