import { create } from 'zustand'
import { authAPI } from '../utils/api'

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true })
    const res = await authAPI.login(email, password)
    const { access_token, user } = res.data
    localStorage.setItem('token', access_token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ token: access_token, user, loading: false })
    return user
  },

  register: async (data) => {
    set({ loading: true })
    const res = await authAPI.register(data)
    set({ loading: false })
    return res.data
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null })
  },

  refreshUser: async () => {
    try {
      const res = await authAPI.me()
      const user = res.data
      localStorage.setItem('user', JSON.stringify(user))
      set({ user })
    } catch (_) {}
  },
}))

export default useAuthStore
