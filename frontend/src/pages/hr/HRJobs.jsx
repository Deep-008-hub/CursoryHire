import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, Search, Briefcase, Send, User, Plus, X, Loader2, Users, Brain } from 'lucide-react'
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
    skills_required:[], description:'', salary_min:'', salary_max:''
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
    if (!form.title) return toast.error('Job title required')
    if (!form.description) return toast.error('Job description required')
    try {
      setLoading(true)
      await api.post('/jobs/', {
        ...form,
        salary_min: form.salary_min || undefined,
        salary_max: form.salary_max || undefined
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
            placeholder="Job description — be specific about requirements, responsibilities, and qualifications. This is used by AI to rank candidates. *"
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

export default function HRJobs() {
  const qc       = useQueryClient()
  const navigate = useNavigate()
  const [showForm,    setShowForm]    = useState(false)
  const [screening,   setScreening]   = useState(null)
  const [expandedJob, setExpandedJob] = useState(null)

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => { const r = await api.get('/jobs/'); return r.data }
  })

  const { data: applicantsData } = useQuery({
    queryKey: ['applicants', expandedJob],
    queryFn: async () => {
      if (!expandedJob) return null
      const r = await api.get(`/jobs/${expandedJob}/applicants`)
      return r.data
    },
    enabled: !!expandedJob,
  })

  const closeJob = async (id) => {
    await api.delete(`/jobs/${id}`)
    qc.invalidateQueries(['jobs'])
    toast.success('Job closed')
  }

  const screenApplicants = async (jobId) => {
    try {
      setScreening(jobId)
      toast.loading('AI is screening all applicants...', { id: 'screen' })
      const res = await api.post(`/screening/screen-applicants/${jobId}`)
      toast.dismiss('screen')
      toast.success(`Screened ${res.data.total} applicants!`)
      navigate(`/hr/results/${res.data.session_id}`)
    } catch (e) {
      toast.dismiss('screen')
      toast.error(e.response?.data?.detail || 'Screening failed')
    } finally {
      setScreening(null)
    }
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
          {jobs.map(j => (
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
                  {/* View applicants button */}
                  <button
                    onClick={() => setExpandedJob(expandedJob === j.id ? null : j.id)}
                    className="btn-secondary text-sm py-2 px-4"
                  >
                    <Users className="w-4 h-4" />
                    {expandedJob === j.id ? 'Hide' : 'View'} Applicants
                  </button>

                  {/* Screen with AI button */}
                  {j.status === 'active' && (
                    <button
                      onClick={() => screenApplicants(j.id)}
                      disabled={screening === j.id}
                      className="btn-primary text-sm py-2 px-4"
                    >
                      {screening === j.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Brain className="w-4 h-4" />
                      }
                      {screening === j.id ? 'Screening...' : 'Screen with AI'}
                    </button>
                  )}

                  {j.status === 'active' && (
                    <button onClick={() => closeJob(j.id)} className="btn-danger text-sm py-2 px-3">
                      Close Job
                    </button>
                  )}
                </div>
              </div>

              {/* Applicants panel */}
              {expandedJob === j.id && (
                <div className="mt-5 pt-5 border-t border-slate-100">
                  {!applicantsData ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                  ) : applicantsData.applicants.length === 0 ? (
                    <div className="text-center py-6">
                      <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">No applicants yet</p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-slate-800">
                          {applicantsData.total} Applicant{applicantsData.total !== 1 ? 's' : ''}
                        </h4>
                        <button
                          onClick={() => screenApplicants(j.id)}
                          disabled={screening === j.id}
                          className="btn-primary text-sm py-1.5 px-4"
                        >
                          {screening === j.id
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Screening...</>
                            : <><Brain className="w-3.5 h-3.5" /> Screen All with AI</>
                          }
                        </button>
                      </div>
                      <div className="space-y-2">
                        {applicantsData.applicants.map(app => (
                          <div key={app.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-violet-100 rounded-full flex items-center justify-center font-bold text-blue-700 text-sm flex-shrink-0">
                              {app.users?.full_name?.[0] || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-900 text-sm">{app.users?.full_name}</div>
                              <div className="text-xs text-slate-500">{app.users?.email || app.users?.phone}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {app.profile?.resume_text
                                ? <span className="badge-green text-xs">✓ Resume</span>
                                : <span className="badge-red text-xs">No resume</span>
                              }
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                app.status === 'applied' ? 'bg-blue-100 text-blue-700' :
                                app.status === 'screening' ? 'bg-violet-100 text-violet-700' :
                                'bg-emerald-100 text-emerald-700'
                              }`}>{app.status}</span>
                              {app.ai_score && (
                                <span className="font-bold text-slate-700 text-sm">
                                  Score: {app.ai_score}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && <JobForm onClose={() => setShowForm(false)} onSaved={() => qc.invalidateQueries(['jobs'])} />}
    </PortalLayout>
  )
}
