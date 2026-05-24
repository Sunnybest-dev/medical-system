import { useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authService } from '@/services'
import { Spinner } from '@/components/ui'
import { CheckCircle, XCircle } from 'lucide-react'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')

  const { mutate, isPending, isSuccess, isError } = useMutation({
    mutationFn: () => authService.verifyEmail(token),
  })

  useEffect(() => { if (token) mutate() }, [token])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        {isPending && <><Spinner size="lg" className="mx-auto mb-4" /><p className="text-gray-600">Verifying your email...</p></>}
        {isSuccess && (
          <>
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Email Verified!</h2>
            <p className="text-gray-500 mb-6">Your email has been verified successfully.</p>
            <Link to="/login" className="btn-primary inline-block">Continue to Sign In</Link>
          </>
        )}
        {isError && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-gray-500 mb-6">Invalid or expired verification link.</p>
            <Link to="/login" className="btn-primary inline-block">Back to Sign In</Link>
          </>
        )}
      </div>
    </div>
  )
}
