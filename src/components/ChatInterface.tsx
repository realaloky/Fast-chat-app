'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, User, Message } from '@/lib/supabase'

type Props = {
  user: User
  onLogout: () => void
}

export default function ChatInterface({ user, onLogout }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [activeTarget, setActiveTarget] = useState<string | null>(null)
  const [targetUsername, setTargetUsername] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
    subscribeToMessages()
  }, [user.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true })

    if (data) setMessages(data as Message[])
  }

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as Message
          if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
            setMessages((prev) => [...prev, newMsg])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const content = inputValue.trim()
    let targetUserId = activeTarget

    if (content.startsWith('@')) {
      const match = content.match(/^@(\d{10})/)
      if (match) {
        const userCode = match[1]
        
        const { data: targetUsers } = await supabase
          .from('users')
          .select('*')
          .eq('user_code', userCode)

        if (targetUsers && targetUsers.length > 0) {
          const targetUser = targetUsers[0] as User
          targetUserId = targetUser.id
          setActiveTarget(targetUser.id)
          setTargetUsername(targetUser.username)
          
          const messageContent = content.replace(/^@\d{10}\s*/, '').trim()
          if (!messageContent) {
            setInputValue('')
            return
          }
          
          await sendMessage(messageContent, targetUserId)
        } else {
          alert('User not found')
          return
        }
      } else {
        alert('Invalid user code format. Use @1234567890')
        return
      }
    } else {
      if (!targetUserId) {
        alert('No active target. Use @<user_code> to set target')
        return
      }
      await sendMessage(content, targetUserId)
    }

    setInputValue('')
  }

  const sendMessage = async (content: string, receiverId: string) => {
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      content,
    })

    if (error) {
      console.error('Send error:', error)
      alert('Failed to send message')
    }
  }

  const getFilteredMessages = () => {
    if (!activeTarget) return []
    return messages.filter(
      (m) =>
        (m.sender_id === user.id && m.receiver_id === activeTarget) ||
        (m.sender_id === activeTarget && m.receiver_id === user.id)
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <div className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center">
        <div>
          <p className="text-sm text-slate-400">Your Code</p>
          <p className="text-xl font-bold text-blue-400">{user.user_code}</p>
          {activeTarget && (
            <p className="text-xs text-green-400 mt-1">
              Chatting with: {targetUsername}
            </p>
          )}
        </div>
        <button
          onClick={onLogout}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
        >
          Logout
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!activeTarget ? (
          <div className="text-center text-slate-400 mt-20">
            <p className="text-lg">No active chat</p>
            <p className="text-sm mt-2">Use @&lt;user_code&gt; to start</p>
          </div>
        ) : (
          getFilteredMessages().map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender_id === user.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-lg ${
                  msg.sender_id === user.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-100'
                }`}
              >
                <p className="break-words">{msg.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(msg.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSendMessage}
        className="bg-slate-800 border-t border-slate-700 p-4"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              activeTarget
                ? 'Type a message...'
                : 'Type @<user_code> to start'
            }
            className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
               }
