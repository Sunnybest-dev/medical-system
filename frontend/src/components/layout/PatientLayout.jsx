import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, User, Brain, Stethoscope, Calendar,
  MessageSquare, FileText, Pill, AlertTriangle, Menu, X, LogOut, Bell
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
  { to: '/patient', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/patient/assess', icon: Brain, label: 'AI Assessment' },
  { to: '/patient/doctors', icon: Stethoscope, label: 'Find Doctors' },
  { to: '/patient/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/patient/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/patient/records', icon: FileText, label: 'Medical Records' },
  { to: '/patient/medication', icon: Pill, label: 'Medication Info' },
  { to: '/patient/profile', icon: User, label: 'Profile' },
]

export default function PatientLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dark, setDark] = useDarkMode()
  const { user, tokens, logout } = useAuthStore()
  const navigate = useNavigate()

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

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform duration-200',
        'bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <Logo subtitle="Patient Portal" />
          <button className="lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
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

        {/* Emergency */}
        <div className="px-4 pb-2">
          <NavLink
            to="/patient/emergency"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 transition-colors w-full"
            onClick={() => setSidebarOpen(false)}
          >
            <AlertTriangle className="w-4 h-4" />
            Emergency
          </NavLink>
        </div>

        {/* User */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <Avatar name={user?.first_name + ' ' + user?.last_name} src={user?.avatar} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between lg:px-6">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1 lg:flex-none" />
          <div className="flex items-center gap-2">
            <NavLink
              to="/patient/emergency"
              className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Emergency
            </NavLink>
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
