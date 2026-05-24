import { useForm } from 'react-hook-form'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authService } from '@/services'
import { Input } from '@/components/ui/FormFields'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { register, handleSubmit } = useForm()

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => authService.resetPassword({ ...data, token: params.get('token') }),
    onSuccess: () => { toast.success('Password reset!'); navigate('/login') },
    onError: () => toast.error('Invalid or expired token'),
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Reset Password</h2>
        <form onSubmit={handleSubmit(mutate)} className="space-y-4">
          <Input label="New Password" type="password" placeholder="••••••••" {...register('new_password')} />
          <Button type="submit" loading={isPending} className="w-full">Reset Password</Button>
        </form>
      </div>
    </div>
  )
}
