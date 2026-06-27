// CandJobs.jsx
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Briefcase, Search, Loader2, MapPin, Clock, GraduationCap, Send } from 'lucide-react'
import PortalLayout from '../../components/PortalLayout'
import { CAND_NAV } from './CandDashboard'
import api from '../../utils/api'
import toast from 'react-hot-toast'

export default function CandJobs() {
  const qc = useQueryClient()
  const [query, setQuery] = useState('')
  const [applying, setApplying] = useState(null)

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['public-jobs'],
    queryFn: async () => { const r = await api.get('/jobs/'); return r.data }
  })

  const { data: myApps = [] } = useQuery({
    queryKey: ['cand-applications'],
    queryFn: async () => { const r = await api.get('/jobs/candidate/applications'); return r.data }
  })

  const appliedJobIds = new Set(myApps.map(a => a.job_id))

  const filtered = jobs.filter(j =>
    !query || j.title.toLowerCase().includes(query.toLowerCase()) ||
    (j.skills_required || []).some(s => s.toLowerCase().includes(query.toLowerCase())) ||
    (j.location || '').toLowerCase().includes(query.toLowerCase())
  )

  const apply = async (jobId, jobTitle) => {
    try {
      setApplying(jobId)
      await api.post(`/jobs/${jobId}/apply`)
      toast.success(`Applied to ${jobTitle}!`)
      qc.invalidateQueries(['cand-applications'])
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to apply')
    } finally { setApplying(null) }
  }

  return (
    <PortalLayout navItems={CAND_NAV} role="candidate">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-slate-900">Browse Jobs</h1>
        <p className="text-slate-500 mt-1">{jobs.length} open position{jobs.length !== 1 ? 's' : ''}</p>
        <div className="mt-4 relative">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
          <input className="input pl-11" placeholder="Search jobs, skills, location..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Briefcase className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500">No jobs found. Try different keywords.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(j => {
            const applied = appliedJobIds.has(j.id)
            return (
              <div key={j.id} className="card hover:shadow-card-hover transition-all">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-xl text-slate-900">{j.title}</h3>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
                      {j.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{j.location}</span>}
                      <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{j.experience_min}–{j.experience_max} yrs</span>
                      {j.education_required && <span className="flex items-center gap-1.5"><GraduationCap className="w-4 h-4" />{j.education_required}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <span className="badge-blue">{j.job_type}</span>
                      {(j.skills_required || []).slice(0, 5).map(s => <span key={s} className="badge-purple text-xs">{s}</span>)}
                    </div>
                    {j.description && <p className="text-sm text-slate-500 mt-3 line-clamp-2 leading-relaxed">{j.description}</p>}
                    {j.salary_min && <p className="text-sm font-semibold text-emerald-600 mt-2">₹{j.salary_min.toLocaleString()} – ₹{j.salary_max?.toLocaleString()} / year</p>}
                  </div>
                  <div className="flex-shrink-0">
                    {applied ? (
                      <span className="badge-green">✓ Applied</span>
                    ) : (
                      <button onClick={() => apply(j.id, j.title)} disabled={applying === j.id} className="btn-primary text-sm py-2.5 px-5">
                        {applying === j.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </PortalLayout>
  )
}
