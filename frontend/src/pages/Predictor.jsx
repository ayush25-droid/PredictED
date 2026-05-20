import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import { TrendingUp, AlertTriangle, CheckCircle, XCircle, Target } from 'lucide-react'

function Predictor() {
  const { user } = useAuth()
  const [predictions, setPredictions] = useState([])
  const [target, setTarget] = useState(75)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.usn) {
      fetchPredictions()
    }
  }, [user?.usn, target])

  const fetchPredictions = async () => {
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usn: user.usn, target })
      })
      const data = await res.json()
      setPredictions(data)
    } catch (error) {
      console.error('Error fetching predictions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusConfig = (status) => {
    if (status === 'safe') return {
      icon: CheckCircle,
      color: 'text-success bg-success/20',
      border: 'border-success/30',
      text: 'Safe to miss'
    }
    if (status === 'warning') return {
      icon: AlertTriangle,
      color: 'text-warning bg-warning/20',
      border: 'border-warning/30',
      text: 'Borderline'
    }
    return {
      icon: XCircle,
      color: 'text-danger bg-danger/20',
      border: 'border-danger/30',
      text: 'Cannot miss'
    }
  }

  const safeCount = predictions.filter(p => p.status === 'safe').length
  const warningCount = predictions.filter(p => p.status === 'warning').length
  const criticalCount = predictions.filter(p => p.status === 'critical').length

  return (
    <>
      <Sidebar />
      <div className="flex-1 overflow-auto p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-text-primary">Bunk Predictor</h1>
          <p className="text-text-secondary mt-1">AI-powered attendance prediction and planning</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 mb-8"
        >
          <div className="flex items-center gap-4">
            <Target className="w-6 h-6 text-accent-primary" />
            <div className="flex-1">
              <label className="text-sm text-text-secondary mb-2 block">Target Attendance %</label>
              <input
                type="range"
                min="50"
                max="100"
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-accent-primary"
              />
            </div>
            <div className="text-2xl font-bold text-accent-primary">{target}%</div>
          </div>
        </motion.div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-6 text-center"
          >
            <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{safeCount}</p>
            <p className="text-sm text-text-tertiary">Safe</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-2xl p-6 text-center"
          >
            <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{warningCount}</p>
            <p className="text-sm text-text-tertiary">Warning</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-2xl p-6 text-center"
          >
            <XCircle className="w-8 h-8 text-danger mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{criticalCount}</p>
            <p className="text-sm text-text-tertiary">Critical</p>
          </motion.div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="glass-card rounded-2xl p-8 text-center text-text-secondary">
              Calculating predictions...
            </div>
          ) : (
            predictions.map((pred, idx) => {
              const config = getStatusConfig(pred.status)
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`glass-card rounded-2xl p-6 border ${config.border}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.color}`}>
                        <config.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary">{pred.subject}</h3>
                        <p className="text-sm text-text-tertiary">{pred.subject_code}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl font-bold text-text-primary">{pred.current_percentage}%</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                          {config.text}
                        </span>
                      </div>
                      {pred.status === 'safe' && (
                        <p className="text-sm text-text-secondary">
                          You can miss <span className="text-success font-semibold">{pred.can_miss}</span> more classes
                        </p>
                      )}
                      {pred.status === 'warning' && (
                        <p className="text-sm text-text-secondary">
                          Need <span className="text-warning font-semibold">{pred.classes_needed}</span> more classes
                        </p>
                      )}
                      {pred.status === 'critical' && (
                        <p className="text-sm text-text-secondary">
                          Cannot miss any more classes
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}

export default Predictor