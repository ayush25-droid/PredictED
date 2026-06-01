import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('predicted_user')
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        const userWithRole = {
          ...parsedUser,
          role: parsedUser.role || (parsedUser.usn ? 'student' : 'teacher')
        }
        setUser(userWithRole)
        setIsAuthenticated(true)
        localStorage.setItem('predicted_user', JSON.stringify(userWithRole))
      } catch (error) {
        localStorage.removeItem('predicted_user')
      }
    }
    setLoading(false)
  }, [])

  const login = async (usn, password) => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usn, password })
      })
      const data = await response.json()
      if (data.success) {
        const studentUser = { usn: data.usn, name: data.name, section: data.section, role: 'student' }
        setUser(studentUser)
        setIsAuthenticated(true)
        localStorage.setItem('predicted_user', JSON.stringify(studentUser))
        return { success: true }
      }
      return { success: false, message: data.message }
    } catch (error) {
      return { success: false, message: 'Server error' }
    }
  }

  const teacherLogin = async (username, password) => {
    try {
      const response = await fetch('/api/teacher-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await response.json()
      if (data.success) {
        const teacherUser = {
          username: data.username,
          teacher_id: data.teacher_id,
          name: data.name,
          subject_id: data.subject_id,
          subject: data.subject,
          subject_code: data.subject_code,
          section: data.section,
          role: 'teacher'
        }
        setUser(teacherUser)
        setIsAuthenticated(true)
        localStorage.setItem('predicted_user', JSON.stringify(teacherUser))
        return { success: true }
      }
      return { success: false, message: data.message }
    } catch (error) {
      return { success: false, message: 'Server error' }
    }
  }

  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('predicted_user')
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, teacherLogin, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
