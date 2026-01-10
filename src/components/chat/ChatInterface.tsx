'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, User, Message } from '@/lib/supabase'
import ChatHeader from './ChatHeader'
import ChatMessages from './ChatMessages'
import ChatInput from './ChatInput'
import SearchPanel from './SearchPanel'
import MenuPanel from './MenuPanel'

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

  useEffect(() => {
    loadMessages()
    loadRecentChats()
    const cleanup = subscribeToMessages()
    return cleanup
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
          
          // Only process if this message involves the current user
          if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
            // Get sender username
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
            
            // Add message to state
            setMessages((prev) => {
              // Check if message already exists
              const exists = prev.some(m => m.id === newMsg.id)
              if (exists) return prev
              
              // Add new message
              return [...prev, { ...newMsg, sender_username: senderUsername || 'Unknown' }]
            })
          }
        }
      )
      .subscribe()

    // Return cleanup function
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

  const handleInputChange = (value: string) => {
    setInputValue(value)
    
    if (!isTyping) setIsTyping(true)
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 1000)
  }

  const handleEmojiSelect = (emoji: string) => {
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

  const closeChat = () => {
    setActiveTarget(null)
    setTargetUsername('')
    setShowMenu(false)
  }

  const getFilteredMessages = () => {
    if (!activeTarget) return []
    return messages.filter(
      (m) =>
        (m.sender_id === user.id && m.receiver_id === activeTarget) ||
        (m.sender_id === activeTarget && m.receiver_id === user.id)
    )
  }

  const filteredMessages = getFilteredMessages()
  const messageCount = filteredMessages.length

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <ChatHeader
        user={user}
        activeTarget={activeTarget}
        targetUsername={targetUsername}
        messageCount={messageCount}
        showSearch={showSearch}
        showMenu={showMenu}
        onToggleSearch={() => setShowSearch(!showSearch)}
        onToggleMenu={() => setShowMenu(!showMenu)}
        onCopyCode={copyUserCode}
        onLogout={onLogout}
      />

      {showSearch && (
        <SearchPanel
          searchQuery={searchQuery}
          searchResults={searchResults}
          recentChats={recentChats}
          onSearchChange={setSearchQuery}
          onSelectChat={selectChat}
        />
      )}

      {showMenu && (
        <MenuPanel
          hasActiveChat={!!activeTarget}
          onClearChat={clearChat}
          onCloseChat={closeChat}
        />
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <ChatMessages
          messages={filteredMessages}
          currentUserId={user.id}
          activeTarget={activeTarget}
          targetUsername={targetUsername}
          loading={loading}
          messagesEndRef={messagesEndRef}
        />
      </div>

      <ChatInput
        inputValue={inputValue}
        isTyping={isTyping}
        activeTarget={activeTarget}
        showEmojiPicker={showEmojiPicker}
        onInputChange={handleInputChange}
        onSubmit={handleSendMessage}
        onToggleEmoji={() => setShowEmojiPicker(!showEmojiPicker)}
        onEmojiSelect={handleEmojiSelect}
        inputRef={inputRef}
      />
    </div>
  )
