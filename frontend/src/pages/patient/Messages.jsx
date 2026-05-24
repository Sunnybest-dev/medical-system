import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Send, MessageSquare } from 'lucide-react'
import { messagingService } from '@/services'
import { useAuthStore } from '@/store/authStore'
import { Avatar, EmptyState, Spinner } from '@/components/ui'
import { cn, timeAgo } from '@/utils'
import { getWsUrl } from '@/utils/ws'

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

  useEffect(() => {
    if (history) setMessages(history)
  }, [history])

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
  }, [conversation.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    if (!input.trim() || wsRef.current?.readyState !== 1) return
    wsRef.current.send(JSON.stringify({ type: 'message', content: input }))
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    else wsRef.current?.send(JSON.stringify({ type: 'typing', is_typing: true }))
  }

  const otherUser = conversation.doctor?.user

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center gap-3">
        <Avatar name={`Dr. ${otherUser?.first_name} ${otherUser?.last_name}`} src={otherUser?.avatar} />
        <div>
          <p className="font-semibold text-gray-900">Dr. {otherUser?.first_name} {otherUser?.last_name}</p>
          <p className="text-xs text-gray-500">{conversation.doctor?.specialization?.name}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.sender?.id === user?.id || msg.sender === user?.id
          return (
            <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm', isMe ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm')}>
                <p>{msg.content}</p>
                <p className={cn('text-xs mt-1', isMe ? 'text-primary-200' : 'text-gray-400')}>{timeAgo(msg.created_at)}</p>
              </div>
            </div>
          )
        })}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100 flex gap-2">
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

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagingService.getConversations().then((r) => r.data.results || r.data),
  })

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-0 bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : conversations?.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No conversations" description="Book an appointment to start chatting" />
          ) : (
            conversations?.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConv(conv)}
                className={cn('w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50', activeConv?.id === conv.id && 'bg-primary-50')}
              >
                <Avatar name={`Dr. ${conv.doctor?.user?.first_name}`} src={conv.doctor?.user?.avatar} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">Dr. {conv.doctor?.user?.first_name} {conv.doctor?.user?.last_name}</p>
                  <p className="text-xs text-gray-400 truncate">{conv.doctor?.specialization?.name}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1">
        {activeConv ? (
          <ChatWindow conversation={activeConv} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <EmptyState icon={MessageSquare} title="Select a conversation" description="Choose a doctor to start messaging" />
          </div>
        )}
      </div>
    </div>
  )
}
