import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Bell,
  BookOpen,
  Calendar,
  Clock
} from 'lucide-react'

const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']

function AnimatedNumber({ value, duration = 1000 }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let startTime
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      setDisplayValue(Math.floor(progress * value))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value, duration])

  return <span>{displayValue}</span>
}

function StatCard({ icon: Icon, label, value, trend, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="glass-card rounded-2xl p-6 glow-hover"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className={`text-sm font-medium ${trend > 0 ? 'text-success' : 'text-danger'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-text-tertiary text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-text-primary">
        <AnimatedNumber value={value} />
      </p>
    </motion.div>
  )
}

function Dashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [trend, setTrend] = useState([])
  const [assignments, setAssignments] = useState([])
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (user?.usn) {
      fetchData()
      const intervalId = setInterval(fetchData, 30000)
      return () => clearInterval(intervalId)
    }
  }, [user?.usn])

  const fetchData = async () => {
    try {
      const [summaryRes, attRes, trendRes, assignRes, notifRes] = await Promise.all([
        fetch(`/api/attendance-summary/${user.usn}`),
        fetch(`/api/attendance/${user.usn}`),
        fetch(`/api/attendance-trend/${user.usn}`),
        fetch(`/api/assignments/${user.usn}`),
        fetch(`/api/notifications/${user.usn}`)
      ])

      setSummary(await summaryRes.json())
      setAttendance(await attRes.json())
      setTrend(await trendRes.json())
      setAssignments(await assignRes.json())
      setNotifications(await notifRes.json())
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const subjectData = attendance.map(a => ({
    name: a.subject_code,
    attendance: a.percentage
  }))

  const riskSubjects = attendance.filter(a => a.percentage < 75)

  return (
    <>
      <Sidebar />
      <div className="flex-1 overflow-auto p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-text-primary">
            Welcome back, {user?.name?.split(' ')[0] || 'Student'}
          </h1>
          <p className="text-text-secondary mt-1">Here's your academic overview</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Users}
            label="Overall Attendance"
            value={summary?.percentage || 0}
            color="bg-accent-primary/20 text-accent-primary"
            delay={0}
          />
          <StatCard
            icon={CheckCircle}
            label="Classes Attended"
            value={summary?.attended || 0}
            trend={5}
            color="bg-success/20 text-success"
            delay={0.1}
          />
          <StatCard
            icon={XCircle}
            label="Classes Missed"
            value={summary?.missed || 0}
            color="bg-danger/20 text-danger"
            delay={0.2}
          />
          <StatCard
            icon={AlertTriangle}
            label="Risk Subjects"
            value={riskSubjects.length}
            color="bg-warning/20 text-warning"
            delay={0.3}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold text-text-primary mb-4">Attendance Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: '8px' }}
                  labelStyle={{ color: '#f8fafc' }}
                />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ fill: '#6366f1', r: 4 }}
                  activeDot={{ r: 6, fill: '#8b5cf6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold text-text-primary mb-4">Subject-wise Attendance</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={subjectData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: '8px' }}
                  labelStyle={{ color: '#f8fafc' }}
                />
                <Bar dataKey="attendance" radius={[4, 4, 0, 0]}>
                  {subjectData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.attendance >= 75 ? '#10b981' : entry.attendance >= 60 ? '#f59e0b' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Risk Alerts</h3>
              <Bell className="w-5 h-5 text-text-tertiary" />
            </div>
            <div className="space-y-3">
              {riskSubjects.length > 0 ? (
                riskSubjects.map((subject, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-danger/10 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-danger" />
                    <div>
                      <p className="text-sm font-medium text-text-primary">{subject.subject}</p>
                      <p className="text-xs text-text-tertiary">{subject.percentage}% attendance</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-text-secondary text-sm">No risk subjects. Great job!</p>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Upcoming Assignments</h3>
              <BookOpen className="w-5 h-5 text-text-tertiary" />
            </div>
            <div className="space-y-3">
              {assignments.slice(0, 3).map((assign, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-xl">
                  <div className={`w-2 h-2 rounded-full ${
                    assign.priority === 'High' ? 'bg-danger' :
                    assign.priority === 'Medium' ? 'bg-warning' : 'bg-success'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{assign.title}</p>
                    <p className="text-xs text-text-tertiary">{assign.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-1 text-xs font-medium bg-danger text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {notifications.slice(0, 3).map((notif, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl ${notif.read ? 'bg-bg-tertiary' : 'bg-accent-primary/10'}`}
                >
                  <p className="text-sm font-medium text-text-primary">{notif.title}</p>
                  <p className="text-xs text-text-tertiary mt-1">{notif.message}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  )
}

export default Dashboard
