'use client'

import { useState, useRef } from 'react'
import EmojiPicker from './EmojiPicker'

type Props = {
  inputValue: string
  isTyping: boolean
  activeTarget: string | null
  showEmojiPicker: boolean
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onToggleEmoji: () => void
  onEmojiSelect: (emoji: string) => void
  inputRef: React.RefObject<HTMLInputElement>
}

export default function ChatInput({
  inputValue,
  isTyping,
  activeTarget,
  showEmojiPicker,
  onInputChange,
  onSubmit,
  onToggleEmoji,
  onEmojiSelect,
  inputRef
}: Props) {
  return (
    <form
      onSubmit={onSubmit}
      className="bg-slate-800/95 backdrop-blur-md border-t border-slate-700 p-4 sticky bottom-0 shadow-2xl"
    >
      {showEmojiPicker && <EmojiPicker onEmojiSelect={onEmojiSelect} />}
      
      <div className="flex gap-2 items-end">
        <button
          type="button"
          onClick={onToggleEmoji}
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
            onChange={(e) => onInputChange(e.target.value)}
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
  )
}
