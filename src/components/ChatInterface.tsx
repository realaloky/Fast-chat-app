'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase, User, Message } from '@/lib/supabase'

type Props = {
  user: User
  onLogout: () => void
}

export default function ChatInterface({ user, onLogout }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [activeTarget, setActiveTarget] = useState<User | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
    const channel = subscribeToMessages()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true })

    if (data) setMessages(data as Message[])
  }

  const subscribeToMessages = () => {
    return supabase
      .channel('messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as Message
          if (msg.sender_id === user.id || msg.receiver_id === user.id) {
            setMessages((prev) => [...prev, msg])
          }
        }
      )
      .subscribe()
  }

  const startChatWithCode = async (code: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('user_code', code)
      .single()

    if (!data) {
      alert('User not found')
      return
    }

    setActiveTarget(data as User)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // Start chat via @code
    if (!activeTarget && input.startsWith('@')) {
      const match = input.match(/^@(\d{10})/)
      if (!match) {
        alert('Invalid format. Use @1234567890')
        return
      }
      await startChatWithCode(match[1])
      setInput('')
      return
    }

    if (!activeTarget) {
      alert('Start chat using @<user_code>')
      return
    }

    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: activeTarget.id,
      content: input.trim(),
    })

    setInput('')
  }

  const chatMessages = activeTarget
    ? messages.filter(
        (m) =>
          (m.sender_id === user.id &&
            m.receiver_id === activeTarget.id) ||
          (m.sender_id === activeTarget.id &&
            m.receiver_id === user.id)
      )
    : []

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700">
        <div>
          <p className="text-xs text-slate-400">Your Code</p>
          <p className="text-lg font-bold text-blue-400">
            {user.user_code}
          </p>
          {activeTarget && (
            <p className="text-sm text-green-400">
              Chatting with {activeTarget.username}
            </p>
          )}
        </div>
        <button
          onClick={onLogout}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold"
        >
          Logout
        </button>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {!activeTarget ? (
          <div className="text-center text-slate-400 mt-24">
            <p className="text-lg font-medium">No active chat</p>
            <p className="text-sm mt-2">
              Start by typing <span className="text-blue-400">@user_code</span>
            </p>
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isMe = msg.sender_id === user.id
            return (
              <div
                key={msg.id}
                className={`flex ${
                  isMe ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[65%] px-4 py-2 rounded-2xl text-sm ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-slate-700 text-slate-100 rounded-bl-none'
                  }`}
                >
                  <p className="break-words">{msg.content}</p>
                  <p className="text-[10px] opacity-70 mt-1 text-right">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="px-6 py-4 bg-slate-800 border-t border-slate-700"
      >
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              activeTarget
                ? 'Type a message...'
                : 'Type @<user_code> to start chat'
            }
            className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
