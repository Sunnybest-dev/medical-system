import { cn } from '@/utils'
import { forwardRef } from 'react'

export const Input = forwardRef(({ label, error, className, ...props }, ref) => (
  <div className="space-y-1">
    {label && <label className="label">{label}</label>}
    <input
      ref={ref}
      className={cn('input', error && 'border-red-500 focus:ring-red-500', className)}
      {...props}
    />
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
))
Input.displayName = 'Input'

export const Textarea = forwardRef(({ label, error, className, ...props }, ref) => (
  <div className="space-y-1">
    {label && <label className="label">{label}</label>}
    <textarea
      ref={ref}
      rows={4}
      className={cn('input resize-none', error && 'border-red-500', className)}
      {...props}
    />
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
))
Textarea.displayName = 'Textarea'

export const Select = forwardRef(({ label, error, children, className, ...props }, ref) => (
  <div className="space-y-1">
    {label && <label className="label">{label}</label>}
    <select
      ref={ref}
      className={cn('input bg-white', error && 'border-red-500', className)}
      {...props}
    >
      {children}
    </select>
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
))
Select.displayName = 'Select'
