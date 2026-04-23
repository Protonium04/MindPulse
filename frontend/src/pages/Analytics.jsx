import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend
} from 'recharts'
import { analyticsAPI } from '../utils/api'
import { getEmotionMeta, distressLabel, formatDate } from '../utils/emotions'

const DAYS_OPTIONS = [7, 14, 30]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-xl text-xs" style={{ background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)' }}>
      <p className="mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? (p.value * 100).toFixed(0) + '%' : p.value}
        </p>
      ))}
    </div>
  )
}

export default function Analytics() {
  const [days, setDays] = useState(7)
  const [history, setHistory] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [h, s] = await Promise.all([
          analyticsAPI.emotionHistory(days),
          analyticsAPI.summary(),
        ])
        setHistory(h.data)
        setSummary(s.data)
      } catch (_) {}
      setLoading(false)
    }
    load()
  }, [days])

  const chartData = history.map(s => ({
    date: formatDate(s.created_at),
    distress: s.distress_score,
    joy: s.joy,
    sadness: s.sadness,
    anger: s.anger,
    fear: s.fear,
    emotion: s.dominant_emotion,
  }))

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              Emotion Analytics
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>Track your emotional patterns over time</p>
          </div>
          <div className="flex gap-2">
            {DAYS_OPTIONS.map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={days === d
                  ? { background: 'var(--accent)', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total sessions', value: summary.total_sessions, color: 'var(--accent)' },
            { label: 'Avg distress', value: `${Math.round(summary.avg_distress * 100)}%`, color: distressLabel(summary.avg_distress).color },
            { label: 'Dominant emotion', value: getEmotionMeta(summary.dominant_emotion).label, color: getEmotionMeta(summary.dominant_emotion).color },
            { label: 'Escalations', value: summary.escalations, color: summary.escalations > 0 ? 'var(--danger)' : 'var(--success)' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="card p-4"
            >
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="card p-12 flex items-center justify-center">
          <p style={{ color: 'var(--text-muted)' }}>Loading analytics…</p>
        </div>
      ) : history.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <span className="text-4xl mb-3">📊</span>
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No data yet</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Start chatting with MindPulse to see your emotion timeline here
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Distress timeline */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-5"
          >
            <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
              Distress level over time
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="distressGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f87171" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 1]} tickFormatter={v => `${Math.round(v * 100)}%`}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="distress" stroke="#f87171" strokeWidth={2}
                  fill="url(#distressGrad)" dot={{ fill: '#f87171', r: 3 }} name="Distress" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Emotion breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-5"
          >
            <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
              Emotion breakdown
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 1]} tickFormatter={v => `${Math.round(v * 100)}%`}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-muted)' }} />
                <Line type="monotone" dataKey="joy"     stroke="#fbbf24" strokeWidth={2} dot={false} name="Joy" />
                <Line type="monotone" dataKey="sadness" stroke="#60a5fa" strokeWidth={2} dot={false} name="Sadness" />
                <Line type="monotone" dataKey="anger"   stroke="#f87171" strokeWidth={2} dot={false} name="Anger" />
                <Line type="monotone" dataKey="fear"    stroke="#c084fc" strokeWidth={2} dot={false} name="Fear" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Session log */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card p-5"
          >
            <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
              Session log
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...history].reverse().map((s) => {
                const meta = getEmotionMeta(s.dominant_emotion)
                const d = distressLabel(s.distress_score)
                return (
                  <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{meta.emoji}</span>
                      <div>
                        <p className="text-sm font-medium capitalize" style={{ color: meta.color }}>{meta.label}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(s.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {s.spotify_mood && (
                        <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                          style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)' }}>
                          🎵 {s.spotify_mood}
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ color: d.color, background: `${d.color}18` }}>
                        {Math.round(s.distress_score * 100)}% distress
                      </span>
                      {s.escalation_triggered && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ color: 'var(--danger)', background: 'rgba(248,113,113,0.12)' }}>
                          ⚠ Escalated
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
