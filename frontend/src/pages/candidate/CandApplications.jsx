import { useQuery } from '@tanstack/react-query'
import { LayoutDashboard, Briefcase, Bell, User, FileText, MapPin, Loader2, Clock, CheckCircle, XCircle } from 'lucide-react'
import PortalLayout from '../../components/PortalLayout'
import { CAND_NAV } from './CandDashboard'
import api from '../../utils/api'

const STATUS_CONFIG = {
  applied:             { label: 'Applied',             badge: 'badge-blue',   step: 0 },
  screening:           { label: 'AI Screening',        badge: 'badge-purple', step: 1 },
  shortlisted:         { label: 'Shortlisted ⭐',      badge: 'badge-green',  step: 2 },
  interview_scheduled: { label: 'Interview Scheduled', badge: 'badge-amber',  step: 3 },
  offered:             { label: 'Offer Received 🎉',   badge: 'badge-green',  step: 5 },
  rejected:            { label: 'Not Selected',        badge: 'badge-red',    step: -1 },
  withdrawn:           { label: 'Withdrawn',           badge: 'badge-gray',   step: -1 },
}

const STEPS = ['Applied', 'Screening', 'Shortlisted', 'Interview', 'Offer']

export default function CandApplications() {
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['cand-applications'],
    queryFn: async () => { const r = await api.get('/jobs/candidate/applications'); return r.data }
  })

  return (
    <PortalLayout navItems={CAND_NAV} role="candidate">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-slate-900">My Applications</h1>
        <p className="text-slate-500 mt-1">Track every job you've applied for</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : applications.length === 0 ? (
        <div className="card text-center py-16">
          <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">No applications yet</p>
          <a href="/candidate/jobs" className="btn-primary inline-flex">Browse Jobs →</a>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map(app => {
            const job    = app.jobs || {}
            const config = STATUS_CONFIG[app.status] || STATUS_CONFIG.applied
            const step   = config.step
            const isOffered  = app.status === 'offered'
            const isRejected = app.status === 'rejected'

            return (
              <div key={app.id} className={`card hover:shadow-card-hover transition-all border-l-4 ${
                isOffered  ? 'border-l-emerald-500' :
                isRejected ? 'border-l-red-400' :
                'border-l-blue-400'
              }`}>
                <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
                  <div>
                    <h3 className="font-display font-bold text-xl text-slate-900">{job.title || 'Job Title'}</h3>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-slate-500">
                      {job.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>}
                      {job.job_type && <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{job.job_type}</span>}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Applied {new Date(app.applied_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <span className={config.badge}>{config.label}</span>
                </div>

                {/* Offered — full green celebration */}
                {isOffered && (
                  <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl mb-4">
                    <CheckCircle className="w-10 h-10 text-emerald-500 flex-shrink-0" />
                    <div>
                      <div className="font-display font-bold text-emerald-800 text-lg">🎉 Congratulations!</div>
                      <div className="text-emerald-600 text-sm mt-0.5">
                        You have been selected for <strong>{job.title}</strong>. HR will be in touch shortly.
                      </div>
                    </div>
                  </div>
                )}

                {/* Rejected — red message */}
                {isRejected && (
                  <div className="flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-2xl mb-4">
                    <XCircle className="w-10 h-10 text-red-400 flex-shrink-0" />
                    <div>
                      <div className="font-display font-bold text-red-700 text-lg">Application Unsuccessful</div>
                      <div className="text-red-500 text-sm mt-0.5">
                        Thank you for applying for <strong>{job.title}</strong>. The position has been filled. Keep applying!
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress timeline — only for active applications */}
                {!isRejected && step >= 0 && step < 5 && (
                  <div className="flex items-center mb-5">
                    {STEPS.map((s, i) => {
                      const done   = i < step
                      const active = i === step
                      const last   = i === STEPS.length - 1
                      return (
                        <div key={s} className="flex items-center flex-1 last:flex-none">
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                              done   ? 'bg-emerald-500 border-emerald-500 text-white' :
                              active ? 'bg-white border-emerald-500 text-emerald-600' :
                                       'bg-white border-slate-200 text-slate-400'
                            }`}>
                              {done ? '✓' : i + 1}
                            </div>
                            <div className={`text-xs mt-1 font-medium whitespace-nowrap ${
                              done || active ? 'text-slate-700' : 'text-slate-400'
                            }`}>{s}</div>
                          </div>
                          {!last && (
                            <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full transition-all ${
                              done ? 'bg-emerald-500' : 'bg-slate-100'
                            }`} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Full green timeline for offered */}
                {isOffered && (
                  <div className="flex items-center mb-5">
                    {STEPS.map((s, i) => {
                      const last = i === STEPS.length - 1
                      return (
                        <div key={s} className="flex items-center flex-1 last:flex-none">
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 bg-emerald-500 border-emerald-500 text-white">
                              ✓
                            </div>
                            <div className="text-xs mt-1 font-medium whitespace-nowrap text-slate-700">{s}</div>
                          </div>
                          {!last && <div className="flex-1 h-0.5 mx-1 mb-4 rounded-full bg-emerald-500" />}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* AI score if available */}
                {app.ai_score && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <div className="text-2xl font-display font-bold text-blue-600">{app.ai_score}</div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">AI Screening Score</div>
                      <div className="text-xs text-slate-500">Rank #{app.ai_rank || '—'} among applicants</div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </PortalLayout>
  )
}
