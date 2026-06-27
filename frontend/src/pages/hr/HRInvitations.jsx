import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LayoutDashboard, Search, Briefcase, Send, User, Mail, Calendar, Video, CheckCircle, Loader2, X, RefreshCw } from 'lucide-react'
import PortalLayout from '../../components/PortalLayout'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const NAV = [
  { path: '/hr/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { path: '/hr/screening',   label: 'AI Screening', icon: Search },
  { path: '/hr/jobs',        label: 'Job Listings', icon: Briefcase },
  { path: '/hr/invitations', label: 'Invitations',  icon: Send },
  { path: '/hr/profile',     label: 'Profile',      icon: User },
]

const ROUNDS = [
  'Technical Round 2',
  'Technical Round 3',
  'HR Round',
  'Manager Round',
  'Final Round',
  'Culture Fit Round',
  'Assignment Round',
]

function ResultModal({ invitation, onClose, onSaved }) {
  const [outcome,  setOutcome]  = useState(invitation.forceOutcome || '')
  const [feedback, setFeedback] = useState('')
  const [loading,  setLoading]  = useState(false)

  const submit = async () => {
    if (!outcome) return toast.error('Select an outcome')
    try {
      setLoading(true)
      await api.patch(`/invitations/${invitation.id}/result`, { outcome, feedback })
      toast.success(`Marked as ${outcome}!`)
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save result')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-blue-600 to-violet-600 p-6 rounded-t-3xl text-white flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">Mark Interview Result</h2>
            <p className="text-blue-100 text-sm mt-1">{invitation.candidate_name} · {invitation.job_title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">Interview outcome *</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'selected', label: '✅ Selected', cls: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
                { value: 'on_hold',  label: '⏳ On Hold',  cls: 'border-amber-300 bg-amber-50 text-amber-700' },
                { value: 'rejected', label: '❌ Rejected', cls: 'border-red-300 bg-red-50 text-red-700' },
              ].map(o => (
                <button key={o.value} onClick={() => setOutcome(o.value)}
                  className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    outcome === o.value ? o.cls : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
            {outcome === 'on_hold' && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                After saving, you can schedule the next interview round from the card.
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Feedback (optional)</label>
            <textarea className="input resize-none" rows={3}
              placeholder="e.g. Strong technical skills. Moving to HR round."
              value={feedback} onChange={e => setFeedback(e.target.value)} />
          </div>
          <button onClick={submit} disabled={loading || !outcome} className="btn-primary w-full justify-center py-3">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Save Result
          </button>
        </div>
      </div>
    </div>
  )
}

function NextRoundModal({ invitation, onClose, onSaved }) {
  const [roundName,   setRoundName]   = useState('Technical Round 2')
  const [customRound, setCustomRound] = useState('')
  const [date,        setDate]        = useState('')
  const [type,        setType]        = useState('video')
  const [message,     setMessage]     = useState('')
  const [loading,     setLoading]     = useState(false)

  const finalRound = customRound.trim() || roundName

  const submit = async () => {
    try {
      setLoading(true)
      await api.post(`/invitations/${invitation.id}/next-round`, {
        round_name:     finalRound,
        interview_date: date || undefined,
        interview_type: type,
        message:        message || `You have been invited for ${finalRound} for the ${invitation.job_title} role.`,
      })
      toast.success(`Next round invitation sent for ${finalRound}!`)
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to schedule next round')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6 rounded-t-3xl text-white flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
          <div>
            <h2 className="font-display text-xl font-bold">Schedule Next Round</h2>
            <p className="text-amber-100 text-sm mt-1">{invitation.candidate_name} · {invitation.job_title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Round name *</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {ROUNDS.map(r => (
                <button key={r} onClick={() => { setRoundName(r); setCustomRound('') }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    roundName === r && !customRound
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                  }`}>
                  {r}
                </button>
              ))}
            </div>
            <input className="input" placeholder="Or type a custom round name..."
              value={customRound} onChange={e => setCustomRound(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Interview Date</label>
              <input className="input" type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Interview Type</label>
              <select className="input" value={type} onChange={e => setType(e.target.value)}>
                <option value="video">Video Call</option>
                <option value="in_person">In Person</option>
                <option value="phone">Phone</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Message (optional)</label>
            <textarea className="input resize-none" rows={3}
              placeholder={`You have been invited for ${finalRound}...`}
              value={message} onChange={e => setMessage(e.target.value)} />
          </div>
          <button onClick={submit} disabled={loading} className="btn-primary w-full justify-center py-3"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Send Next Round Invitation
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HRInvitations() {
  const qc = useQueryClient()
  const [marking,   setMarking]   = useState(null)
  const [nextRound, setNextRound] = useState(null)
  const [activeTab, setActiveTab] = useState('all')

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['hr-invitations'],
    queryFn: async () => { const r = await api.get('/invitations/hr/sent'); return r.data },
    refetchInterval: 15000,
  })

  const stats = {
    total:    invitations.length,
    pending:  invitations.filter(i => i.status === 'pending').length,
    accepted: invitations.filter(i => i.status === 'accepted').length,
    declined: invitations.filter(i => i.status === 'declined').length,
    on_hold:  invitations.filter(i => i.interview_outcome === 'on_hold').length,
    selected: invitations.filter(i => i.interview_outcome === 'selected').length,
  }

  const filtered = activeTab === 'all'      ? invitations
    : activeTab === 'on_hold'               ? invitations.filter(i => i.interview_outcome === 'on_hold')
    : activeTab === 'selected'              ? invitations.filter(i => i.interview_outcome === 'selected')
    : activeTab === 'pending'               ? invitations.filter(i => i.status === 'pending')
    : invitations.filter(i => i.status === activeTab)

  return (
    <PortalLayout navItems={NAV} role="hr">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-slate-900">Interview Invitations</h1>
        <p className="text-slate-500 mt-1">Track all rounds and mark results after each interview</p>
      </div>

      {/* Stats tabs */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Total',    value: stats.total,    color: 'text-blue-600',    bg: 'bg-blue-50',    tab: 'all' },
          { label: 'Pending',  value: stats.pending,  color: 'text-amber-600',   bg: 'bg-amber-50',   tab: 'pending' },
          { label: 'Accepted', value: stats.accepted, color: 'text-emerald-600', bg: 'bg-emerald-50', tab: 'accepted' },
          { label: 'Declined', value: stats.declined, color: 'text-red-600',     bg: 'bg-red-50',     tab: 'declined' },
          { label: 'On Hold',  value: stats.on_hold,  color: 'text-orange-600',  bg: 'bg-orange-50',  tab: 'on_hold' },
          { label: 'Selected', value: stats.selected, color: 'text-violet-600',  bg: 'bg-violet-50',  tab: 'selected' },
        ].map(s => (
          <button key={s.label} onClick={() => setActiveTab(s.tab)}
            className={`card border-2 transition-all text-left ${
              activeTab === s.tab ? 'border-blue-400 shadow-md' : 'border-transparent'
            } ${s.bg}`}>
            <div className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-600 mt-0.5">{s.label}</div>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Send className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500">No invitations in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => (
            <div key={inv.id} className={`card hover:shadow-card-hover transition-all border-l-4 ${
              inv.interview_outcome === 'selected' ? 'border-l-emerald-500' :
              inv.interview_outcome === 'rejected' ? 'border-l-red-400' :
              inv.interview_outcome === 'on_hold'  ? 'border-l-amber-400' :
              inv.status === 'accepted'            ? 'border-l-blue-400' :
              inv.status === 'declined'            ? 'border-l-red-300' :
              'border-l-slate-200'
            }`}>
              <div className="flex items-start gap-4 flex-wrap">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-violet-100 rounded-2xl flex items-center justify-center font-display font-bold text-blue-700 text-lg flex-shrink-0">
                  {inv.candidate_name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-display font-bold text-slate-900">{inv.candidate_name}</h3>
                      <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                        <Mail className="w-3.5 h-3.5" />{inv.candidate_email}
                      </div>
                      <div className="text-sm font-medium text-slate-700 mt-1">
                        {inv.job_title}
                        {inv.round_name && inv.round_name !== 'Round 1' && (
                          <span className="ml-2 badge-purple text-xs">{inv.round_name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={
                        inv.status === 'accepted' ? 'badge-green' :
                        inv.status === 'declined' ? 'badge-red' : 'badge-amber'
                      }>
                        {inv.status === 'accepted' ? '✓ Accepted' :
                         inv.status === 'declined' ? '✗ Declined' : '⏳ Pending'}
                      </span>
                      {inv.interview_outcome && (
                        <span className={
                          inv.interview_outcome === 'selected' ? 'badge-green' :
                          inv.interview_outcome === 'rejected' ? 'badge-red' : 'badge-amber'
                        }>
                          {inv.interview_outcome === 'selected' ? '🎉 Selected' :
                           inv.interview_outcome === 'rejected' ? '❌ Rejected' : '⏳ On Hold'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                    {inv.interview_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(inv.interview_date).toLocaleString()}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Video className="w-3.5 h-3.5" />{inv.interview_type}
                    </span>
                    <span>Sent {new Date(inv.created_at).toLocaleDateString()}</span>
                  </div>

                  {inv.interview_feedback && (
                    <div className="mt-2 p-3 bg-slate-50 rounded-xl text-sm text-slate-600 italic">
                      "{inv.interview_feedback}"
                    </div>
                  )}

                  {/* On Hold action box */}
                  {inv.interview_outcome === 'on_hold' && (
                    <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-sm text-amber-800 font-semibold mb-3">
                        ⏳ Candidate is on hold — what would you like to do next?
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => setNextRound(inv)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition-colors">
                          <RefreshCw className="w-4 h-4" /> Schedule Next Round
                        </button>
                        <button onClick={() => setMarking({ ...inv, forceOutcome: 'selected' })}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors">
                          ✅ Select Candidate
                        </button>
                        <button onClick={() => setMarking({ ...inv, forceOutcome: 'rejected' })}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-colors">
                          ❌ Reject Candidate
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 mt-3 flex-wrap">
                    {inv.status === 'accepted' && inv.meet_link && (
                      <a href={inv.meet_link} target="_blank" rel="noreferrer"
                        className="btn-primary text-sm py-2 px-4">
                        <Video className="w-4 h-4" /> Join Interview Room
                      </a>
                    )}
                    {inv.status === 'accepted' && !inv.interview_outcome && (
                      <button onClick={() => setMarking(inv)}
                        className="btn-secondary text-sm py-2 px-4">
                        <CheckCircle className="w-4 h-4" /> Mark Result
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {marking && (
        <ResultModal
          invitation={marking}
          onClose={() => setMarking(null)}
          onSaved={() => qc.invalidateQueries(['hr-invitations'])}
        />
      )}

      {nextRound && (
        <NextRoundModal
          invitation={nextRound}
          onClose={() => setNextRound(null)}
          onSaved={() => qc.invalidateQueries(['hr-invitations'])}
        />
      )}
    </PortalLayout>
  )
}