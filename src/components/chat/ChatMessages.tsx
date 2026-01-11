'use client'

import { Message } from '@/lib/supabase'
import MessageBubble from './MessageBubble'
import { motion } from 'framer-motion'
import { format, isToday, isYesterday } from 'date-fns'

type MessageWithUser = Message & {
  sender_username?: string
  sender_avatar?: string | null
  reply_to?: {
    id: string
    content: string
    sender_username: string
  }
}

type Props = {
  messages: MessageWithUser[]
  currentUserId: string
  activeTarget: string | null
  targetUsername: string
  loading: boolean
  messagesEndRef: React.RefObject<HTMLDivElement>
  onReact: (messageId: string, emoji: string) => void
  onReply: (message: MessageWithUser) => void
  onEdit: (message: MessageWithUser) => void
  onDelete: (messageId: string, forEveryone: boolean) => void
}

export default function ChatMessages({
  messages,
  currentUserId,
  activeTarget,
  targetUsername,
  loading,
  messagesEndRef,
  onReact,
  onReply,
  onEdit,
  onDelete
}: Props) {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'MMM d, yyyy')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/60">Loading messages...</p>
        </div>
      </div>
    )
  }

  if (!activeTarget) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-dark rounded-3xl p-12"
        >
          <div className="text-6xl mb-6">💬</div>
          <h2 className="text-2xl font-bold mb-2">Your Messages</h2>
          <p className="text-white/60 mb-6">Select a conversation or search for someone to start chatting</p>
          <div className="flex gap-4 justify-center">
            <div className="glass p-4 rounded-xl">
              <div className="text-2xl mb-2">⚡</div>
              <p className="text-sm">Fast</p>
            </div>
            <div className="glass p-4 rounded-xl">
              <div className="text-2xl mb-2">🔒</div>
              <p className="text-sm">Secure</p>
            </div>
            <div className="glass p-4 rounded-xl">
              <div className="text-2xl mb-2">🎨</div>
              <p className="text-sm">Beautiful</p>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="text-5xl mb-4">👋</div>
          <p className="text-xl font-semibold mb-2">Start the conversation</p>
          <p className="text-white/60">Send the first message to {targetUsername}!</p>
        </motion.div>
      </div>
    )
  }

  return (
    <>
      {messages.map((msg, index) => {
        const isOwn = msg.sender_id === currentUserId
        const showDate = index === 0 || 
          formatDate(msg.created_at) !== formatDate(messages[index - 1].created_at)
        
        return (
          <div key={msg.id}>
            {showDate && (
              <div className="flex justify-center my-6">
                <span className="glass-dark px-4 py-1.5 rounded-full text-xs font-medium">
                  {formatDate(msg.created_at)}
                </span>
              </div>
            )}
            <MessageBubble 
              message={msg} 
              isOwn={isOwn}
              currentUserId={currentUserId}
              onReact={onReact}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        )
      })}
      <div ref={messagesEndRef} />
    </>
  )
}
