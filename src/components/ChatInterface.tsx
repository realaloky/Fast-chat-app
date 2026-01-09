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
  const [target, setTarget] = useState<User | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true })

    if (data) setMessages(data as Message[])
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    if (!target && input.startsWith('@')) {
      const code = input.replace('@', '').trim()
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('user_code', code)
        .single()

      if (!data) {
        alert('User not found')
        return
      }

      setTarget(data as User)
      setInput('')
      return
    }

    if (!target) {
      alert('Start chat using @user_code')
      return
    }

    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: target.id,
      content: input,
    })

    setInput('')
  }

  const filtered = target
    ? messages.filter(
        (m) =>
          (m.sender_id === user.id && m.receiver_id === target.id) ||
          (m.sender_id === target.id && m.receiver_id === user.id)
      )
    : []

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white">
      <header className="p-4 bg-slate-800 flex justify-between">
        <div>
          <p className="text-xs text-slate-400">Your Code</p>
          <p className="text-blue-400 font-bold">{user.user_code}</p>
          {target && (
            <p className="text-sm text-green-400">
              Chatting with {target.username}
            </p>
          )}
        </div>
        <button
          onClick={onLogout}
          className="bg-red-600 px-4 py-2 rounded"
        >
          Logout
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-2">
        {!target ? (
          <p className="text-center text-slate-400 mt-20">
            Type @user_code to start chat
          </p>
        ) : (
          filtered.map((m) => (
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

      <form onSubmit={handleSend} className="p-4 bg-slate-800">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full px-4 py-3 rounded bg-slate-700"
          placeholder={
            target ? 'Type message...' : 'Type @user_code'
          }
        />
      </form>
    </div>
  )
}
