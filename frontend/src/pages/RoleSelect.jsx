import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GraduationCap, ShieldCheck, UserCheck } from 'lucide-react'

export default function RoleSelect() {
  const navigate = useNavigate()

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
        className="w-full max-w-3xl"
      >
        <div className="text-center mb-8">
          <img
            src="/logo.jpg"
            alt="Logo"
            className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold gradient-text">PredictED</h1>
          <p className="text-text-secondary mt-2">Choose your portal</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.button
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => navigate('/login')}
            className="glass-card rounded-2xl p-8 text-left glow-hover"
          >
            <div className="w-14 h-14 rounded-xl bg-accent-primary/20 flex items-center justify-center mb-6">
              <GraduationCap className="w-7 h-7 text-accent-primary" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Student</h2>
            <p className="text-text-secondary">View attendance, timetable, assignments, predictions, and alerts.</p>
          </motion.button>

          <motion.button
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => navigate('/teacher-login')}
            className="glass-card rounded-2xl p-8 text-left glow-hover"
          >
            <div className="w-14 h-14 rounded-xl bg-accent-secondary/20 flex items-center justify-center mb-6">
              <UserCheck className="w-7 h-7 text-accent-secondary" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Teacher</h2>
            <p className="text-text-secondary">Mark attendance by subject and keep student analytics updated.</p>
          </motion.button>

          <motion.button
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => navigate('/admin-login')}
            className="glass-card rounded-2xl p-8 text-left glow-hover"
          >
            <div className="w-14 h-14 rounded-xl bg-warning/20 flex items-center justify-center mb-6">
              <ShieldCheck className="w-7 h-7 text-warning" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Admin</h2>
            <p className="text-text-secondary">Manage users, timetable, marks, notifications, and analytics.</p>
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
