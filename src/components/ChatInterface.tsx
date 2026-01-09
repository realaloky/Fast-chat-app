'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, User, Message } from '@/lib/supabase'

type Props = {
  user: User
  onLogout: () => void
}

type MessageWithUser = Message & {
  sender_username?: string
}

export default function ChatInterface({ user, onLogout }: Props) {
  const [messages, setMessages] = useState<MessageWithUser[]>([])
  const [inputValue, setInputValue] = useState('')
  const [activeTarget, setActiveTarget] = useState<string | null>(null)
  const [targetUsername, setTargetUsername] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<{ [key: string]: User }>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
    setLoading(true)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true })

    if (data) {
      const msgs = data as Message[]
      
      // Load usernames for all messages
      const userIds = [...new Set(msgs.map(m => m.sender_id))]
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .in('id', userIds)
      
      if (usersData) {
        const userMap: { [key: string]: User } = {}
        usersData.forEach((u: User) => {
          userMap[u.id] = u
        })
        setUsers(userMap)
        
        const messagesWithUsernames = msgs.map(msg => ({
          ...msg,
          sender_username: userMap[msg.sender_id]?.username || 'Unknown'
        }))
        setMessages(messagesWithUsernames)
      } else {
        setMessages(msgs)
      }
    }
    setLoading(false)
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
        async (payload) => {
          const newMsg = payload.new as Message
          if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
            // Get sender username if not already loaded
            let senderUsername = users[newMsg.sender_id]?.username
            if (!senderUsername) {
              const { data } = await supabase
                .from('users')
                .select('*')
                .eq('id', newMsg.sender_id)
                .single()
              
              if (data) {
                senderUsername = data.username
                setUsers(prev => ({ ...prev, [data.id]: data }))
              }
            }
            
            setMessages((prev) => [...prev, { ...newMsg, sender_username: senderUsername }])
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
          alert('❌ User not found with code: ' + userCode)
          return
        }
      } else {
        alert('❌ Invalid format. Use: @1234567890 message')
        return
      }
    } else {
      if (!targetUserId) {
        alert('❌ No active chat. Start with @<user_code>')
        return
      }
      await sendMessage(content, targetUserId)
    }

    setInputValue('')
    inputRef.current?.focus()
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

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const filteredMessages = getFilteredMessages()

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-800/90 backdrop-blur-sm border-b border-slate-700 p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-slate-400">Your Code</p>
                <p className="text-lg font-bold text-blue-400 tracking-wider">{user.user_code}</p>
              </div>
            </div>
            {activeTarget && (
              <div className="mt-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <p className="text-xs text-green-400">
                  Chatting with <span className="font-semibold">{targetUsername}</span>
                </p>
              </div>
            )}
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-600/80 hover:bg-red-600 rounded-lg text-sm font-medium transition-all"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : !activeTarget ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-xl font-semibold text-slate-300 mb-2">No Active Chat</p>
            <p className="text-sm text-slate-500 mb-4">Start a conversation by entering a user code</p>
            <div className="bg-slate-800 rounded-lg p-4 max-w-sm">
              <p className="text-xs text-slate-400 mb-2">Example:</p>
              <code className="text-blue-400 text-sm">@1234567890 Hello there!</code>
            </div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-slate-400">No messages yet</p>
            <p className="text-sm text-slate-500 mt-2">Send a message to start the conversation</p>
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isOwn = msg.sender_id === user.id
            const showTimestamp = index === 0 || 
              (new Date(msg.created_at).getTime() - new Date(filteredMessages[index - 1].created_at).getTime() > 300000)
            
            return (
              <div key={msg.id}>
                {showTimestamp && (
                  <div className="flex justify-center my-4">
                    <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                )}
                <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
                  <div className={`flex items-end gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isOwn && (
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {msg.sender_username?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <div
                      className={`px-4 py-2 rounded-2xl shadow-md ${
                        isOwn
                          ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-sm'
                          : 'bg-slate-700 text-slate-100 rounded-bl-sm'
                      }`}
                    >
                      {!isOwn && (
                        <p className="text-xs font-semibold mb-1 opacity-80">
                          {msg.sender_username}
                        </p>
                      )}
                      <p className="break-words leading-relaxed">{msg.content}</p>
                      <p className={`text-xs mt-1 ${isOwn ? 'text-blue-200' : 'text-slate-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSendMessage}
        className="bg-slate-800/90 backdrop-blur-sm border-t border-slate-700 p-4 sticky bottom-0"
      >
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                activeTarget
                  ? 'Type a message...'
                  : 'Type @<user_code> to start'
              }
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-100 placeholder-slate-400"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-700 disabled:to-slate-700 rounded-2xl font-semibold transition-all shadow-lg disabled:shadow-none flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        {!activeTarget && (
          <p className="text-xs text-slate-500 mt-2 text-center">
            Tip: Use @1234567890 to send to a specific user
          </p>
        )}
      </form>
    </div>
  )
}
