'use client'

type Props = {
  type: 'no-chat' | 'no-messages'
  targetUsername?: string
}

export default function EmptyState({ type, targetUsername }: Props) {
  if (type === 'no-messages') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        </div>
        <p className="text-xl font-semibold text-slate-300 mb-2">No messages yet</p>
        <p className="text-sm text-slate-500">Send the first message to {targetUsername}!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="w-32 h-32 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
        <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-slate-200 mb-2">Welcome to Fast Chat!</h2>
      <p className="text-slate-400 mb-6 max-w-sm">
        Start a conversation by searching for users or entering their user code
      </p>
      <div className="bg-slate-800 rounded-xl p-6 max-w-sm space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold">1</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-200 mb-1">Search for Users</p>
            <p className="text-xs text-slate-400">Tap the search icon to find friends</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold">2</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-200 mb-1">Use User Code</p>
            <p className="text-xs text-slate-400">Type @1234567890 to start chatting</p>
          </div>
        </div>
      </div>
    </div>
  )
}
