import { Link } from 'react-router-dom'
import { LayoutDashboard, Search, Briefcase, Send, User, BarChart3, Users, Star, Clock, TrendingUp } from 'lucide-react'
import PortalLayout from '../../components/PortalLayout'
import { useQuery } from '@tanstack/react-query'
import api from '../../utils/api'
import useAuthStore from '../../store/authStore'

const NAV = [
  { path: '/hr/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { path: '/hr/screening',   label: 'AI Screening', icon: Search },
  { path: '/hr/jobs',        label: 'Job Listings', icon: Briefcase },
  { path: '/hr/invitations', label: 'Invitations',  icon: Send },
  { path: '/hr/profile',     label: 'Profile',      icon: User },
]

export default function HRDashboard() {
  const { user } = useAuthStore()

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => { const r = await api.get('/screening/sessions'); return r.data }
  })

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => { const r = await api.get('/jobs/'); return r.data }
  })

  const { data: invitations = [] } = useQuery({
    queryKey: ['hr-invitations'],
    queryFn: async () => { const r = await api.get('/invitations/hr/sent'); return r.data }
  })

  const totalScreened = sessions.reduce((a, s) => a + (s.total_resumes || 0), 0)
  const pendingInvites = invitations.filter(i => i.status === 'pending').length
  const acceptedInvites = invitations.filter(i => i.status === 'accepted').length

  const stats = [
    { label: 'Resumes Screened',   value: totalScreened,         icon: Search,   color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Active Jobs',        value: jobs.filter(j=>j.status==='active').length, icon: Briefcase, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Invitations Sent',   value: invitations.length,    icon: Send,     color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Accepted',           value: acceptedInvites,       icon: Star,     color: 'text-amber-600',  bg: 'bg-amber-50' },
  ]

  return (
    <PortalLayout navItems={NAV} role="hr">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-slate-900 mb-1">
          Welcome back, {user?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-500">Here's your hiring overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map(s => (
          <div key={s.label} className="card">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div className="font-display text-3xl font-bold text-slate-900 mb-0.5">{s.value}</div>
            <div className="text-sm text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent sessions */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-slate-900">Recent Screening Sessions</h2>
            <Link to="/hr/screening" className="text-sm text-blue-600 hover:underline font-medium">+ New session</Link>
          </div>
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 mb-4">No screening sessions yet</p>
              <Link to="/hr/screening" className="btn-primary text-sm">Start AI Screening</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 6).map(s => (
                <Link key={s.id} to={`/hr/results/${s.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all group">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-violet-100 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{s.job_title}</div>
                    <div className="text-xs text-slate-500">{s.total_resumes} resumes · {new Date(s.created_at).toLocaleDateString()}</div>
                  </div>
                  <span className={s.status === 'completed' ? 'badge-green' : 'badge-amber'}>
                    {s.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions + recent invitations */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="font-display font-bold text-slate-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { to: '/hr/screening',   icon: Search,   label: 'Screen Resumes',    color: 'from-blue-600 to-violet-600' },
                { to: '/hr/jobs',        icon: Briefcase,label: 'Post a Job',         color: 'from-violet-600 to-purple-600' },
                { to: '/hr/invitations', icon: Send,     label: 'View Invitations',  color: 'from-emerald-500 to-teal-600' },
              ].map(a => (
                <Link key={a.to} to={a.to}
                  className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${a.color} text-white font-medium text-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}>
                  <a.icon className="w-4 h-4" />
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="font-display font-bold text-slate-900 mb-4">Recent Invitations</h2>
            {invitations.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No invitations sent yet</p>
            ) : invitations.slice(0, 5).map(inv => (
              <div key={inv.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-violet-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
                  {inv.candidate_name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{inv.candidate_name}</div>
                  <div className="text-xs text-slate-500 truncate">{inv.job_title}</div>
                </div>
                <span className={
                  inv.status === 'accepted' ? 'badge-green' :
                  inv.status === 'declined' ? 'badge-red' : 'badge-amber'
                }>{inv.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
