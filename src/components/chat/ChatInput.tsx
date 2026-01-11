'use client'

import { useRef } from 'react'

type Props = {
  inputValue: string
  activeTarget: string | null
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onImageSelect: (file: File) => void
  inputRef: React.RefObject<HTMLInputElement>
  uploading?: boolean
}

export default function ChatInput({
  inputValue, activeTarget, onInputChange, onSubmit, onImageSelect, inputRef, uploading
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <form onSubmit={onSubmit} className="glass-dark border-t border-white/10 p-4">
      <div className="flex gap-2 items-center">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && onImageSelect(e.target.files[0])}
          className="hidden"
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={activeTarget ? 'Type a message...' : 'Select a chat to start'}
          className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-white/50"
          disabled={!activeTarget || uploading}
        />

        <button
          type="submit"
          disabled={!inputValue.trim() || !activeTarget || uploading}
          className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-white/10 disabled:to-white/10 flex items-center justify-center transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </form>
  )
}
