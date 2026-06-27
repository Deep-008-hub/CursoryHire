import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bell, LogOut, Zap } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { useQuery } from '@tanstack/react-query'
import api from '../utils/api'
import { useState } from 'react'

export default function PortalLayout({ children, navItems, role }) {
  const location = useLocation()
  const navigate  = useNavigate()
  const { user, logout } = useAuthStore()
  const [showNotifs, setShowNotifs] = useState(false)

  const { data: notifs = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/users/notifications')
      return res.data
    },
    refetchInterval: 30000,
  })

  const unread = notifs.filter(n => !n.read).length

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const roleGradient = role === 'hr'
    ? 'from-blue-600 to-violet-600'
    : 'from-emerald-500 to-teal-600'

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside className="w-60 bg-white border-r border-slate-100 flex flex-col shadow-sm flex-shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-100">
          <div className={`w-8 h-8 bg-gradient-to-br ${roleGradient} rounded-lg flex items-center justify-center`}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-display font-bold text-slate-900 text-sm leading-none">CursoryHire</div>
            <div className="text-xs text-slate-400 mt-0.5">{role === 'hr' ? 'HR Portal' : 'Candidate Portal'}</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          {navItems.map(item => {
            const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all ${
                  active
                    ? `bg-gradient-to-r ${roleGradient} text-white shadow-sm`
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
                {item.badge ? (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${roleGradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
              {user?.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">{user?.full_name}</div>
              <div className="text-xs text-slate-400 capitalize">{user?.role}</div>
            </div>
            <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-end px-6 gap-4 flex-shrink-0">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <Bell className="w-4 h-4 text-slate-600" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                  <span className="font-semibold text-slate-900">Notifications</span>
                  {unread > 0 && (
                    <button
                      onClick={async () => { await api.patch('/users/notifications/read-all'); setShowNotifs(false) }}
                      className="text-xs text-blue-600 hover:underline"
                    >Mark all read</button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifs.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm">No notifications</div>
                  ) : notifs.slice(0, 10).map(n => (
                    <div key={n.id} className={`p-4 border-b border-slate-50 last:border-0 ${!n.read ? 'bg-blue-50' : ''}`}>
                      <div className="font-medium text-slate-900 text-sm">{n.title}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{n.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
