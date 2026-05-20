import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import { FileText, Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react'

function Assignments() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (user?.usn) {
      fetchAssignments()
    }
  }, [user?.usn])

  const fetchAssignments = async () => {
    try {
      const res = await fetch(`/api/assignments/${user.usn}`)
      const data = await res.json()
      setAssignments(data)
    } catch (error) {
      console.error('Error fetching assignments:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleComplete = async (id, completed) => {
    try {
      await fetch(`/api/assignments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed })
      })
      fetchAssignments()
    } catch (error) {
      console.error('Error updating assignment:', error)
    }
  }

  const getDaysUntilDue = (dueDate) => {
    const due = new Date(dueDate)
    const today = new Date()
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24))
    return diff
  }

  const filteredAssignments = assignments.filter(a => {
    if (filter === 'all') return true
    if (filter === 'pending') return !a.completed
    if (filter === 'completed') return a.completed
    return true
  })

  const getPriorityColor = (priority) => {
    if (priority === 'High') return 'text-danger bg-danger/20'
    if (priority === 'Medium') return 'text-warning bg-warning/20'
    return 'text-success bg-success/20'
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
          <h1 className="text-2xl font-bold text-text-primary">Assignments</h1>
          <p className="text-text-secondary mt-1">Track and manage your assignments</p>
        </motion.div>

        <div className="flex gap-2 mb-6">
          {['all', 'pending', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-accent-primary text-white'
                  : 'glass-card text-text-secondary hover:text-text-primary'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="glass-card rounded-2xl p-8 text-center text-text-secondary">
              Loading assignments...
            </div>
          ) : filteredAssignments.length > 0 ? (
            filteredAssignments.map((assign, idx) => {
              const daysLeft = getDaysUntilDue(assign.due_date)
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`glass-card rounded-2xl p-6 glow-hover ${assign.completed ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => toggleComplete(assign.id, assign.completed)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          assign.completed
                            ? 'bg-success border-success'
                            : 'border-text-tertiary hover:border-accent-primary'
                        }`}
                      >
                        {assign.completed && <CheckCircle className="w-4 h-4 text-white" />}
                      </button>
                      <div>
                        <h3 className={`text-lg font-semibold text-text-primary ${assign.completed ? 'line-through' : ''}`}>
                          {assign.title}
                        </h3>
                        <p className="text-sm text-text-tertiary">{assign.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(assign.priority)}`}>
                        {assign.priority}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        daysLeft < 0 ? 'bg-danger/20 text-danger' :
                        daysLeft <= 3 ? 'bg-warning/20 text-warning' :
                        'bg-bg-tertiary text-text-secondary'
                      }`}>
                        {daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Due today' : `${daysLeft} days`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">{assign.due_date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">{assign.subject}</span>
                    </div>
                  </div>
                </motion.div>
              )
            })
          ) : (
            <div className="glass-card rounded-2xl p-8 text-center text-text-secondary">
              No assignments found
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Assignments