// CandDashboard.jsx
import { Link } from 'react-router-dom'
import { LayoutDashboard, Briefcase, Bell, User, FileText, CheckCircle, Clock, XCircle } from 'lucide-react'
import PortalLayout from '../../components/PortalLayout'
import { useQuery } from '@tanstack/react-query'
import api from '../../utils/api'
import useAuthStore from '../../store/authStore'

export const CAND_NAV = [
  { path: '/candidate/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { path: '/candidate/jobs',         label: 'Browse Jobs',  icon: Briefcase },
  { path: '/candidate/applications', label: 'Applications', icon: FileText },
  { path: '/candidate/invitations',  label: 'Invitations',  icon: Bell },
  { path: '/candidate/profile',      label: 'Profile',      icon: User },
]

export default function CandDashboard() {
  const { user } = useAuthStore()

  const { data: invitations = [] } = useQuery({
    queryKey: ['cand-invitations'],
    queryFn: async () => { const r = await api.get('/invitations/candidate/received'); return r.data },
    refetchInterval: 15000,
  })

  const { data: applications = [] } = useQuery({
    queryKey: ['cand-applications'],
    queryFn: async () => { const r = await api.get('/jobs/candidate/applications'); return r.data }
  })

  const { data: notifs = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => { const r = await api.get('/users/notifications'); return r.data },
    refetchInterval: 20000,
  })

  const pendingInvites = invitations.filter(i => i.status === 'pending').length
  const acceptedInvites = invitations.filter(i => i.status === 'accepted').length

  return (
    <PortalLayout navItems={CAND_NAV} role="candidate">
      {/* Welcome */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 mb-8 text-white">
        <div className="absolute right-8 top-6 text-8xl opacity-10">🚀</div>
        <div className="relative">
          <h1 className="font-display text-3xl font-bold mb-1">Welcome back, {user?.full_name?.split(' ')[0]} 👋</h1>
          <p className="text-emerald-100">Track your applications and interview invitations here</p>
          <div className="flex gap-8 mt-6">
            <div><div className="font-display text-3xl font-bold">{applications.length}</div><div className="text-emerald-200 text-sm">Applications</div></div>
            <div><div className="font-display text-3xl font-bold">{pendingInvites}</div><div className="text-emerald-200 text-sm">Pending Invites</div></div>
            <div><div className="font-display text-3xl font-bold">{acceptedInvites}</div><div className="text-emerald-200 text-sm">Accepted</div></div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Invitations */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-slate-900">Interview Invitations</h2>
            <Link to="/candidate/invitations" className="text-sm text-emerald-600 hover:underline font-medium">View all →</Link>
          </div>
          {invitations.length === 0 ? (
            <div className="text-center py-10">
              <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No invitations yet. Apply to jobs to get started!</p>
              <Link to="/candidate/jobs" className="btn-primary text-sm mt-4 inline-flex">Browse Jobs</Link>
            </div>
          ) : invitations.slice(0, 5).map(inv => (
            <Link key={inv.id} to="/candidate/invitations"
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all mb-2 last:mb-0">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center font-display font-bold text-emerald-700 flex-shrink-0">
                {inv.company_name?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 truncate">{inv.job_title}</div>
                <div className="text-xs text-slate-500">{inv.company_name} · {inv.interview_type}</div>
              </div>
              <span className={inv.status === 'accepted' ? 'badge-green' : inv.status === 'declined' ? 'badge-red' : 'badge-amber'}>
                {inv.status}
              </span>
            </Link>
          ))}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <div className="card">
            <h2 className="font-display font-bold text-slate-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { to:'/candidate/jobs',         icon:Briefcase, label:'Browse Jobs',       color:'from-emerald-500 to-teal-600' },
                { to:'/candidate/invitations',  icon:Bell,      label:'View Invitations',  color:'from-blue-500 to-violet-600' },
                { to:'/candidate/profile',      icon:User,      label:'Update Profile',    color:'from-violet-500 to-purple-600' },
              ].map(a => (
                <Link key={a.to} to={a.to} className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${a.color} text-white font-medium text-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}>
                  <a.icon className="w-4 h-4" />{a.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="font-display font-bold text-slate-900 mb-4">Recent Notifications</h2>
            {notifs.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No notifications yet</p>
            ) : notifs.slice(0, 5).map(n => (
              <div key={n.id} className={`py-3 border-b border-slate-50 last:border-0 ${!n.read ? 'font-medium' : ''}`}>
                <div className="text-sm text-slate-900">{n.title}</div>
                <div className="text-xs text-slate-400 mt-0.5">{n.message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
