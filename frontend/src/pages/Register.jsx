import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Brain, Mail, Lock, User, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../context/authStore'

export default function Register() {
  const [form, setForm] = useState({ email: '', username: '', password: '', full_name: '' })
  const { register, login, loading } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await register(form)
      await login(form.email, form.password)
      toast.success('Account created! Welcome to MindPulse 🧠')
      // New users always go through account connection onboarding
      navigate('/connect-accounts')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    }
  }

  const field = (key) => ({
    value: form[key],
    onChange: e => setForm(f => ({ ...f, [key]: e.target.value }),
  )})

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-8"
          style={{ background: '#438063' }} />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 rounded-full blur-3xl opacity-10"
          style={{ background: 'var(--accent)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)' }}>
            <Brain size={28} style={{ color: 'var(--accent)' }} />
          </div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Join MindPulse
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Start your wellness journey today</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
            Create account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>Username</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input className="input-field pl-10" placeholder="johndoe" {...field('username')} required />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>Full name</label>
                <input className="input-field" placeholder="John Doe" {...field('full_name')} />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input type="email" className="input-field pl-10" placeholder="you@example.com" {...field('email')} required />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input type="password" className="input-field pl-10" placeholder="min 8 characters" {...field('password')} required minLength={8} />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 mt-6" disabled={loading}>
              {loading ? 'Creating account…' : (<>Get started <ArrowRight size={15} /></>)}
            </button>
          </form>

          <p className="text-center mt-6 text-sm" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)' }} className="font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
