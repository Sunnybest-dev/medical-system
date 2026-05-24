import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, Calendar, Clock, Users, MessageSquare,
  FileText, BarChart2, User, Menu, X, LogOut, Bell
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services'
import { Avatar } from '@/components/ui'
import Logo from '@/components/ui/Logo'
import DarkModeToggle from '@/components/ui/DarkModeToggle'
import { useDarkMode } from '@/hooks/useDarkMode'
import { cn } from '@/utils'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/doctor', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/doctor/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/doctor/availability', icon: Clock, label: 'Availability' },
  { to: '/doctor/patients', icon: Users, label: 'Patients' },
  { to: '/doctor/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/doctor/notes', icon: FileText, label: 'Consultation Notes' },
  { to: '/doctor/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/doctor/profile', icon: User, label: 'Profile' },
]

const statusColors = {
  available: 'bg-emerald-500',
  busy: 'bg-amber-500',
  offline: 'bg-gray-400',
  emergency_duty: 'bg-red-500',
}

export default function DoctorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dark, setDark] = useDarkMode()
  const { user, tokens, logout } = useAuthStore()
  const navigate = useNavigate()
  const doctorStatus = user?.doctor_profile?.online_status || 'offline'

  const handleLogout = async () => {
    try { await authService.logout(tokens?.refresh) } catch {}
    logout()
    navigate('/login')
    toast.success('Logged out successfully')
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        'fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform duration-200',
        'bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <Logo subtitle="Doctor Portal" />
          <button className="lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to} to={to} end={end}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar name={`Dr. ${user?.first_name} ${user?.last_name}`} src={user?.avatar} size="sm" />
              <span className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900', statusColors[doctorStatus])} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">Dr. {user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-gray-400 capitalize">{doctorStatus.replace('_', ' ')}</p>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between lg:px-6">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button className="relative w-9 h-9 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <DarkModeToggle dark={dark} setDark={setDark} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
