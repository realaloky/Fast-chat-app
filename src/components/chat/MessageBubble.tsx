'use client'

import { Message } from '@/lib/supabase'

type MessageWithUser = Message & {
  sender_username?: string
}

type Props = {
  message: MessageWithUser
  isOwn: boolean
}

export default function MessageBubble({ message, isOwn }: Props) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 animate-fade-in`}>
      <div className={`flex items-end gap-2 max-w-[85%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isOwn && (
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-lg">
            {message.sender_username?.charAt(0).toUpperCase() || '?'}
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
              {message.sender_username}
            </p>
          )}
          <p className="break-words leading-relaxed text-[15px]">{message.content}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className={`text-[10px] ${isOwn ? 'text-blue-200' : 'text-slate-400'}`}>
              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            {isOwn && message.id.startsWith('temp-') && (
              <svg className="w-3 h-3 text-blue-300 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
