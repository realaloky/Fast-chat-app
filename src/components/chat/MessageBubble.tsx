'use client'

import { useState, useRef, useEffect } from 'react'
import { Message, Reaction } from '@/lib/supabase'
import MessageReactions from './MessageReactions'
import MessageActions from './MessageActions'

type MessageWithUser = Message & {
  sender_username?: string
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

  // Check if message is deleted for current user
  const isDeletedForMe = message.deleted_for?.includes(currentUserId)
  
  if (isDeletedForMe) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className="px-4 py-2 rounded-lg bg-slate-800/50 text-slate-500 italic text-sm">
          🚫 This message was deleted
        </div>
      </div>
    )
  }

  const handleLongPressStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    
    longPressTimer.current = setTimeout(() => {
      const rect = bubbleRef.current?.getBoundingClientRect()
      if (rect) {
        setActionPosition({
          x: rect.left + rect.width / 2,
          y: rect.top
        })
        setShowActions(true)
      }
    }, 500)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const rect = bubbleRef.current?.getBoundingClientRect()
    if (rect) {
      setActionPosition({
        x: rect.left + rect.width / 2,
        y: rect.top
      })
      setShowActions(true)
    }
  }

  const handleReactionClick = (emoji: string) => {
    onReact(message.id, emoji)
  }

  return (
    <>
      <div 
        ref={bubbleRef}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 animate-fade-in`}
        onContextMenu={handleContextMenu}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
      >
        <div className={`flex items-end gap-2 max-w-[85%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          {!isOwn && (
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-lg">
              {message.sender_username?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          
          <div className="flex flex-col gap-1">
            <div
              className={`px-4 py-3 rounded-2xl shadow-lg backdrop-blur-sm ${
                isOwn
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-sm'
                  : 'bg-slate-700/90 text-slate-100 rounded-bl-sm'
              }`}
            >
              {!isOwn && (
                <p className="text-xs font-semibold mb-1 opacity-80">
                  {message.sender_username}
                </p>
              )}
              
              {/* Reply Preview */}
              {message.reply_to && (
                <div className={`mb-2 pl-2 border-l-2 ${isOwn ? 'border-blue-300' : 'border-slate-500'}`}>
                  <p className={`text-[10px] font-semibold ${isOwn ? 'text-blue-200' : 'text-slate-400'}`}>
                    {message.reply_to.sender_username}
                  </p>
                  <p className={`text-xs ${isOwn ? 'text-blue-100' : 'text-slate-300'} truncate`}>
                    {message.reply_to.content.length > 50 
                      ? message.reply_to.content.substring(0, 50) + '...' 
                      : message.reply_to.content}
                  </p>
                </div>
              )}
              
              {/* Message Content */}
              <p className="break-words leading-relaxed text-[15px]">{message.content}</p>
              
              {/* Time & Edit Indicator */}
              <div className="flex items-center gap-2 mt-1">
                <p className={`text-[10px] ${isOwn ? 'text-blue-200' : 'text-slate-400'}`}>
                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                
                {message.edited_at && (
                  <span className={`text-[10px] italic ${isOwn ? 'text-blue-200' : 'text-slate-400'}`}>
                    (edited)
                  </span>
                )}
                
                {isOwn && message.id.startsWith('temp-') && (
                  <svg className="w-3 h-3 text-blue-300 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
              </div>
            </div>
            
            {/* Reactions */}
            <MessageReactions 
              reactions={message.reactions || []}
              currentUserId={currentUserId}
              onReactionClick={handleReactionClick}
            />
          </div>
        </div>
      </div>

      {/* Action Menu */}
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
