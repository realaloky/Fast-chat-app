'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, User, Message, searchUsers, uploadImage } from '@/lib/supabase'
import ChatHeader from './ChatHeader'
import ChatMessages from './ChatMessages'
import ChatInput from './ChatInput'
import SearchPanel from './SearchPanel'
import ReplyPreview from './ReplyPreview'
import ProfileView from '../ProfileView'
import ImagePreview from './ImagePreview'
import { motion, AnimatePresence } from 'framer-motion'

type Props = {
  user: User
  onLogout: () => void
}

type MessageWithUser = Message & {
  sender_username?: string
  sender_avatar?: string | null
  reply_to?: {
    id: string
    content: string
    sender_username: string
  }
}

export default function ChatInterface({ user: initialUser, onLogout }: Props) {
  const [user, setUser] = useState(initialUser)
  const [messages, setMessages] = useState<MessageWithUser[]>([])
  const [inputValue, setInputValue] = useState('')
  const [activeTarget, setActiveTarget] = useState<string | null>(null)
  const [targetUser, setTargetUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<{ [key: string]: User }>({})
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [recentChats, setRecentChats] = useState<User[]>([])
  const [replyTo, setReplyTo] = useState<MessageWithUser | null>(null)
  const [editingMessage, setEditingMessage] = useState<MessageWithUser | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
      performSearch()
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
        
        const messagesWithData = msgs.map((msg) => ({
          ...msg,
          sender_username: userMap[msg.sender_id]?.username || 'Unknown',
          sender_avatar: userMap[msg.sender_id]?.avatar_url || null
        }))
        
        setMessages(messagesWithData)
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

  const performSearch = async () => {
    const results = await searchUsers(searchQuery, user.id)
    setSearchResults(results)
  }

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as Message
            
            if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
              let senderData = users[newMsg.sender_id]
              
              if (!senderData) {
                const { data } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', newMsg.sender_id)
                  .single()
                
                if (data) {
                  senderData = data
                  setUsers(prev => ({ ...prev, [data.id]: data }))
                }
              }
              
              const msgWithData: MessageWithUser = {
                ...newMsg,
                sender_username: senderData?.username || 'Unknown',
                sender_avatar: senderData?.avatar_url || null
              }
              
              setMessages((prev) => {
                const exists = prev.some(m => m.id === newMsg.id)
                if (exists) return prev
                return [...prev, msgWithData]
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as Message
            setMessages((prev) =>
              prev.map((m) => m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m)
            )
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
    
    if (selectedImage) {
      await handleSendImage()
      return
    }
    
    if (!inputValue.trim() || !activeTarget) return

    const content = inputValue.trim()

    if (editingMessage) {
      await handleEditMessage(editingMessage.id, content)
      return
    }

    await sendMessage(content, activeTarget)
    setInputValue('')
    setReplyTo(null)
  }

  const handleSendImage = async () => {
    if (!selectedImage || !activeTarget) return

    setUploadingImage(true)
    const imageUrl = await uploadImage(selectedImage, user.id)
    
    if (imageUrl) {
      await sendMessage(inputValue.trim() || '📷 Image', activeTarget, 'image', imageUrl)
      setSelectedImage(null)
      setInputValue('')
    }
    
    setUploadingImage(false)
  }

  const sendMessage = async (
    content: string, 
    receiverId: string,
    messageType: 'text' | 'image' = 'text',
    mediaUrl?: string
  ) => {
    const tempId = 'temp-' + Date.now()
    
    const optimisticMessage: MessageWithUser = {
      id: tempId,
      sender_id: user.id,
      receiver_id: receiverId,
      content,
      created_at: new Date().toISOString(),
      sender_username: user.username,
      sender_avatar: user.avatar_url,
      reactions: [],
      reply_to_id: replyTo?.id || null,
      deleted_for: [],
      message_type: messageType,
      media_url: mediaUrl || null
    }
    
    setMessages((prev) => [...prev, optimisticMessage])
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content,
        reply_to_id: replyTo?.id || null,
        reactions: [],
        message_type: messageType,
        media_url: mediaUrl || null
      })
      .select()
      .single()

    if (error) {
      setMessages((prev) => prev.filter(m => m.id !== tempId))
      alert('Failed to send message')
    } else if (data) {
      setMessages((prev) => 
        prev.map(m => m.id === tempId ? { ...optimisticMessage, id: data.id } : m)
      )
    }
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    const message = messages.find(m => m.id === messageId)
    if (!message) return

    const reactions = message.reactions || []
    const existingReaction = reactions.find(
      r => r.user_id === user.id && r.emoji === emoji
    )

    let newReactions = existingReaction
      ? reactions.filter(r => !(r.user_id === user.id && r.emoji === emoji))
      : [...reactions, { user_id: user.id, emoji, username: user.username }]

    setMessages(prev =>
      prev.map(m => m.id === messageId ? { ...m, reactions: newReactions } : m)
    )

    await supabase
      .from('messages')
      .update({ reactions: newReactions })
      .eq('id', messageId)
  }

  const handleReply = (message: MessageWithUser) => {
    setReplyTo(message)
    inputRef.current?.focus()
  }

  const handleEdit = (message: MessageWithUser) => {
    setEditingMessage(message)
    setInputValue(message.content)
    inputRef.current?.focus()
  }

  const handleEditMessage = async (messageId: string, newContent: string) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === messageId
          ? { ...m, content: newContent, edited_at: new Date().toISOString() }
          : m
      )
    )

    await supabase
      .from('messages')
      .update({ content: newContent, edited_at: new Date().toISOString() })
      .eq('id', messageId)

    setEditingMessage(null)
    setInputValue('')
  }

  const handleDelete = async (messageId: string, forEveryone: boolean) => {
    if (forEveryone) {
      if (!confirm('Delete this message for everyone?')) return
      await supabase.from('messages').delete().eq('id', messageId)
      setMessages(prev => prev.filter(m => m.id !== messageId))
    } else {
      const message = messages.find(m => m.id === messageId)
      if (!message) return

      const newDeletedFor = [...(message.deleted_for || []), user.id]
      await supabase
        .from('messages')
        .update({ deleted_for: newDeletedFor })
        .eq('id', messageId)

      setMessages(prev =>
        prev.map(m => m.id === messageId ? { ...m, deleted_for: newDeletedFor } : m)
      )
    }
  }

  const selectChat = (target: User) => {
    setActiveTarget(target.id)
    setTargetUser(target)
    setShowSearch(false)
    inputRef.current?.focus()
  }

  const handleImageSelect = (file: File) => {
    setSelectedImage(file)
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

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <ChatHeader
        user={user}
        targetUser={targetUser}
        messageCount={filteredMessages.length}
        onSearchToggle={() => setShowSearch(!showSearch)}
        onProfileOpen={() => setShowProfile(true)}
        onLogout={onLogout}
      />

      <AnimatePresence>
        {showSearch && (
          <SearchPanel
            searchQuery={searchQuery}
            searchResults={searchResults}
            recentChats={recentChats}
            onSearchChange={setSearchQuery}
            onSelectChat={selectChat}
            onClose={() => setShowSearch(false)}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-4">
        <ChatMessages
          messages={filteredMessages}
          currentUserId={user.id}
          activeTarget={activeTarget}
          targetUsername={targetUser?.username || ''}
          loading={loading}
          messagesEndRef={messagesEndRef}
          onReact={handleReaction}
          onReply={handleReply}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {replyTo && (
        <ReplyPreview replyTo={replyTo} onCancel={() => setReplyTo(null)} />
      )}

      {editingMessage && (
        <div className="bg-amber-500/20 border-t border-amber-500/50 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <p className="text-sm text-white">Editing message</p>
          </div>
          <button onClick={() => { setEditingMessage(null); setInputValue('') }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {selectedImage && (
        <ImagePreview
          file={selectedImage}
          onCancel={() => setSelectedImage(null)}
        />
      )}

      <ChatInput
        inputValue={inputValue}
        activeTarget={activeTarget}
        onInputChange={setInputValue}
        onSubmit={handleSendMessage}
        onImageSelect={handleImageSelect}
        inputRef={inputRef}
        uploading={uploadingImage}
      />

      <AnimatePresence>
        {showProfile && (
          <ProfileView
            user={user}
            onClose={() => setShowProfile(false)}
            onUpdate={(updatedUser) => {
              setUser(updatedUser)
              setShowProfile(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
            }
