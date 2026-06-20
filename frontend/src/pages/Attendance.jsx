import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, BookOpen, CalendarDays, CheckCircle, ClipboardCheck, Filter, User, XCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import { isHoliday } from '../data/calendarData'

function Attendance() {
  const { user } = useAuth()
  const [attendance, setAttendance] = useState([])
  const [summary, setSummary] = useState(null)
  const [history, setHistory] = useState([])
  const [filters, setFilters] = useState({ subject: '', startDate: '', endDate: '', status: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.usn) {
      fetchAttendance()
    }
  }, [user?.usn])

  const fetchAttendance = async () => {
    setLoading(true)
    setError('')
    try {
      const [attendanceRes, summaryRes, historyRes] = await Promise.all([
        fetch(`/api/attendance/${user.usn}`),
        fetch(`/api/attendance-summary/${user.usn}`),
        fetch(`/api/attendance-history/${user.usn}`)
      ])
      if (!attendanceRes.ok || !summaryRes.ok || !historyRes.ok) {
        throw new Error('Unable to load attendance data.')
      }
      setAttendance(await attendanceRes.json())
      setSummary(await summaryRes.json())
      setHistory(await historyRes.json())
    } catch (fetchError) {
      console.error('Error fetching attendance:', fetchError)
      setError('Attendance data could not be loaded right now.')
    } finally {
      setLoading(false)
    }
  }

  const subjects = useMemo(() => Array.from(new Map(history.map((row) => [row.subject_code || row.subject, {
    code: row.subject_code || row.subject,
    label: row.subject_code ? `${row.subject_code} - ${row.subject}` : row.subject
  }])).values()).filter((item) => item.code), [history])

  const filteredHistory = useMemo(() => {
    return history.filter((row) => {
      if (filters.subject && ![row.subject_code, row.subject].includes(filters.subject)) return false
      if (filters.status && row.status !== filters.status) return false
      if (filters.startDate && String(row.date) < filters.startDate) return false
      if (filters.endDate && String(row.date) > filters.endDate) return false
      return true
    })
  }, [history, filters])

  const missedClasses = filteredHistory.filter((row) => row.status === 'Absent')
  const calendarDays = useMemo(() => buildCalendarDays(filteredHistory), [filteredHistory])

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
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Attendance Tracker</h1>
          <p className="text-text-secondary mt-1">Review subject percentages, class history, missed classes, and attendance calendar</p>
        </motion.div>

        {error && <div className="mb-6 p-4 rounded-xl bg-danger/10 text-danger text-sm">{error}</div>}

        <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
          <SummaryCard icon={ClipboardCheck} label="Overall Attendance" value={`${summary?.percentage ?? 0}%`} />
          <SummaryCard icon={CheckCircle} label="Classes Attended" value={summary?.attended ?? 0} color="text-success bg-success/20" />
          <SummaryCard icon={XCircle} label="Classes Missed" value={summary?.missed ?? 0} color="text-danger bg-danger/20" />
          <SummaryCard icon={BookOpen} label="Subjects" value={attendance.length} />
        </section>

        <section className="glass-card rounded-2xl overflow-hidden mb-6">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-text-primary">Attendance Summary</h2>
          </div>
          <div className="divide-y divide-border">
            {loading ? (
              <div className="p-8 text-center text-text-secondary">Loading attendance summary...</div>
            ) : attendance.length ? (
              attendance.map((subject, idx) => (
                <motion.div key={`${subject.subject_code}-${idx}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }} className="p-6 hover:bg-bg-tertiary/50 transition-colors">
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
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
                    <div className="text-text-secondary lg:text-center">{subject.total} classes</div>
                    <div className="flex items-center gap-4 lg:justify-center">
                      <span className="flex items-center gap-1 text-success text-sm"><CheckCircle className="w-4 h-4" />{subject.attended}</span>
                      <span className="flex items-center gap-1 text-danger text-sm"><XCircle className="w-4 h-4" />{subject.missed}</span>
                    </div>
                    <div className="flex items-center lg:justify-end gap-3">
                      <div className="w-32 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${getProgressColor(subject.percentage)}`} style={{ width: `${subject.percentage}%` }} />
                      </div>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subject.percentage)}`}>
                        {getStatusIcon(subject.percentage)} {subject.percentage}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-8 text-center text-text-secondary">No attendance summary found.</div>
            )}
          </div>
        </section>

        <section className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-accent-primary" />
            <h2 className="text-lg font-semibold text-text-primary">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select value={filters.subject} onChange={(event) => setFilters({ ...filters, subject: event.target.value })} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary">
              <option value="">All Subjects</option>
              {subjects.map((subject) => <option key={subject.code} value={subject.code}>{subject.label}</option>)}
            </select>
            <input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary" />
            <input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary" />
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary">
              <option value="">Present and Absent</option>
              <option value="Present">Present Only</option>
              <option value="Absent">Absent Only</option>
            </select>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.4fr_.9fr] gap-6 mb-6">
          <HistoryTable rows={filteredHistory.filter((row) => ['Present', 'Absent'].includes(row.status))} loading={loading} />
          <MissedClasses rows={missedClasses} />
        </section>

        <AttendanceCalendar days={calendarDays} />
      </div>
    </>
  )
}

function SummaryCard({ icon: Icon, label, value, color = 'text-accent-primary bg-accent-primary/20' }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center mb-4`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-sm text-text-tertiary">{label}</p>
      <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
    </div>
  )
}

function HistoryTable({ rows, loading }) {
  return (
    <section className="glass-card rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-text-primary mb-4">Attendance History</h2>
      <div className="space-y-2 max-h-[520px] overflow-auto">
        <div className="grid grid-cols-4 gap-4 px-3 text-xs uppercase text-text-tertiary">
          <span>Date</span><span>Subject</span><span>Faculty</span><span>Status</span>
        </div>
        {loading ? (
          <p className="p-4 text-sm text-text-secondary">Loading attendance history...</p>
        ) : rows.length ? (
          rows.map((row, index) => <HistoryRow key={`${row.date}-${row.subject_code}-${index}`} row={row} />)
        ) : (
          <p className="p-4 text-sm text-text-secondary">No attendance history found for the selected filters.</p>
        )}
      </div>
    </section>
  )
}

function HistoryRow({ row }) {
  const present = row.status === 'Present'
  return (
    <div className="grid grid-cols-4 gap-4 p-3 bg-bg-tertiary rounded-xl text-sm items-center">
      <span className="text-text-primary">{row.date}</span>
      <span className="text-text-secondary">{row.subject_code || row.subject}</span>
      <span className="text-text-secondary truncate">{row.faculty || '-'}</span>
      <span className={`inline-flex w-fit items-center gap-1 px-3 py-1 rounded-full font-medium ${present ? 'text-success bg-success/20' : 'text-danger bg-danger/20'}`}>
        {present ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
        {row.status}
      </span>
    </div>
  )
}

function MissedClasses({ rows }) {
  return (
    <section className="glass-card rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-text-primary mb-4">Missed Classes</h2>
      <div className="space-y-2 max-h-[520px] overflow-auto">
        {rows.map((row, index) => (
          <div key={`${row.date}-${row.subject_code}-${index}`} className="p-3 bg-danger/10 rounded-xl">
            <p className="text-sm font-medium text-text-primary">{row.date} · {row.subject_code || row.subject}</p>
            <p className="text-xs text-text-tertiary">{row.faculty || '-'}</p>
          </div>
        ))}
        {!rows.length && <p className="text-sm text-text-secondary">No missed classes found for the selected filters.</p>}
      </div>
    </section>
  )
}

function AttendanceCalendar({ days }) {
  return (
    <section className="glass-card rounded-2xl p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-accent-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Attendance Calendar</h2>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
          <Legend color="bg-success" label="Present" />
          <Legend color="bg-danger" label="Absent" />
          <Legend color="bg-warning" label="Holiday" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {days.map((day) => (
          <div key={day.date} className={`min-h-20 rounded-xl p-3 border ${day.className}`}>
            <p className="text-sm font-semibold">{day.label}</p>
            <p className="text-xs mt-1">{day.meta}</p>
          </div>
        ))}
      </div>
      {!days.length && <p className="text-sm text-text-secondary">No attendance dates available for calendar view.</p>}
    </section>
  )
}

function Legend({ color, label }) {
  return <span className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${color}`} />{label}</span>
}

function buildCalendarDays(rows) {
  const datedRows = rows.filter((row) => row.date).sort((a, b) => String(a.date).localeCompare(String(b.date)))
  if (!datedRows.length) return []
  const start = new Date(`${datedRows[0].date}T00:00:00`)
  const end = new Date(`${datedRows[datedRows.length - 1].date}T00:00:00`)
  const byDate = datedRows.reduce((acc, row) => {
    acc[row.date] ||= []
    acc[row.date].push(row)
    return acc
  }, {})
  const days = []
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const date = cursor.toISOString().slice(0, 10)
    const dayRows = byDate[date] || []
    const holiday = isHoliday(String(cursor.getDate()))
    const absent = dayRows.some((row) => row.status === 'Absent')
    const present = dayRows.some((row) => row.status === 'Present')
    let className = 'border-border bg-bg-tertiary text-text-tertiary'
    let meta = 'No record'
    if (holiday) {
      className = 'border-warning/40 bg-warning/10 text-warning'
      meta = 'Holiday'
    }
    if (present) {
      className = 'border-success/40 bg-success/10 text-success'
      meta = `${dayRows.filter((row) => row.status === 'Present').length} present`
    }
    if (absent) {
      className = 'border-danger/40 bg-danger/10 text-danger'
      meta = `${dayRows.filter((row) => row.status === 'Absent').length} absent`
    }
    days.push({
      date,
      label: cursor.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      meta,
      className
    })
  }
  return days
}

export default Attendance
