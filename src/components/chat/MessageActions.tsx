import { useState, useEffect, useRef } from 'react'

type Props = {
  messageId: string
  isOwn: boolean
  position: { x: number; y: number }
  onReact: (emoji: string) => void
  onReply: () => void
  onEdit: () => void
  onDelete: (forEveryone: boolean) => void
  onClose: () => void
}

const QUICK_REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '🔥']

export default function MessageActions({
  messageId,
  isOwn,
  position,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onClose
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 backdrop-blur-md animate-scale-in"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%) translateY(-8px)'
      }}
    >
      {/* Quick Reactions */}
      <div className="flex gap-1 pb-2 border-b border-slate-700 mb-2">
        {QUICK_REACTIONS.map(emoji => (
          <button
            key={emoji}
            onClick={() => {
              onReact(emoji)
              onClose()
            }}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-700 transition-all text-lg hover:scale-125"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="space-y-1">
        <button
          onClick={() => {
            onReply()
            onClose()
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700 transition-all text-left text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <span>Reply</span>
        </button>

        {isOwn && (
          <>
            <button
              onClick={() => {
                onEdit()
                onClose()
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700 transition-all text-left text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit</span>
            </button>

            <button
              onClick={() => {
                onDelete(true)
                onClose()
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-600/20 text-red-400 transition-all text-left text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete for Everyone</span>
            </button>
          </>
        )}

        <button
          onClick={() => {
            onDelete(false)
            onClose()
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-600/20 text-red-400 transition-all text-left text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Delete for Me</span>
        </button>
      </div>
    </div>
  )
}
