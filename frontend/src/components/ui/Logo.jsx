import { Heart } from 'lucide-react'
import { cn } from '@/utils'

export default function Logo({ size = 'md', showText = true, subtitle = null }) {
  const sizes = {
    sm: { wrap: 'w-8 h-8 rounded-lg', icon: 'w-4 h-4', title: 'text-base', sub: 'text-xs' },
    md: { wrap: 'w-9 h-9 rounded-xl', icon: 'w-5 h-5', title: 'text-lg', sub: 'text-xs' },
    lg: { wrap: 'w-12 h-12 rounded-2xl', icon: 'w-6 h-6', title: 'text-xl', sub: 'text-sm' },
  }
  const s = sizes[size]
  return (
    <div className="flex items-center gap-3">
      <div className={cn('bg-primary-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/30', s.wrap)}>
        <Heart className={cn('text-white fill-white', s.icon)} />
      </div>
      {showText && (
        <div>
          <h1 className={cn('font-bold text-gray-900 dark:text-white leading-none', s.title)}>MediAI</h1>
          {subtitle && <p className={cn('text-gray-400 dark:text-gray-500 leading-none mt-0.5', s.sub)}>{subtitle}</p>}
        </div>
      )}
    </div>
  )
}
