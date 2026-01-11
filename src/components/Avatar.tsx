'use client'

import { User, getInitials } from '@/lib/supabase'

type Props = {
  user: User
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showOnline?: boolean
  className?: string
}

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl'
}

const onlineSizes = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
  xl: 'w-5 h-5'
}

export default function Avatar({ user, size = 'md', showOnline = false, className = '' }: Props) {
  return (
    <div className={`relative ${className}`}>
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={user.username}
          className={`${sizes[size]} rounded-full object-cover border-2 border-white/20`}
        />
      ) : (
        <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white border-2 border-white/20`}>
          {getInitials(user.full_name || user.username)}
        </div>
      )}
      
      {showOnline && user.is_online && (
        <div className={`absolute bottom-0 right-0 ${onlineSizes[size]} bg-green-500 rounded-full border-2 border-white`}></div>
      )}
    </div>
  )
}
