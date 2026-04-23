import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, MessageCircleHeart, BarChart3,
  Plug, LogOut, Brain
} from 'lucide-react'
import useAuthStore from '../../context/authStore'
import useChatStore from '../../context/chatStore'
import { getEmotionMeta, distressLabel } from '../../utils/emotions'

const NAV = [
  { to: '/dashboard',   icon: LayoutDashboard,      label: 'Dashboard' },
  { to: '/chat',        icon: MessageCircleHeart,   label: 'Talk to MindPulse' },
  { to: '/analytics',  icon: BarChart3,             label: 'Analytics' },
  { to: '/connections', icon: Plug,                 label: 'Connections' },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const { currentEmotion, currentDistress } = useChatStore()
  const navigate = useNavigate()

  const emotionMeta = currentEmotion ? getEmotionMeta(currentEmotion) : null
  const distress = currentEmotion ? distressLabel(currentDistress) : null

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 flex flex-col border-r flex-shrink-0"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        {/* Logo */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)' }}>
              <Brain size={18} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>MindPulse</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Wellness Companion</p>
            </div>
          </div>
        </div>

        {/* Current emotion status */}
        {emotionMeta && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mb-4 p-3 rounded-xl border"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'var(--border)' }}
          >
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Current mood</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{emotionMeta.emoji}</span>
                <span className="text-sm font-medium capitalize" style={{ color: emotionMeta.color }}>
                  {emotionMeta.label}
                </span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: distress.color, background: `${distress.color}20` }}>
                {distress.label}
              </span>
            </div>
            <div className="mt-2 h-1 rounded-full" style={{ background: 'var(--border)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.round(currentDistress * 100)}%`, background: distress.color }}
              />
            </div>
          </motion.div>
        )}

        {/* Nav links */}
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'text-white'
                    : 'hover:bg-white/5'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(77,123,255,0.3)' }
                  : { color: 'var(--text-muted)', border: '1px solid transparent' }
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {user?.username}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150"
            style={{ color: 'var(--text-muted)' }}
            onMouseOver={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'rgba(248,113,113,0.08)' }}
            onMouseOut={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
