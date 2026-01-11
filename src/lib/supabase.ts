// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type User = {
  id: string
  username: string
  password: string
  full_name?: string | null
  avatar_url?: string | null
  bio?: string | null
  status?: string | null
  is_online?: boolean
  last_seen?: string
  created_at: string
}

export type Reaction = {
  user_id: string
  emoji: string
  username?: string
}

export type MessageType = 'text' | 'image' | 'file' | 'voice'

export type Message = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  reactions?: Reaction[]
  reply_to_id?: string | null
  edited_at?: string | null
  deleted_for?: string[]
  message_type?: MessageType
  media_url?: string | null
  media_name?: string | null
  media_size?: number | null
}

// Auth
export const login = async (username: string, password: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .single()

  if (error || !data) return null
  
  await supabase
    .from('users')
    .update({ is_online: true, last_seen: new Date().toISOString() })
    .eq('id', data.id)
  
  return data as User
}

export const signup = async (username: string, password: string, fullName?: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .insert({
      username,
      password,
      full_name: fullName,
      is_online: true
    })
    .select()
    .single()

  if (error) return null
  return data as User
}

export const logout = async (userId: string) => {
  await supabase
    .from('users')
    .update({ is_online: false, last_seen: new Date().toISOString() })
    .eq('id', userId)
}

export const updateProfile = async (userId: string, updates: Partial<User>) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  return { data, error }
}

export const searchUsers = async (query: string, currentUserId: string): Promise<User[]> => {
  const { data } = await supabase
    .from('users')
    .select('*')
    .ilike('username', `%${query}%`)
    .neq('id', currentUserId)
    .limit(20)
  return (data as User[]) || []
}

export const uploadImage = async (file: File, userId: string): Promise<string | null> => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${Date.now()}.${fileExt}`
  
  const { error } = await supabase.storage
    .from('chat-media')
    .upload(fileName, file)

  if (error) return null

  const { data } = supabase.storage
    .from('chat-media')
    .getPublicUrl(fileName)

  return data.publicUrl
}

export const uploadAvatar = async (file: File, userId: string): Promise<string | null> => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}.${fileExt}`
  
  await supabase.storage
    .from('avatars')
    .upload(fileName, file, { upsert: true })

  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName)

  return data.publicUrl
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export const getInitials = (name?: string | null): string => {
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
