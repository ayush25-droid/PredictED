import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import { ClipboardCheck, BookOpen, User, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

function Attendance() {
  const { user } = useAuth()
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.usn) {
      fetchAttendance()
    }
  }, [user?.usn])

  const fetchAttendance = async () => {
    try {
      const res = await fetch(`/api/attendance/${user.usn}`)
      const data = await res.json()
      setAttendance(data)
    } catch (error) {
      console.error('Error fetching attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (percentage) => {
    if (percentage >= 75) return 'text-success bg-success/20'
    if (percentage >= 60) return 'text-warning bg-warning/20'
    return 'text-danger bg-danger/20'
  }

  const getStatusIcon = (percentage) => {
    if (percentage >= 75) return <CheckCircle className="w-5 h-5" />
    if (percentage >= 60) return <AlertCircle className="w-5 h-5" />
    return <XCircle className="w-5 h-5" />
  }

  const getProgressColor = (percentage) => {
    if (percentage >= 75) return 'bg-success'
    if (percentage >= 60) return 'bg-warning'
    return 'bg-danger'
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
          <h1 className="text-2xl font-bold text-text-primary">Attendance Tracker</h1>
          <p className="text-text-secondary mt-1">Monitor your class attendance across all subjects</p>
        </motion.div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="grid grid-cols-5 gap-4 text-sm font-medium text-text-tertiary">
              <span>Subject</span>
              <span>Faculty</span>
              <span className="text-center">Classes</span>
              <span className="text-center">Present/Absent</span>
              <span className="text-right">Percentage</span>
            </div>
          </div>

          <div className="divide-y divide-border">
            {loading ? (
              <div className="p-8 text-center text-text-secondary">Loading...</div>
            ) : (
              attendance.map((subject, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-6 hover:bg-bg-tertiary/50 transition-colors"
                >
                  <div className="grid grid-cols-5 gap-4 items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent-primary/20 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-accent-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{subject.subject}</p>
                        <p className="text-sm text-text-tertiary">{subject.subject_code}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-text-secondary">
                      <User className="w-4 h-4" />
                      <span className="text-sm">{subject.faculty}</span>
                    </div>

                    <div className="text-center">
                      <span className="text-lg font-semibold text-text-primary">{subject.total}</span>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                      <div className="flex items-center gap-1 text-success">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">{subject.attended}</span>
                      </div>
                      <div className="flex items-center gap-1 text-danger">
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm">{subject.missed}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                      <div className="w-32 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getProgressColor(subject.percentage)}`}
                          style={{ width: `${subject.percentage}%` }}
                        />
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subject.percentage)}`}>
                        {subject.percentage}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default Attendance