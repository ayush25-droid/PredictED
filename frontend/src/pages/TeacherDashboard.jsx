import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import {
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle,
  ClipboardCheck,
  Download,
  FileText,
  LogOut,
  MessageSquare,
  MinusCircle,
  Save,
  Search,
  Send,
  Shield,
  Upload,
  Users,
  XCircle
} from 'lucide-react'

const today = new Date().toISOString().slice(0, 10)
const tabs = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'student', label: 'Student View', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'timetable', label: 'Timetable', icon: BookOpen },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'assignments', label: 'Assignments', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Shield }
]

export default function TeacherDashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [students, setStudents] = useState([])
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedDate, setSelectedDate] = useState(today)
  const [attendance, setAttendance] = useState({})
  const [history, setHistory] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [studentDetail, setStudentDetail] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [assignments, setAssignments] = useState([])
  const [teacherTimetable, setTeacherTimetable] = useState([])
  const [submissions, setSubmissions] = useState(null)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '' })

  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    type: 'info',
    recipient_type: 'class',
    usns: []
  })
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    due_date: today,
    subject: '',
    priority: 'Medium',
    file: null
  })

  useEffect(() => {
    fetchPortalData()
  }, [])

  useEffect(() => {
    if (user?.subject_id && subjects.length > 0 && !selectedSubject) {
      setSelectedSubject(String(user.subject_id))
    }
    if (subjects.length > 0 && !assignmentForm.subject) {
      setAssignmentForm((current) => ({ ...current, subject: subjects[0].code }))
    }
  }, [user?.subject_id, subjects, selectedSubject, assignmentForm.subject])

  useEffect(() => {
    if (students.length > 0 && !selectedStudent) {
      setSelectedStudent(students[0].usn)
    }
  }, [students, selectedStudent])

  useEffect(() => {
    if (students.length > 0 && selectedSubject && selectedDate) {
      loadAttendanceForDate()
    }
  }, [students, selectedSubject, selectedDate])

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentDetail(selectedStudent)
    }
  }, [selectedStudent])

  const fetchPortalData = async () => {
    setLoading(true)
    try {
      const teacherQuery = new URLSearchParams({ teacher_username: user?.username || '' })
      const [studentsRes, subjectsRes, analyticsRes, notifRes, assignmentRes, historyRes, timetableRes] = await Promise.all([
        fetch(`/api/students?${teacherQuery}`),
        fetch(`/api/teacher/subjects?${teacherQuery}`),
        fetch(`/api/teacher/class-analytics?${teacherQuery}`),
        fetch(`/api/teacher/notifications?${teacherQuery}`),
        fetch(`/api/teacher/assignments?${teacherQuery}`),
        fetch(`/api/teacher/attendance/history?${teacherQuery}`),
        fetch(`/api/teacher/timetable?${teacherQuery}`)
      ])
      const [studentsData, subjectsData, analyticsData, notifData, assignmentData, historyData, timetableData] = await Promise.all([
        studentsRes.json(),
        subjectsRes.json(),
        analyticsRes.json(),
        notifRes.json(),
        assignmentRes.json(),
        historyRes.json(),
        timetableRes.json()
      ])

      setStudents(studentsData)
      setSubjects(subjectsData)
      setAnalytics(analyticsData)
      setNotifications(notifData)
      setAssignments(assignmentData)
      setTeacherTimetable(timetableData)
      setHistory(historyData)
      setSelectedSubject(String(user?.subject_id || subjectsData[0]?.id || ''))
    } catch (error) {
      setMessage('Unable to load teacher portal data.')
    } finally {
      setLoading(false)
    }
  }

  const loadAttendanceForDate = async () => {
    const params = new URLSearchParams({ teacher_username: user?.username || '', subject_id: selectedSubject, date: selectedDate })
    const res = await fetch(`/api/teacher/attendance/history?${params}`)
    const records = await res.json()
    const nextAttendance = students.reduce((acc, student) => {
      const existing = records.find((record) => record.usn === student.usn)
      acc[student.usn] = existing?.status || 'No Attendance'
      return acc
    }, {})
    setAttendance(nextAttendance)
  }

  const fetchStudentDetail = async (usn) => {
    const params = new URLSearchParams({ teacher_username: user?.username || '' })
    const res = await fetch(`/api/teacher/student-attendance/${usn}?${params}`)
    setStudentDetail(await res.json())
  }

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return students
    return students.filter((student) =>
      student.name.toLowerCase().includes(query) ||
      student.usn.toLowerCase().includes(query) ||
      student.branch.toLowerCase().includes(query)
    )
  }, [students, search])

  const selectedSubjectName = subjects.find((subject) => String(subject.id) === selectedSubject)?.name
  const presentCount = students.filter((student) => attendance[student.usn] === 'Present').length
  const absentCount = students.filter((student) => attendance[student.usn] === 'Absent').length
  const noAttendanceCount = students.filter((student) => attendance[student.usn] === 'No Attendance').length

  const setStatus = (usn, status) => {
    setAttendance((current) => ({ ...current, [usn]: status }))
  }

  const saveAttendance = async () => {
    setMessage('')
    setSaving(true)
    try {
      const records = students.map((student) => ({
        teacher_username: user?.username,
        usn: student.usn,
        subject_id: Number(selectedSubject),
        date: selectedDate,
        status: attendance[student.usn] || 'No Attendance'
      }))

      const response = await fetch('/api/teacher/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_username: user?.username, records })
      })
      const data = await response.json()
      setMessage(data.message || 'Attendance saved.')
      await fetchPortalData()
      if (selectedStudent) fetchStudentDetail(selectedStudent)
    } catch (error) {
      setMessage('Server error while saving attendance.')
    } finally {
      setSaving(false)
    }
  }

  const sendNotification = async (event) => {
    event.preventDefault()
    setMessage('')
    const res = await fetch('/api/teacher/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...notificationForm, teacher_username: user?.username, sender: user?.name || 'Teacher' })
    })
    const data = await res.json()
    setMessage(data.message)
    if (data.success) {
      setNotificationForm({ title: '', message: '', type: 'info', recipient_type: 'class', usns: [] })
      fetchPortalData()
    }
  }

  const createAssignment = async (event) => {
    event.preventDefault()
    setMessage('')
    const formData = new FormData()
    Object.entries(assignmentForm).forEach(([key, value]) => {
      if (value) formData.append(key, value)
    })
    formData.append('teacher_username', user?.username || '')

    const res = await fetch('/api/teacher/assignments', {
      method: 'POST',
      body: formData
    })
    const data = await res.json()
    setMessage(data.message)
    if (data.success) {
      setAssignmentForm({ title: '', description: '', due_date: today, subject: subjects[0]?.code || '', priority: 'Medium', file: null })
      fetchPortalData()
    }
  }

  const fetchSubmissions = async (groupId) => {
    const params = new URLSearchParams({ teacher_username: user?.username || '' })
    const res = await fetch(`/api/teacher/assignments/${groupId}/submissions?${params}`)
    setSubmissions(await res.json())
  }

  const toggleRecipient = (usn) => {
    setNotificationForm((current) => ({
      ...current,
      usns: current.usns.includes(usn)
        ? current.usns.filter((item) => item !== usn)
        : [...current.usns, usn]
    }))
  }

  const changeTeacherPassword = async (event) => {
    event.preventDefault()
    setMessage('')
    const response = await fetch('/api/teacher/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user?.username, ...passwordForm })
    })
    const data = await response.json()
    setMessage(data.message || 'Unable to update password.')
    if (data.success) {
      setPasswordForm({ current_password: '', new_password: '' })
    }
  }

  const cardData = analytics?.cards || {}

  return (
    <>
      <aside className="w-64 h-screen bg-bg-secondary border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
            <div>
              <h1 className="text-lg font-bold gradient-text">PredictED</h1>
              <p className="text-xs text-text-tertiary">Teacher Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-accent-primary/20 text-accent-primary'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('predicted-open-chatbot'))}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="font-medium">AI Assistant</span>
          </button>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center">
              <span className="text-sm font-medium text-accent-primary">{user?.name?.charAt(0) || 'T'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{user?.name}</p>
              <p className="text-xs text-text-tertiary truncate">{user?.subject}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:bg-danger/10 hover:text-danger transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Teacher Dashboard</h1>
          <p className="text-text-secondary mt-1">Manage attendance, notifications, assignments, and class analytics</p>
          {message && <p className="mt-4 text-sm text-accent-primary">{message}</p>}
        </motion.div>

        {loading ? (
          <div className="glass-card rounded-2xl p-8 text-center text-text-secondary">Loading teacher portal...</div>
        ) : (
          <>
            {(activeTab === 'overview' || activeTab === 'analytics') && (
              <AnalyticsSection analytics={analytics} cardData={cardData} />
            )}

            {activeTab === 'attendance' && (
              <AttendanceSection
                subjects={subjects}
                students={students}
                filteredStudents={filteredStudents}
                selectedSubject={selectedSubject}
                setSelectedSubject={setSelectedSubject}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                selectedSubjectName={selectedSubjectName}
                attendance={attendance}
                setStatus={setStatus}
                search={search}
                setSearch={setSearch}
                presentCount={presentCount}
                absentCount={absentCount}
                noAttendanceCount={noAttendanceCount}
                saveAttendance={saveAttendance}
                saving={saving}
                history={history}
              />
            )}

            {activeTab === 'student' && (
              <StudentAttendanceSection
                students={students}
                selectedStudent={selectedStudent}
                setSelectedStudent={setSelectedStudent}
                detail={studentDetail}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationsSection
                students={students}
                form={notificationForm}
                setForm={setNotificationForm}
                toggleRecipient={toggleRecipient}
                sendNotification={sendNotification}
                notifications={notifications}
              />
            )}

            {activeTab === 'timetable' && (
              <TeacherTimetableSection timetable={teacherTimetable} />
            )}

            {activeTab === 'assignments' && (
              <AssignmentsSection
                subjects={subjects}
                form={assignmentForm}
                setForm={setAssignmentForm}
                createAssignment={createAssignment}
                assignments={assignments}
                submissions={submissions}
                fetchSubmissions={fetchSubmissions}
              />
            )}

            {activeTab === 'settings' && (
              <TeacherSettingsSection
                form={passwordForm}
                setForm={setPasswordForm}
                changePassword={changeTeacherPassword}
              />
            )}
          </>
        )}
      </main>
    </>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-text-tertiary">{label}</p>
          <p className="text-2xl font-bold text-text-primary">{value || 0}</p>
        </div>
      </div>
    </div>
  )
}

function AnalyticsSection({ analytics, cardData }) {
  const subjectData = analytics?.subject_stats || []
  const trend = analytics?.trend || []
  const leaderboard = analytics?.leaderboard || []
  const below = analytics?.below_threshold || []

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <StatCard icon={Users} label="Total Students" value={cardData.total_students} color="bg-accent-primary/20 text-accent-primary" />
        <StatCard icon={XCircle} label="Below 75%" value={cardData.below_threshold} color="bg-danger/20 text-danger" />
        <StatCard icon={FileText} label="Active Assignments" value={cardData.active_assignments} color="bg-warning/20 text-warning" />
        <StatCard icon={Upload} label="Pending Submissions" value={cardData.pending_submissions} color="bg-accent-secondary/20 text-accent-secondary" />
        <StatCard icon={Bell} label="Notifications Sent" value={cardData.notifications_sent} color="bg-success/20 text-success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Subject-wise Attendance</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={subjectData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="subject_code" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: '8px' }} />
              <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                {subjectData.map((item, index) => (
                  <Cell key={index} fill={item.percentage >= 75 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Class Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="percentage" stroke="#6366f1" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ListPanel title={`Students Below 75% (${below.length})`} rows={below} empty="No students below threshold" />
        <ListPanel title={`Attendance Leaderboard · Class Avg ${analytics?.class_average || 0}%`} rows={leaderboard.slice(0, 8)} empty="No attendance data" />
      </div>
    </div>
  )
}

function ListPanel({ title, rows, empty }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">{title}</h3>
      <div className="space-y-3">
        {rows.length ? rows.map((row) => (
          <div key={row.usn} className="flex items-center justify-between p-3 bg-bg-tertiary rounded-xl">
            <div>
              <p className="text-sm font-medium text-text-primary">{row.name}</p>
              <p className="text-xs text-text-tertiary">{row.usn}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${row.percentage >= 75 ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
              {row.percentage}%
            </span>
          </div>
        )) : <p className="text-sm text-text-secondary">{empty}</p>}
      </div>
    </div>
  )
}

function AttendanceSection(props) {
  const {
    subjects,
    filteredStudents,
    selectedSubject,
    setSelectedSubject,
    selectedDate,
    setSelectedDate,
    selectedSubjectName,
    attendance,
    setStatus,
    search,
    setSearch,
    presentCount,
    absentCount,
    noAttendanceCount,
    saveAttendance,
    saving,
    history
  } = props

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={CheckCircle} label="Present" value={presentCount} color="bg-success/20 text-success" />
        <StatCard icon={XCircle} label="Absent" value={absentCount} color="bg-danger/20 text-danger" />
        <StatCard icon={MinusCircle} label="No Attendance" value={noAttendanceCount} color="bg-warning/20 text-warning" />
        <StatCard icon={BookOpen} label="Selected Subject" value={selectedSubjectName ? subjects.find((s) => String(s.id) === selectedSubject)?.code : ''} color="bg-accent-primary/20 text-accent-primary" />
      </div>

      <section className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_180px_auto] gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students" className="w-full bg-bg-tertiary border border-border rounded-xl py-3 pl-11 pr-4 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary transition-colors" />
            </div>
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary focus:outline-none focus:border-accent-primary transition-colors">
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.code}</option>)}
            </select>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary focus:outline-none focus:border-accent-primary transition-colors" />
            <button type="button" onClick={saveAttendance} disabled={saving} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              <Save className="w-5 h-5" />{saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <p className="mt-4 text-sm text-text-secondary">{selectedSubjectName}</p>
        </div>

        <div className="divide-y divide-border">
          {filteredStudents.map((student, index) => {
            const status = attendance[student.usn] || 'No Attendance'
            return (
              <motion.div key={student.usn} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }} className="p-5 hover:bg-bg-tertiary/50 transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_360px] gap-4 items-center">
                  <div>
                    <p className="font-medium text-text-primary">{student.name}</p>
                    <p className="text-sm text-text-tertiary">{student.usn}</p>
                  </div>
                  <div className="text-sm text-text-secondary">Semester {student.semester} - {student.branch}</div>
                  <div className="grid grid-cols-3 gap-2">
                    {['Present', 'Absent', 'No Attendance'].map((item) => (
                      <button key={item} type="button" onClick={() => setStatus(student.usn, item)} className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-colors ${status === item ? (item === 'Present' ? 'bg-success/20 border-success/30 text-success' : item === 'Absent' ? 'bg-danger/20 border-danger/30 text-danger' : 'bg-warning/20 border-warning/30 text-warning') : 'border-border text-text-secondary hover:bg-bg-tertiary'}`}>
                        {item === 'Present' ? <CheckCircle className="w-4 h-4" /> : item === 'Absent' ? <XCircle className="w-4 h-4" /> : <MinusCircle className="w-4 h-4" />}
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      <HistoryTable history={history.slice(0, 20)} />
    </div>
  )
}

function HistoryTable({ history }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Attendance History</h3>
      <div className="space-y-2">
        {history.map((record, index) => (
          <div key={`${record.usn}-${record.subject_id}-${record.date}-${index}`} className="grid grid-cols-4 gap-4 p-3 bg-bg-tertiary rounded-xl text-sm">
            <span className="text-text-primary">{record.name || record.usn}</span>
            <span className="text-text-secondary">{record.code || record.subject_id}</span>
            <span className="text-text-secondary">{record.date}</span>
            <span className={record.status === 'Present' ? 'text-success' : record.status === 'Absent' ? 'text-danger' : 'text-warning'}>{record.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StudentAttendanceSection({ students, selectedStudent, setSelectedStudent, detail }) {
  return (
    <div className="space-y-8">
      <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary focus:outline-none focus:border-accent-primary transition-colors">
        {students.map((student) => <option key={student.usn} value={student.usn}>{student.name} - {student.usn}</option>)}
      </select>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={ClipboardCheck} label="Overall %" value={detail?.summary?.percentage} color="bg-accent-primary/20 text-accent-primary" />
        <StatCard icon={CheckCircle} label="Attended" value={detail?.summary?.attended} color="bg-success/20 text-success" />
        <StatCard icon={XCircle} label="Missed" value={detail?.summary?.missed} color="bg-danger/20 text-danger" />
        <StatCard icon={BookOpen} label="Total Classes" value={detail?.summary?.total} color="bg-warning/20 text-warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Subject Attendance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={detail?.attendance || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="subject_code" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: '8px' }} />
              <Bar dataKey="percentage" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={detail?.trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="percentage" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <HistoryTable history={detail?.history || []} />
    </div>
  )
}

function NotificationsSection({ students, form, setForm, toggleRecipient, sendNotification, notifications }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={sendNotification} className="glass-card rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Create Notification</h3>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary focus:outline-none focus:border-accent-primary" />
        <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Message" rows="4" className="w-full bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary focus:outline-none focus:border-accent-primary" />
        <div className="grid grid-cols-2 gap-3">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary">
            <option value="info">Info</option>
            <option value="alert">Alert</option>
            <option value="warning">Warning</option>
          </select>
          <select value={form.recipient_type} onChange={(e) => setForm({ ...form, recipient_type: e.target.value, usns: [] })} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary">
            <option value="class">Entire Class</option>
            <option value="students">Specific Students</option>
          </select>
        </div>
        {form.recipient_type === 'students' && (
          <div className="max-h-48 overflow-auto space-y-2">
            {students.map((student) => (
              <label key={student.usn} className="flex items-center gap-3 p-2 bg-bg-tertiary rounded-xl text-sm text-text-secondary">
                <input type="checkbox" checked={form.usns.includes(student.usn)} onChange={() => toggleRecipient(student.usn)} />
                {student.name} ({student.usn})
              </label>
            ))}
          </div>
        )}
        <button type="submit" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold">
          <Send className="w-5 h-5" />Send Notification
        </button>
      </form>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Sent Notifications</h3>
        <div className="space-y-3 max-h-[520px] overflow-auto">
          {notifications.map((item) => (
            <div key={`${item.id}-${item.usn}`} className="p-3 bg-bg-tertiary rounded-xl">
              <p className="text-sm font-medium text-text-primary">{item.title}</p>
              <p className="text-xs text-text-tertiary mt-1">{item.message}</p>
              <p className="text-xs text-text-secondary mt-2">{item.usn} · {item.date}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TeacherTimetableSection({ timetable }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">My Classes</h3>
      <div className="space-y-3">
        {timetable.length > 0 ? timetable.map((cls, index) => (
          <div key={`${cls.day}-${cls.start_time}-${index}`} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_120px] gap-4 p-4 bg-bg-tertiary rounded-xl">
            <div>
              <p className="text-sm font-medium text-text-primary">{cls.subject}</p>
              <p className="text-xs text-text-tertiary">{cls.subject_code} · {cls.section}</p>
            </div>
            <p className="text-sm text-text-secondary">{cls.day}</p>
            <p className="text-sm text-text-secondary">{cls.start_time} - {cls.end_time}</p>
            <p className="text-sm text-accent-primary">{cls.room}</p>
          </div>
        )) : (
          <p className="text-sm text-text-secondary">No classes assigned.</p>
        )}
      </div>
    </div>
  )
}

function TeacherSettingsSection({ form, setForm, changePassword }) {
  return (
    <form onSubmit={changePassword} className="max-w-xl glass-card rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-warning" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Password</h3>
          <p className="text-sm text-text-tertiary">Update your teacher login password</p>
        </div>
      </div>
      <input
        type="password"
        value={form.current_password}
        onChange={(event) => setForm({ ...form, current_password: event.target.value })}
        placeholder="Current password"
        className="w-full bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary"
        required
      />
      <input
        type="password"
        value={form.new_password}
        onChange={(event) => setForm({ ...form, new_password: event.target.value })}
        placeholder="New password"
        className="w-full bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary"
        required
      />
      <button type="submit" className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold">
        Update Password
      </button>
    </form>
  )
}

function AssignmentsSection({ subjects, form, setForm, createAssignment, assignments, submissions, fetchSubmissions }) {
  return (
    <div className="space-y-6">
      <form onSubmit={createAssignment} className="glass-card rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Create Assignment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary focus:outline-none focus:border-accent-primary" />
          <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary focus:outline-none focus:border-accent-primary" />
          <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary">
            {subjects.map((subject) => <option key={subject.code} value={subject.code}>{subject.code}</option>)}
          </select>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary">
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </div>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows="3" className="w-full bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary focus:outline-none focus:border-accent-primary" />
        <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.zip" onChange={(e) => setForm({ ...form, file: e.target.files[0] })} className="w-full bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-secondary" />
        <button type="submit" className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold">
          <Upload className="w-5 h-5" />Create and Send to Class
        </button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Assignments</h3>
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <button key={assignment.assignment_group_id} type="button" onClick={() => fetchSubmissions(assignment.assignment_group_id)} className="w-full p-4 bg-bg-tertiary rounded-xl text-left hover:bg-bg-tertiary/70 transition-colors">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{assignment.title}</p>
                    <p className="text-xs text-text-tertiary">{assignment.subject} · Due {assignment.due_date}</p>
                  </div>
                  <span className="text-sm text-accent-primary">{assignment.submitted}/{assignment.total}</span>
                </div>
                {assignment.file_path && (
                  <a href={`/api/uploads/${assignment.file_path}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-accent-secondary mt-2">
                    <Download className="w-3 h-3" />{assignment.file_name}
                  </a>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Submission Tracking</h3>
          {submissions?.success ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <StatCard icon={Users} label="Total" value={submissions.total} color="bg-accent-primary/20 text-accent-primary" />
                <StatCard icon={CheckCircle} label="Submitted" value={submissions.submitted} color="bg-success/20 text-success" />
                <StatCard icon={XCircle} label="Pending" value={submissions.pending} color="bg-danger/20 text-danger" />
              </div>
              {submissions.students.map((student) => (
                <div key={student.id} className="p-3 bg-bg-tertiary rounded-xl">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{student.name}</p>
                      <p className="text-xs text-text-tertiary">{student.usn}</p>
                    </div>
                    <span className={String(student.completed).toLowerCase() === 'true' ? 'text-success text-sm' : 'text-danger text-sm'}>
                      {String(student.completed).toLowerCase() === 'true' ? 'Submitted' : 'Pending'}
                    </span>
                  </div>
                  {student.submitted_at && <p className="text-xs text-text-secondary mt-2">{student.submitted_at}</p>}
                  {student.submission_file_path && (
                    <a href={`/api/uploads/${student.submission_file_path}`} className="inline-flex items-center gap-1 text-xs text-accent-secondary mt-2">
                      <Download className="w-3 h-3" />{student.submission_file_name}
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">Select an assignment to view submissions.</p>
          )}
        </div>
      </div>
    </div>
  )
}
