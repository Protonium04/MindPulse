import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Music, Youtube, CheckCircle, ArrowRight, Brain, Loader2, SkipForward } from 'lucide-react'
import toast from 'react-hot-toast'
import { spotifyAPI, youtubeAPI } from '../utils/api'
import useAuthStore from '../context/authStore'

const STEPS = [
  {
    id: 'spotify',
    label: 'Spotify',
    sub: 'We read your recently played tracks to understand your music mood.',
    icon: Music,
    color: '#1ed760',
    bgColor: 'rgba(30,215,96,0.1)',
    borderColor: 'rgba(30,215,96,0.25)',
    what: ['Recently played tracks', 'Audio features (valence, energy)', 'Listening mood signals'],
  },
  {
    id: 'youtube',
    label: 'YouTube',
    sub: 'We analyse your liked videos and watch history for emotional themes.',
    icon: Youtube,
    color: '#ff4444',
    bgColor: 'rgba(255,68,68,0.1)',
    borderColor: 'rgba(255,68,68,0.25)',
    what: ['Liked videos & watch history', 'Video title sentiment', 'Content mood patterns'],
  },
]

export default function ConnectAccounts() {
  const { user, refreshUser } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [spotifyDone, setSpotifyDone] = useState(!!user?.spotify_connected)
  const [youtubeDone, setYoutubeDone] = useState(!!user?.youtube_connected)
  const [connecting, setConnecting] = useState(null) // 'spotify' | 'youtube'
  const [showSuccess, setShowSuccess] = useState(false)

  // Handle OAuth callback returns
  useEffect(() => {
    const cb = async () => {
      const spotify = searchParams.get('spotify')
      const youtube = searchParams.get('youtube')

      if (spotify === 'connected') {
        await refreshUser()
        setSpotifyDone(true)
        toast.success('Spotify connected! 🎵')
      }
      if (youtube === 'connected') {
        await refreshUser()
        setYoutubeDone(true)
        toast.success('YouTube connected! 📺')
      }
    }
    cb()
  }, [])

  // Sync from user object whenever it updates
  useEffect(() => {
    setSpotifyDone(!!user?.spotify_connected)
    setYoutubeDone(!!user?.youtube_connected)
  }, [user])

  // If both already connected on page load, go straight to dashboard
  useEffect(() => {
    if (user?.spotify_connected && user?.youtube_connected) {
      setShowSuccess(true)
      const t = setTimeout(() => navigate('/dashboard'), 1800)
      return () => clearTimeout(t)
    }
  }, [user])

  const handleConnect = async (id) => {
    setConnecting(id)
    try {
      if (id === 'spotify') {
        const res = await spotifyAPI.connect()
        // Store current page so callback returns here
        sessionStorage.setItem('oauth_return', '/connect-accounts')
        window.location.href = res.data.auth_url
      } else {
        const res = await youtubeAPI.connect()
        sessionStorage.setItem('oauth_return', '/connect-accounts')
        window.location.href = res.data.auth_url
      }
    } catch {
      toast.error(`Failed to connect ${id === 'spotify' ? 'Spotify' : 'YouTube'}`)
      setConnecting(null)
    }
  }

  const handleContinue = () => {
    navigate('/dashboard')
  }

  const bothDone = spotifyDone && youtubeDone
  const noneDone = !spotifyDone && !youtubeDone

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background glows */}
      {/* Background glows */}
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl"
        style={{ background: '#1ed760', opacity: 0.04 }} />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full blur-3xl"
        style={{ background: '#ff4444', opacity: 0.04 }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl"
        style={{ background: 'var(--accent)', opacity: 0.05 }} />
    </div>

      <AnimatePresence mode="wait">
        {showSuccess ? (
          /* ── All connected splash ── */
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(52,211,153,0.15)', border: '2px solid rgba(52,211,153,0.4)' }}
            >
              <CheckCircle size={36} style={{ color: 'var(--success)' }} />
            </motion.div>
            <h2 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              All connected!
            </h2>
            <p style={{ color: 'var(--text-muted)' }}>Taking you to your dashboard…</p>
          </motion.div>
        ) : (
          /* ── Main connect UI ── */
          <motion.div
            key="connect"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="w-full max-w-lg"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)' }}>
                <Brain size={28} style={{ color: 'var(--accent)' }} />
              </div>
              <h1 className="font-display text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Connect your accounts
              </h1>
              <p className="text-sm leading-relaxed max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
                Hey <span style={{ color: 'var(--text-primary)' }}>{user?.full_name?.split(' ')[0] || user?.username}</span>!
                MindPulse reads your music and video habits to understand your mood — beyond just what you type.
              </p>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center gap-3 mb-6 px-1">
              {STEPS.map((step, i) => {
                const done = step.id === 'spotify' ? spotifyDone : youtubeDone
                return (
                  <div key={step.id} className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                        style={done
                          ? { background: 'var(--success)', color: '#fff' }
                          : { background: 'var(--border)', color: 'var(--text-muted)' }}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span className="text-xs font-medium" style={{ color: done ? 'var(--success)' : 'var(--text-muted)' }}>
                        {step.label}
                      </span>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: done ? '100%' : '0%', background: step.color }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Service cards */}
            <div className="space-y-4 mb-6">
              {STEPS.map((step) => {
                const Icon = step.icon
                const done = step.id === 'spotify' ? spotifyDone : youtubeDone
                const isConnecting = connecting === step.id

                return (
                  <motion.div
                    key={step.id}
                    layout
                    className="card p-5 transition-all duration-200"
                    style={done ? { borderColor: step.borderColor, background: step.bgColor } : {}}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Icon */}
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: step.bgColor, border: `1px solid ${step.borderColor}` }}>
                          {done
                            ? <CheckCircle size={20} style={{ color: step.color }} />
                            : <Icon size={20} style={{ color: step.color }} />
                          }
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{step.label}</p>
                            {done && (
                              <span className="text-xs px-2 py-0.5 rounded-full"
                                style={{ color: step.color, background: step.bgColor }}>
                                Connected
                              </span>
                            )}
                          </div>
                          <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-muted)' }}>{step.sub}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                            {step.what.map(w => (
                              <span key={w} className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                <span style={{ color: step.color }}>·</span> {w}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Button */}
                      {!done && (
                        <button
                          onClick={() => handleConnect(step.id)}
                          disabled={!!connecting}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium flex-shrink-0 transition-all"
                          style={{
                            color: step.color,
                            background: step.bgColor,
                            border: `1px solid ${step.borderColor}`,
                            opacity: connecting && connecting !== step.id ? 0.5 : 1,
                          }}
                        >
                          {isConnecting
                            ? <><Loader2 size={13} className="animate-spin" /> Connecting…</>
                            : <><ArrowRight size={13} /> Connect</>
                          }
                        </button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Privacy note */}
            <div className="flex items-start gap-2.5 mb-6 px-1">
              <span className="text-base flex-shrink-0">🔒</span>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                We only <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>read</strong> your activity — we never modify your playlists, history, or posts.
                You can disconnect anytime from the Connections page.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              {bothDone ? (
                <button onClick={handleContinue} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  Go to Dashboard <ArrowRight size={15} />
                </button>
              ) : (
                <>
                  <button
                    onClick={handleContinue}
                    className="btn-ghost flex items-center gap-2 text-sm"
                  >
                    <SkipForward size={14} />
                    {noneDone ? 'Skip for now' : 'Continue anyway'}
                  </button>
                  {(spotifyDone || youtubeDone) && (
                    <p className="text-xs flex-1 text-right" style={{ color: 'var(--text-muted)' }}>
                      {spotifyDone ? '✅ Spotify' : '⬜ Spotify'} &nbsp;
                      {youtubeDone ? '✅ YouTube' : '⬜ YouTube'}
                    </p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
