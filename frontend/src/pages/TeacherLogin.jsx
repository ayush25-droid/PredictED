import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { Lock, User } from 'lucide-react'

export default function TeacherLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [showReset, setShowReset] = useState(false)
  const [loading, setLoading] = useState(false)
  const { teacherLogin } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await teacherLogin(username, password)
    if (result.success) {
      navigate('/teacher-dashboard')
    } else {
      setError(result.message)
    }
    setLoading(false)
  }

  const requestPasswordReset = async (event) => {
    event.preventDefault()
    setError('')
    const response = await fetch('/api/password-reset-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'teacher', email: resetEmail })
    })
    const data = await response.json()
    setError(data.message || 'Unable to submit reset request.')
    if (data.success) {
      setResetEmail('')
      setShowReset(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-secondary/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="glass-card rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-flex items-center justify-center mb-4"
            >
              <img
                src="/logo.jpg"
                alt="Logo"
                className="w-20 h-20 rounded-2xl object-cover"
              />
            </motion.div>
            <h1 className="text-3xl font-bold gradient-text">PredictED</h1>
            <p className="text-text-secondary mt-2">Teacher Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full bg-bg-tertiary border border-border rounded-xl py-3 pl-11 pr-4 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-bg-tertiary border border-border rounded-xl py-3 pl-11 pr-4 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary transition-colors"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-danger text-sm text-center"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </motion.button>
          </form>

          <button
            type="button"
            onClick={() => setShowReset(!showReset)}
            className="mt-4 w-full text-sm text-text-secondary hover:text-accent-primary transition-colors"
          >
            Forgot Password?
          </button>

          {showReset && (
            <form onSubmit={requestPasswordReset} className="mt-4 space-y-3">
              <input
                type="email"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                placeholder="Registered email"
                className="w-full bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary transition-colors"
                required
              />
              <button type="submit" className="w-full py-3 px-4 rounded-xl bg-bg-tertiary text-accent-primary font-semibold">
                Send Request to Admin
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 w-full text-sm text-accent-primary hover:text-accent-secondary transition-colors"
          >
            Back to Portal Selection
          </button>
        </div>
      </motion.div>
    </div>
  )
}
