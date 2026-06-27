import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LayoutDashboard, Search, Briefcase, Send, User, Trophy, Star, ChevronDown, ChevronUp, Mail, X, Loader2, CheckCircle } from 'lucide-react'
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

const GRADE_COLORS = { 'A+':'bg-emerald-500', A:'bg-emerald-400', 'B+':'bg-blue-500', B:'bg-blue-400', C:'bg-amber-500', D:'bg-orange-500', F:'bg-red-500' }
const REC_BADGE = { 'Strongly Recommended':'badge-green', Recommended:'badge-blue', Consider:'badge-amber', 'Not Suitable':'badge-red' }

function ScoreBar({ label, value, color = 'bg-blue-500' }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-800">{value}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function InviteModal({ result, jobTitle, onClose, onSent }) {
  const [email,    setEmail]    = useState(result.candidate_email || '')
  const [name,     setName]     = useState(result.candidate_name || result.filename)
  const [date,     setDate]     = useState('')
  const [type,     setType]     = useState('video')
  const [message,  setMessage]  = useState(`Hi ${result.candidate_name || 'there'},\n\nWe were impressed by your profile and would love to invite you for an interview for the ${jobTitle} role.\n\nLooking forward to speaking with you!`)
  const [loading,  setLoading]  = useState(false)

  const send = async () => {
    if (!email) return toast.error('Enter candidate email')
    try {
      setLoading(true)
      await api.post('/invitations/send', {
        screening_result_id: result.id,
        candidate_email: email,
        candidate_name: name,
        job_title: jobTitle,
        message,
        interview_date: date || undefined,
        interview_type: type,
      })
      toast.success(`Invitation sent to ${name}!`)
      onSent()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to send invitation')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-blue-600 to-violet-600 p-6 rounded-t-3xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold">Send Interview Invitation</h2>
              <p className="text-blue-100 text-sm mt-1">for {jobTitle}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Candidate Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Candidate Email *</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="candidate@email.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Interview Date</label>
              <input className="input" type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Interview Type</label>
              <select className="input" value={type} onChange={e => setType(e.target.value)}>
                <option value="video">Video Call</option>
                <option value="in_person">In Person</option>
                <option value="phone">Phone</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
            <textarea className="input resize-none" rows={4} value={message} onChange={e => setMessage(e.target.value)} />
          </div>
          <button onClick={send} disabled={loading} className="btn-primary w-full justify-center py-3">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Send Invitation
          </button>
        </div>
      </div>
    </div>
  )
}

function CandidateCard({ result, jobTitle, rank, onInvite }) {
  const [expanded, setExpanded] = useState(false)
  const rankCls = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'bg-slate-100 text-slate-600'
  const scoreColor = result.overall_score >= 80 ? 'text-emerald-600' : result.overall_score >= 60 ? 'text-amber-600' : 'text-red-500'

  return (
    <div className={`card hover:shadow-card-hover transition-all border-2 ${rank <= 3 ? 'border-blue-100' : 'border-slate-100'}`}>
      <div className="flex items-start gap-4">
        {/* Rank */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm flex-shrink-0 ${rankCls}`}>
          {rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-display font-bold text-slate-900 text-lg">{result.candidate_name || result.filename}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={REC_BADGE[result.recommendation] || 'badge-gray'}>{result.recommendation}</span>
                {result.grade && (
                  <span className={`w-8 h-8 rounded-full ${GRADE_COLORS[result.grade] || 'bg-slate-400'} text-white text-xs font-bold flex items-center justify-center`}>
                    {result.grade}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className={`font-display text-4xl font-bold ${scoreColor}`}>{result.overall_score}</div>
              <div className="text-xs text-slate-400">/ 100</div>
            </div>
          </div>

          {/* Score bar */}
          <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${result.overall_score >= 80 ? 'from-emerald-400 to-emerald-600' : result.overall_score >= 60 ? 'from-amber-400 to-amber-600' : 'from-red-400 to-red-600'}`}
              style={{ width: `${result.overall_score}%` }}
            />
          </div>

          {/* Skills chips */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(result.matched_skills || []).slice(0, 5).map(s => (
              <span key={s} className="badge-green text-xs">✓ {s}</span>
            ))}
            {(result.missing_skills || []).slice(0, 3).map(s => (
              <span key={s} className="badge-red text-xs">✗ {s}</span>
            ))}
          </div>

          {/* Summary */}
          <p className="text-sm text-slate-600 mt-3 leading-relaxed">{result.executive_summary}</p>

          {/* Expanded detail */}
          {expanded && (
            <div className="mt-4 pt-4 border-t border-slate-100 grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-slate-800 text-sm mb-2">Dimension Scores</h4>
                {Object.entries(result.scores || {}).map(([k, v]) => (
                  <ScoreBar key={k} label={k.replace(/_/g, ' ')} value={v} />
                ))}
              </div>
              <div>
                <div className="mb-4">
                  <h4 className="font-semibold text-emerald-700 text-sm mb-1.5">Strengths</h4>
                  <ul className="text-xs text-slate-600 space-y-1">
                    {(result.strengths || []).map((s, i) => <li key={i} className="flex gap-1.5"><span className="text-emerald-500">•</span>{s}</li>)}
                  </ul>
                </div>
                {result.red_flags?.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-red-600 text-sm mb-1.5">Red Flags</h4>
                    <ul className="text-xs text-slate-600 space-y-1">
                      {result.red_flags.map((s, i) => <li key={i} className="flex gap-1.5"><span className="text-red-500">⚠</span>{s}</li>)}
                    </ul>
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-blue-700 text-sm mb-1.5">Interview Questions</h4>
                  <ol className="text-xs text-slate-600 space-y-1.5">
                    {(result.interview_questions || []).slice(0, 3).map((q, i) => (
                      <li key={i} className="flex gap-1.5"><span className="font-bold text-blue-600">Q{i+1}.</span>{q}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => setExpanded(!expanded)}
              className="btn-secondary text-sm py-2 px-4"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expanded ? 'Less detail' : 'Full analysis'}
            </button>
            {result.invited ? (
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium text-sm">
                <CheckCircle className="w-4 h-4" /> Invitation sent
              </span>
            ) : (
              <button onClick={() => onInvite(result)} className="btn-primary text-sm py-2 px-4">
                <Send className="w-4 h-4" /> Send Invitation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HRResults() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const qc         = useQueryClient()
  const [inviting, setInviting] = useState(null)

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => { const r = await api.get(`/screening/sessions/${id}`); return r.data }
  })

  if (isLoading) return (
    <PortalLayout navItems={NAV} role="hr">
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    </PortalLayout>
  )

  const results = (session?.results || []).sort((a, b) => (a.rank || 99) - (b.rank || 99))

  return (
    <PortalLayout navItems={NAV} role="hr">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-slate-900">{session?.job_title}</h1>
            <p className="text-slate-500 mt-1">
              {results.length} candidates ranked by AI · {new Date(session?.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/hr/screening')} className="btn-secondary text-sm">
              + New Session
            </button>
          </div>
        </div>

        {/* Top 3 summary */}
        {results.length >= 1 && (
          <div className="grid grid-cols-3 gap-4 mt-6">
            {results.slice(0, 3).map((r, i) => (
              <div key={r.id} className={`card border-2 ${i === 0 ? 'border-yellow-300 bg-yellow-50' : i === 1 ? 'border-slate-300 bg-slate-50' : 'border-orange-300 bg-orange-50'}`}>
                <div className="text-2xl mb-2">{['🥇','🥈','🥉'][i]}</div>
                <div className="font-display font-bold text-slate-900">{r.candidate_name || r.filename}</div>
                <div className="text-2xl font-bold text-slate-700 mt-1">{r.overall_score}<span className="text-sm font-normal text-slate-400">/100</span></div>
                <span className={`mt-2 ${REC_BADGE[r.recommendation] || 'badge-gray'}`}>{r.recommendation}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All results */}
      <div className="space-y-4">
        {results.map(r => (
          <CandidateCard
            key={r.id}
            result={r}
            rank={r.rank}
            jobTitle={session?.job_title}
            onInvite={setInviting}
          />
        ))}
      </div>

      {inviting && (
        <InviteModal
          result={inviting}
          jobTitle={session?.job_title}
          onClose={() => setInviting(null)}
          onSent={() => qc.invalidateQueries(['session', id])}
        />
      )}
    </PortalLayout>
  )
}
