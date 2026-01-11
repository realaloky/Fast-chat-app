'use client'

import { User } from '@/lib/supabase'
import Avatar from '../Avatar'
import { motion } from 'framer-motion'

type Props = {
  searchQuery: string
  searchResults: User[]
  recentChats: User[]
  onSearchChange: (query: string) => void
  onSelectChat: (user: User) => void
  onClose: () => void
}

export default function SearchPanel({ searchQuery, searchResults, recentChats, onSearchChange, onSelectChat, onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="glass-dark border-b border-white/10 p-4"
    >
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search users..."
        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-white/50"
        autoFocus
      />

      {searchResults.length > 0 && (
        <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
          {searchResults.map(user => (
            <button
              key={user.id}
              onClick={() => onSelectChat(user)}
              className="w-full flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
            >
              <Avatar user={user} size="sm" showOnline />
              <div className="text-left">
                <p className="font-medium">{user.username}</p>
                {user.full_name && <p className="text-xs text-white/60">{user.full_name}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      {searchQuery === '' && recentChats.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-white/60 mb-2">Recent Chats</p>
          <div className="space-y-2">
            {recentChats.slice(0, 5).map(user => (
              <button
                key={user.id}
                onClick={() => onSelectChat(user)}
                className="w-full flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
              >
                <Avatar user={user} size="sm" showOnline />
                <p className="font-medium">{user.username}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
