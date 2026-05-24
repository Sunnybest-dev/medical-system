import { cn, getInitials } from '@/utils'
import { Loader2 } from 'lucide-react'

export function Card({ children, className, ...props }) {
  return (
    <div className={cn('card', className)} {...props}>
      {children}
    </div>
  )
}

export function Badge({ children, className, variant = 'default' }) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-primary-100 text-primary-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  }
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}

export function Avatar({ src, name, size = 'md', className }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base', xl: 'w-20 h-20 text-xl' }
  return (
    <div className={cn('rounded-full flex items-center justify-center font-semibold bg-primary-100 text-primary-700 overflow-hidden flex-shrink-0', sizes[size], className)}>
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : getInitials(name)}
    </div>
  )
}

export function Spinner({ size = 'md', className }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return <Loader2 className={cn('animate-spin text-primary-600', sizes[size], className)} />
}

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto">
          <span className="text-white text-2xl font-bold">M</span>
        </div>
        <Spinner size="lg" />
        <p className="text-gray-500 text-sm">Loading MediAI...</p>
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-12 space-y-3">
      {Icon && <Icon className="w-12 h-12 text-gray-300 mx-auto" />}
      <h3 className="text-gray-600 font-medium">{title}</h3>
      {description && <p className="text-gray-400 text-sm">{description}</p>}
      {action}
    </div>
  )
}

export function StatCard({ title, value, icon: Icon, color = 'primary', trend }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    green: 'bg-emerald-50 text-emerald-600',
    yellow: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && <p className="text-xs text-emerald-600 mt-1">{trend}</p>}
        </div>
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', colors[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  )
}

export function MedicalDisclaimer({ className }) {
  return (
    <div className={cn('bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800', className)}>
      <strong>⚠️ Medical Disclaimer:</strong> This information is for educational purposes only and does NOT constitute medical advice or diagnosis. Always consult a qualified healthcare professional for medical concerns.
    </div>
  )
}
