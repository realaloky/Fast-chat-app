'use client'

import { User } from '@/lib/supabase'

type Props = {
  user: User
  activeTarget: string | null
  targetUsername: string
  messageCount: number
  showSearch: boolean
  showMenu: boolean
  onToggleSearch: () => void
  onToggleMenu: () => void
  onCopyCode: () => void
  onLogout: () => void
}

export default function ChatHeader({
  user,
  activeTarget,
  targetUsername,
  messageCount,
  showSearch,
  showMenu,
  onToggleSearch,
  onToggleMenu,
  onCopyCode,
  onLogout
}: Props) {
  return (
    <div className="bg-slate-800/95 backdrop-blur-md border-b border-slate-700 p-4 sticky top-0 z-20 shadow-xl">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800"></div>
            </div>
            <div>
              <p className="text-xs text-slate-400">Your Code</p>
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-blue-400 tracking-wider">{user.user_code}</p>
                <button
                  onClick={onCopyCode}
                  className="text-slate-400 hover:text-blue-400 transition-colors"
                  title="Copy code"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          {activeTarget && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <p className="text-xs text-green-400">
                <span className="font-semibold">{targetUsername}</span> • {messageCount} messages
              </p>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onToggleSearch}
            className={`p-2 rounded-lg transition-all ${showSearch ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
            title="Search users"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          
          <button
            onClick={onToggleMenu}
            className={`p-2 rounded-lg transition-all ${showMenu ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
            title="Menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg text-sm font-medium transition-all shadow-lg"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  )
}
