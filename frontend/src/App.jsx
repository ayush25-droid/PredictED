import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import RoleSelect from './pages/RoleSelect'
import Login from './pages/Login'
import TeacherLogin from './pages/TeacherLogin'
import AdminLogin from './pages/AdminLogin'
import ResetPassword from './pages/ResetPassword'
import TeacherDashboard from './pages/TeacherDashboard'
import AdminDashboard from './pages/AdminDashboard'
import Dashboard from './pages/Dashboard'
import Attendance from './pages/Attendance'
import Timetable from './pages/Timetable'
import Assignments from './pages/Assignments'
import Marks from './pages/Marks'
import Predictor from './pages/Predictor'
import Calendar from './pages/Calendar'
import Settings from './pages/Settings'
import Chatbot from './components/Chatbot'

function ProtectedRoute({ children, role }) {
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) return null
  if (!isAuthenticated) return <Navigate to={role === 'teacher' ? '/teacher-login' : role === 'admin' ? '/admin-login' : '/login'} />
  if (role && user?.role !== role) {
    return <Navigate to={user?.role === 'teacher' ? '/teacher-dashboard' : user?.role === 'admin' ? '/admin-dashboard' : '/dashboard'} />
  }

  return children
}

function AppLayout({ children }) {
  return (
    <div className="flex h-screen bg-bg-primary">
      {children}
    </div>
  )
}

function AuthenticatedChatbot() {
  const { isAuthenticated, user } = useAuth()
  return isAuthenticated ? <Chatbot /> : null
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RoleSelect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/teacher-login" element={<TeacherLogin />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/dashboard" element={
              <ProtectedRoute role="student">
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/teacher-dashboard" element={
              <ProtectedRoute role="teacher">
                <AppLayout>
                  <TeacherDashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin-dashboard" element={
              <ProtectedRoute role="admin">
                <AppLayout>
                  <AdminDashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/attendance" element={
              <ProtectedRoute role="student">
                <AppLayout>
                  <Attendance />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/timetable" element={
              <ProtectedRoute role="student">
                <AppLayout>
                  <Timetable />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/assignments" element={
              <ProtectedRoute role="student">
                <AppLayout>
                  <Assignments />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/marks" element={
              <ProtectedRoute role="student">
                <AppLayout>
                  <Marks />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/predictor" element={
              <ProtectedRoute role="student">
                <AppLayout>
                  <Predictor />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/calendar" element={
              <ProtectedRoute role="student">
                <AppLayout>
                  <Calendar />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute role="student">
                <AppLayout>
                  <Settings />
                </AppLayout>
              </ProtectedRoute>
            } />
          </Routes>
          <AuthenticatedChatbot />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App


