'use client'

import { useState, useRef } from 'react'
import { Message } from '@/lib/supabase'
import MessageReactions from './MessageReactions'
import MessageActions from './MessageActions'
import { motion } from 'framer-motion'

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
  message: MessageWithUser
  isOwn: boolean
  onReact: (messageId: string, emoji: string) => void
  onReply: (message: MessageWithUser) => void
  onEdit: (message: MessageWithUser) => void
  onDelete: (messageId: string, forEveryone: boolean) => void
  currentUserId: string
}

export default function MessageBubble({ 
  message, 
  isOwn, 
  onReact,
  onReply,
  onEdit,
  onDelete,
  currentUserId
}: Props) {
  const [showActions, setShowActions] = useState(false)
  const [actionPosition, setActionPosition] = useState({ x: 0, y: 0 })
  const bubbleRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  const isDeletedForMe = message.deleted_for?.includes(currentUserId)
  
  if (isDeletedForMe) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className="px-4 py-2 rounded-2xl bg-white/5 text-white/40 italic text-sm">
          🚫 This message was deleted
        </div>
      </div>
    )
  }

  const showActionMenu = () => {
    const rect = bubbleRef.current?.getBoundingClientRect()
    if (rect) {
      setActionPosition({ x: rect.left + rect.width / 2, y: rect.top })
      setShowActions(true)
    }
  }

  const handleLongPress = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    longPressTimer.current = setTimeout(() => {
      if ('vibrate' in navigator) navigator.vibrate(50)
      showActionMenu()
    }, 500)
  }

  const handlePressEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    showActionMenu()
  }

  return (
    <>
      <motion.div
        ref={bubbleRef}
        initial={{ opacity: 0, x: isOwn ? 50 : -50, scale: 0.8 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 no-select`}
        onContextMenu={handleRightClick}
        onTouchStart={handleLongPress}
        onTouchEnd={handlePressEnd}
        onMouseDown={handleLongPress}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
      >
        <div className={`flex items-end gap-2 max-w-[75%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          {!isOwn && message.sender_avatar && (
            <img
              src={message.sender_avatar}
              alt={message.sender_username}
              className="w-8 h-8 rounded-full object-cover border-2 border-white/20 flex-shrink-0"
            />
          )}
          
          {!isOwn && !message.sender_avatar && (
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 border-2 border-white/20">
              {message.sender_username?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          
          <div className="flex flex-col gap-1">
            <div
              className={`px-4 py-3 rounded-2xl shadow-lg backdrop-blur-sm ${
                isOwn
                  ? 'message-bubble-own'
                  : 'message-bubble-other'
              }`}
            >
              {!isOwn && (
                <p className="text-xs font-semibold mb-1 opacity-80">
                  {message.sender_username}
                </p>
              )}
              
              {message.reply_to && (
                <div className={`mb-2 pl-2 border-l-2 ${isOwn ? 'border-white/40' : 'border-white/30'}`}>
                  <p className={`text-[10px] font-semibold ${isOwn ? 'text-white/70' : 'text-white/60'}`}>
                    {message.reply_to.sender_username}
                  </p>
                  <p className={`text-xs ${isOwn ? 'text-white/60' : 'text-white/50'} truncate`}>
                    {message.reply_to.content.length > 50 
                      ? message.reply_to.content.substring(0, 50) + '...' 
                      : message.reply_to.content}
                  </p>
                </div>
              )}
              
              {message.message_type === 'image' && message.media_url && (
                <div className="mb-2">
                  <img
                    src={message.media_url}
                    alt="Shared image"
                    className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(message.media_url!, '_blank')}
                  />
                </div>
              )}
              
              {message.content && (
                <p className="break-words leading-relaxed text-[15px]">{message.content}</p>
              )}
              
              <div className="flex items-center gap-2 mt-1">
                <p className={`text-[10px] ${isOwn ? 'text-white/50' : 'text-white/40'}`}>
                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                
                {message.edited_at && (
                  <span className={`text-[10px] italic ${isOwn ? 'text-white/50' : 'text-white/40'}`}>
                    (edited)
                  </span>
                )}
                
                {isOwn && message.id.startsWith('temp-') && (
                  <svg className="w-3 h-3 animate-spin opacity-50" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
              </div>
            </div>
            
            <MessageReactions 
              reactions={message.reactions || []}
              currentUserId={currentUserId}
              onReactionClick={(emoji) => onReact(message.id, emoji)}
            />
          </div>
        </div>
      </motion.div>

      {showActions && (
        <MessageActions
          messageId={message.id}
          isOwn={isOwn}
          position={actionPosition}
          onReact={(emoji) => {
            onReact(message.id, emoji)
            setShowActions(false)
          }}
          onReply={() => {
            onReply(message)
            setShowActions(false)
          }}
          onEdit={() => {
            onEdit(message)
            setShowActions(false)
          }}
          onDelete={(forEveryone) => {
            onDelete(message.id, forEveryone)
            setShowActions(false)
          }}
          onClose={() => setShowActions(false)}
        />
      )}
    </>
  )
        }
