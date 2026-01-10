'use client'

import { User } from '@/lib/supabase'

type Props = {
  searchQuery: string
  searchResults: User[]
  recentChats: User[]
  onSearchChange: (query: string) => void
  onSelectChat: (user: User) => void
}

export default function SearchPanel({
  searchQuery,
  searchResults,
  recentChats,
  onSearchChange,
  onSelectChat
}: Props) {
  return (
    <div className="mt-4 bg-slate-700/50 rounded-lg p-3 space-y-3">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search by username or code..."
        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      />
      
      {searchResults.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {searchResults.map(u => (
            <button
              key={u.id}
              onClick={() => onSelectChat(u)}
              className="w-full flex items-center gap-3 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all text-left"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {u.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">{u.username}</p>
                <p className="text-xs text-slate-400">{u.user_code}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {recentChats.length > 0 && searchQuery === '' && (
        <div>
          <p className="text-xs text-slate-400 mb-2">Recent Chats</p>
          <div className="space-y-2">
            {recentChats.slice(0, 5).map(u => (
              <button
                key={u.id}
                onClick={() => onSelectChat(u)}
                className="w-full flex items-center gap-3 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all text-left"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {u.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{u.username}</p>
                  <p className="text-xs text-slate-400">{u.user_code}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
