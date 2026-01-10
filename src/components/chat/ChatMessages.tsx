'use client'

import { Message } from '@/lib/supabase'
import MessageBubble from './MessageBubble'
import EmptyState from './EmptyState'

type MessageWithUser = Message & {
  sender_username?: string
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading messages...</p>
        </div>
      </div>
    )
  }

  if (!activeTarget) {
    return <EmptyState type="no-chat" />
  }

  if (messages.length === 0) {
    return <EmptyState type="no-messages" targetUsername={targetUsername} />
  }

  return (
    <>
      {messages.map((msg, index) => {
        const isOwn = msg.sender_id === currentUserId
        const showTimestamp = index === 0 || 
          (new Date(msg.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 300000)
        
        return (
          <div key={msg.id}>
            {showTimestamp && (
              <div className="flex justify-center my-4">
                <span className="text-xs text-slate-400 bg-slate-800/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-lg">
                  {formatTime(msg.created_at)}
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
