'use client'

type MessageWithUser = {
  id: string
  content: string
  sender_username?: string
}

type Props = {
  replyTo: MessageWithUser | null
  onCancel: () => void
}

export default function ReplyPreview({ replyTo, onCancel }: Props) {
  if (!replyTo) return null

  return (
    <div className="bg-slate-700/50 border-l-4 border-blue-500 p-3 flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <p className="text-xs font-semibold text-blue-400">
            Replying to {replyTo.sender_username || 'Unknown'}
          </p>
        </div>
        <p className="text-sm text-slate-300 truncate">
          {replyTo.content}
        </p>
      </div>
      
      <button
        onClick={onCancel}
        className="ml-3 p-1 hover:bg-slate-600 rounded-full transition-colors"
      >
        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
