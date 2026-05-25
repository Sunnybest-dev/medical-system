import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, UserX, UserCheck, Search, Mail, Globe, Calendar, Shield } from 'lucide-react'
import { adminService } from '@/services'
import { Badge, Avatar, Spinner, EmptyState } from '@/components/ui'
import Button from '@/components/ui/Button'
import { formatDate, cn } from '@/utils'
import toast from 'react-hot-toast'

export default function AdminUsers() {
  const [roleFilter, setRoleFilter] = useState('patient')
  const [search, setSearch] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', roleFilter],
    queryFn: () => adminService.getUsers(roleFilter).then(r => r.data.results || r.data),
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, action }) => adminService.userAction(id, action),
    onSuccess: (_, vars) => {
      toast.success(`User ${vars.action}d successfully`)
      qc.invalidateQueries(['admin-users'])
      qc.invalidateQueries(['admin-dashboard'])
    },
    onError: () => toast.error('Action failed'),
  })

  const filtered = (data || []).filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.country?.toLowerCase().includes(q)
    )
  })

  const activeCount = (data || []).filter(u => u.is_active).length
  const inactiveCount = (data || []).filter(u => !u.is_active).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage patient and doctor accounts</p>
      </div>

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total', value: data.length, color: 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300' },
            { label: 'Active', value: activeCount, color: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' },
            { label: 'Inactive', value: inactiveCount, color: 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-2xl p-4 text-center ${color}`}>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          {['patient', 'doctor'].map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all',
                roleFilter === r
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary-300'
              )}
            >
              {r === 'patient' ? <Users className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              {r}s
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, email, country..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{search ? 'No users match your search' : 'No users found'}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map(user => (
              <div key={user.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="relative">
                  <Avatar name={`${user.first_name} ${user.last_name}`} src={user.avatar} size="md" />
                  <span className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900',
                    user.is_active ? 'bg-emerald-500' : 'bg-gray-400'
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {user.first_name} {user.last_name}
                    </p>
                    <Badge variant={user.is_email_verified ? 'success' : 'warning'} className="text-xs">
                      {user.is_email_verified ? '✓ Verified' : 'Unverified'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Mail className="w-3 h-3" /> {user.email}
                    </span>
                    {user.country && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Globe className="w-3 h-3" /> {user.country}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="w-3 h-3" /> {user.created_at ? formatDate(user.created_at) : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn(
                    'text-xs font-medium px-2.5 py-1 rounded-full',
                    user.is_active
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                  )}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <Button
                    size="sm"
                    variant={user.is_active ? 'danger' : 'secondary'}
                    onClick={() => actionMutation.mutate({ id: user.id, action: user.is_active ? 'deactivate' : 'activate' })}
                    loading={actionMutation.isPending}
                  >
                    {user.is_active
                      ? <><UserX className="w-3.5 h-3.5" /> Deactivate</>
                      : <><UserCheck className="w-3.5 h-3.5" /> Activate</>
                    }
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
