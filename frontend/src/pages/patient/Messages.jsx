import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, MessageSquare, Plus, X } from 'lucide-react'
import { messagingService, appointmentService } from '@/services'
import { useAuthStore } from '@/store/authStore'
import { Avatar, EmptyState, Spinner } from '@/components/ui'
import { cn, timeAgo } from '@/utils'
import { getWsUrl } from '@/utils/ws'
import toast from 'react-hot-toast'

function NewConversationModal({ onClose, onCreated }) {
  const queryClient = useQueryClient()

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['patient-appointments-for-msg'],
    queryFn: () => appointmentService.list({ status: 'confirmed' }).then((r) => {
      const all = r.data.results || r.data
      // Deduplicate by doctor id
      const seen = new Set()
      return all.filter((a) => {
        if (seen.has(a.doctor)) return false
        seen.add(a.doctor)
        return true
      })
    }),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (doctorId) => messagingService.createConversation({ doctor_id: doctorId }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      onCreated(res.data)
      onClose()
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || 'Could not start conversation')
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">New Message</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : !appointments?.length ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              You need a confirmed appointment to message a doctor.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Select a doctor to message:</p>
              {appointments.map((appt) => {
                const doc = appt.doctor_detail || {}
                const name = appt.doctor_name || 'Doctor'
                return (
                  <button
                    key={appt.id}
                    onClick={() => mutate(appt.doctor)}
                    disabled={isPending}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                  >
                    <Avatar name={name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{name}</p>
                      <p className="text-xs text-gray-400">{appt.doctor_specialization}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ChatWindow({ conversation }) {
  const { user, tokens } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const wsRef = useRef(null)
  const bottomRef = useRef(null)

  const { data: history } = useQuery({
    queryKey: ['messages', conversation.id],
    queryFn: () => messagingService.getMessages(conversation.id).then((r) => r.data.results || r.data),
  })

  useEffect(() => { if (history) setMessages(history) }, [history])

  useEffect(() => {
    const ws = new WebSocket(getWsUrl(`/ws/chat/${conversation.id}/?token=${tokens?.access}`))
    wsRef.current = ws
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'message') {
        setMessages((prev) => [...prev, { id: data.message_id, content: data.content, sender: { id: data.sender_id }, created_at: data.created_at }])
      } else if (data.type === 'typing') {
        setIsTyping(data.is_typing)
        if (data.is_typing) setTimeout(() => setIsTyping(false), 3000)
      }
    }
    return () => ws.close()
  }, [conversation.id, tokens?.access])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = () => {
    if (!input.trim() || wsRef.current?.readyState !== 1) return
    wsRef.current.send(JSON.stringify({ type: 'message', content: input }))
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    else wsRef.current?.send(JSON.stringify({ type: 'typing', is_typing: true }))
  }

  const docUser = conversation.doctor?.user

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <Avatar name={docUser ? `${docUser.first_name} ${docUser.last_name}` : 'Doctor'} src={docUser?.avatar} />
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">
            Dr. {docUser?.first_name} {docUser?.last_name}
          </p>
          <p className="text-xs text-gray-500">{conversation.doctor?.specialization?.name}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.sender?.id === user?.id || msg.sender === user?.id
          return (
            <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm', isMe ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm')}>
                <p>{msg.content}</p>
                <p className={cn('text-xs mt-1', isMe ? 'text-primary-200' : 'text-gray-400')}>{timeAgo(msg.created_at)}</p>
              </div>
            </div>
          )
        })}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                {[0, 150, 300].map((delay) => (
                  <span key={delay} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-2">
        <input
          className="input flex-1"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={sendMessage} className="btn-primary px-3 py-2">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default function PatientMessages() {
  const [activeConv, setActiveConv] = useState(null)
  const [showNewModal, setShowNewModal] = useState(false)

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagingService.getConversations().then((r) => r.data.results || r.data),
  })

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-gray-100 dark:border-gray-800 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white">Messages</h2>
          <button
            onClick={() => setShowNewModal(true)}
            className="w-8 h-8 flex items-center justify-center bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            title="New message"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : !conversations?.length ? (
            <div className="p-4">
              <EmptyState
                icon={MessageSquare}
                title="No conversations"
                description="Tap + to message a doctor"
              />
            </div>
          ) : (
            conversations.map((conv) => {
              const docUser = conv.doctor?.user
              const name = docUser ? `${docUser.first_name} ${docUser.last_name}` : 'Doctor'
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConv(conv)}
                  className={cn('w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left border-b border-gray-50 dark:border-gray-800', activeConv?.id === conv.id && 'bg-primary-50 dark:bg-primary-950')}
                >
                  <Avatar name={`Dr. ${name}`} src={docUser?.avatar} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">Dr. {name}</p>
                    <p className="text-xs text-gray-400 truncate">{conv.doctor?.specialization?.name}</p>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0">
                      {conv.unread_count}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1">
        {activeConv ? (
          <ChatWindow key={activeConv.id} conversation={activeConv} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <EmptyState icon={MessageSquare} title="Select a conversation" description="Or tap + to start a new one" />
          </div>
        )}
      </div>

      {showNewModal && (
        <NewConversationModal
          onClose={() => setShowNewModal(false)}
          onCreated={(conv) => setActiveConv(conv)}
        />
      )}
    </div>
  )
}
