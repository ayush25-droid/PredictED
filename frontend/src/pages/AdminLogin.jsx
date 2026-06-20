import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { adminLogin } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    const result = await adminLogin(email, password)
    if (result.success) {
      navigate('/admin-dashboard')
    } else {
      setError(result.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-secondary/10 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="glass-card rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <img src="/logo.jpg" alt="Logo" className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4" />
            <h1 className="text-3xl font-bold gradient-text">PredictED</h1>
            <p className="text-text-secondary mt-2">Admin Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter email" className="w-full bg-bg-tertiary border border-border rounded-xl py-3 pl-11 pr-4 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" className="w-full bg-bg-tertiary border border-border rounded-xl py-3 pl-11 pr-4 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary" required />
              </div>
            </div>
            {error && <p className="text-danger text-sm text-center">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <button type="button" onClick={() => navigate('/')} className="mt-6 w-full text-sm text-accent-primary hover:text-accent-secondary transition-colors">
            Back to Portal Selection
          </button>
        </div>
      </motion.div>
    </div>
  )
}
