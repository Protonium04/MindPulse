import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Music, Youtube, CheckCircle, XCircle, ExternalLink, Unlink, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { spotifyAPI, youtubeAPI } from '../utils/api'
import useAuthStore from '../context/authStore'

function ConnectionCard({ name, icon: Icon, iconColor, connected, onConnect, onDisconnect, loading, details }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: `${iconColor}18`, border: `1px solid ${iconColor}40` }}>
            <Icon size={22} style={{ color: iconColor }} />
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {connected
                ? <><CheckCircle size={12} style={{ color: 'var(--success)' }} /><span className="text-xs" style={{ color: 'var(--success)' }}>Connected</span></>
                : <><XCircle size={12} style={{ color: 'var(--text-muted)' }} /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Not connected</span></>
              }
            </div>
          </div>
        </div>

        {connected
          ? (
            <button
              onClick={onDisconnect}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ color: 'var(--danger)', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}
            >
              <Unlink size={12} />
              Disconnect
            </button>
          ) : (
            <button
              onClick={onConnect}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ color: iconColor, background: `${iconColor}18`, border: `1px solid ${iconColor}40` }}
            >
              <ExternalLink size={12} />
              {loading ? 'Opening…' : 'Connect'}
            </button>
          )
        }
      </div>

      {/* What we access */}
      <div className="space-y-2">
        {details.map((d, i) => (
          <div key={i} className="flex items-start gap-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: iconColor }} />
            {d}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default function Connections() {
  const { user, refreshUser } = useAuthStore()
  const [searchParams] = useSearchParams()
  const [spotifyLoading, setSpotifyLoading] = useState(false)
  const [youtubeLoading, setYoutubeLoading] = useState(false)
  const [spotifyData, setSpotifyData] = useState(null)
  const [youtubeData, setYoutubeData] = useState(null)

  // Handle OAuth return
  useEffect(() => {
    const spotify = searchParams.get('spotify')
    const youtube = searchParams.get('youtube')
    if (spotify === 'connected') {
      toast.success('Spotify connected! 🎵')
      refreshUser()
    }
    if (youtube === 'connected') {
      toast.success('YouTube connected! 📺')
      refreshUser()
    }
  }, [])

  // Load live data if connected
  useEffect(() => {
    if (user?.spotify_connected) {
      spotifyAPI.recentTracks().then(r => setSpotifyData(r.data)).catch(() => {})
    }
    if (user?.youtube_connected) {
      youtubeAPI.watchHistory().then(r => setYoutubeData(r.data)).catch(() => {})
    }
  }, [user?.spotify_connected, user?.youtube_connected])

  const connectSpotify = async () => {
    setSpotifyLoading(true)
    try {
      const res = await spotifyAPI.connect()
      window.location.href = res.data.auth_url
    } catch {
      toast.error('Failed to initiate Spotify connection')
      setSpotifyLoading(false)
    }
  }

  const disconnectSpotify = async () => {
    try {
      await spotifyAPI.disconnect()
      setSpotifyData(null)
      await refreshUser()
      toast.success('Spotify disconnected')
    } catch {
      toast.error('Failed to disconnect Spotify')
    }
  }

  const connectYoutube = async () => {
    setYoutubeLoading(true)
    try {
      const res = await youtubeAPI.connect()
      window.location.href = res.data.auth_url
    } catch {
      toast.error('Failed to initiate YouTube connection')
      setYoutubeLoading(false)
    }
  }

  const disconnectYoutube = async () => {
    try {
      await youtubeAPI.disconnect()
      setYoutubeData(null)
      await refreshUser()
      toast.success('YouTube disconnected')
    } catch {
      toast.error('Failed to disconnect YouTube')
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Data Connections
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Connect your services so MindPulse can understand your emotional patterns beyond just what you type
        </p>
      </motion.div>

      {/* Info banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6 p-4 rounded-xl flex items-start gap-3"
        style={{ background: 'rgba(77,123,255,0.08)', border: '1px solid rgba(77,123,255,0.2)' }}
      >
        <span className="text-lg">🔒</span>
        <div>
          <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>Privacy first</p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            We only read your activity data to understand your mood — we never modify your playlists, history, or account.
            Tokens are stored securely and you can disconnect at any time.
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-5">
        <ConnectionCard
          name="Spotify"
          icon={Music}
          iconColor="#1ed760"
          connected={!!user?.spotify_connected}
          onConnect={connectSpotify}
          onDisconnect={disconnectSpotify}
          loading={spotifyLoading}
          details={[
            'Read your recently played tracks (up to 50)',
            'Analyse audio features: valence (happiness), energy, and danceability',
            'Map your listening mood to emotional signals',
          ]}
        />

        <ConnectionCard
          name="YouTube"
          icon={Youtube}
          iconColor="#ff4444"
          connected={!!user?.youtube_connected}
          onConnect={connectYoutube}
          onDisconnect={disconnectYoutube}
          loading={youtubeLoading}
          details={[
            'Read your liked videos and watch history',
            'Analyse video titles and categories for emotional themes',
            'Detect patterns like late-night doom-scrolling or sad content consumption',
          ]}
        />
      </div>

      {/* Live signal preview — always show when at least one connected */}
      {(user?.spotify_connected || user?.youtube_connected) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="glow-dot" style={{ background: 'var(--success)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Live signal preview</p>
            </div>
            <button
              onClick={async () => {
                if (user?.spotify_connected) {
                  try { const r = await spotifyAPI.recentTracks(); setSpotifyData(r.data) } catch {}
                }
                if (user?.youtube_connected) {
                  try { const r = await youtubeAPI.watchHistory(); setYoutubeData(r.data) } catch {}
                }
                toast.success('Signals refreshed!')
              }}
              className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              <RefreshCw size={11} /> Refresh
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Spotify Signal Card */}
            {user?.spotify_connected && (
              <div className="p-3 rounded-xl" style={{ background: 'rgba(30,215,96,0.06)', border: '1px solid rgba(30,215,96,0.15)' }}>
                <div className="flex items-center gap-1.5 mb-3">
                  <Music size={13} style={{ color: '#1ed760' }} />
                  <p className="text-xs font-medium" style={{ color: '#1ed760' }}>Spotify signal</p>
                </div>
                {spotifyData && spotifyData.tracks_analysed > 0 ? (
                  <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <p>Tracks analysed: <span style={{ color: 'var(--text-primary)' }}>{spotifyData.tracks_analysed}</span></p>
                    <p>Mood: <span className="capitalize" style={{ color: '#1ed760' }}>{spotifyData.dominant_mood}</span></p>
                    <p>Valence: <span style={{ color: 'var(--text-primary)' }}>{Math.round(spotifyData.avg_valence * 100)}%</span></p>
                    <p>Energy: <span style={{ color: 'var(--text-primary)' }}>{Math.round(spotifyData.avg_energy * 100)}%</span></p>
                    {spotifyData.top_tracks?.length > 0 && (
                      <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(30,215,96,0.15)' }}>
                        <p className="mb-1">Recent tracks:</p>
                        {spotifyData.top_tracks.slice(0, 2).map((t, i) => (
                          <p key={i} className="truncate">• {t}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs space-y-1.5" style={{ color: 'var(--text-muted)' }}>
                    <p>🎵 No recent listening data yet.</p>
                    <p>Play some songs on Spotify then click Refresh!</p>
                  </div>
                )}
              </div>
            )}

            {/* YouTube Signal Card */}
            {user?.youtube_connected && (
              <div className="p-3 rounded-xl" style={{ background: 'rgba(255,68,68,0.06)', border: '1px solid rgba(255,68,68,0.15)' }}>
                <div className="flex items-center gap-1.5 mb-3">
                  <Youtube size={13} style={{ color: '#ff4444' }} />
                  <p className="text-xs font-medium" style={{ color: '#ff4444' }}>YouTube signal</p>
                </div>
                {youtubeData && youtubeData.videos_analysed > 0 ? (
                  <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <p>Videos analysed: <span style={{ color: 'var(--text-primary)' }}>{youtubeData.videos_analysed}</span></p>
                    <p>Theme: <span className="capitalize" style={{ color: '#ff4444' }}>{youtubeData.dominant_theme}</span></p>
                    <p>Sentiment: <span style={{ color: 'var(--text-primary)' }}>
                      {youtubeData.sentiment_score > 0.1 ? '😊 Positive' : youtubeData.sentiment_score < -0.1 ? '😔 Negative' : '😐 Neutral'}
                    </span></p>
                    <p>Sentiment score: <span style={{ color: 'var(--text-primary)' }}>{youtubeData.sentiment_score}</span></p>
                  </div>
                ) : (
                  <div className="text-xs space-y-1.5" style={{ color: 'var(--text-muted)' }}>
                    <p>📺 No YouTube data yet.</p>
                    <p>Like some videos on YouTube then click Refresh!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}
