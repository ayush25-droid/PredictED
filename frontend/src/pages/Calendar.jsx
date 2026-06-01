import { Component } from 'react'
import { motion } from 'framer-motion'
import Sidebar from '../components/Sidebar'
import { calendarData, footerData, isHoliday } from '../data/calendarData'

class CalendarErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <>
          <Sidebar />
          <div className="flex-1 overflow-auto p-8 bg-bg-primary">
            <div className="glass-card rounded-2xl p-8 text-center text-text-secondary">
              Calendar is unavailable right now.
            </div>
          </div>
        </>
      )
    }

    return this.props.children
  }
}

function CalendarContent() {
  const rows = Array.isArray(calendarData) ? calendarData : []
  const workingDays = footerData?.workingDays || {}
  const notes = Array.isArray(footerData?.notes) ? footerData.notes : []

  const getDayClass = (day) => {
    const dayText = String(day || '')
    const cleanDay = dayText.replace(/\*/g, '')
    if (dayText.includes('***')) return 'bg-red-900 text-white font-bold'
    if (dayText.includes('*')) return 'bg-red-800 text-white'
    if (isHoliday(cleanDay)) return 'bg-red-700 text-white'
    return 'bg-bg-tertiary text-text-primary'
  }

  const getDayValue = (row, key) => String(row?.days?.[key] || '')

  return (
    <>
      <Sidebar />
      <div className="flex-1 overflow-auto p-6 bg-bg-primary">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <img 
                src="/logo.jpg" 
                alt="DSCE Logo" 
                className="w-20 h-20 rounded-xl object-contain"
              />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
              DAYANANDA SAGAR COLLEGE OF ENGINEERING
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Autonomous Institution Affiliated to VTU
            </p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="px-3 py-1 bg-accent-primary/20 text-accent-primary rounded-full text-sm font-medium">
                CALENDAR OF EVENTS
              </span>
              <span className="text-text-tertiary">|</span>
              <span className="text-accent-primary font-bold">25 | 26</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold gradient-text mt-3">
              UG - CALENDAR OF EVENTS FOR 2nd SEM 2025-26
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr>
                  <th className="border border-border p-2 bg-bg-tertiary text-center text-text-primary text-sm font-semibold w-16">
                    Week
                  </th>
                  <th className="border border-border p-2 bg-bg-tertiary text-center text-text-primary text-sm font-semibold w-20">
                    Month
                  </th>
                  <th className="border border-border p-2 bg-bg-secondary text-center text-text-primary text-sm font-semibold w-16">
                    Mon
                  </th>
                  <th className="border border-border p-2 bg-bg-secondary text-center text-text-primary text-sm font-semibold w-16">
                    Tue
                  </th>
                  <th className="border border-border p-2 bg-bg-secondary text-center text-text-primary text-sm font-semibold w-16">
                    Wed
                  </th>
                  <th className="border border-border p-2 bg-bg-secondary text-center text-text-primary text-sm font-semibold w-16">
                    Thu
                  </th>
                  <th className="border border-border p-2 bg-bg-secondary text-center text-text-primary text-sm font-semibold w-16">
                    Fri
                  </th>
                  <th className="border border-border p-2 bg-bg-secondary text-center text-text-primary text-sm font-semibold w-16">
                    Sat
                  </th>
                  <th className="border border-border p-2 bg-yellow-500/20 text-center text-text-primary text-sm font-semibold w-20">
                    Working Days
                  </th>
                  <th className="border border-border p-2 bg-cyan-500/20 text-center text-text-primary text-sm font-semibold min-w-[280px]">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? rows.map((row, index) => (
                  <motion.tr
                    key={row.week || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-bg-tertiary/50 transition-colors"
                  >
                    <td className="border border-border p-2 text-center text-text-primary font-medium">
                      {row.week || '-'}
                    </td>
                    <td className="border border-border p-2 text-center text-text-primary font-bold">
                      {row.month || '-'}
                    </td>
                    <td className={`border border-border p-2 text-center text-sm ${getDayClass(getDayValue(row, 'mon'))}`}>
                      {getDayValue(row, 'mon')}
                    </td>
                    <td className={`border border-border p-2 text-center text-sm ${getDayClass(getDayValue(row, 'tue'))}`}>
                      {getDayValue(row, 'tue')}
                    </td>
                    <td className={`border border-border p-2 text-center text-sm ${getDayClass(getDayValue(row, 'wed'))}`}>
                      {getDayValue(row, 'wed')}
                    </td>
                    <td className={`border border-border p-2 text-center text-sm ${getDayClass(getDayValue(row, 'thu'))}`}>
                      {getDayValue(row, 'thu')}
                    </td>
                    <td className={`border border-border p-2 text-center text-sm ${getDayClass(getDayValue(row, 'fri'))}`}>
                      {getDayValue(row, 'fri')}
                    </td>
                    <td className={`border border-border p-2 text-center text-sm ${getDayClass(getDayValue(row, 'sat'))}`}>
                      {getDayValue(row, 'sat')}
                    </td>
                    <td className="border border-border p-2 text-center bg-yellow-500/10 font-bold text-text-primary">
                      {row.workingDays || 0}
                    </td>
                    <td className="border border-border p-3 bg-cyan-500/5 align-top">
                      <ul className="space-y-1">
                        {(Array.isArray(row.remarks) ? row.remarks : []).map((remark, idx) => (
                          <li 
                            key={idx} 
                            className={`text-xs leading-relaxed ${
                              remark.includes('Holiday') || remark.includes('Holiday') 
                                ? 'text-red-400 font-medium' 
                                : 'text-text-secondary'
                            }`}
                          >
                            {remark}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </motion.tr>
                )) : (
                  <tr>
                    <td colSpan="10" className="border border-border p-8 text-center text-text-secondary">
                      No calendar events available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-6 glass-card rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold text-text-primary mb-4">Working Days Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
              <div className="text-center p-4 bg-bg-tertiary rounded-xl">
                <p className="text-text-tertiary text-sm">Mon</p>
                <p className="text-2xl font-bold text-accent-primary">{workingDays.mon || 0}</p>
              </div>
              <div className="text-center p-4 bg-bg-tertiary rounded-xl">
                <p className="text-text-tertiary text-sm">Tue</p>
                <p className="text-2xl font-bold text-accent-primary">{workingDays.tue || 0}</p>
              </div>
              <div className="text-center p-4 bg-bg-tertiary rounded-xl">
                <p className="text-text-tertiary text-sm">Wed</p>
                <p className="text-2xl font-bold text-accent-primary">{workingDays.wed || 0}</p>
              </div>
              <div className="text-center p-4 bg-bg-tertiary rounded-xl">
                <p className="text-text-tertiary text-sm">Thu</p>
                <p className="text-2xl font-bold text-accent-primary">{workingDays.thu || 0}</p>
              </div>
              <div className="text-center p-4 bg-bg-tertiary rounded-xl">
                <p className="text-text-tertiary text-sm">Fri</p>
                <p className="text-2xl font-bold text-accent-primary">{workingDays.fri || 0}</p>
              </div>
              <div className="text-center p-4 bg-bg-tertiary rounded-xl">
                <p className="text-text-tertiary text-sm">Sat</p>
                <p className="text-2xl font-bold text-accent-primary">{workingDays.sat || 0}</p>
              </div>
              <div className="text-center p-4 bg-accent-primary/20 rounded-xl">
                <p className="text-text-tertiary text-sm">Total</p>
                <p className="text-2xl font-bold text-accent-primary">{workingDays.total || 0}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mt-6 space-y-3"
          >
            {notes.length > 0 ? notes.map((note, index) => (
              <div 
                key={index} 
                className="glass-card rounded-xl p-4 flex items-start gap-3"
              >
                <span className="w-6 h-6 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-accent-primary text-xs font-bold">{index + 1}</span>
                </span>
                <p className="text-text-secondary text-sm leading-relaxed">{note}</p>
              </div>
            )) : (
              <div className="glass-card rounded-xl p-4 text-text-secondary text-sm">
                No calendar notes available.
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-8 p-4 bg-danger/10 border border-danger/30 rounded-xl text-center"
          >
            <p className="text-danger font-semibold text-sm">
              {footerData?.warning || 'Calendar data is informational and subject to change.'}
            </p>
          </motion.div>

          <div className="mt-6 flex justify-between text-text-tertiary text-xs">
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-red-800 rounded"></span> IAT/Exam
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-red-700 rounded"></span> Holiday
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-white border border-border rounded"></span> Regular
              </span>
            </div>
            <span>DSCE - Academic Calendar 2025-26</span>
          </div>
        </motion.div>
      </div>
    </>
  )
}

function CalendarPage() {
  return (
    <CalendarErrorBoundary>
      <CalendarContent />
    </CalendarErrorBoundary>
  )
}

export default CalendarPage
