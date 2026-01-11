'use client'

import { User } from '@/lib/supabase'
import Avatar from '../Avatar'
import { motion } from 'framer-motion'

type Props = {
  user: User
  targetUser: User | null
  messageCount: number
  onSearchToggle: () => void
  onProfileOpen: () => void
  onLogout: () => void
}

export default function ChatHeader({
  user,
  targetUser,
  messageCount,
  onSearchToggle,
  onProfileOpen,
  onLogout
}: Props) {
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass-dark border-b border-white/10 p-4 flex items-center justify-between"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button onClick={onProfileOpen} className="flex-shrink-0">
          <Avatar user={user} size="md" showOnline />
        </button>
        
        <div className="flex-1 min-w-0">
          {targetUser ? (
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-white truncate">{targetUser.username}</h2>
                {targetUser.is_online && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </div>
              <p className="text-xs text-white/60">{messageCount} messages</p>
            </div>
          ) : (
            <div>
              <h2 className="font-bold text-white">FastChat</h2>
              <p className="text-xs text-white/60">Select a chat to start messaging</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSearchToggle}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onLogout}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-medium text-sm transition-all"
        >
          Logout
        </motion.button>
      </div>
    </motion.div>
  )
}
