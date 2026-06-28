import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Briefcase, Search, Loader2, MapPin, Clock, GraduationCap, Send, X, Building, DollarSign, Calendar, CheckCircle } from 'lucide-react'
import PortalLayout from '../../components/PortalLayout'
import { CAND_NAV } from './CandDashboard'
import api from '../../utils/api'
import toast from 'react-hot-toast'

function JobDetailModal({ job, onClose, onApply, applied, applying }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 rounded-t-3xl flex-shrink-0">
          <div className="flex items-start justify-between gap-4 text-white">
            <div>
              <h2 className="font-display text-2xl font-bold">{job.title}</h2>
              <div className="flex flex-wrap gap-3 mt-2 text-emerald-100 text-sm">
                {job.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />{job.location}
                  </span>
                )}
                {job.department && (
                  <span className="flex items-center gap-1.5">
                    <Building className="w-4 h-4" />{job.department}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />{job.experience_min}–{job.experience_max} yrs
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Key info badges */}
          <div className="flex flex-wrap gap-2">
            <span className="badge-blue">{job.job_type}</span>
            {job.education_required && (
              <span className="badge-gray flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />{job.education_required}
              </span>
            )}
            {job.salary_min && (
              <span className="badge-green flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                ₹{job.salary_min.toLocaleString()} – ₹{job.salary_max?.toLocaleString()} / year
              </span>
            )}
            {job.application_deadline && (
              <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                new Date(job.application_deadline) < new Date()
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                <Calendar className="w-3.5 h-3.5" />
                Deadline: {new Date(job.application_deadline).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Description */}
          {job.description && (
            <div>
              <h3 className="font-display font-bold text-slate-900 mb-2">Job Description</h3>
              <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-line">{job.description}</p>
            </div>
          )}

          {/* Responsibilities */}
          {job.responsibilities && (
            <div>
              <h3 className="font-display font-bold text-slate-900 mb-2">Responsibilities</h3>
              <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-line">{job.responsibilities}</p>
            </div>
          )}

          {/* Required Skills */}
          {job.skills_required?.length > 0 && (
            <div>
              <h3 className="font-display font-bold text-slate-900 mb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.skills_required.map(s => (
                  <span key={s} className="badge-purple">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Benefits */}
          {job.benefits && (
            <div>
              <h3 className="font-display font-bold text-slate-900 mb-2">Benefits</h3>
              <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-line">{job.benefits}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex-shrink-0">
          {applied ? (
            <div className="flex items-center justify-center gap-2 py-3 text-emerald-600 font-semibold">
              <CheckCircle className="w-5 h-5" />
              You have already applied for this job
            </div>
          ) : (
            <button
              onClick={() => onApply(job.id, job.title)}
              disabled={applying === job.id}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {applying === job.id
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <Send className="w-5 h-5" />
              }
              Apply Now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CandJobs() {
  const qc = useQueryClient()
  const [query,      setQuery]      = useState('')
  const [applying,   setApplying]   = useState(null)
  const [selectedJob, setSelectedJob] = useState(null)

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
    !query ||
    j.title.toLowerCase().includes(query.toLowerCase()) ||
    (j.skills_required || []).some(s => s.toLowerCase().includes(query.toLowerCase())) ||
    (j.location || '').toLowerCase().includes(query.toLowerCase())
  )

  const apply = async (jobId, jobTitle) => {
    try {
      setApplying(jobId)
      await api.post(`/jobs/${jobId}/apply`)
      toast.success(`Successfully applied to ${jobTitle}!`)
      qc.invalidateQueries(['cand-applications'])
      setSelectedJob(null)
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
          <input className="input pl-11" placeholder="Search jobs, skills, location..."
            value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Briefcase className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500">No jobs found. Try different keywords.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(j => {
            const applied = appliedJobIds.has(j.id)
            const deadlinePassed = j.application_deadline && new Date(j.application_deadline) < new Date()

            return (
              <div
                key={j.id}
                className="card hover:shadow-card-hover transition-all cursor-pointer"
                onClick={() => setSelectedJob(j)}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-xl text-slate-900 hover:text-emerald-600 transition-colors">
                      {j.title}
                    </h3>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
                      {j.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />{j.location}
                        </span>
                      )}
                      {j.department && (
                        <span className="flex items-center gap-1.5">
                          <Building className="w-4 h-4" />{j.department}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />{j.experience_min}–{j.experience_max} yrs exp
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <span className="badge-blue">{j.job_type}</span>
                      {(j.skills_required || []).slice(0, 4).map(s => (
                        <span key={s} className="badge-purple text-xs">{s}</span>
                      ))}
                      {(j.skills_required || []).length > 4 && (
                        <span className="badge-gray text-xs">+{j.skills_required.length - 4} more</span>
                      )}
                    </div>
                    {j.description && (
                      <p className="text-sm text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                        {j.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2">
                      {j.salary_min && (
                        <p className="text-sm font-semibold text-emerald-600">
                          ₹{j.salary_min.toLocaleString()} – ₹{j.salary_max?.toLocaleString()} / year
                        </p>
                      )}
                      {j.application_deadline && (
                        <p className={`text-xs font-medium flex items-center gap-1 ${deadlinePassed ? 'text-red-500' : 'text-amber-600'}`}>
                          <Calendar className="w-3.5 h-3.5" />
                          {deadlinePassed ? 'Deadline passed' : `Deadline: ${new Date(j.application_deadline).toLocaleDateString()}`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    {applied ? (
                      <span className="badge-green flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" /> Applied
                      </span>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedJob(j) }}
                        className="btn-primary text-sm py-2.5 px-5"
                        style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}
                      >
                        <Send className="w-4 h-4" /> View & Apply
                      </button>
                    )}
                    <p className="text-xs text-slate-400">Click to view details</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onApply={apply}
          applied={appliedJobIds.has(selectedJob.id)}
          applying={applying}
        />
      )}
    </PortalLayout>
  )
}
