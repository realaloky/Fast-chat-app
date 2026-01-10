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
  const [activeUser, setActiveUser] = useState<User | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  /* ---------------- INITIAL LOAD ---------------- */

  useEffect(() => {
    loadMessages()

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const msg = payload.new as Message

          // Only care about messages involving me
          if (msg.sender_id !== user.id && msg.receiver_id !== user.id) return

          setMessages((prev) => [...prev, msg])

          // 🔥 AUTO OPEN CHAT IF SOMEONE MESSAGES ME FIRST
          if (!activeUser && msg.sender_id !== user.id) {
            const { data } = await supabase
              .from('users')
              .select('*')
              .eq('id', msg.sender_id)
              .single()

            if (data) setActiveUser(data as User)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  /* ---------------- AUTOSCROLL ---------------- */

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* ---------------- AUTO @INPUT AFTER LOGIN ---------------- */

  useEffect(() => {
    if (!activeUser && input === '') {
      setInput(`@${user.user_code} `)
    }
  }, [activeUser])

  /* ---------------- LOAD MESSAGES ---------------- */

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true })

    if (data) setMessages(data as Message[])
  }

  /* ---------------- SEND MESSAGE ---------------- */

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // FIRST MESSAGE WITH @CODE
    if (!activeUser && input.startsWith('@')) {
      const match = input.match(/^@(\S+)\s+(.*)$/)
      if (!match) {
        alert('Use @user_code message')
        return
      }

      const [, code, content] = match

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('user_code', code)
        .single()

      if (!data) {
        alert('User not found')
        return
      }

      setActiveUser(data as User)

      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: data.id,
        content,
      })

      setInput('')
      return
    }

    if (!activeUser) return

    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: activeUser.id,
      content: input,
    })

    setInput('')
  }

  /* ---------------- CLEAR CHAT HISTORY ---------------- */

  const clearChat = async () => {
    if (!activeUser) return
    if (!confirm('Clear chat history?')) return

    await supabase
      .from('messages')
      .delete()
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${activeUser.id}),and(sender_id.eq.${activeUser.id},receiver_id.eq.${user.id})`
      )

    setMessages((prev) =>
      prev.filter(
        (m) =>
          !(
            (m.sender_id === user.id &&
              m.receiver_id === activeUser.id) ||
            (m.sender_id === activeUser.id &&
              m.receiver_id === user.id)
          )
      )
    )
  }

  /* ---------------- FILTERED CHAT ---------------- */

  const chatMessages = activeUser
    ? messages.filter(
        (m) =>
          (m.sender_id === user.id &&
            m.receiver_id === activeUser.id) ||
          (m.sender_id === activeUser.id &&
            m.receiver_id === user.id)
      )
    : []

  /* ---------------- UI ---------------- */

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white">
      {/* HEADER */}
      <header className="flex justify-between items-center p-4 bg-slate-800">
        <div>
          <p className="text-xs text-slate-400">Your User Code</p>
          <p className="text-blue-400 font-bold">{user.user_code}</p>
          {activeUser && (
            <p className="text-sm text-green-400">
              Chatting with {activeUser.username}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          {activeUser && (
            <button
              onClick={clearChat}
              className="text-sm bg-slate-700 px-3 py-1 rounded"
            >
              Clear ✖
            </button>
          )}
          <button
            onClick={onLogout}
            className="bg-red-600 px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      </header>

      {/* MESSAGES */}
      <main className="flex-1 overflow-y-auto p-4 space-y-2">
        {!activeUser ? (
          <div className="text-center text-slate-400 mt-20 space-y-2">
            <p className="font-semibold">
              After login, you’ll see your 10-digit User Code at the top
            </p>
            <p>📌 Share this code with friends</p>
            <p className="mt-3">
              Start chatting by typing:
              <br />
              <span className="text-blue-400">
                @1234567890 Hi!
              </span>
            </p>
            <p className="text-xs mt-4">
              First message must start with @user_code
              <br />
              One-to-one only · Demo app
            </p>
          </div>
        ) : (
          chatMessages.map((m) => (
            <div
              key={m.id}
              className={`flex ${
                m.sender_id === user.id
                  ? 'justify-end'
                  : 'justify-start'
              }`}
            >
              <div className="bg-blue-600 px-3 py-2 rounded-lg max-w-[70%]">
                {m.content}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </main>

      {/* INPUT */}
      <form onSubmit={handleSend} className="p-4 bg-slate-800">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 px-4 py-3 rounded bg-slate-700"
            placeholder="Type message..."
          />
          {input && (
            <button
              type="button"
              onClick={() => setInput('')}
              className="px-3 text-slate-300"
            >
              ✖
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
