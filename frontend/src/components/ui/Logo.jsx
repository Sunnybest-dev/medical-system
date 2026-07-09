import logoImg from '@/logo/logo-v2.png'
import { cn } from '@/utils'

export default function Logo({ size = 'md', showText = true, subtitle = null }) {
  const sizes = {
    sm: { img: 'h-7', title: 'text-base', sub: 'text-xs' },
    md: { img: 'h-8', title: 'text-lg', sub: 'text-xs' },
    lg: { img: 'h-10', title: 'text-xl', sub: 'text-sm' },
  }
  const s = sizes[size]
  return (
    <div className="flex items-center gap-2.5">
      <img src={logoImg} alt="Mxta" className={cn('w-auto object-contain flex-shrink-0', s.img)} />
      {showText && (
        <div>
          <h1 className={cn('font-bold text-gray-900 dark:text-white leading-none', s.title)}>Mxta</h1>
          {subtitle && <p className={cn('text-gray-400 dark:text-gray-500 leading-none mt-0.5', s.sub)}>{subtitle}</p>}
        </div>
      )}
    </div>
  )
}
