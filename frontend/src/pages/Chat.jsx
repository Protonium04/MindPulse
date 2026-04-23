import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Music, Youtube, RefreshCw, AlertTriangle, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import useChatStore from '../context/chatStore'
import useAuthStore from '../context/authStore'
import { getEmotionMeta, distressLabel, formatTime } from '../utils/emotions'

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 mb-4">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
        style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)' }}>🧠</div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-md" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex gap-1 items-center h-4">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </div>
  )
}

function UserBubble({ message }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex justify-end mb-4"
    >
      <div className="max-w-sm">
        <div className="px-4 py-3 rounded-2xl rounded-br-md text-sm leading-relaxed"
          style={{ background: 'var(--accent)', color: '#fff' }}>
          {message.content}
        </div>
        <p className="text-right text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {formatTime(message.created_at)}
        </p>
      </div>
    </motion.div>
  )
}

function AssistantBubble({ message }) {
  const meta = message.detected_emotion ? getEmotionMeta(message.detected_emotion) : null
  const distress = message.distress_score != null ? distressLabel(message.distress_score) : null

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-end gap-3 mb-4"
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
        style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)' }}>🧠</div>

      <div className="max-w-lg flex-1">
        {/* Emotion tag */}
        {meta && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">{meta.emoji}</span>
            <span className="text-xs font-medium" style={{ color: meta.color }}>
              {meta.label}
            </span>
            {distress && (
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ color: distress.color, background: `${distress.color}20` }}>
                {distress.label} distress
              </span>
            )}
          </div>
        )}

        {/* Reply bubble */}
        <div className="px-4 py-3 rounded-2xl rounded-bl-md text-sm leading-relaxed mb-2"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          {message.content}
        </div>

        {/* Coping steps */}
        {message.coping_steps?.length > 0 && (
          <div className="space-y-2 mb-2">
            {message.coping_steps.map((step) => (
              <div key={step.step} className="flex gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(67,128,99,0.08)', border: '1px solid rgba(67,128,99,0.2)' }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(67,128,99,0.3)', color: 'var(--sage-light)' }}>
                  {step.step}
                </span>
                <div>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--sage-light)' }}>{step.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Doctor referral */}
        {message.doctor_referral && (
          <div className="p-3 rounded-xl flex gap-3"
            style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)' }}>
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--danger)' }} />
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--danger)' }}>
                Professional support recommended
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Based on your recent sessions, speaking with a mental health professional could be helpful.
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <Phone size={11} style={{ color: 'var(--danger)' }} />
                <span className="text-xs font-mono" style={{ color: 'var(--danger)' }}>
                  iCall (India): 9152987821
                </span>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {formatTime(message.created_at)}
        </p>
      </div>
    </motion.div>
  )
}

export default function Chat() {
  const { messages, loading, loadHistory, sendMessage } = useChatStore()
  const { user } = useAuthStore()
  const [input, setInput] = useState('')
  const [includeSpotify, setIncludeSpotify] = useState(true)
  const [includeYoutube, setIncludeYoutube] = useState(true)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => { loadHistory() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    try {
      await sendMessage(text, includeSpotify && !!user?.spotify_connected, includeYoutube && !!user?.youtube_connected)
    } catch (err) {
      toast.error('Failed to send message. Is the backend running?')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <div>
          <h2 className="font-display font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
            Talk to MindPulse
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Your empathetic AI companion — share anything on your mind
          </p>
        </div>

        {/* Signal toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIncludeSpotify(v => !v)}
            disabled={!user?.spotify_connected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={includeSpotify && user?.spotify_connected
              ? { background: 'rgba(30,215,96,0.15)', color: '#1ed760', border: '1px solid rgba(30,215,96,0.3)' }
              : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            title={user?.spotify_connected ? 'Toggle Spotify signal' : 'Connect Spotify first'}
          >
            <Music size={12} />
            Spotify
          </button>
          <button
            onClick={() => setIncludeYoutube(v => !v)}
            disabled={!user?.youtube_connected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={includeYoutube && user?.youtube_connected
              ? { background: 'rgba(255,0,0,0.12)', color: '#ff4444', border: '1px solid rgba(255,0,0,0.25)' }
              : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            title={user?.youtube_connected ? 'Toggle YouTube signal' : 'Connect YouTube first'}
          >
            <Youtube size={12} />
            YouTube
          </button>
          <button
            onClick={() => { useChatStore.getState().clearMessages(); loadHistory() }}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            title="Refresh history"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {messages.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <span className="text-5xl mb-4">🧠</span>
            <h3 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Hello, I'm MindPulse
            </h3>
            <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
              I'm here to listen and understand. Tell me how you're feeling — I'll read your words,
              your music, and your videos to truly understand you.
            </p>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg) =>
            msg.role === 'user'
              ? <UserBubble key={msg.id} message={msg} />
              : <AssistantBubble key={msg.id} message={msg} />
          )}
        </AnimatePresence>

        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              className="input-field resize-none pr-12 min-h-[48px] max-h-36"
              rows={1}
              placeholder="Share what's on your mind… (Enter to send, Shift+Enter for new line)"
              value={input}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
              onKeyDown={handleKeyDown}
              style={{ lineHeight: '1.5' }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="btn-primary p-3 flex-shrink-0"
            style={{ padding: '12px' }}
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
          {user?.spotify_connected || user?.youtube_connected
            ? `Analysing text${user.spotify_connected && includeSpotify ? ' + Spotify' : ''}${user.youtube_connected && includeYoutube ? ' + YouTube' : ''} signals`
            : 'Connect Spotify & YouTube for deeper emotion understanding'}
        </p>
      </div>
    </div>
  )
}
