import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { MessageCircleHeart, TrendingUp, Shield, Music, Youtube, ArrowRight, Zap } from 'lucide-react'
import { analyticsAPI } from '../utils/api'
import useAuthStore from '../context/authStore'
import { getEmotionMeta, distressLabel } from '../utils/emotions'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const [summary, setSummary] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [s, h] = await Promise.all([
          analyticsAPI.summary(),
          analyticsAPI.emotionHistory(7),
        ])
        setSummary(s.data)
        setHistory(h.data)
      } catch (_) {}
      setLoading(false)
    }
    load()
  }, [])

  const emotionMeta = summary?.dominant_emotion ? getEmotionMeta(summary.dominant_emotion) : null
  const distress = summary ? distressLabel(summary.avg_distress) : null

  const radarData = summary?.emotion_distribution
    ? Object.entries(summary.emotion_distribution).map(([name, value]) => ({
        emotion: getEmotionMeta(name).label,
        value,
        fullMark: Math.max(...Object.values(summary.emotion_distribution)),
      }))
    : []

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          {greeting}, {user?.full_name?.split(' ')[0] || user?.username} 👋
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {loading ? 'Loading your wellness data…' : `You have ${summary?.total_sessions || 0} sessions in the last 30 days.`}
        </p>
      </motion.div>

      {/* Quick action banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-6 p-5 rounded-2xl flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, rgba(77,123,255,0.15), rgba(67,128,99,0.15))', border: '1px solid rgba(77,123,255,0.25)' }}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
            <Zap size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>How are you feeling right now?</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Share your thoughts and let MindPulse understand you</p>
          </div>
        </div>
        <Link to="/chat" className="btn-primary flex items-center gap-2 whitespace-nowrap">
          Talk now <ArrowRight size={14} />
        </Link>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            label: 'Dominant Emotion',
            value: emotionMeta?.label || '—',
            sub: 'Last 30 days',
            icon: emotionMeta?.emoji || '🌫️',
            color: emotionMeta?.color || 'var(--text-muted)',
          },
          {
            label: 'Avg Distress',
            value: summary ? `${Math.round(summary.avg_distress * 100)}%` : '—',
            sub: distress?.label || 'No data',
            icon: '📊',
            color: distress?.color || 'var(--text-muted)',
          },
          {
            label: 'Total Sessions',
            value: summary?.total_sessions ?? '—',
            sub: 'Conversations logged',
            icon: '🗂️',
            color: 'var(--accent)',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="show"
            className="card p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold mb-0.5" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-5 gap-4">
        {/* Emotion radar */}
        <motion.div
          custom={3}
          variants={cardVariants}
          initial="hidden"
          animate="show"
          className="card p-5 col-span-2"
        >
          <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Emotion distribution</p>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="emotion" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Radar name="Emotion" dataKey="value" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} strokeWidth={1.5} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
              <p className="text-sm">No emotion data yet</p>
            </div>
          )}
        </motion.div>

        {/* Connections + recent */}
        <motion.div
          custom={4}
          variants={cardVariants}
          initial="hidden"
          animate="show"
          className="card p-5 col-span-3"
        >
          <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Data connections</p>
          <div className="space-y-3 mb-4">
            {[
              { label: 'Spotify', icon: Music, connected: user?.spotify_connected },
              { label: 'YouTube', icon: Youtube, connected: user?.youtube_connected },
            ].map(({ label, icon: Icon, connected }) => (
              <div key={label} className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2.5">
                  <Icon size={16} style={{ color: connected ? 'var(--success)' : 'var(--text-muted)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{label}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={connected
                    ? { color: 'var(--success)', background: 'rgba(52,211,153,0.1)' }
                    : { color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)' }}>
                  {connected ? 'Connected' : 'Not connected'}
                </span>
              </div>
            ))}
          </div>
          {!user?.spotify_connected && !user?.youtube_connected && (
            <Link to="/connections" className="btn-ghost w-full flex items-center justify-center gap-2 text-sm">
              Connect data sources <ArrowRight size={13} />
            </Link>
          )}

          {/* Escalation notice */}
          {summary?.escalations > 0 && (
            <div className="mt-3 p-3 rounded-xl flex items-center gap-2.5"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
              <Shield size={14} style={{ color: 'var(--danger)' }} />
              <p className="text-xs" style={{ color: 'var(--danger)' }}>
                {summary.escalations} session{summary.escalations > 1 ? 's' : ''} flagged for professional support
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
