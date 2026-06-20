import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'

export default function ResetPassword() {
  const { token: pathToken } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const token = new URLSearchParams(location.search).get('token') || pathToken
  const [status, setStatus] = useState('Checking reset link...')
  const [valid, setValid] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const verifyToken = async () => {
      const response = await fetch(`/api/password-reset/${token}`)
      const data = await response.json()
      setValid(Boolean(data.success))
      setStatus(data.success ? `Reset password for ${data.email}` : data.message || 'Invalid reset link')
    }
    verifyToken()
  }, [token])

  const submit = async (event) => {
    event.preventDefault()
    if (password.length < 8) {
      setStatus('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setStatus('Passwords do not match.')
      return
    }
    setLoading(true)
    const response = await fetch(`/api/password-reset/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_password: password })
    })
    const data = await response.json()
    setStatus(data.message || 'Unable to reset password.')
    setLoading(false)
    if (data.success) {
      setTimeout(() => navigate('/'), 1200)
    }
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
            <h1 className="text-3xl font-bold gradient-text">Reset Password</h1>
            <p className="text-text-secondary mt-2">{status}</p>
          </div>
          {valid && (
            <form onSubmit={submit} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" className="w-full bg-bg-tertiary border border-border rounded-xl py-3 pl-11 pr-4 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary" required />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm password" className="w-full bg-bg-tertiary border border-border rounded-xl py-3 pl-11 pr-4 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary" required />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold disabled:opacity-50">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
          <button type="button" onClick={() => navigate('/')} className="mt-6 w-full text-sm text-accent-primary hover:text-accent-secondary transition-colors">
            Back to Portal Selection
          </button>
        </div>
      </motion.div>
    </div>
  )
}


