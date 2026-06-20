import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Award, BookOpen, TrendingDown, TrendingUp } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-text-tertiary">{label}</p>
          <p className="text-2xl font-bold text-text-primary">{value || '-'}</p>
        </div>
      </div>
    </div>
  )
}

export default function Marks() {
  const { user } = useAuth()
  const [marks, setMarks] = useState([])

  useEffect(() => {
    if (user?.usn) {
      fetch(`/api/marks/${user.usn}`)
        .then((response) => response.json())
        .then(setMarks)
        .catch(() => setMarks([]))
    }
  }, [user?.usn])

  const overall = useMemo(() => {
    if (!marks.length) return 0
    return (marks.reduce((sum, mark) => sum + Number(mark.subject_average || 0), 0) / marks.length).toFixed(1)
  }, [marks])

  const strongest = [...marks].sort((a, b) => Number(b.subject_average || 0) - Number(a.subject_average || 0))[0]
  const weakest = [...marks].sort((a, b) => Number(a.subject_average || 0) - Number(b.subject_average || 0))[0]
  const trend = ['CIE1', 'CIE2', 'CIE3', 'SEE'].map((exam) => ({
    exam,
    average: marks.length ? Number((marks.reduce((sum, mark) => sum + Number(mark[exam] || 0), 0) / marks.length).toFixed(1)) : 0
  }))

  return (
    <>
      <Sidebar />
      <div className="flex-1 overflow-auto p-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Marks</h1>
          <p className="text-text-secondary mt-1">Subject-wise internal marks and exam performance</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard icon={Award} label="Overall Average" value={`${overall}%`} color="bg-accent-primary/20 text-accent-primary" />
          <StatCard icon={BookOpen} label="Subjects" value={marks.length} color="bg-accent-secondary/20 text-accent-secondary" />
          <StatCard icon={TrendingUp} label="Strongest" value={strongest?.subject} color="bg-success/20 text-success" />
          <StatCard icon={TrendingDown} label="Weakest" value={weakest?.subject} color="bg-danger/20 text-danger" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Marks by Subject</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={marks}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="subject" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: '8px' }} />
                <Bar dataKey="subject_average" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Exam Performance Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="exam" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="average" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Subject-wise Marks</h3>
          <div className="space-y-2">
            {marks.map((mark) => (
              <div key={`${mark.student_id}-${mark.subject}`} className="grid grid-cols-6 gap-4 p-3 bg-bg-tertiary rounded-xl text-sm">
                <span className="text-text-primary font-medium">{mark.subject}</span>
                <span className="text-text-secondary">CIE1 {mark.CIE1}</span>
                <span className="text-text-secondary">CIE2 {mark.CIE2}</span>
                <span className="text-text-secondary">CIE3 {mark.CIE3}</span>
                <span className="text-text-secondary">SEE {mark.SEE}</span>
                <span className="text-accent-primary">{mark.subject_average}%</span>
              </div>
            ))}
            {!marks.length && <p className="text-sm text-text-secondary">No marks available yet.</p>}
          </div>
        </div>
      </div>
    </>
  )
}
