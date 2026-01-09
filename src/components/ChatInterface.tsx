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
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  /* -------------------- EFFECTS -------------------- */

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

  /* -------------------- DATA -------------------- */

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

  /* -------------------- CHAT LOGIC -------------------- */

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

    // Start chat using @code
    if (!activeTarget && input.startsWith('@')) {
      const match = input.match(/^@(\d{10})/)
      if (!match) {
        alert('Use @<10 digit user code>')
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

    setIsTyping(false)

    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: activeTarget.id,
      content: input.trim(),
    })

    setInput('')
  }

  /* -------------------- UI HELPERS -------------------- */

  const filteredMessages = activeTarget
    ? messages.filter(
        (m) =>
          (m.sender_id === user.id &&
            m.receiver_id === activeTarget.id) ||
          (m.sender_id === activeTarget.id &&
            m.receiver_id === user.id)
      )
    : []

  /* -------------------- RENDER -------------------- */

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold uppercase">
            {activeTarget
              ? activeTarget.username[0]
              : user.username[0]}
          </div>
          <div>
            <p className="text-sm text-slate-400">Chat</p>
            <p className="text-lg font-semibold">
              {activeTarget ? activeTarget.username : 'No active chat'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-400">Your Code</p>
            <p className="text-sm font-bold text-blue-400">
              {user.user_code}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      {/* CHAT AREA */}
      <main className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {!activeTarget ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <p className="text-2xl font-semibold mb-2">
              Start a conversation
            </p>
            <p className="text-sm">
              Type <span className="text-blue-400">@user_code</span> below
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = msg.sender_id === user.id
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] px-4 py-3 rounded-3xl text-sm leading-relaxed ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-100 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-[10px] opacity-60 mt-2 text-right">
                    {new Date(msg.created_at).toLocaleTimeString()}
                    {isMe && ' • Sent'}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* INPUT */}
      <form
        onSubmit={handleSend}
        className="px-6 py-4 bg-slate-900 border-t border-slate-800"
      >
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setIsTyping(true)
            }}
            rows={1}
            placeholder={
              activeTarget
                ? 'Message...'
                : 'Type @<user_code> to start chat'
            }
            className="flex-1 resize-none px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend(e)
              }
            }}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 rounded-2xl font-semibold"
          >
            Send
          </button>
        </div>
        {isTyping && activeTarget && (
          <p className="text-xs text-slate-400 mt-2">
            Typing…
          </p>
        )}
      </form>
    </div>
  )
}
