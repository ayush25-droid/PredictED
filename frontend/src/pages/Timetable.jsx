import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import { CalendarDays, Clock, MapPin, User } from 'lucide-react'

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function Timetable() {
  const { user } = useAuth()
  const [timetable, setTimetable] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDay, setCurrentDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }))

  useEffect(() => {
    if (user?.usn) {
      fetchTimetable()
    }
  }, [user?.usn])

  const fetchTimetable = async () => {
    try {
      const res = await fetch(`/api/timetable/${user.usn}`)
      const data = await res.json()
      setTimetable(data)
    } catch (error) {
      console.error('Error fetching timetable:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTodayClasses = () => {
    return timetable.filter(t => t.day === currentDay)
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
          <h1 className="text-2xl font-bold text-text-primary">Timetable</h1>
          <p className="text-text-secondary mt-1">Your weekly class schedule</p>
        </motion.div>

        <div className="flex gap-2 mb-6">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setCurrentDay(day)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                currentDay === day
                  ? 'bg-accent-primary text-white'
                  : 'glass-card text-text-secondary hover:text-text-primary'
              }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>

        <div className="grid gap-4">
          {loading ? (
            <div className="glass-card rounded-2xl p-8 text-center text-text-secondary">
              Loading timetable...
            </div>
          ) : getTodayClasses().length > 0 ? (
            getTodayClasses().map((cls, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="glass-card rounded-2xl p-6 glow-hover"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                      <CalendarDays className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary">{cls.name}</h3>
                      <p className="text-sm text-text-tertiary">{cls.subject_code}</p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-sm font-medium ${
                    currentDay === new Date().toLocaleDateString('en-US', { weekday: 'long' })
                      ? 'bg-success/20 text-success'
                      : 'bg-bg-tertiary text-text-secondary'
                  }`}>
                    {currentDay === new Date().toLocaleDateString('en-US', { weekday: 'long' })
                      ? 'Today'
                      : cls.day}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{cls.time_slot || `${cls.start_time} - ${cls.end_time}`}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{cls.room}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <User className="w-4 h-4" />
                    <span className="text-sm">{cls.teacher || cls.faculty}</span>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="glass-card rounded-2xl p-8 text-center text-text-secondary">
              No classes scheduled for {currentDay}
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <h2 className="text-lg font-semibold text-text-primary mb-4">Weekly Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {days.map((day) => {
              const dayClasses = timetable.filter(t => t.day === day)
              return (
                <div key={day} className="glass-card rounded-xl p-4">
                  <h3 className="text-sm font-medium text-text-primary mb-2">{day.slice(0, 3)}</h3>
                  <div className="space-y-2">
                    {dayClasses.slice(0, 3).map((cls, idx) => (
                      <div key={idx} className="text-xs text-text-tertiary">
                        {(cls.start_time || cls.time_slot?.split('-')[0])} - {cls.name}
                      </div>
                    ))}
                    {dayClasses.length === 0 && (
                      <span className="text-xs text-text-tertiary">No classes</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </>
  )
}

export default Timetable
