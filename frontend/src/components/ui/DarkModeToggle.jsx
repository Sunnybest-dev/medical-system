import { Sun, Moon } from 'lucide-react'
import { cn } from '@/utils'

export default function DarkModeToggle({ dark, setDark, className }) {
  return (
    <button
      onClick={() => setDark(!dark)}
      className={cn(
        'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
        'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
        'dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800',
        className
      )}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
