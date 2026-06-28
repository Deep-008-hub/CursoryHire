import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, Search, Briefcase, Send, User, Plus, X, Loader2, Users, Brain, Trophy, Clock, CheckSquare, Square } from 'lucide-react'
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

function JobForm({ onClose, onSaved }) {
  const [form, setForm] = useState({
    title:'', department:'', location:'', job_type:'Full-time',
    experience_min:0, experience_max:5, education_required:'',
    skills_required:[], description:'', salary_min:'', salary_max:'',
    application_deadline: ''
  })
  const [skillInp, setSkillInp] = useState('')
  const [loading,  setLoading]  = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const addSkill = () => {
    if (!skillInp.trim()) return
    set('skills_required', [...form.skills_required, skillInp.trim()])
    setSkillInp('')
  }

  const save = async () => {
    if (!form.title)       return toast.error('Job title required')
    if (!form.description) return toast.error('Job description required')
    try {
      setLoading(true)
      await api.post('/jobs/', {
        ...form,
        salary_min:           form.salary_min || undefined,
        salary_max:           form.salary_max || undefined,
        application_deadline: form.application_deadline || undefined,
      })
      toast.success('Job posted!')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to post job')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-blue-600 to-violet-600 p-6 rounded-t-3xl sticky top-0">
          <div className="flex items-center justify-between text-white">
            <h2 className="font-display text-xl font-bold">Post New Job</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <input className="input" placeholder="Job Title *" value={form.title} onChange={e => set('title', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Department" value={form.department} onChange={e => set('department', e.target.value)} />
            <input className="input" placeholder="Location" value={form.location} onChange={e => set('location', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <select className="input" value={form.job_type} onChange={e => set('job_type', e.target.value)}>
              <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option>
            </select>
            <input className="input" type="number" placeholder="Min exp (yrs)" value={form.experience_min} onChange={e => set('experience_min', +e.target.value)} />
            <input className="input" type="number" placeholder="Max exp (yrs)" value={form.experience_max} onChange={e => set('experience_max', +e.target.value)} />
          </div>

          {/* Application Deadline */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <Clock className="w-4 h-4 inline mr-1" />Application Deadline
            </label>
            <input
              className="input"
              type="datetime-local"
              value={form.application_deadline}
              onChange={e => set('application_deadline', e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1">Leave empty for no deadline</p>
          </div>

          <div>
            <div className="flex gap-2 mb-2">
              <input className="input" placeholder="Add required skill (Enter)" value={skillInp}
                onChange={e => setSkillInp(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())} />
              <button onClick={addSkill} className="btn-secondary px-4"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.skills_required.map(s => (
                <span key={s} className="badge-blue flex items-center gap-1">{s}
                  <button onClick={() => set('skills_required', form.skills_required.filter(x => x !== s))}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>
          <textarea className="input resize-none" rows={5}
            placeholder="Job description — include requirements, responsibilities, qualifications. Used by AI to rank candidates. *"
            value={form.description} onChange={e => set('description', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input" type="number" placeholder="Min salary (INR)" value={form.salary_min} onChange={e => set('salary_min', e.target.value)} />
            <input className="input" type="number" placeholder="Max salary (INR)" value={form.salary_max} onChange={e => set('salary_max', e.target.value)} />
          </div>
          <button onClick={save} disabled={loading} className="btn-primary w-full justify-center py-3">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
            Post Job
          </button>
        </div>
      </div>
    </div>
  )
}

function ApplicantsPanel({ job, onClose }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedIds,   setSelectedIds]   = useState([])
  const [screening,     setScreening]     = useState(false)
  const [loadingFinal,  setLoadingFinal]  = useState(false)
  const [filter,        setFilter]        = useState('all')
  const [viewingResume, setViewingResume] = useState(null)

  const { data: applicantsData, isLoading, refetch } = useQuery({
    queryKey: ['applicants', job.id],
    queryFn: async () => {
      const r = await api.get(`/jobs/${job.id}/applicants`)
      return r.data
    }
  })

  const { data: screeningStatus } = useQuery({
    queryKey: ['screening-status', job.id],
    queryFn: async () => {
      const r = await api.get(`/screening/job-screening-status/${job.id}`)
      return r.data
    },
    refetchInterval: 5000,
  })

  const applicants = applicantsData?.applicants || []

  const filtered = filter === 'all'        ? applicants
    : filter === 'unscreened'              ? applicants.filter(a => !a.screened)
    : applicants.filter(a => a.screened)

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    const unscreenedIds = filtered
      .filter(a => !a.screened && a.profile?.resume_text)
      .map(a => a.id)
    setSelectedIds(unscreenedIds)
  }

  const screenSelected = async () => {
    if (!selectedIds.length) return toast.error('Select at least one applicant')
    try {
      setScreening(true)
      toast.loading(`Screening ${selectedIds.length} resumes with AI...`, { id: 'screen' })
      const res = await api.post(`/screening/batch/${job.id}`, {
        application_ids: selectedIds
      })
      toast.dismiss('screen')
      toast.success(`Batch ${res.data.batch_number} complete! ${res.data.screened} resumes screened.`)
      setSelectedIds([])
      refetch()
      qc.invalidateQueries(['screening-status', job.id])
    } catch (e) {
      toast.dismiss('screen')
      toast.error(e.response?.data?.detail || 'Screening failed')
    } finally { setScreening(false) }
  }

  const showFinalRanking = async () => {
    try {
      setLoadingFinal(true)
      const res = await api.get(`/screening/final-ranking/${job.id}`)
      toast.success(`Final ranking ready! ${res.data.total_screened} candidates ranked.`)
      // Navigate to a results page showing all ranked candidates
      navigate(`/hr/final-ranking/${job.id}`)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to get final ranking')
    } finally { setLoadingFinal(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-violet-600 p-6 rounded-t-3xl flex-shrink-0">
          <div className="flex items-center justify-between text-white">
            <div>
              <h2 className="font-display text-xl font-bold">{job.title} — Applicants</h2>
              <p className="text-blue-100 text-sm mt-1">
                {applicantsData?.total || 0} total · {applicantsData?.screened || 0} screened · {applicantsData?.unscreened || 0} pending
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Screening progress */}
        {screeningStatus && (
          <div className="px-6 pt-4 flex-shrink-0">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">Screening Progress</span>
                <span className="text-sm text-slate-500">
                  {screeningStatus.screened_count}/{screeningStatus.total_applicants} screened · {screeningStatus.batches_completed} batch{screeningStatus.batches_completed !== 1 ? 'es' : ''} done
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all"
                  style={{ width: `${screeningStatus.total_applicants ? screeningStatus.screened_count / screeningStatus.total_applicants * 100 : 0}%` }}
                />
              </div>
              {screeningStatus.screened_count > 0 && (
                <button
                  onClick={showFinalRanking}
                  disabled={loadingFinal}
                  className="btn-primary text-sm py-2 px-4 w-full justify-center"
                >
                  {loadingFinal
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trophy className="w-4 h-4" />
                  }
                  {screeningStatus.all_screened
                    ? 'Show Final Rankings (All Screened)'
                    : `Show Rankings (${screeningStatus.screened_count} screened so far)`
                  }
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filter tabs + batch actions */}
        <div className="px-6 pt-4 flex-shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
              {[
                { key: 'all',        label: `All (${applicants.length})` },
                { key: 'unscreened', label: `Pending (${applicants.filter(a=>!a.screened).length})` },
                { key: 'screened',   label: `Screened (${applicants.filter(a=>a.screened).length})` },
              ].map(f => (
                <button key={f.key} onClick={() => { setFilter(f.key); setSelectedIds([]) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filter === f.key ? 'bg-white shadow text-slate-800' : 'text-slate-500'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={selectAll} className="btn-secondary text-xs py-1.5 px-3">
                <CheckSquare className="w-3.5 h-3.5" /> Select Unscreened
              </button>
              {selectedIds.length > 0 && (
                <button onClick={screenSelected} disabled={screening}
                  className="btn-primary text-xs py-1.5 px-3">
                  {screening
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Brain className="w-3.5 h-3.5" />
                  }
                  Screen {selectedIds.length} Selected
                </button>
              )}
            </div>
          </div>
          {selectedIds.length > 0 && (
            <div className="mt-2 text-xs text-blue-600 font-medium">
              {selectedIds.length} selected · Max 20 per batch
            </div>
          )}
        </div>

        {/* Applicants list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400">No applicants in this category</div>
          ) : filtered.map(app => {
            const isSelected = selectedIds.includes(app.id)
            const hasResume  = !!app.profile?.resume_text
            const isScreened = !!app.screened

            return (
              <div
                key={app.id}
                onClick={() => !isScreened && hasResume && toggleSelect(app.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                  isScreened    ? 'border-emerald-200 bg-emerald-50 cursor-default' :
                  !hasResume    ? 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-60' :
                  isSelected    ? 'border-blue-400 bg-blue-50 cursor-pointer' :
                  'border-slate-200 hover:border-blue-300 cursor-pointer'
                }`}
              >
                {/* Checkbox */}
                <div className="flex-shrink-0">
                  {isScreened ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  ) : hasResume ? (
                    isSelected
                      ? <CheckSquare className="w-5 h-5 text-blue-600" />
                      : <Square className="w-5 h-5 text-slate-400" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-300" />
                  )}
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-violet-100 rounded-full flex items-center justify-center font-bold text-blue-700 text-sm flex-shrink-0">
                  {app.users?.full_name?.[0] || '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm">{app.users?.full_name}</div>
                  <div className="text-xs text-slate-500">{app.users?.email || app.users?.phone}</div>
                </div>

                {/* Status badges */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {hasResume
                    ? <span className="badge-green text-xs">✓ Resume</span>
                    : <span className="badge-red text-xs">No Resume</span>
                  }
                  {isScreened && app.ai_score ? (
                    <span className="badge-purple text-xs font-bold">Score: {app.ai_score}</span>
                  ) : isScreened ? (
                    <span className="badge-green text-xs">Screened</span>
                  ) : (
                    <span className="badge-amber text-xs">Pending</span>
                  )}
                  {app.screening_batch > 0 && (
                    <span className="text-xs text-slate-400">Batch {app.screening_batch}</span>
                  )}
                  {/* View Resume buttons */}
                  {hasResume && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={e => { e.stopPropagation(); setViewingResume(app) }}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        View Text
                      </button>
                      {app.profile?.resume_url && (
                        <a
                          href={app.profile.resume_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-violet-600 hover:underline font-medium"
                        >
                          View PDF
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom action */}
        {selectedIds.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex-shrink-0">
            <button onClick={screenSelected} disabled={screening}
              className="btn-primary w-full justify-center py-3">
              {screening
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Screening with AI...</>
                : <><Brain className="w-4 h-4" /> Screen {selectedIds.length} Selected Resumes with AI</>
              }
            </button>
          </div>
        )}

        {/* Resume Viewer Modal */}
        {viewingResume && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
            onClick={() => setViewingResume(null)}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
              onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-5 rounded-t-3xl flex items-center justify-between text-white flex-shrink-0">
                <div>
                  <h3 className="font-display font-bold text-lg">{viewingResume.users?.full_name}</h3>
                  <p className="text-slate-300 text-sm mt-0.5">{viewingResume.users?.email || viewingResume.users?.phone}</p>
                </div>
                <button onClick={() => setViewingResume(null)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Resume content */}
              <div className="flex-1 overflow-y-auto p-6">
                {viewingResume.profile?.resume_text ? (
                  <pre className="whitespace-pre-wrap font-mono text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {viewingResume.profile.resume_text}
                  </pre>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <p>No resume text available</p>
                  </div>
                )}
              </div>
              {/* Footer */}
              <div className="p-4 border-t border-slate-100 flex-shrink-0 flex gap-3">
                <button
                  onClick={() => {
                    const text = viewingResume.profile?.resume_text || ''
                    const blob = new Blob([text], { type: 'text/plain' })
                    const a = document.createElement('a')
                    a.href = URL.createObjectURL(blob)
                    a.download = `${viewingResume.users?.full_name || 'resume'}.txt`
                    a.click()
                  }}
                  className="btn-secondary text-sm py-2 px-4"
                >
                  ⬇ Download as TXT
                </button>
                <button onClick={() => setViewingResume(null)} className="btn-secondary text-sm py-2 px-4">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function HRJobs() {
  const qc = useQueryClient()
  const [showForm,     setShowForm]     = useState(false)
  const [viewApplicants, setViewApplicants] = useState(null)

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => { const r = await api.get('/jobs/'); return r.data }
  })

  const closeJob = async (id) => {
    await api.delete(`/jobs/${id}`)
    qc.invalidateQueries(['jobs'])
    toast.success('Job closed')
  }

  const isDeadlinePassed = (deadline) => {
    if (!deadline) return false
    return new Date(deadline) < new Date()
  }

  const formatDeadline = (deadline) => {
    if (!deadline) return null
    const d = new Date(deadline)
    const now = new Date()
    const diff = d - now
    if (diff < 0) return { text: 'Deadline passed', color: 'text-red-600' }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return { text: 'Deadline today!', color: 'text-red-600' }
    if (days === 1) return { text: '1 day left', color: 'text-amber-600' }
    if (days <= 7)  return { text: `${days} days left`, color: 'text-amber-600' }
    return { text: `${days} days left`, color: 'text-emerald-600' }
  }

  return (
    <PortalLayout navItems={NAV} role="hr">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">Job Listings</h1>
          <p className="text-slate-500 mt-1">{jobs.length} job{jobs.length !== 1 ? 's' : ''} posted</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Post Job
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : jobs.length === 0 ? (
        <div className="card text-center py-16">
          <Briefcase className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">No jobs posted yet</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">Post your first job</button>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map(j => {
            const deadline = formatDeadline(j.application_deadline)
            return (
              <div key={j.id} className="card hover:shadow-card-hover transition-all">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-xl text-slate-900">{j.title}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {j.department && <span className="badge-gray">🏢 {j.department}</span>}
                      {j.location   && <span className="badge-gray">📍 {j.location}</span>}
                      <span className="badge-blue">{j.job_type}</span>
                      <span className="badge-gray">⏳ {j.experience_min}–{j.experience_max} yrs</span>
                      <span className={j.status === 'active' ? 'badge-green' : 'badge-red'}>{j.status}</span>
                    </div>

                    {/* Deadline */}
                    {j.application_deadline && (
                      <div className={`flex items-center gap-1.5 mt-2 text-sm font-medium ${deadline?.color}`}>
                        <Clock className="w-4 h-4" />
                        Deadline: {new Date(j.application_deadline).toLocaleDateString()} · {deadline?.text}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(j.skills_required || []).map(s => (
                        <span key={s} className="badge-purple text-xs">{s}</span>
                      ))}
                    </div>
                    {j.description && (
                      <p className="text-sm text-slate-500 mt-3 leading-relaxed line-clamp-2">{j.description}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => setViewApplicants(j)}
                      className="btn-primary text-sm py-2 px-4"
                    >
                      <Users className="w-4 h-4" /> View & Screen Applicants
                    </button>
                    {j.status === 'active' && (
                      <button onClick={() => closeJob(j.id)} className="btn-danger text-sm py-2 px-3">
                        Close Job
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && <JobForm onClose={() => setShowForm(false)} onSaved={() => qc.invalidateQueries(['jobs'])} />}
      {viewApplicants && <ApplicantsPanel job={viewApplicants} onClose={() => setViewApplicants(null)} />}
    </PortalLayout>
  )
}
