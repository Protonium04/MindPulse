import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Brain, Mail, Lock, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../context/authStore'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const { login, loading } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const user = await login(form.email, form.password)
      toast.success('Welcome back!')
      // If either service not connected, go through onboarding
      if (!user.spotify_connected || !user.youtube_connected) {
        navigate('/connect-accounts')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl opacity-10"
          style={{ background: 'var(--accent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-8"
          style={{ background: '#438063' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)' }}>
            <Brain size={28} style={{ color: 'var(--accent)' }} />
          </div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            MindPulse
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Your mental wellness companion</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
            Sign in
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  className="input-field pl-10"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  className="input-field pl-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 mt-6" disabled={loading}>
              {loading ? 'Signing in…' : (<>Sign in <ArrowRight size={15} /></>)}
            </button>
          </form>

          <p className="text-center mt-6 text-sm" style={{ color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent)' }} className="font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
