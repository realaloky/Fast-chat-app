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
  const [isTyping, setIsTyping] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [recentChats, setRecentChats] = useState<User[]>([])
  const [showMenu, setShowMenu] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const emojis = ['😀', '😂', '😍', '🥰', '😎', '🤔', '👍', '👏', '🙏', '❤️', '🔥', '✨', '🎉', '💯', '🚀', '⭐']

  useEffect(() => {
    loadMessages()
    loadRecentChats()
    subscribeToMessages()
  }, [user.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers()
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

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

  const loadRecentChats = async () => {
    const { data } = await supabase
      .from('messages')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) {
      const userIds = [...new Set(
        data.map(m => m.sender_id === user.id ? m.receiver_id : m.sender_id)
      )]
      
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .in('id', userIds)
      
      if (usersData) {
        setRecentChats(usersData as User[])
      }
    }
  }

  const searchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .or(`username.ilike.%${searchQuery}%,user_code.ilike.%${searchQuery}%`)
      .neq('id', user.id)
      .limit(10)
    
    if (data) {
      setSearchResults(data as User[])
    }
    }const subscribeToMessages = () => {
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
            
            setMessages((prev) => {
              const exists = prev.some(m => m.id === newMsg.id)
              if (exists) return prev
              return [...prev, { ...newMsg, sender_username: senderUsername }]
            })
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
    setIsTyping(false)
    inputRef.current?.focus()
  }

  const sendMessage = async (content: string, receiverId: string) => {
    const tempId = 'temp-' + Date.now()
    
    const optimisticMessage: MessageWithUser = {
      id: tempId,
      sender_id: user.id,
      receiver_id: receiverId,
      content,
      created_at: new Date().toISOString(),
      sender_username: user.username
    }
    
    setMessages((prev) => [...prev, optimisticMessage])
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content,
      })
      .select()
      .single()

    if (error) {
      console.error('Send error:', error)
      setMessages((prev) => prev.filter(m => m.id !== tempId))
      alert('Failed to send message')
    } else if (data) {
      setMessages((prev) => 
        prev.map(m => m.id === tempId ? { ...data, sender_username: user.username } : m)
      )
    }
  }

  const selectChat = (targetUser: User) => {
    setActiveTarget(targetUser.id)
    setTargetUsername(targetUser.username)
    setShowSearch(false)
    setShowMenu(false)
    inputRef.current?.focus()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    
    if (!isTyping) setIsTyping(true)
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 1000)
  }

  const addEmoji = (emoji: string) => {
    setInputValue(prev => prev + emoji)
    setShowEmojiPicker(false)
    inputRef.current?.focus()
  }

  const copyUserCode = () => {
    navigator.clipboard.writeText(user.user_code)
    alert('✅ User code copied!')
  }

  const clearChat = async () => {
    if (!activeTarget) return
    if (!confirm('Clear all messages in this chat?')) return
    
    const { error } = await supabase
      .from('messages')
      .delete()
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeTarget}),and(sender_id.eq.${activeTarget},receiver_id.eq.${user.id})`)
    
    if (!error) {
      setMessages(prev => prev.filter(m => 
        !((m.sender_id === user.id && m.receiver_id === activeTarget) || 
          (m.sender_id === activeTarget && m.receiver_id === user.id))
      ))
      alert('✅ Chat cleared!')
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
  const messageCount = filteredMessages.length

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/95 backdrop-blur-md border-b border-slate-700 p-4 sticky top-0 z-20 shadow-xl">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800"></div>
              </div>
              <div>
                <p className="text-xs text-slate-400">Your Code</p>
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold text-blue-400 tracking-wider">{user.user_code}</p>
                  <button
                    onClick={copyUserCode}
                    className="text-slate-400 hover:text-blue-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            {activeTarget && (
              <div className="mt-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <p className="text-xs text-green-400">
                  <span className="font-semibold">{targetUsername}</span> • {messageCount} messages
                </p>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all"
              title="Search users"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all"
              title="Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg text-sm font-medium transition-all shadow-lg"
            >
              Exit
            </button>
          </div>
        </div>

        {/* Search Panel */}
        {showSearch && (
          <div className="mt-4 bg-slate-700/50 rounded-lg p-3 space-y-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username or code..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => selectChat(u)}
                    className="w-full flex items-center gap-3 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all text-left"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">{u.username}</p>
                      <p className="text-xs text-slate-400">{u.user_code}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {recentChats.length > 0 && searchQuery === '' && (
              <div>
                <p className="text-xs text-slate-400 mb-2">Recent Chats</p>
                <div className="space-y-2">
                  {recentChats.slice(0, 5).map(u => (
                    <button
                      key={u.id}
                      onClick={() => selectChat(u)}
                      className="w-full flex items-center gap-3 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all text-left"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-200 truncate">{u.username}</p>
                        <p className="text-xs text-slate-400">{u.user_code}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Menu Panel */}
        {showMenu && (
          <div className="mt-4 bg-slate-700/50 rounded-lg p-3 space-y-2">
            {activeTarget && (
              <button
                onClick={clearChat}
                className="w-full flex items-center gap-3 p-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg transition-all text-left text-red-400"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="text-sm font-medium">Clear Chat History</span>
              </button>
            )}
            <button
              onClick={() => {
                setActiveTarget(null)
                setTargetUsername('')
                setShowMenu(false)
              }}
              className="w-full flex items-center gap-3 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all text-left"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-sm font-medium">Close Current Chat</span>
            </button>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-400">Loading messages...</p>
            </div>
          </div>
        ) : !activeTarget ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-200 mb-2">Welcome to Fast Chat!</h2>
            <p className="text-slate-400 mb-6 max-w-sm">
              Start a conversation by searching for users or entering their user code
            </p>
            <div className="bg-slate-800 rounded-xl p-6 max-w-sm space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">1</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-200 mb-1">Search for Users</p>
                  <p className="text-xs text-slate-400">Tap the search icon to find friends</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">2</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-200 mb-1">Use User Code</p>
                  <p className="text-xs text-slate-400">Type @1234567890 to start chatting</p>
                </div>
              </div>
            </div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <p className="text-xl font-semibold text-slate-300 mb-2">No messages yet</p>
            <p className="text-sm text-slate-500">Send the first message to {targetUsername}!</p>
          </div>
        ) : (filteredMessages.map((msg, index) => {
            const isOwn = msg.sender_id === user.id
            const showTimestamp = index === 0 || 
              (new Date(msg.created_at).getTime() - new Date(filteredMessages[index - 1].created_at).getTime() > 300000)
            
            return (
              <div key={msg.id}>
                {showTimestamp && (
                  <div className="flex justify-center my-4">
                    <span className="text-xs text-slate-400 bg-slate-800/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-lg">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                )}
                <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 animate-fade-in`}>
                  <div className={`flex items-end gap-2 max-w-[85%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isOwn && (
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-lg">
                        {msg.sender_username?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <div
                      className={`px-4 py-3 rounded-2xl shadow-lg backdrop-blur-sm ${
                        isOwn
                          ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-sm'
                          : 'bg-slate-700/90 text-slate-100 rounded-bl-sm'
                      }`}
                    >
                      {!isOwn && (
                        <p className="text-xs font-semibold mb-1 opacity-80">
                          {msg.sender_username}
                        </p>
                      )}
                      <p className="break-words leading-relaxed text-[15px]">{msg.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className={`text-[10px] ${isOwn ? 'text-blue-200' : 'text-slate-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {isOwn && msg.id.startsWith('temp-') && (
                          <svg className="w-3 h-3 text-blue-300 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                      </div>
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
        className="bg-slate-800/95 backdrop-blur-md border-t border-slate-700 p-4 sticky bottom-0 shadow-2xl"
      >
        {showEmojiPicker && (
          <div className="mb-3 p-3 bg-slate-700 rounded-xl grid grid-cols-8 gap-2">
            {emojis.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => addEmoji(emoji)}
                className="text-2xl hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        
        <div className="flex gap-2 items-end">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-3 bg-slate-700 hover:bg-slate-600 rounded-full transition-all shadow-lg"
          >
            <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder={
                activeTarget
                  ? 'Type a message...'
                  : 'Type @<user_code> to start'
              }
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-100 placeholder-slate-400 shadow-inner"
              autoComplete="off"
            />
            {isTyping && (
              <div className="absolute right-3 top-3 flex gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-700 disabled:to-slate-700 rounded-2xl font-semibold transition-all shadow-lg disabled:shadow-none flex items-center gap-2 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        
        {!activeTarget && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-slate-400">
              Use @1234567890 to send to a specific user
            </p>
          </div>
        )}
      </form>
    </div>
  )
