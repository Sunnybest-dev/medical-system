// Doctor Messages - reuses same chat pattern
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Send, MessageSquare } from 'lucide-react'
import { messagingService } from '@/services'
import { useAuthStore } from '@/store/authStore'
import { Avatar, EmptyState, Spinner } from '@/components/ui'
import { cn, timeAgo } from '@/utils'
import { getWsUrl } from '@/utils/ws'
import { useEffect, useRef } from 'react'

function DoctorChatWindow({ conversation }) {
  const { user, tokens } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
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
      if (data.type === 'message') setMessages((p) => [...p, { id: data.message_id, content: data.content, sender: { id: data.sender_id }, created_at: data.created_at }])
    }
    return () => ws.close()
  }, [conversation.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = () => {
    if (!input.trim() || wsRef.current?.readyState !== 1) return
    wsRef.current.send(JSON.stringify({ type: 'message', content: input }))
    setInput('')
  }

  const patient = conversation.patient

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 flex items-center gap-3">
        <Avatar name={`${patient?.first_name} ${patient?.last_name}`} src={patient?.avatar} />
        <p className="font-semibold text-gray-900">{patient?.first_name} {patient?.last_name}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.sender?.id === user?.id || msg.sender === user?.id
          return (
            <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-xs px-4 py-2 rounded-2xl text-sm', isMe ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm')}>
                <p>{msg.content}</p>
                <p className={cn('text-xs mt-1', isMe ? 'text-primary-200' : 'text-gray-400')}>{timeAgo(msg.created_at)}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t border-gray-100 flex gap-2">
        <input className="input flex-1" placeholder="Type a message..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button onClick={send} className="btn-primary px-3 py-2"><Send className="w-4 h-4" /></button>
      </div>
    </div>
  )
}

export default function DoctorMessages() {
  const [activeConv, setActiveConv] = useState(null)
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['doctor-conversations'],
    queryFn: () => messagingService.getConversations().then((r) => r.data.results || r.data),
  })

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="w-72 border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Patient Messages</h2></div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? <div className="flex justify-center py-8"><Spinner /></div> :
            conversations?.map((conv) => (
              <button key={conv.id} onClick={() => setActiveConv(conv)}
                className={cn('w-full p-4 flex items-center gap-3 hover:bg-gray-50 text-left border-b border-gray-50', activeConv?.id === conv.id && 'bg-primary-50')}>
                <Avatar name={`${conv.patient?.first_name} ${conv.patient?.last_name}`} src={conv.patient?.avatar} size="sm" />
                <p className="font-medium text-sm text-gray-900 truncate">{conv.patient?.first_name} {conv.patient?.last_name}</p>
              </button>
            ))
          }
        </div>
      </div>
      <div className="flex-1">
        {activeConv ? <DoctorChatWindow conversation={activeConv} /> :
          <div className="h-full flex items-center justify-center">
            <EmptyState icon={MessageSquare} title="Select a conversation" />
          </div>
        }
      </div>
    </div>
  )
}
