'use client'

import { useState } from 'react'
import { User, updateProfile, uploadAvatar } from '@/lib/supabase'
import Avatar from './Avatar'
import { motion } from 'framer-motion'

type Props = {
  user: User
  onClose: () => void
  onUpdate: (user: User) => void
}

export default function ProfileView({ user, onClose, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [fullName, setFullName] = useState(user.full_name || '')
  const [bio, setBio] = useState(user.bio || '')
  const [status, setStatus] = useState(user.status || '')
  const [uploading, setUploading] = useState(false)

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const url = await uploadAvatar(file, user.id)
    
    if (url) {
      const { data } = await updateProfile(user.id, { avatar_url: url })
      if (data) {
        onUpdate(data as User)
        const updatedUser = { ...user, avatar_url: url }
        localStorage.setItem('chat_user', JSON.stringify(updatedUser))
      }
    }
    setUploading(false)
  }

  const handleSave = async () => {
    const { data } = await updateProfile(user.id, {
      full_name: fullName,
      bio,
      status
    })
    
    if (data) {
      onUpdate(data as User)
      localStorage.setItem('chat_user', JSON.stringify(data))
      setIsEditing(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-dark rounded-3xl p-6 max-w-md w-full"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Profile</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <Avatar user={user} size="xl" showOnline />
            {isEditing && (
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-700 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={uploading}
                />
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </label>
            )}
          </div>
          <h3 className="text-xl font-bold mt-4">@{user.username}</h3>
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div>
            <label className="text-sm text-white/60 mb-1 block">Full Name</label>
            {isEditing ? (
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Your name"
              />
            ) : (
              <p className="text-white">{fullName || 'Not set'}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-white/60 mb-1 block">Bio</label>
            {isEditing ? (
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="Tell us about yourself"
                rows={3}
              />
            ) : (
              <p className="text-white/80">{bio || 'No bio yet'}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-white/60 mb-1 block">Status</label>
            {isEditing ? (
              <input
                type="text"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Your status"
              />
            ) : (
              <p className="text-white/80">{status}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-colors font-bold"
              >
                Save
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-colors font-bold"
            >
              Edit Profile
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
