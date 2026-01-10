'use client'

import { Reaction } from '@/lib/supabase'

type Props = {
  reactions: Reaction[]
  currentUserId: string
  onReactionClick: (emoji: string) => void
}

export default function MessageReactions({ reactions, currentUserId, onReactionClick }: Props) {
  if (!reactions || reactions.length === 0) return null

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = { count: 0, users: [], hasCurrentUser: false }
    }
    acc[reaction.emoji].count++
    acc[reaction.emoji].users.push(reaction.username || 'Unknown')
    if (reaction.user_id === currentUserId) {
      acc[reaction.emoji].hasCurrentUser = true
    }
    return acc
  }, {} as Record<string, { count: number; users: string[]; hasCurrentUser: boolean }>)

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(groupedReactions).map(([emoji, data]) => (
        <button
          key={emoji}
          onClick={() => onReactionClick(emoji)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
            data.hasCurrentUser
              ? 'bg-blue-600/30 border border-blue-500'
              : 'bg-slate-700/50 border border-slate-600 hover:bg-slate-600/50'
          }`}
          title={data.users.join(', ')}
        >
          <span>{emoji}</span>
          <span className="text-[10px] font-semibold">{data.count}</span>
        </button>
      ))}
    </div>
  )
}
