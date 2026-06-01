import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  ClipboardCheck,
  CalendarDays,
  FileText,
  TrendingUp,
  Calendar,
  Settings,
  MessageSquare,
  LogOut
} from 'lucide-react'

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { path: '/timetable', icon: CalendarDays, label: 'Timetable' },
  { path: '/assignments', icon: FileText, label: 'Assignments' },
  { path: '/predictor', icon: TrendingUp, label: 'Bunk Predictor' },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="w-64 h-screen bg-bg-secondary border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.jpg" 
            alt="Logo" 
            className="w-10 h-10 rounded-xl object-cover"
          />
          <div>
            <h1 className="text-lg font-bold gradient-text">PredictED</h1>
            <p className="text-xs text-text-tertiary">Academic Hub</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-accent-primary/20 text-accent-primary'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-primary"
                />
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('predicted-open-chatbot'))}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="font-medium">AI Assistant</span>
        </button>
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-4 py-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center">
            <span className="text-sm font-medium text-accent-primary">
              {user?.name?.charAt(0) || 'S'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {user?.name || 'Student'}
            </p>
            <p className="text-xs text-text-tertiary truncate">
              {user?.usn}
            </p>
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
    </div>
  )
}
