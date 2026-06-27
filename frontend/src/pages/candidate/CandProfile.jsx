import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LayoutDashboard, Briefcase, Bell, User, FileText, Save, Plus, X, Loader2, Upload, CheckCircle, Camera } from 'lucide-react'
import PortalLayout from '../../components/PortalLayout'
import { CAND_NAV } from './CandDashboard'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'

export default function CandProfile() {
 const { user } = useAuthStore()
  const qc = useQueryClient()
  const fileRef = useRef()
  const avatarRef = useRef()
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarUrl,     setAvatarUrl]     = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [resumeLoading,setResumeLoading]= useState(false)
  const [skillInp,     setSkillInp]     = useState('')
  const [resumeText,   setResumeText]   = useState('')
  const [resumeFile,   setResumeFile]   = useState(null)
  const [form, setForm] = useState({
    headline: '', summary: '', skills: [],
    experience_years: 0, current_company: '', current_position: '',
    location: '', linkedin: '', github: '', portfolio: '',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => { const r = await api.get('/users/me'); return r.data }
  })

  useEffect(() => {
    if (meData?.profile) {
      const p = meData.profile
      setForm(prev => ({
        ...prev,
        headline:         p.headline || '',
        summary:          p.summary || '',
        skills:           p.skills || [],
        experience_years: p.experience_years || 0,
        current_company:  p.current_company || '',
        current_position: p.current_position || '',
        location:         p.location || '',
        linkedin:         p.linkedin || '',
        github:           p.github || '',
        portfolio:        p.portfolio || '',
      }))
      setResumeText(p.resume_text || '')
    }
  }, [meData])
  useEffect(() => {
    if (meData?.user?.avatar_url) setAvatarUrl(meData.user.avatar_url)
  }, [meData])

  const handleAvatarChange = async (file) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return toast.error('Image must be under 2MB')
    try {
      setAvatarLoading(true)
      const fd = new FormData()
      fd.append('avatar', file)
      const res = await api.post('/users/upload-avatar', fd)
      setAvatarUrl(res.data.avatar_url)
      toast.success('Profile picture updated!')
      qc.invalidateQueries(['me'])
    } catch (e) {
      toast.error('Failed to upload image')
    } finally { setAvatarLoading(false) }
  }

  const addSkill = () => {
    const v = skillInp.trim()
    if (!v || form.skills.includes(v)) return
    set('skills', [...form.skills, v])
    setSkillInp('')
  }

  const removeSkill = (s) => set('skills', form.skills.filter(x => x !== s))

  // Handle resume file upload
  const handleResumeFile = async (file) => {
    if (!file) return
    setResumeFile(file)
    setResumeLoading(true)

    try {
      // Extract text from PDF using pdfjs or just read as text
      if (file.name.endsWith('.txt')) {
        const text = await file.text()
        setResumeText(text)
        toast.success('Resume text loaded!')
      } else if (file.name.endsWith('.pdf')) {
        // Send to backend to extract text
        const fd = new FormData()
        fd.append('resume', file)
        const res = await api.post('/users/extract-resume', fd)
        if (res.data.text) {
          setResumeText(res.data.text)
          toast.success('Resume text extracted!')
        }
      } else {
        toast.error('Please upload a PDF or TXT file')
      }
    } catch (e) {
      toast.error('Could not extract text. Please paste it manually below.')
    } finally {
      setResumeLoading(false)
    }
  }

  const saveProfile = async () => {
    try {
      setLoading(true)
      await api.patch('/users/candidate/profile', {
        ...form,
        resume_text: resumeText,
      })
      toast.success('Profile saved!')
      qc.invalidateQueries(['me'])
    } catch (e) {
      toast.error('Save failed')
    } finally { setLoading(false) }
  }

  const hasResume = resumeText.trim().length > 30
  const completeness = [
    !!user?.full_name, !!form.headline, !!form.summary,
    form.skills.length > 0, form.experience_years > 0, hasResume
  ].filter(Boolean).length

  return (
    <PortalLayout navItems={CAND_NAV} role="candidate">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-slate-900">My Profile</h1>
            <p className="text-slate-500 mt-1">Keep your profile complete to apply for jobs</p>
          </div>
          <button onClick={saveProfile} disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All Changes
          </button>
        </div>

        {/* Completeness bar */}
        {/* Avatar */}
        <div className="card mb-6 flex items-center gap-5">
          <div className="relative flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile"
                className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-200" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-display font-bold text-3xl">
                {user?.full_name?.[0]?.toUpperCase() || 'C'}
              </div>
            )}
            <button
              onClick={() => avatarRef.current?.click()}
              disabled={avatarLoading}
              className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-emerald-700 transition-colors"
            >
              {avatarLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Camera className="w-4 h-4" />
              }
            </button>
            <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp"
              className="hidden" onChange={e => handleAvatarChange(e.target.files[0])} />
          </div>
          <div>
            <div className="font-display font-bold text-xl text-slate-900">{user?.full_name}</div>
            <div className="text-slate-500 text-sm">{form.headline || 'Add your headline'}</div>
            <button onClick={() => avatarRef.current?.click()}
              className="text-xs text-emerald-600 hover:underline mt-1">
              Change profile picture
            </button>
          </div>
        </div>
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-800 text-sm">Profile completeness</span>
            <span className="text-sm font-bold text-blue-600">{Math.round(completeness/6*100)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all"
              style={{ width: `${completeness/6*100}%` }} />
          </div>
          {!hasResume && (
            <p className="text-amber-600 text-xs mt-2 font-medium">
              ⚠️ Upload your resume to apply for jobs
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left */}
          <div className="space-y-5">
            {/* Basic info */}
            <div className="card">
              <h2 className="font-display font-bold text-slate-900 mb-4">Basic Info</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Professional Headline</label>
                  <input className="input" placeholder="e.g. Senior React Developer · 5 yrs exp"
                    value={form.headline} onChange={e => set('headline', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Role</label>
                    <input className="input" placeholder="Job title"
                      value={form.current_position} onChange={e => set('current_position', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Company</label>
                    <input className="input" placeholder="Company name"
                      value={form.current_company} onChange={e => set('current_company', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Experience (years)</label>
                    <input className="input" type="number" min="0" max="50"
                      value={form.experience_years} onChange={e => set('experience_years', +e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Location</label>
                    <input className="input" placeholder="City, Country"
                      value={form.location} onChange={e => set('location', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Professional Summary</label>
                  <textarea className="input resize-none" rows={3}
                    placeholder="Tell recruiters about yourself..."
                    value={form.summary} onChange={e => set('summary', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="card">
              <h2 className="font-display font-bold text-slate-900 mb-4">Skills</h2>
              <div className="flex gap-2 mb-3">
                <input className="input flex-1" placeholder="Add a skill and press Enter"
                  value={skillInp} onChange={e => setSkillInp(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())} />
                <button onClick={addSkill} className="btn-secondary px-4"><Plus className="w-4 h-4" /></button>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {form.skills.length === 0 && <p className="text-sm text-slate-400">No skills added yet</p>}
                {form.skills.map(s => (
                  <span key={s} className="badge-blue flex items-center gap-1.5 py-1 px-3">
                    {s}
                    <button onClick={() => removeSkill(s)} className="hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Links */}
            <div className="card">
              <h2 className="font-display font-bold text-slate-900 mb-4">Links</h2>
              <div className="space-y-3">
                <input className="input" placeholder="LinkedIn URL" value={form.linkedin} onChange={e => set('linkedin', e.target.value)} />
                <input className="input" placeholder="GitHub URL" value={form.github} onChange={e => set('github', e.target.value)} />
                <input className="input" placeholder="Portfolio / Website" value={form.portfolio} onChange={e => set('portfolio', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Right — Resume */}
          <div className="space-y-5">
            <div className="card border-2 border-dashed border-blue-200 bg-blue-50/30">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-slate-900">Resume *</h2>
                {hasResume && (
                  <span className="badge-green flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Ready to apply
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-600 mb-4">
                Your resume is used when you apply for jobs. HR will use it to rank candidates with AI.
              </p>

              {/* Upload zone */}
              <div
                className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all mb-4"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleResumeFile(e.dataTransfer.files[0]) }}
              >
                {resumeLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-sm text-slate-500">Extracting text...</p>
                  </div>
                ) : resumeFile ? (
                  <div className="flex items-center gap-3 justify-center">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div className="text-left">
                      <p className="font-medium text-slate-800 text-sm">{resumeFile.name}</p>
                      <p className="text-xs text-slate-400">Click to change</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-600 text-sm">Upload PDF or TXT resume</p>
                    <p className="text-xs text-slate-400 mt-1">Or paste your resume text below</p>
                  </>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.txt" className="hidden"
                  onChange={e => handleResumeFile(e.target.files[0])} />
              </div>

              {/* Resume text area */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Resume Text {hasResume ? <span className="text-emerald-500">✓</span> : <span className="text-red-500">*</span>}
                </label>
                <textarea
                  className="input resize-none font-mono text-xs"
                  rows={14}
                  placeholder="Your resume text will appear here after uploading...&#10;&#10;Or paste your resume manually:&#10;&#10;DEEP SAHA&#10;Senior Software Engineer&#10;deep@email.com | +91 9875525607&#10;&#10;EXPERIENCE&#10;Senior Developer – TechCorp (2021–Present)&#10;- Built scalable React applications&#10;&#10;SKILLS&#10;React, Node.js, Python, PostgreSQL"
                  value={resumeText}
                  onChange={e => setResumeText(e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">
                  {resumeText.trim().split(/\s+/).filter(Boolean).length} words
                  {!hasResume && ' — minimum 30 words required'}
                </p>
              </div>
            </div>

            {/* Checklist */}
            <div className="card">
              <h2 className="font-display font-bold text-slate-900 mb-3">Before you apply</h2>
              {[
                { label: 'Full name set',        done: !!user?.full_name },
                { label: 'Headline added',       done: !!form.headline },
                { label: 'Skills listed',        done: form.skills.length > 0 },
                { label: 'Experience added',     done: form.experience_years > 0 },
                { label: 'Resume uploaded ⭐',   done: hasResume },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                    {item.done && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-sm ${item.done ? 'text-slate-700' : 'text-slate-400'}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
