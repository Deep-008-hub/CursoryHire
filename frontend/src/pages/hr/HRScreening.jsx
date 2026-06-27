import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, Search, Briefcase, Send, User, Upload, X, FileText, Loader2, ChevronDown } from 'lucide-react'
import PortalLayout from '../../components/PortalLayout'
import toast from 'react-hot-toast'
import api from '../../utils/api'

const NAV = [
  { path: '/hr/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { path: '/hr/screening',   label: 'AI Screening', icon: Search },
  { path: '/hr/jobs',        label: 'Job Listings', icon: Briefcase },
  { path: '/hr/invitations', label: 'Invitations',  icon: Send },
  { path: '/hr/profile',     label: 'Profile',      icon: User },
]

export default function HRScreening() {
  const navigate = useNavigate()
  const fileRef  = useRef()

  const [jobTitle, setJobTitle]   = useState('')
  const [jobDesc,  setJobDesc]    = useState('')
  const [files,    setFiles]      = useState([])
  const [loading,  setLoading]    = useState(false)
  const [progress, setProgress]   = useState('')
  const [dragging, setDragging]   = useState(false)

  const addFiles = (newFiles) => {
    const valid = Array.from(newFiles).filter(f =>
      ['.pdf', '.docx', '.doc', '.txt'].some(ext => f.name.toLowerCase().endsWith(ext))
    )
    if (files.length + valid.length > 20)
      return toast.error('Maximum 20 resumes per session')
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...valid.filter(f => !names.has(f.name))]
    })
  }

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx))

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const handleSubmit = async () => {
    if (!jobTitle.trim()) return toast.error('Enter job title')
    if (!jobDesc.trim())  return toast.error('Enter job description')
    if (files.length === 0) return toast.error('Upload at least one resume')

    try {
      setLoading(true)
      setProgress(`Uploading ${files.length} resume${files.length > 1 ? 's' : ''}...`)

      const fd = new FormData()
      fd.append('job_title', jobTitle.trim())
      fd.append('job_description', jobDesc.trim())
      files.forEach(f => fd.append('resumes', f))

      setProgress('Gemini AI is reading and scoring resumes...')
      const res = await api.post('/screening/batch', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      })

      toast.success(`Screened ${res.data.total} resumes! Ranked by AI score.`)
      navigate(`/hr/results/${res.data.session_id}`)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Screening failed. Check your Gemini API key.')
      console.error(e)
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  const formatSize = (bytes) => bytes < 1024*1024 ? `${(bytes/1024).toFixed(0)} KB` : `${(bytes/1024/1024).toFixed(1)} MB`

  return (
    <PortalLayout navItems={NAV} role="hr">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-slate-900 mb-1">AI Resume Screening</h1>
          <p className="text-slate-500">Upload up to 20 resumes — Gemini AI screens and ranks them by suitability</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: Job Details */}
          <div className="lg:col-span-2 space-y-5">
            <div className="card">
              <h2 className="font-display font-bold text-slate-900 mb-4">Job Details</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Job Title *</label>
                <input className="input" placeholder="e.g. Senior React Developer" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Job Description *</label>
                <textarea
                  className="input resize-none"
                  rows={10}
                  placeholder="Paste the full job description here — required skills, experience, responsibilities, qualifications..."
                  value={jobDesc}
                  onChange={e => setJobDesc(e.target.value)}
                />
              </div>
            </div>

            <div className="card bg-gradient-to-br from-blue-50 to-violet-50 border-blue-100">
              <h3 className="font-semibold text-slate-800 mb-2 text-sm">💡 Tips for better results</h3>
              <ul className="text-xs text-slate-600 space-y-1.5">
                <li>• Include specific skills and tech stack</li>
                <li>• Mention minimum years of experience</li>
                <li>• Add education requirements</li>
                <li>• List key responsibilities clearly</li>
              </ul>
            </div>
          </div>

          {/* Right: Resume Upload */}
          <div className="lg:col-span-3 space-y-5">
            <div className="card">
              <h2 className="font-display font-bold text-slate-900 mb-4">Upload Resumes</h2>

              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className={`w-10 h-10 mx-auto mb-3 ${dragging ? 'text-blue-500' : 'text-slate-300'}`} />
                <p className="font-semibold text-slate-700 mb-1">Drop resumes here or click to browse</p>
                <p className="text-sm text-slate-400">PDF, DOCX, DOC, TXT · Max 20 files</p>
                <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.doc,.txt" className="hidden"
                  onChange={e => addFiles(e.target.files)} />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-700 mb-2">
                    <span>{files.length} file{files.length > 1 ? 's' : ''} selected</span>
                    <button onClick={() => setFiles([])} className="text-red-500 hover:text-red-700 text-xs">Clear all</button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{f.name}</div>
                          <div className="text-xs text-slate-400">{formatSize(f.size)}</div>
                        </div>
                        <button onClick={() => removeFile(i)} className="p-1 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading || !jobTitle || !jobDesc || files.length === 0}
              className="btn-primary w-full justify-center py-4 text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {progress || 'Processing...'}
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Screen {files.length > 0 ? files.length : ''} Resume{files.length !== 1 ? 's' : ''} with AI
                </>
              )}
            </button>

            {loading && (
              <div className="card bg-amber-50 border-amber-200">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-amber-600 animate-spin flex-shrink-0" />
                  <div>
                    <div className="font-medium text-amber-800 text-sm">{progress}</div>
                    <div className="text-xs text-amber-600 mt-0.5">This may take 30-60 seconds depending on file count</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
