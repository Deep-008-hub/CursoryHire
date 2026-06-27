import { create } from 'zustand'
import api from '../utils/api'

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('ch_user') || 'null'),
  token: localStorage.getItem('ch_token') || null,
  profile: null,
  loading: false,

  setAuth: (token, user) => {
    localStorage.setItem('ch_token', token)
    localStorage.setItem('ch_user', JSON.stringify(user))
    set({ token, user })
  },

  logout: () => {
    localStorage.removeItem('ch_token')
    localStorage.removeItem('ch_user')
    set({ token: null, user: null, profile: null })
  },

  fetchProfile: async () => {
    try {
      const res = await api.get('/users/me')
      set({ profile: res.data })
      return res.data
    } catch (e) {
      console.error('Profile fetch failed:', e)
    }
  },

  isHR: () => get().user?.role === 'hr',
  isCandidate: () => get().user?.role === 'candidate',
  isLoggedIn: () => !!get().token,
}))

export default useAuthStore
