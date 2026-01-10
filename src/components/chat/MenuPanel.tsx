'use client'

type Props = {
  hasActiveChat: boolean
  onClearChat: () => void
  onCloseChat: () => void
}

export default function MenuPanel({ hasActiveChat, onClearChat, onCloseChat }: Props) {
  return (
    <div className="mt-4 bg-slate-700/50 rounded-lg p-3 space-y-2">
      {hasActiveChat && (
        <button
          onClick={onClearChat}
          className="w-full flex items-center gap-3 p-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg transition-all text-left text-red-400"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="text-sm font-medium">Clear Chat History</span>
        </button>
      )}
      <button
        onClick={onCloseChat}
        className="w-full flex items-center gap-3 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all text-left"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className="text-sm font-medium">Close Current Chat</span>
      </button>
    </div>
  )
}
