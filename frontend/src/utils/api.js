import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ── Auth ────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password) =>
    api.post('/auth/login', new URLSearchParams({ username: email, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  me: () => api.get('/auth/me'),
}

// ── Chat ────────────────────────────────────────────────
export const chatAPI = {
  sendMessage: (message, includeSpotify = true, includeYoutube = true) =>
    api.post('/chat/message', { message, include_spotify: includeSpotify, include_youtube: includeYoutube }),
  getHistory: (limit = 50) => api.get(`/chat/history?limit=${limit}`),
}

// ── Spotify ─────────────────────────────────────────────
export const spotifyAPI = {
  connect: () => api.get('/spotify/connect'),
  status: () => api.get('/spotify/status'),
  recentTracks: () => api.get('/spotify/recent-tracks'),
  disconnect: () => api.delete('/spotify/disconnect'),
}

// ── YouTube ─────────────────────────────────────────────
export const youtubeAPI = {
  connect: () => api.get('/youtube/connect'),
  status: () => api.get('/youtube/status'),
  watchHistory: () => api.get('/youtube/watch-history'),
  disconnect: () => api.delete('/youtube/disconnect'),
}

// ── Analytics ───────────────────────────────────────────
export const analyticsAPI = {
  emotionHistory: (days = 7) => api.get(`/analytics/emotion-history?days=${days}`),
  summary: () => api.get('/analytics/summary'),
}
