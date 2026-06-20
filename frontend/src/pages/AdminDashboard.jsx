import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft, Bell, BookOpen, CalendarDays, Download, Edit, Eye, FileText, LogOut, MoreVertical, Save, Search, Shield, Trash2, Users, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const tabs = [
  { id: 'home', label: 'Home', icon: Shield },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'teachers', label: 'Teachers', icon: BookOpen },
  { id: 'teaching-map', label: 'Teaching Map', icon: BookOpen },
  { id: 'timetable', label: 'Timetable', icon: CalendarDays },
  { id: 'assignments', label: 'Assignments', icon: FileText },
  { id: 'marks', label: 'Marks', icon: FileText },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'reset-requests', label: 'Reset Requests', icon: Shield }
]

const blankStudent = { usn: '', name: '', email: '', phone: '', semester: '', branch: '', section: '', password: '' }
const blankTeacher = { teacher_id: '', username: '', password: '', name: '', email: '' }
const blankMapping = { teacher_id: '', section: '', subject: '', subject_code: '' }
const blankClass = { section: '', day: '', start_time: '', end_time: '', subject: '', subject_code: '', teacher: '', teacher_id: '', room: '' }
const blankNotice = { title: '', message: '', type: 'info', target_type: 'all', section: '', teacher_id: '', usn: '' }
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function Field({ value, onChange, placeholder, type = 'text' }) {
  return <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary" />
}

function StatCard({ icon: Icon, label, value, onClick }) {
  const className = `glass-card rounded-2xl p-6 text-left ${onClick ? 'hover:border-accent-primary/60 transition-colors cursor-pointer' : ''}`
  const content = (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-accent-primary/20 text-accent-primary flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-text-tertiary">{label}</p>
        <p className="text-2xl font-bold text-text-primary">{value || 0}</p>
      </div>
    </div>
  )
  if (onClick) {
    return <button type="button" onClick={onClick} className={className}>{content}</button>
  }
  return (
    <div className={className}>{content}</div>
  )
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('home')
  const [message, setMessage] = useState('')
  const [students, setStudents] = useState([])
  const [teachers, setTeachers] = useState([])
  const [teacherAssignments, setTeacherAssignments] = useState([])
  const [timetable, setTimetable] = useState([])
  const [attendance, setAttendance] = useState([])
  const [assignments, setAssignments] = useState([])
  const [marks, setMarks] = useState([])
  const [notifications, setNotifications] = useState([])
  const [resetRequests, setResetRequests] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [sectionFilter, setSectionFilter] = useState('')
  const [teacherFilter, setTeacherFilter] = useState('')
  const [search, setSearch] = useState('')
  const [studentListMode, setStudentListMode] = useState('all')
  const [profile, setProfile] = useState(null)
  const [forms, setForms] = useState({ student: blankStudent, teacher: blankTeacher, mapping: blankMapping, class: blankClass, notice: blankNotice })
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [adminPassword, setAdminPassword] = useState('')

  const adminQuery = useMemo(() => new URLSearchParams({ admin_id: user?.admin_id || '' }), [user?.admin_id])

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    const [studentsRes, teachersRes, mapRes, timetableRes, attendanceRes, assignmentsRes, marksRes, noticesRes, resetRes, analyticsRes] = await Promise.all([
      fetch(`/api/admin/students?${adminQuery}`),
      fetch(`/api/admin/teachers?${adminQuery}`),
      fetch(`/api/admin/teacher-assignments?${adminQuery}`),
      fetch(`/api/admin/timetable?${adminQuery}`),
      fetch(`/api/admin/attendance?${adminQuery}`),
      fetch(`/api/admin/assignments?${adminQuery}`),
      fetch(`/api/admin/marks?${adminQuery}`),
      fetch(`/api/admin/notifications?${adminQuery}`),
      fetch(`/api/admin/password-reset-requests?${adminQuery}`),
      fetch(`/api/admin/analytics?${adminQuery}`)
    ])
    setStudents(await studentsRes.json())
    setTeachers(await teachersRes.json())
    setTeacherAssignments(await mapRes.json())
    setTimetable(await timetableRes.json())
    setAttendance(await attendanceRes.json())
    setAssignments(await assignmentsRes.json())
    setMarks(await marksRes.json())
    setNotifications(await noticesRes.json())
    setResetRequests(await resetRes.json())
    setAnalytics(await analyticsRes.json())
  }

  const sectionOptions = useMemo(() => Array.from(new Set([
    ...students.map((student) => student.section),
    ...teacherAssignments.map((item) => item.section),
    ...timetable.map((item) => item.section),
    ...attendance.map((item) => item.section),
    ...assignments.map((item) => item.section),
    ...marks.map((item) => item.section)
  ].filter(Boolean))).sort(), [students, teacherAssignments, timetable, attendance, assignments, marks])

  const subjects = useMemo(() => {
    const rows = [...teacherAssignments, ...timetable].map((item) => ({ code: item.subject_code, name: item.subject })).filter((item) => item.code)
    return Array.from(new Map(rows.map((item) => [item.code, item])).values())
  }, [teacherAssignments, timetable])

  const teacherName = (teacherId) => teachers.find((teacher) => teacher.teacher_id === teacherId)?.name || teacherId
  const filterBySectionTeacher = (rows) => rows.filter((row) => (!sectionFilter || row.section === sectionFilter) && (!teacherFilter || row.teacher_id === teacherFilter))
  const attendanceByStudent = useMemo(() => {
    const map = new Map()
    attendance.forEach((row) => {
      const status = String(row.status || '')
      if (!['Present', 'Absent'].includes(status)) return
      const current = map.get(row.usn) || { total: 0, present: 0, absent: 0 }
      current.total += 1
      if (status === 'Present') current.present += 1
      if (status === 'Absent') current.absent += 1
      map.set(row.usn, current)
    })
    return map
  }, [attendance])
  const attendancePercentForStudent = (usn) => {
    const row = attendanceByStudent.get(usn)
    return row?.total ? (row.present / row.total) * 100 : 0
  }
  const isShortageStudent = (student) => {
    const row = attendanceByStudent.get(student.usn)
    return row?.total ? attendancePercentForStudent(student.usn) < 75 : false
  }
  const filteredStudents = students.filter((row) => (!sectionFilter || row.section === sectionFilter) && (studentListMode !== 'shortage' || isShortageStudent(row)) && searchable(row))
  const filteredTeachers = teachers.filter((row) => (!teacherFilter || row.teacher_id === teacherFilter) && searchable(row))
  const filteredMappings = filterBySectionTeacher(teacherAssignments).filter(searchable)
  const filteredTimetable = filterBySectionTeacher(timetable).filter(searchable)
  const filteredAssignments = filterBySectionTeacher(assignments).filter(searchable)
  const filteredMarks = filterBySectionTeacher(marks).filter(searchable)

  function searchable(row) {
    const query = search.trim().toLowerCase()
    if (!query) return true
    return Object.values(row).join(' ').toLowerCase().includes(query)
  }

  const saveEntity = async (kind, form, resetKey) => {
    setMessage('')
    const response = await fetch(`/api/admin/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_id: user?.admin_id, ...form })
    })
    const data = await response.json()
    setMessage(data.message || 'Saved.')
    if (data.success) {
      if (resetKey) setForms((current) => ({ ...current, [resetKey]: resetFor(resetKey) }))
      fetchAll()
    }
  }

  const updateEntity = async (kind, id, form) => {
    const response = await fetch(`/api/admin/${kind}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_id: user?.admin_id, ...form })
    })
    const data = await response.json()
    setMessage(data.message || 'Updated.')
    if (data.success) {
      setEditing(null)
      fetchAll()
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const response = await fetch(`/api/admin/${deleteTarget.kind}/${deleteTarget.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_id: user?.admin_id, admin_password: adminPassword })
    })
    const data = await response.json()
    setMessage(data.message || 'Delete failed.')
    if (data.success) {
      setDeleteTarget(null)
      setAdminPassword('')
      fetchAll()
    }
  }

  const sendNotification = async (event) => {
    event.preventDefault()
    await saveEntity('notifications', forms.notice, 'notice')
  }

  const exportMarks = () => {
    const header = ['student_id', 'student_name', 'section', 'subject', 'teacher_id', 'CIE1', 'CIE2', 'CIE3', 'SEE', 'subject_average']
    const csv = [header.join(','), ...filteredMarks.map((row) => header.map((key) => `"${String(row[key] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = 'marks-export.csv'
    link.click()
  }

  const dashboardStats = {
    pendingRequests: resetRequests.filter((request) => ['sent', 'email_failed'].includes(request.status)).length,
    attendance: analytics?.attendance_stats?.length ? Math.round(analytics.attendance_stats.reduce((sum, row) => sum + Number(row.percentage || 0), 0) / analytics.attendance_stats.length) : 0
  }

  return (
    <>
      <aside className="w-64 h-screen bg-bg-secondary border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
            <div>
              <h1 className="text-lg font-bold gradient-text">PredictED</h1>
              <p className="text-xs text-text-tertiary">Admin Portal</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => { setProfile(null); setStudentListMode('all'); setActiveTab(tab.id) }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id ? 'bg-accent-primary/20 text-accent-primary' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'}`}>
              <tab.icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <p className="px-4 text-sm font-medium text-text-primary truncate">{user?.name}</p>
          <p className="px-4 text-xs text-text-tertiary truncate mb-3">{user?.email}</p>
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:bg-danger/10 hover:text-danger">
            <LogOut className="w-5 h-5" />Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        <Header
          title={profile ? `${profile.type === 'student' ? 'Student' : 'Teacher'} Profile` : (tabs.find((tab) => tab.id === activeTab)?.label || 'Admin')}
          sectionFilter={sectionFilter}
          setSectionFilter={setSectionFilter}
          teacherFilter={teacherFilter}
          setTeacherFilter={setTeacherFilter}
          sectionOptions={sectionOptions}
          teachers={teachers}
          search={search}
          setSearch={setSearch}
        />
        {message && <p className="text-sm text-accent-primary mb-4">{message}</p>}

        {profile?.type === 'student' && <StudentProfile student={students.find((item) => item.usn === profile.id)} attendance={attendance} marks={marks} assignments={assignments} notifications={notifications} timetable={timetable} onBack={() => setProfile(null)} />}
        {profile?.type === 'teacher' && <TeacherProfile teacher={teachers.find((item) => item.teacher_id === profile.id)} mappings={teacherAssignments} attendance={attendance} marks={marks} assignments={assignments} notifications={notifications} timetable={timetable} onBack={() => setProfile(null)} />}

        {!profile && activeTab === 'home' && <Home analytics={analytics} stats={dashboardStats} notifications={notifications} resetRequests={resetRequests} setActiveTab={setActiveTab} onOpenShortage={() => { setStudentListMode('shortage'); setActiveTab('students') }} />}
        {!profile && activeTab === 'students' && (
          <ManagementPanel title={studentListMode === 'shortage' ? 'Students Below Attendance Threshold' : 'Students'} rows={filteredStudents} fields={Object.keys(blankStudent)} form={forms.student} setForm={(form) => setForms({ ...forms, student: form })} onCreate={() => saveEntity('students', forms.student, 'student')} onUpdate={(row) => updateEntity('students', row.usn, row)} onDelete={(row) => setDeleteTarget({ kind: 'students', id: row.usn, label: row.name })} onView={(row) => setProfile({ type: 'student', id: row.usn })} editing={editing} setEditing={setEditing} />
        )}
        {!profile && activeTab === 'teachers' && (
          <ManagementPanel title="Teachers" rows={filteredTeachers} fields={Object.keys(blankTeacher)} form={forms.teacher} setForm={(form) => setForms({ ...forms, teacher: form })} onCreate={() => saveEntity('teachers', forms.teacher, 'teacher')} onUpdate={(row) => updateEntity('teachers', row.teacher_id, row)} onDelete={(row) => setDeleteTarget({ kind: 'teachers', id: row.teacher_id, label: row.name })} onView={(row) => setProfile({ type: 'teacher', id: row.teacher_id })} editing={editing} setEditing={setEditing} />
        )}
        {!profile && activeTab === 'teaching-map' && (
          <TeachingMap rows={filteredMappings} teachers={teachers} subjects={subjects} form={forms.mapping} setForm={(form) => setForms({ ...forms, mapping: form })} onCreate={() => saveEntity('teacher-assignments', forms.mapping, 'mapping')} onUpdate={(row) => updateEntity('teacher-assignments', row.id, row)} onDelete={(row) => setDeleteTarget({ kind: 'teacher-assignments', id: row.id, label: `${teacherName(row.teacher_id)} ${row.section} ${row.subject_code}` })} editing={editing} setEditing={setEditing} teacherName={teacherName} />
        )}
        {!profile && activeTab === 'timetable' && (
          <TimetableManager rows={filteredTimetable} form={forms.class} setForm={(form) => setForms({ ...forms, class: form })} teachers={teachers} subjects={subjects} sectionFilter={sectionFilter} onCreate={() => saveEntity('timetable', forms.class, 'class')} onUpdate={(row) => updateEntity('timetable', row.id, row)} onDelete={(row) => setDeleteTarget({ kind: 'timetable', id: row.id, label: `${row.day} ${row.start_time}` })} editing={editing} setEditing={setEditing} />
        )}
        {!profile && activeTab === 'assignments' && <AssignmentsDashboard rows={filteredAssignments} />}
        {!profile && activeTab === 'marks' && <MarksManager rows={filteredMarks} onUpdate={(row) => saveEntity('marks', { records: [row] })} exportMarks={exportMarks} editing={editing} setEditing={setEditing} />}
        {!profile && activeTab === 'notifications' && <NotificationManager form={forms.notice} setForm={(form) => setForms({ ...forms, notice: form })} sendNotification={sendNotification} notifications={notifications} teachers={teachers} students={students} sectionOptions={sectionOptions} />}
        {!profile && activeTab === 'reset-requests' && <ResetRequests rows={resetRequests} />}
      </main>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Confirm Delete</h3>
                <p className="text-sm text-text-secondary mt-1">Delete {deleteTarget.label}? Enter admin password.</p>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="text-text-tertiary hover:text-text-primary"><X className="w-5 h-5" /></button>
            </div>
            <Field type="password" value={adminPassword} onChange={setAdminPassword} placeholder="Admin password" />
            <button type="button" onClick={confirmDelete} className="mt-4 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-danger text-white font-semibold">
              <Trash2 className="w-5 h-5" />Delete
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function resetFor(key) {
  return { student: blankStudent, teacher: blankTeacher, mapping: blankMapping, class: blankClass, notice: blankNotice }[key]
}

function Header({ title, sectionFilter, setSectionFilter, teacherFilter, setTeacherFilter, sectionOptions, teachers, search, setSearch }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        <p className="text-text-secondary mt-1">Role-separated academic management</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:min-w-[640px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" className="w-full bg-bg-tertiary border border-border rounded-xl py-3 pl-10 pr-4 text-text-primary placeholder:text-text-tertiary" />
        </div>
        <select value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary">
          <option value="">All Sections</option>
          {sectionOptions.map((section) => <option key={section} value={section}>{section}</option>)}
        </select>
        <select value={teacherFilter} onChange={(event) => setTeacherFilter(event.target.value)} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary">
          <option value="">All Teachers</option>
          {teachers.map((teacher) => <option key={teacher.teacher_id} value={teacher.teacher_id}>{teacher.name}</option>)}
        </select>
      </div>
    </div>
  )
}

function Home({ analytics, stats, notifications, resetRequests, setActiveTab, onOpenShortage }) {
  const cards = analytics?.cards || {}
  const openResetRequests = resetRequests.filter((request) => ['sent', 'email_failed'].includes(request.status))
  const recentActivity = [
    ...(notifications || []).slice(0, 4).map((notice) => ({
      title: 'Notification sent',
      meta: `${notice.title || 'Untitled'} - ${notice.recipient_type || 'recipient'} - ${notice.date || ''}`
    })),
    ...openResetRequests.slice(0, 3).map((request) => ({
      title: 'Password reset requested',
      meta: `${request.name || request.email} - ${request.role} - ${request.requested_at || ''}`
    })),
    ...(analytics?.top_performers || []).slice(0, 2).map((row) => ({
      title: 'Marks updated',
      meta: `${row.student_name || row.student_id} - ${row.subject || 'subject'} - ${row.subject_average || 0}%`
    }))
  ].slice(0, 8)

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <button type="button" onClick={() => setActiveTab('students')} className="px-4 py-3 rounded-xl bg-bg-tertiary text-text-primary text-sm">Add Student</button>
        <button type="button" onClick={() => setActiveTab('teachers')} className="px-4 py-3 rounded-xl bg-bg-tertiary text-text-primary text-sm">Add Teacher</button>
        <button type="button" onClick={() => setActiveTab('notifications')} className="px-4 py-3 rounded-xl bg-bg-tertiary text-text-primary text-sm">Create Notification</button>
        <button type="button" onClick={() => setActiveTab('timetable')} className="px-4 py-3 rounded-xl bg-bg-tertiary text-text-primary text-sm">Create Timetable Entry</button>
        <button type="button" onClick={() => setActiveTab('marks')} className="px-4 py-3 rounded-xl bg-bg-tertiary text-text-primary text-sm">View Reports</button>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <StatCard icon={Shield} label="Attendance Shortage Students" value={cards.attendance_shortage_students} onClick={onOpenShortage} />
        <StatCard icon={FileText} label="Assignments Due This Week" value={cards.assignments_due_this_week} onClick={() => setActiveTab('assignments')} />
        <StatCard icon={Bell} label="Unread Notifications" value={cards.unread_notifications} onClick={() => setActiveTab('notifications')} />
        <StatCard icon={Users} label="Pending Password Resets" value={stats.pendingRequests} onClick={() => setActiveTab('reset-requests')} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.25fr_.75fr] gap-6">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((item, index) => <RowLine key={index} title={item.title} meta={item.meta} />)}
            {!recentActivity.length && <p className="text-sm text-text-secondary">No recent activity.</p>}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Needs Attention</h3>
            <div className="space-y-3">
              <RowLine title="Attendance shortage" meta={`${cards.attendance_shortage_students || 0} students below threshold`} />
              <RowLine title="Pending work" meta={`${cards.pending_assignments || 0} assignment submissions pending`} />
              <RowLine title="Password resets" meta={`${openResetRequests.length} requests waiting`} />
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Notifications</h3>
            <div className="space-y-3">
              {notifications.slice(0, 4).map((notice) => <RowLine key={`${notice.id}-${notice.usn}`} title={notice.title} meta={`${notice.recipient_type} - ${notice.section || notice.usn || 'ALL'}`} />)}
              {!notifications.length && <p className="text-sm text-text-secondary">No notifications.</p>}
            </div>
          </div>
        </div>
      </section>

      <SimpleList title="At-Risk Students" rows={analytics?.at_risk_students || []} empty="No at-risk students found." />
    </div>
  )
}
function ChartCard({ title, data, x, y }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
          <XAxis dataKey={x} stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
          <Tooltip contentStyle={{ backgroundColor: '#12121a', border: '1px solid #1e1e2e', borderRadius: '8px' }} />
          <Bar dataKey={y} fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function SimpleList({ title, rows, empty = 'No data available.' }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((row, index) => <RowLine key={index} title={row.student_name || row.name} meta={`${row.student_id || row.usn} - ${row.subject || ''} - ${row.subject_average || row.percentage || 0}%`} />)}
        {!rows.length && <p className="text-sm text-text-secondary">{empty}</p>}
      </div>
    </div>
  )
}

function RowLine({ title, meta }) {
  return (
    <div className="p-3 bg-bg-tertiary rounded-xl">
      <p className="text-sm font-medium text-text-primary">{title}</p>
      <p className="text-xs text-text-tertiary">{meta}</p>
    </div>
  )
}

function ManagementPanel({ title, rows, fields, form, setForm, onCreate, onUpdate, onDelete, onView, editing, setEditing }) {
  const active = editing?.title === title ? editing.row : form
  const update = (field, value) => editing?.title === title ? setEditing({ title, row: { ...editing.row, [field]: value } }) : setForm({ ...form, [field]: value })
  return (
    <div className="space-y-6">
      <FormPanel title={editing?.title === title ? `Edit ${title}` : `Add ${title}`} fields={fields} values={active} update={update} onSave={() => editing?.title === title ? onUpdate(editing.row) : onCreate()} onCancel={editing?.title === title ? () => setEditing(null) : null} />
      <DataList title={title} rows={rows} fields={fields} onEdit={(row) => setEditing({ title, row })} onDelete={onDelete} onView={onView} />
    </div>
  )
}

function FormPanel({ title, fields, values, update, onSave, onCancel }) {
  const inputType = (field) => field.includes('password') ? 'password' : field === 'email' ? 'email' : 'text'
  return (
    <section className="glass-card rounded-2xl p-6 space-y-4">
      <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {fields.map((field) => <Field key={field} type={inputType(field)} value={values[field]} onChange={(value) => update(field, value)} placeholder={field.replaceAll('_', ' ')} required={field === 'email'} />)}
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onSave} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold"><Save className="w-5 h-5" />Save</button>
        {onCancel && <button type="button" onClick={onCancel} className="px-5 py-3 rounded-xl bg-bg-tertiary text-text-secondary">Cancel</button>}
      </div>
    </section>
  )
}

function DataList({ title, rows, fields, onEdit, onDelete, onView }) {
  return (
    <section className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">{title}</h3>
      <div className="space-y-2 max-h-[560px] overflow-auto">
        {rows.map((row, index) => <DataRow key={index} row={row} fields={fields} onEdit={onEdit} onDelete={onDelete} onView={onView} />)}
        {!rows.length && <p className="text-sm text-text-secondary">No records found.</p>}
      </div>
    </section>
  )
}

function DataRow({ row, fields, onEdit, onDelete, onView }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 p-3 bg-bg-tertiary rounded-xl text-sm relative">
      <span className="text-text-secondary truncate">{fields.map((field) => row[field]).filter(Boolean).join(' | ')}</span>
      <button type="button" onClick={() => setOpen(!open)} className="text-text-tertiary hover:text-text-primary"><MoreVertical className="w-5 h-5" /></button>
      {open && (
        <div className="absolute right-3 top-10 z-10 bg-bg-secondary border border-border rounded-xl p-2 shadow-xl">
          {onView && <button type="button" onClick={() => { setOpen(false); onView(row) }} className="flex items-center gap-2 w-32 px-3 py-2 text-sm text-text-secondary hover:text-text-primary"><Eye className="w-4 h-4" />View</button>}
          <button type="button" onClick={() => { setOpen(false); onEdit(row) }} className="flex items-center gap-2 w-32 px-3 py-2 text-sm text-text-secondary hover:text-text-primary"><Edit className="w-4 h-4" />Edit</button>
          {onDelete && <button type="button" onClick={() => { setOpen(false); onDelete(row) }} className="flex items-center gap-2 w-32 px-3 py-2 text-sm text-danger"><Trash2 className="w-4 h-4" />Delete</button>}
        </div>
      )}
    </div>
  )
}

function TeachingMap({ rows, teachers, subjects, form, setForm, onCreate, onUpdate, onDelete, editing, setEditing, teacherName }) {
  const active = editing?.title === 'Teaching Map' ? editing.row : form
  const update = (field, value) => editing?.title === 'Teaching Map' ? setEditing({ title: 'Teaching Map', row: { ...editing.row, [field]: value } }) : setForm({ ...form, [field]: value })
  return (
    <div className="space-y-6">
      <section className="glass-card rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">{editing?.title === 'Teaching Map' ? 'Edit Teaching Assignment' : 'Assign Teacher'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={active.teacher_id || ''} onChange={(event) => update('teacher_id', event.target.value)} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary">
            <option value="">Teacher</option>
            {teachers.map((teacher) => <option key={teacher.teacher_id} value={teacher.teacher_id}>{teacher.name}</option>)}
          </select>
          <Field value={active.section} onChange={(value) => update('section', value)} placeholder="section" />
          <select value={active.subject_code || ''} onChange={(event) => {
            const subject = subjects.find((item) => item.code === event.target.value)
            update('subject_code', event.target.value)
            update('subject', subject?.name || '')
          }} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary">
            <option value="">Subject</option>
            {subjects.map((subject) => <option key={subject.code} value={subject.code}>{subject.code}</option>)}
          </select>
          <Field value={active.subject} onChange={(value) => update('subject', value)} placeholder="subject name" />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => editing?.title === 'Teaching Map' ? onUpdate(editing.row) : onCreate()} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold"><Save className="w-5 h-5" />Save Assignment</button>
          {editing?.title === 'Teaching Map' && <button type="button" onClick={() => setEditing(null)} className="px-5 py-3 rounded-xl bg-bg-tertiary text-text-secondary">Cancel</button>}
        </div>
      </section>
      <section className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Teaching Map</h3>
        <div className="space-y-2 max-h-[560px] overflow-auto">
          {rows.map((row) => <DataRow key={row.id} row={{ ...row, display: `${teacherName(row.teacher_id)} | ${row.section} | ${row.subject_code} | ${row.subject}` }} fields={['display']} onEdit={() => setEditing({ title: 'Teaching Map', row })} onDelete={() => onDelete(row)} />)}
        </div>
      </section>
    </div>
  )
}

function TimetableManager({ rows, form, setForm, teachers, subjects, sectionFilter, onCreate, onUpdate, onDelete, editing, setEditing }) {
  const active = editing?.title === 'Timetable' ? editing.row : form
  const update = (field, value) => editing?.title === 'Timetable' ? setEditing({ title: 'Timetable', row: { ...editing.row, [field]: value } }) : setForm({ ...form, [field]: value })
  const slots = Array.from(new Set(rows.map((row) => `${row.start_time}-${row.end_time}`).filter((slot) => slot !== '-'))).sort()
  return (
    <div className="space-y-6">
      <section className="glass-card rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">{editing?.title === 'Timetable' ? 'Edit Class' : 'Add Class'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field value={active.section} onChange={(value) => update('section', value)} placeholder={sectionFilter || 'section'} />
          <select value={active.day || ''} onChange={(event) => update('day', event.target.value)} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary"><option value="">Day</option>{days.map((day) => <option key={day}>{day}</option>)}</select>
          <Field value={active.start_time} onChange={(value) => update('start_time', value)} placeholder="start time" />
          <Field value={active.end_time} onChange={(value) => update('end_time', value)} placeholder="end time" />
          <select value={active.subject_code || ''} onChange={(event) => {
            const subject = subjects.find((item) => item.code === event.target.value)
            update('subject_code', event.target.value)
            update('subject', subject?.name || '')
          }} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary"><option value="">Subject</option>{subjects.map((subject) => <option key={subject.code} value={subject.code}>{subject.code}</option>)}</select>
          <select value={active.teacher_id || ''} onChange={(event) => {
            const teacher = teachers.find((item) => item.teacher_id === event.target.value)
            update('teacher_id', event.target.value)
            update('teacher', teacher?.name || '')
          }} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary"><option value="">Teacher</option>{teachers.map((teacher) => <option key={teacher.teacher_id} value={teacher.teacher_id}>{teacher.name}</option>)}</select>
          <Field value={active.room} onChange={(value) => update('room', value)} placeholder="room" />
          <Field value={active.subject} onChange={(value) => update('subject', value)} placeholder="subject name" />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => editing?.title === 'Timetable' ? onUpdate(editing.row) : onCreate()} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold"><Save className="w-5 h-5" />Save Class</button>
          {editing?.title === 'Timetable' && <button type="button" onClick={() => setEditing(null)} className="px-5 py-3 rounded-xl bg-bg-tertiary text-text-secondary">Cancel</button>}
        </div>
      </section>
      <section className="glass-card rounded-2xl p-6 overflow-auto">
        <h3 className="text-lg font-semibold text-text-primary mb-4">{sectionFilter || 'All Sections'} Weekly Timetable</h3>
        <div className="min-w-[880px] grid" style={{ gridTemplateColumns: `140px repeat(${days.length}, minmax(120px, 1fr))` }}>
          <div className="p-3 text-sm text-text-tertiary">Time</div>
          {days.map((day) => <div key={day} className="p-3 text-sm font-medium text-text-primary">{day}</div>)}
          {slots.map((slot) => (
            <>
              <div key={`${slot}-time`} className="p-3 border-t border-border text-sm text-text-secondary">{slot}</div>
              {days.map((day) => {
                const cls = rows.find((row) => `${row.start_time}-${row.end_time}` === slot && row.day === day)
                return <button key={`${slot}-${day}`} type="button" onClick={() => cls && setEditing({ title: 'Timetable', row: cls })} className="min-h-24 p-3 border-t border-border text-left hover:bg-bg-tertiary/60">{cls ? <><p className="text-sm text-text-primary">{cls.subject_code}</p><p className="text-xs text-text-tertiary">{cls.teacher}</p><p className="text-xs text-accent-primary">{cls.room}</p></> : <span className="text-xs text-text-tertiary">Empty</span>}</button>
              })}
            </>
          ))}
        </div>
      </section>
      <DataList title="Classes" rows={rows} fields={['section', 'day', 'start_time', 'end_time', 'subject_code', 'teacher', 'room']} onEdit={(row) => setEditing({ title: 'Timetable', row })} onDelete={onDelete} />
    </div>
  )
}

function attendanceRisk(percentage) {
  const value = Number(percentage || 0)
  if (value >= 85) return { label: 'Excellent', className: 'bg-emerald-500/15 text-emerald-300' }
  if (value >= 75) return { label: 'Safe', className: 'bg-sky-500/15 text-sky-300' }
  if (value >= 70) return { label: 'Warning', className: 'bg-amber-500/15 text-amber-300' }
  return { label: 'Critical', className: 'bg-danger/15 text-danger' }
}

function RiskBadge({ value }) {
  const risk = attendanceRisk(value)
  return <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${risk.className}`}>{risk.label}</span>
}

function metricAverage(rows) {
  const values = rows.map((row) => Number(row.subject_average || 0)).filter((value) => !Number.isNaN(value))
  return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1) : '0.0'
}

function assignmentGroups(rows) {
  return Array.from(new Map(rows.map((row) => [row.assignment_group_id || row.id || `${row.title}-${row.usn}`, row])).values())
}

function StudentProfile({ student, attendance, marks, assignments, notifications, timetable, onBack }) {
  const [active, setActive] = useState('overview')
  if (!student) return <EmptyProfile onBack={onBack} label="Student not found." />
  const studentAttendance = attendance.filter((row) => row.usn === student.usn)
  const counted = studentAttendance.filter((row) => ['Present', 'Absent'].includes(row.status))
  const present = counted.filter((row) => row.status === 'Present').length
  const absent = counted.filter((row) => row.status === 'Absent').length
  const overall = counted.length ? ((present / counted.length) * 100).toFixed(1) : '0.0'
  const subjectRows = Object.values(studentAttendance.reduce((acc, row) => {
    const key = row.subject_code || row.subject_id || 'Subject'
    acc[key] ||= { subject: row.subject_code || row.subject_name || key, total: 0, present: 0, absent: 0 }
    if (['Present', 'Absent'].includes(row.status)) acc[key].total += 1
    if (row.status === 'Present') acc[key].present += 1
    if (row.status === 'Absent') acc[key].absent += 1
    return acc
  }, {})).map((row) => ({ ...row, percentage: row.total ? ((row.present / row.total) * 100).toFixed(1) : '0.0' }))
  const markRows = marks.filter((row) => row.student_id === student.usn)
  const assignmentRows = assignments.filter((row) => row.usn === student.usn || (row.section === student.section && !row.usn))
  const dueNow = new Date()
  const pendingAssignments = assignmentRows.filter((row) => String(row.completed).toLowerCase() !== 'true')
  const lateAssignments = pendingAssignments.filter((row) => row.due_date && new Date(row.due_date) < dueNow)
  const receivedNotifications = notifications.filter((notice) => {
    const type = notice.recipient_type || ''
    return notice.usn === student.usn || (['all', 'all_users'].includes(type)) || (['class', 'section'].includes(type) && ['', 'ALL', student.section].includes(notice.section || ''))
  })
  const sectionTimetable = timetable.filter((row) => row.section === student.section)
  const tabs = ['overview', 'attendance', 'marks', 'assignments', 'notifications', 'timetable']

  return (
    <section className="space-y-6">
      <ProfileHeader onBack={onBack} title={student.name} meta={`${student.usn} - ${student.section}`} />
      <div className="glass-card rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <ProfileField label="Name" value={student.name} />
        <ProfileField label="USN" value={student.usn} />
        <ProfileField label="Section" value={student.section} />
        <ProfileField label="Email" value={student.email || '-'} />
        <ProfileField label="Phone" value={student.phone || '-'} />
        <ProfileField label="Account Status" value={student.email ? 'Active' : 'Email Missing'} />
      </div>
      <ProfileTabs tabs={tabs} active={active} setActive={setActive} />

      {active === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={Shield} label="Overall Attendance" value={`${overall}%`} />
          <StatCard icon={FileText} label="Overall Marks" value={`${metricAverage(markRows)}%`} />
          <StatCard icon={BookOpen} label="Pending Assignments" value={pendingAssignments.length} />
          <div className="glass-card rounded-2xl p-6"><p className="text-sm text-text-tertiary mb-2">Attendance Status</p><RiskBadge value={overall} /></div>
        </div>
      )}

      {active === 'attendance' && (
        <ProfileSection title="Attendance">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <RowLine title="Overall" meta={`${overall}% attendance`} />
            <RowLine title="Present" meta={`${present} classes`} />
            <RowLine title="Absent" meta={`${absent} classes`} />
            <div className="p-3 bg-bg-tertiary rounded-xl"><p className="text-sm font-medium text-text-primary">Status</p><RiskBadge value={overall} /></div>
          </div>
          <Table rows={subjectRows} columns={['subject', 'present', 'absent', 'total', 'percentage']} badgeColumn="percentage" />
          <ProfileSubList title="Absent Days" rows={studentAttendance.filter((row) => row.status === 'Absent').map((row) => ({ title: row.date, meta: `${row.subject_code || row.subject_name || row.subject_id}` }))} empty="No absent days found." />
        </ProfileSection>
      )}

      {active === 'marks' && <ProfileSection title="Marks"><Table rows={markRows} columns={['subject', 'CIE1', 'CIE2', 'CIE3', 'SEE', 'subject_average']} /></ProfileSection>}
      {active === 'assignments' && (
        <ProfileSection title="Assignments">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <RowLine title="Submitted" meta={`${assignmentRows.filter((row) => String(row.completed).toLowerCase() === 'true').length}`} />
            <RowLine title="Pending" meta={`${pendingAssignments.length}`} />
            <RowLine title="Late" meta={`${lateAssignments.length}`} />
          </div>
          <Table rows={assignmentRows} columns={['title', 'subject', 'due_date', 'completed', 'submitted_at']} />
        </ProfileSection>
      )}
      {active === 'notifications' && <ProfileSection title="Notifications Received"><Table rows={receivedNotifications} columns={['title', 'message', 'recipient_type', 'date', 'read']} /></ProfileSection>}
      {active === 'timetable' && <ProfileSection title="Timetable"><Table rows={sectionTimetable} columns={['day', 'start_time', 'end_time', 'subject_code', 'teacher', 'room']} /></ProfileSection>}
    </section>
  )
}

function TeacherProfile({ teacher, mappings, attendance, marks, assignments, notifications, timetable, onBack }) {
  const [active, setActive] = useState('overview')
  if (!teacher) return <EmptyProfile onBack={onBack} label="Teacher not found." />
  const teacherMappings = mappings.filter((row) => row.teacher_id === teacher.teacher_id)
  const sections = Array.from(new Set(teacherMappings.map((row) => row.section).filter(Boolean)))
  const subjects = Array.from(new Set(teacherMappings.map((row) => row.subject_code || row.subject).filter(Boolean)))
  const assignmentRows = assignmentGroups(assignments.filter((row) => row.teacher_id === teacher.teacher_id || row.creator === teacher.username))
  const notificationRows = notifications.filter((row) => row.teacher_id === teacher.teacher_id || row.teacher_username === teacher.username || row.sender === teacher.name)
  const markRows = marks.filter((row) => row.teacher_id === teacher.teacher_id)
  const classRows = timetable.filter((row) => row.teacher_id === teacher.teacher_id || row.teacher === teacher.name)
  const attendanceRows = attendance.filter((row) => teacherMappings.some((map) => map.section === row.section && String(map.subject_code) === String(row.subject_code)))
  const tabs = ['overview', 'attendance', 'marks', 'assignments', 'notifications', 'timetable']

  return (
    <section className="space-y-6">
      <ProfileHeader onBack={onBack} title={teacher.name} meta={`${teacher.teacher_id} - ${teacher.username}`} />
      <div className="glass-card rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <ProfileField label="Teacher ID" value={teacher.teacher_id} />
        <ProfileField label="Username" value={teacher.username} />
        <ProfileField label="Email" value={teacher.email || '-'} />
        <ProfileField label="Assigned Sections" value={sections.join(', ') || '-'} />
        <ProfileField label="Assigned Subjects" value={subjects.join(', ') || '-'} />
        <ProfileField label="Account Status" value={teacher.email ? 'Active' : 'Email Missing'} />
      </div>
      <ProfileTabs tabs={tabs} active={active} setActive={setActive} />
      {active === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Assigned Sections" value={sections.length} />
          <StatCard icon={BookOpen} label="Subjects" value={subjects.length} />
          <StatCard icon={FileText} label="Assignments Created" value={assignmentRows.length} />
          <StatCard icon={Bell} label="Notifications Sent" value={notificationRows.length} />
        </div>
      )}
      {active === 'attendance' && <ProfileSection title="Attendance Records"><Table rows={attendanceRows} columns={['date', 'section', 'subject_code', 'usn', 'student_name', 'status']} /></ProfileSection>}
      {active === 'marks' && <ProfileSection title="Marks Entered"><Table rows={markRows} columns={['student_id', 'student_name', 'section', 'subject', 'CIE1', 'CIE2', 'CIE3', 'SEE', 'subject_average']} /></ProfileSection>}
      {active === 'assignments' && <ProfileSection title="Assignments Created"><Table rows={assignmentRows} columns={['title', 'section', 'subject', 'due_date', 'file_name']} /></ProfileSection>}
      {active === 'notifications' && <ProfileSection title="Notifications Sent"><Table rows={notificationRows} columns={['title', 'message', 'recipient_type', 'section', 'date']} /></ProfileSection>}
      {active === 'timetable' && <ProfileSection title="Classes"><Table rows={classRows} columns={['section', 'day', 'start_time', 'end_time', 'subject_code', 'room']} /></ProfileSection>}
    </section>
  )
}

function EmptyProfile({ onBack, label }) {
  return <section className="glass-card rounded-2xl p-6"><button type="button" onClick={onBack} className="flex items-center gap-2 text-text-secondary mb-4"><ArrowLeft className="w-4 h-4" />Back</button><p className="text-text-secondary">{label}</p></section>
}

function ProfileHeader({ onBack, title, meta }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-3"><ArrowLeft className="w-4 h-4" />Back</button>
        <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
        <p className="text-text-secondary">{meta}</p>
      </div>
    </div>
  )
}

function ProfileField({ label, value }) {
  return <div><p className="text-xs uppercase text-text-tertiary mb-1">{label}</p><p className="text-text-primary font-medium">{value}</p></div>
}

function ProfileTabs({ tabs, active, setActive }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => <button key={tab} type="button" onClick={() => setActive(tab)} className={`px-4 py-2 rounded-xl text-sm capitalize ${active === tab ? 'bg-accent-primary/20 text-accent-primary' : 'bg-bg-tertiary text-text-secondary'}`}>{tab}</button>)}
    </div>
  )
}

function ProfileSection({ title, children }) {
  return <section className="glass-card rounded-2xl p-6"><h3 className="text-lg font-semibold text-text-primary mb-4">{title}</h3>{children}</section>
}

function ProfileSubList({ title, rows, empty }) {
  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-text-primary mb-3">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((row, index) => <RowLine key={index} title={row.title} meta={row.meta} />)}
        {!rows.length && <p className="text-sm text-text-secondary">{empty}</p>}
      </div>
    </div>
  )
}

function Table({ rows, columns, badgeColumn }) {
  return (
    <div className="overflow-auto">
      <div className="min-w-[760px] space-y-2">
        <div className="grid gap-4 px-3 text-xs uppercase text-text-tertiary" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(110px, 1fr))` }}>
          {columns.map((column) => <span key={column}>{column.replaceAll('_', ' ')}</span>)}
        </div>
        {rows.map((row, index) => (
          <div key={index} className="grid gap-4 p-3 bg-bg-tertiary rounded-xl text-sm" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(110px, 1fr))` }}>
            {columns.map((column) => <span key={column} className="text-text-secondary truncate">{badgeColumn === column ? <RiskBadge value={row[column]} /> : String(row[column] ?? '')}</span>)}
          </div>
        ))}
        {!rows.length && <p className="text-sm text-text-secondary">No records found.</p>}
      </div>
    </div>
  )
}

function AssignmentsDashboard({ rows }) {
  const grouped = assignmentGroups(rows)
  const pending = rows.filter((row) => String(row.completed).toLowerCase() !== 'true').length
  const submitted = rows.filter((row) => String(row.completed).toLowerCase() === 'true').length
  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={FileText} label="Assignments" value={grouped.length} />
        <StatCard icon={Shield} label="Pending Submissions" value={pending} />
        <StatCard icon={Users} label="Submitted" value={submitted} />
      </div>
      <ProfileSection title="Assignments">
        <Table rows={grouped} columns={['title', 'section', 'subject', 'teacher_id', 'due_date', 'file_name']} />
      </ProfileSection>
    </section>
  )
}

function MarksManager({ rows, onUpdate, exportMarks, editing, setEditing }) {
  const [studentQuery, setStudentQuery] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const students = useMemo(() => {
    const map = new Map()
    rows.forEach((row) => {
      if (!map.has(row.student_id)) {
        map.set(row.student_id, { student_id: row.student_id, student_name: row.student_name, section: row.section })
      }
    })
    return Array.from(map.values()).filter((student) => {
      const query = studentQuery.trim().toLowerCase()
      if (!query) return true
      return `${student.student_id} ${student.student_name}`.toLowerCase().includes(query)
    })
  }, [rows, studentQuery])
  const selectedStudent = students.find((student) => student.student_id === selectedStudentId) || students[0]
  const studentRows = selectedStudent ? rows.filter((row) => row.student_id === selectedStudent.student_id) : []
  const average = (row) => Number(row.subject_average || 0)
  const overall = studentRows.length ? (studentRows.reduce((sum, row) => sum + average(row), 0) / studentRows.length).toFixed(1) : '0.0'
  const highest = [...studentRows].sort((a, b) => average(b) - average(a))[0]
  const lowest = [...studentRows].sort((a, b) => average(a) - average(b))[0]

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
      <section className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Students</h3>
          <button type="button" onClick={exportMarks} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-tertiary text-text-primary text-sm"><Download className="w-4 h-4" />Export</button>
        </div>
        <input value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} placeholder="Search student" className="w-full bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary placeholder:text-text-tertiary mb-4" />
        <div className="space-y-2 max-h-[620px] overflow-auto">
          {students.map((student) => (
            <button key={student.student_id} type="button" onClick={() => setSelectedStudentId(student.student_id)} className={`w-full p-3 rounded-xl text-left ${selectedStudent?.student_id === student.student_id ? 'bg-accent-primary/20 text-accent-primary' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'}`}>
              <p className="text-sm font-medium">{student.student_name}</p>
              <p className="text-xs">{student.student_id} - {student.section}</p>
            </button>
          ))}
          {!students.length && <p className="text-sm text-text-secondary">No students found.</p>}
        </div>
      </section>

      <section className="space-y-6">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-text-primary">Student Academic Profile</h3>
          <p className="text-sm text-text-secondary mt-1">{selectedStudent ? `${selectedStudent.student_name} - ${selectedStudent.student_id} - ${selectedStudent.section}` : 'Select a student to view performance.'}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={FileText} label="Overall Average" value={`${overall}%`} />
          <StatCard icon={BookOpen} label="Highest Subject" value={highest?.subject || '-'} />
          <StatCard icon={Shield} label="Lowest Subject" value={lowest?.subject || '-'} />
          <StatCard icon={Users} label="Subjects" value={studentRows.length} />
        </div>
        {editing?.title === 'Marks' && <FormPanel title="Edit Marks" fields={['student_id', 'student_name', 'section', 'subject', 'teacher_id', 'CIE1', 'CIE2', 'CIE3', 'SEE']} values={editing.row} update={(field, value) => setEditing({ title: 'Marks', row: { ...editing.row, [field]: value } })} onSave={() => onUpdate(editing.row)} onCancel={() => setEditing(null)} />}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Subject Performance</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-6 gap-4 px-3 text-xs uppercase text-text-tertiary">
              <span>Subject</span><span>CIE1</span><span>CIE2</span><span>CIE3</span><span>SEE</span><span>Average</span>
            </div>
            {studentRows.map((row) => (
              <div key={`${row.student_id}-${row.subject}`} className="grid grid-cols-6 gap-4 p-3 bg-bg-tertiary rounded-xl text-sm">
                <span className="text-text-primary font-medium">{row.subject}</span>
                <span className="text-text-secondary">{row.CIE1}</span>
                <span className="text-text-secondary">{row.CIE2}</span>
                <span className="text-text-secondary">{row.CIE3}</span>
                <span className="text-text-secondary">{row.SEE}</span>
                <button type="button" onClick={() => setEditing({ title: 'Marks', row })} className="text-left text-accent-primary">{row.subject_average}%</button>
              </div>
            ))}
            {!studentRows.length && <p className="text-sm text-text-secondary">No marks found for this student.</p>}
          </div>
        </div>
      </section>
    </div>
  )
}
function NotificationManager({ form, setForm, sendNotification, notifications, teachers, students, sectionOptions }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={sendNotification} className="glass-card rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Send Notification</h3>
        <Field value={form.title} onChange={(value) => setForm({ ...form, title: value })} placeholder="title" />
        <textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="message" rows="4" className="w-full bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select value={form.target_type} onChange={(event) => setForm({ ...form, target_type: event.target.value })} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary">
            <option value="all">All Students</option>
            <option value="teachers">All Teachers</option>
            <option value="all_users">All Users</option>
            <option value="section">Specific Section</option>
            <option value="teacher">Specific Teacher</option>
            <option value="student">Specific Student</option>
          </select>
          <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary">
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="alert">Alert</option>
          </select>
          {form.target_type === 'section' && <select value={form.section} onChange={(event) => setForm({ ...form, section: event.target.value })} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary"><option value="">Section</option>{sectionOptions.map((section) => <option key={section}>{section}</option>)}</select>}
          {form.target_type === 'teacher' && <select value={form.teacher_id} onChange={(event) => setForm({ ...form, teacher_id: event.target.value })} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary"><option value="">Teacher</option>{teachers.map((teacher) => <option key={teacher.teacher_id} value={teacher.teacher_id}>{teacher.name}</option>)}</select>}
          {form.target_type === 'student' && <select value={form.usn} onChange={(event) => setForm({ ...form, usn: event.target.value })} className="bg-bg-tertiary border border-border rounded-xl py-3 px-4 text-text-primary"><option value="">Student</option>{students.map((student) => <option key={student.usn} value={student.usn}>{student.name}</option>)}</select>}
        </div>
        <button type="submit" className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold"><Save className="w-5 h-5" />Send</button>
      </form>
      <DataList title="Recent Notifications" rows={notifications} fields={['title', 'recipient_type', 'section', 'usn', 'date']} onEdit={() => {}} />
    </div>
  )
}

function ResetRequests({ rows }) {
  return (
    <section className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Password Reset Requests</h3>
      <div className="space-y-3">
        {rows.map((request) => (
          <div key={request.id} className="p-4 bg-bg-tertiary rounded-xl">
            <p className="text-sm font-medium text-text-primary">{request.name || request.email}</p>
            <p className="text-xs text-text-tertiary">{request.role} - {request.identifier} - {request.email}</p>
            <p className="text-xs text-text-secondary mt-1">{request.status} - {request.requested_at}</p>
          </div>
        ))}
        {!rows.length && <p className="text-sm text-text-secondary">No password reset requests.</p>}
      </div>
    </section>
  )
}






