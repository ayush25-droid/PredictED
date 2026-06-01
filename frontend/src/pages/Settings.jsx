import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import { Moon, Sun, User, Bell, Shield, Info } from 'lucide-react'

function Settings() {
  const { isDark, toggleTheme } = useTheme()
  const { user } = useAuth()
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '' })
  const [passwordMessage, setPasswordMessage] = useState('')

  const changePassword = async (event) => {
    event.preventDefault()
    setPasswordMessage('')
    const response = await fetch('/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usn: user?.usn, ...passwordForm })
    })
    const data = await response.json()
    setPasswordMessage(data.message || 'Unable to update password.')
    if (data.success) {
      setPasswordForm({ current_password: '', new_password: '' })
    }
  }

  return (
    <>
      <Sidebar />
      <div className="flex-1 overflow-auto p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
          <p className="text-text-secondary mt-1">Customize your dashboard experience</p>
        </motion.div>

        <div className="max-w-2xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent-primary/20 flex items-center justify-center">
                {isDark ? <Moon className="w-5 h-5 text-accent-primary" /> : <Sun className="w-5 h-5 text-accent-primary" />}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Appearance</h3>
                <p className="text-sm text-text-tertiary">Customize how the app looks</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-bg-tertiary rounded-xl">
              <div className="flex items-center gap-3">
                {isDark ? (
                  <Moon className="w-5 h-5 text-text-secondary" />
                ) : (
                  <Sun className="w-5 h-5 text-text-secondary" />
                )}
                <span className="text-text-primary">Dark Mode</span>
              </div>
              <button
                onClick={toggleTheme}
                className={`w-14 h-8 rounded-full transition-colors ${
                  isDark ? 'bg-accent-primary' : 'bg-gray-300'
                }`}
              >
                <motion.div
                  animate={{ x: isDark ? 24 : 4 }}
                  className="w-6 h-6 bg-white rounded-full shadow-md"
                />
              </button>
            </div>
          </motion.div>

          <motion.form
            onSubmit={changePassword}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Password</h3>
                <p className="text-sm text-text-tertiary">Update your login password</p>
              </div>
            </div>

            <input
              type="password"
              value={passwordForm.current_password}
              onChange={(event) => setPasswordForm({ ...passwordForm, current_password: event.target.value })}
              placeholder="Current password"
              className="w-full bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary"
              required
            />
            <input
              type="password"
              value={passwordForm.new_password}
              onChange={(event) => setPasswordForm({ ...passwordForm, new_password: event.target.value })}
              placeholder="New password"
              className="w-full bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary"
              required
            />
            {passwordMessage && <p className="text-sm text-accent-primary">{passwordMessage}</p>}
            <button type="submit" className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold">
              Update Password
            </button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent-secondary/20 flex items-center justify-center">
                <User className="w-5 h-5 text-accent-secondary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Profile</h3>
                <p className="text-sm text-text-tertiary">Your account information</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-bg-tertiary rounded-xl">
                <span className="text-text-secondary">Name</span>
                <span className="text-text-primary font-medium">{user?.name || 'Student'}</span>
              </div>
              <div className="flex justify-between p-3 bg-bg-tertiary rounded-xl">
                <span className="text-text-secondary">USN</span>
                <span className="text-text-primary font-medium">{user?.usn}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                <Info className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary">About</h3>
                <p className="text-sm text-text-tertiary">App information</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-bg-tertiary rounded-xl">
                <span className="text-text-secondary">Version</span>
                <span className="text-text-primary">1.0.0</span>
              </div>
              <div className="flex justify-between p-3 bg-bg-tertiary rounded-xl">
                <span className="text-text-secondary">App Name</span>
                <span className="text-text-primary">PredictED</span>
              </div>
              <div className="flex justify-between p-3 bg-bg-tertiary rounded-xl">
                <span className="text-text-secondary">Developer</span>
                <span className="text-text-primary">College Project</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  )
}

export default Settings
