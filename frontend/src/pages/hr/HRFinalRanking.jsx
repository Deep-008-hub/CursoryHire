import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LayoutDashboard, Search, Briefcase, Send, User, Trophy, ChevronDown, ChevronUp, Mail, Loader2, X } from 'lucide-react'
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

const REC_BADGE = {
  'Strongly Recommended': 'badge-green',
  'Recommended':          'badge-blue',
  'Consider':             'badge-amber',
  'Not Suitable':         'badge-red',
}

function InviteModal({ result, jobTitle, onClose, onSent }) {
  const [email,   setEmail]   = useState(result.candidate_email || '')
  const [name,    setName]    = useState(result.candidate_name || '')
  const [date,    setDate]    = useState('')
  const [type,    setType]    = useState('video')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const send = async () => {
    if (!email) return toast.error('Enter candidate email')
    try {
      setLoading(true)
      await api.post('/invitations/send', {
        screening_result_id: result.id,
        candidate_email:     email,
        candidate_name:      name,
        job_title:           jobTitle,
        job_id:              jobId,   // add this
        message,
        interview_date:      date || undefined,
        interview_type:      type,
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
        <div className="bg-gradient-to-r from-blue-600 to-violet-600 p-6 rounded-t-3xl text-white flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">Send Invitation</h2>
            <p className="text-blue-100 text-sm mt-1">{jobTitle}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl"><X className="w-5 h-5" /></button>
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
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
              <select className="input" value={type} onChange={e => setType(e.target.value)}>
                <option value="video">Video Call</option>
                <option value="in_person">In Person</option>
                <option value="phone">Phone</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
            <textarea className="input resize-none" rows={3}
              placeholder="Hi, we'd love to invite you for an interview..."
              value={message} onChange={e => setMessage(e.target.value)} />
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

function CandidateCard({ result, jobTitle, rank, onInvite, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const scoreColor = result.overall_score >= 80 ? 'text-emerald-600' :
                     result.overall_score >= 60 ? 'text-amber-600' : 'text-red-500'
  const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null

  return (
    <div className={`card border-2 transition-all ${rank <= 3 ? 'border-blue-100' : 'border-slate-100'}`}>
      <div className="flex items-start gap-4">
        {/* Rank */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm flex-shrink-0 ${
          rank === 1 ? 'bg-yellow-400 text-white' :
          rank === 2 ? 'bg-slate-300 text-white' :
          rank === 3 ? 'bg-orange-400 text-white' :
          'bg-slate-100 text-slate-600'
        }`}>
          {rankEmoji || rank}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900">{result.candidate_name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={REC_BADGE[result.recommendation] || 'badge-gray'}>
                  {result.recommendation}
                </span>
                {result.grade && (
                  <span className="badge-purple text-xs">{result.grade}</span>
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
              className={`h-full rounded-full bg-gradient-to-r ${
                result.overall_score >= 80 ? 'from-emerald-400 to-emerald-600' :
                result.overall_score >= 60 ? 'from-amber-400 to-amber-600' :
                'from-red-400 to-red-600'
              }`}
              style={{ width: `${result.overall_score}%` }}
            />
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(result.matched_skills || []).slice(0, 5).map(s => (
              <span key={s} className="badge-green text-xs">✓ {s}</span>
            ))}
            {(result.missing_skills || []).slice(0, 3).map(s => (
              <span key={s} className="badge-red text-xs">✗ {s}</span>
            ))}
          </div>

          <p className="text-sm text-slate-600 mt-3 leading-relaxed">{result.executive_summary}</p>

          {/* Expanded */}
          {expanded && (
            <div className="mt-4 pt-4 border-t border-slate-100 grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-slate-800 text-sm mb-2">Dimension Scores</h4>
                {Object.entries(result.scores || {}).map(([k, v]) => (
                  <div key={k} className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{k.replace(/_/g, ' ')}</span>
                      <span className="font-semibold">{v}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${v}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div>
                {result.strengths?.length > 0 && (
                  <div className="mb-3">
                    <h4 className="font-semibold text-emerald-700 text-sm mb-1">Strengths</h4>
                    <ul className="text-xs text-slate-600 space-y-1">
                      {result.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                  </div>
                )}
                {result.red_flags?.length > 0 && (
                  <div className="mb-3">
                    <h4 className="font-semibold text-red-600 text-sm mb-1">Red Flags</h4>
                    <ul className="text-xs text-slate-600 space-y-1">
                      {result.red_flags.map((s, i) => <li key={i}>⚠ {s}</li>)}
                    </ul>
                  </div>
                )}
                {result.interview_questions?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-blue-700 text-sm mb-1">Interview Questions</h4>
                    <ol className="text-xs text-slate-600 space-y-1.5">
                      {result.interview_questions.slice(0, 3).map((q, i) => (
                        <li key={i}><span className="font-bold text-blue-600">Q{i+1}.</span> {q}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <button onClick={() => setExpanded(!expanded)} className="btn-secondary text-sm py-2 px-4">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expanded ? 'Less' : 'Full Analysis'}
            </button>
            {result.invited ? (
              <span className="text-emerald-600 font-medium text-sm flex items-center gap-1.5">
                ✓ Invitation sent
              </span>
            ) : (
              <button onClick={() => onInvite(result)} className="btn-primary text-sm py-2 px-4">
                <Mail className="w-4 h-4" /> Send Invitation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HRFinalRanking() {
  const { jobId }  = useParams()
  const navigate   = useNavigate()
  const qc         = useQueryClient()
  const [inviting, setInviting] = useState(null)

  const { data: rankingData, isLoading, refetch } = useQuery({
    queryKey: ['final-ranking', jobId],
    queryFn: async () => {
      const r = await api.get(`/screening/final-ranking/${jobId}`)
      return r.data
    }
  })

  if (isLoading) return (
    <PortalLayout navItems={NAV} role="hr">
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    </PortalLayout>
  )

  const results = rankingData?.results || []

  return (
    <PortalLayout navItems={NAV} role="hr">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => navigate('/hr/jobs')} className="text-sm text-blue-600 hover:underline mb-3 flex items-center gap-1">
          ← Back to Jobs
        </button>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Final Rankings
            </h1>
            <p className="text-slate-500 mt-1">
              {rankingData?.job_title} · {results.length} candidates · {rankingData?.total_batches} batch{rankingData?.total_batches !== 1 ? 'es' : ''} screened
            </p>
          </div>
          <button onClick={() => navigate('/hr/jobs')} className="btn-secondary text-sm">
            + Screen More
          </button>
        </div>

        {/* Top 3 summary */}
        {results.length >= 1 && (
          <div className="grid grid-cols-3 gap-4 mt-6">
            {results.slice(0, 3).map((r, i) => (
              <div key={r.id} className={`card border-2 ${
                i === 0 ? 'border-yellow-300 bg-yellow-50' :
                i === 1 ? 'border-slate-300 bg-slate-50' :
                'border-orange-300 bg-orange-50'
              }`}>
                <div className="text-2xl mb-2">{['🥇','🥈','🥉'][i]}</div>
                <div className="font-display font-bold text-slate-900">{r.candidate_name}</div>
                <div className="text-2xl font-bold text-slate-700 mt-1">
                  {r.overall_score}<span className="text-sm font-normal text-slate-400">/100</span>
                </div>
                <span className={`mt-2 ${REC_BADGE[r.recommendation] || 'badge-gray'}`}>
                  {r.recommendation}
                </span>
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
            jobTitle={rankingData?.job_title}
            onInvite={setInviting}
            onRefresh={refetch}
          />
        ))}
      </div>

      {inviting && (
        <InviteModal
          result={inviting}
          jobTitle={rankingData?.job_title}
          onClose={() => setInviting(null)}
          onSent={() => { refetch(); qc.invalidateQueries(['final-ranking', jobId]) }}
        />
      )}
    </PortalLayout>
  )
}
