import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, UserX, UserCheck } from 'lucide-react'
import { adminService } from '@/services'
import { Card, Badge, Avatar, Spinner, EmptyState } from '@/components/ui'
import Button from '@/components/ui/Button'
import { formatDate } from '@/utils'
import toast from 'react-hot-toast'

export default function AdminUsers() {
  const [roleFilter, setRoleFilter] = useState('patient')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', roleFilter],
    queryFn: () => adminService.getUsers(roleFilter).then((r) => r.data.results || r.data),
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, action }) => adminService.userAction(id, action),
    onSuccess: (_, vars) => {
      toast.success(`User ${vars.action}d`)
      qc.invalidateQueries(['admin-users'])
    },
    onError: () => toast.error('Action failed'),
  })

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">User Management</h1>

      <div className="flex gap-2">
        {['patient', 'doctor'].map((r) => (
          <button key={r} onClick={() => setRoleFilter(r)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${roleFilter === r ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {r}s
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : data?.length === 0 ? (
        <EmptyState icon={Users} title="No users found" />
      ) : (
        <div className="space-y-3">
          {data?.map((user) => (
            <Card key={user.id} className="flex items-center gap-4">
              <Avatar name={`${user.first_name} ${user.last_name}`} src={user.avatar} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{user.first_name} {user.last_name}</p>
                <p className="text-sm text-gray-500">{user.email} • {user.country}</p>
                <p className="text-xs text-gray-400">Joined {formatDate(user.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={user.is_active ? 'success' : 'danger'}>{user.is_active ? 'Active' : 'Inactive'}</Badge>
                <Button
                  size="sm"
                  variant={user.is_active ? 'danger' : 'secondary'}
                  onClick={() => actionMutation.mutate({ id: user.id, action: user.is_active ? 'deactivate' : 'activate' })}
                  loading={actionMutation.isPending}
                >
                  {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  {user.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
