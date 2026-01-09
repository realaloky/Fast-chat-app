'use client'

import { useState } from 'react'
import { supabase, User } from '@/lib/supabase'

type Props = {
  onLogin: (user: User) => void
}

export default function LoginForm({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const generateUserCode = (): string => {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString()
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return

    setLoading(true)

    try {
      const { data: existingUsers } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)

      if (existingUsers && existingUsers.length > 0) {
        const user = existingUsers[0] as User
        localStorage.setItem('chat_user', JSON.stringify(user))
        onLogin(user)
      } else {
        let userCode = generateUserCode()
        
        let isUnique = false
        while (!isUnique) {
          const { data } = await supabase
            .from('users')
            .select('user_code')
            .eq('user_code', userCode)
          
          if (!data || data.length === 0) {
            isUnique = true
          } else {
            userCode = generateUserCode()
          }
        }

        const { data: newUser, error } = await supabase
          .from('users')
          .insert({
            username,
            password,
            user_code: userCode,
          })
          .select()
          .single()

        if (error) throw error

        const user = newUser as User
        localStorage.setItem('chat_user', JSON.stringify(user))
        onLogin(user)
      }
    } catch (error) {
      console.error('Login error:', error)
      alert('Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-blue-400">
          Fast Chat
        </h1>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter username"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter password"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Loading...' : 'Login / Sign Up'}
          </button>
        </form>
        <p className="mt-6 text-sm text-center text-slate-400">
          New users are created automatically
        </p>
      </div>
    </div>
  )
  }
