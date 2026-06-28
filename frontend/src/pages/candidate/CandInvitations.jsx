import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LayoutDashboard, Briefcase, Bell, User, FileText, Calendar, Video, Check, X, Loader2 } from 'lucide-react'
import PortalLayout from '../../components/PortalLayout'
import { CAND_NAV } from './CandDashboard'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { useState } from 'react'

export default function CandInvitations() {
  const qc = useQueryClient()
  const [responding, setResponding] = useState(null)

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['cand-invitations'],
    queryFn: async () => { const r = await api.get('/invitations/candidate/received'); return r.data },
    refetchInterval: 15000,
  })

  const respond = async (invId, status) => {
    try {
      setResponding(invId + status)
      await api.patch(`/invitations/${invId}/respond`, { status })
      toast.success(status === 'accepted' ? '🎉 Invitation accepted!' : 'Invitation declined')
      qc.invalidateQueries(['cand-invitations'])
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to respond')
    } finally { setResponding(null) }
  }

  return (
    <PortalLayout navItems={CAND_NAV} role="candidate">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-slate-900">Interview Invitations</h1>
        <p className="text-slate-500 mt-1">Respond to interview requests from recruiters</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
      ) : invitations.length === 0 ? (
        <div className="card text-center py-16">
          <Bell className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500">No invitations yet. Keep applying!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.map(inv => (
            <div key={inv.id} className={`card border-2 transition-all ${
              inv.status === 'accepted' ? 'border-emerald-200 bg-emerald-50' :
              inv.status === 'declined' ? 'border-red-100' : 'border-blue-200 hover:shadow-card-hover'
            }`}>
              {/* Pending banner */}
              {inv.status === 'pending' && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-4 text-sm font-medium text-amber-800">
                  <Bell className="w-4 h-4" />
                  New invitation — please respond
                </div>
              )}

              <div className="flex items-start gap-4 flex-wrap">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-violet-100 flex items-center justify-center font-display font-bold text-blue-700 text-xl flex-shrink-0">
                  {inv.company_name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-display font-bold text-xl text-slate-900">{inv.job_title}</h3>
                      <p className="text-slate-600 font-medium">{inv.company_name}</p>
                    </div>
                    <span className={inv.status === 'accepted' ? 'badge-green' : inv.status === 'declined' ? 'badge-red' : 'badge-amber'}>
                      {inv.status === 'accepted' ? '✓ Accepted' : inv.status === 'declined' ? '✗ Declined' : '⏳ Pending'}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3 mt-4">
                    {inv.interview_date && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        {new Date(inv.interview_date).toLocaleString()}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Video className="w-4 h-4 text-violet-600" />
                      {inv.interview_type?.replace('_', ' ') || 'Video'}
                    </div>
                    <div className="text-xs text-slate-400">Received {new Date(inv.created_at).toLocaleDateString()}</div>
                  </div>

                  {inv.message && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed italic">
                      "{inv.message}"
                    </div>
                  )}

                  {/* Actions */}
                  {inv.status === 'pending' && (
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => respond(inv.id, 'accepted')}
                        disabled={!!responding}
                        className="btn-primary py-2.5 px-6"
                      >
                        {responding === inv.id + 'accepted' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Accept Interview
                      </button>
                      <button
                        onClick={() => respond(inv.id, 'declined')}
                        disabled={!!responding}
                        className="btn-danger py-2.5 px-6"
                      >
                        {responding === inv.id + 'declined' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        Decline
                      </button>
                    </div>
                  )}

                  {/* Accepted: show video room link */}
                  {inv.status === 'accepted' && inv.meet_link && (
                    <div className="mt-4 p-4 bg-emerald-100 border border-emerald-300 rounded-2xl flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-emerald-800">🎉 Interview confirmed!</div>
                        <div className="text-sm text-emerald-700 mt-0.5">Your video room is ready for the scheduled time</div>
                      </div>
                     <button
  onClick={() => window.open(inv.meet_link, '_blank')}
  className="btn-primary text-sm py-2 px-4">
  <Video className="w-4 h-4" /> Join Interview Room
</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalLayout>
  )
}
