import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LayoutDashboard, Search, Briefcase, Send, User, Save, Loader2, Camera } from 'lucide-react'
import PortalLayout from '../../components/PortalLayout'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'

const NAV = [
  { path: '/hr/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { path: '/hr/screening',   label: 'AI Screening', icon: Search },
  { path: '/hr/jobs',        label: 'Job Listings', icon: Briefcase },
  { path: '/hr/invitations', label: 'Invitations',  icon: Send },
  { path: '/hr/profile',     label: 'Profile',      icon: User },
]

export default function HRProfile() {
  const { user, setAuth, token } = useAuthStore()
  const qc = useQueryClient()
  const fileRef = useRef()
  const [loading,       setLoading]       = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarUrl,     setAvatarUrl]     = useState(null)
  const [form, setForm] = useState({
    company_name: '', designation: '', industry: '',
    company_size: '', website: '', linkedin: '', bio: ''
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => { const r = await api.get('/users/me'); return r.data }
  })

  useEffect(() => {
    if (meData?.profile) setForm({ ...form, ...meData.profile })
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
    } finally {
      setAvatarLoading(false)
    }
  }

  const save = async () => {
    try {
      setLoading(true)
      await api.patch('/users/hr/profile', form)
      toast.success('Profile saved!')
      qc.invalidateQueries(['me'])
    } catch (e) {
      toast.error('Save failed')
    } finally { setLoading(false) }
  }

  const initials = user?.full_name?.[0]?.toUpperCase() || 'H'

  return (
    <PortalLayout navItems={NAV} role="hr">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-slate-900">HR Profile</h1>
          <p className="text-slate-500 mt-1">Your company and contact information</p>
        </div>

        {/* Avatar card */}
        <div className="card mb-6 flex items-center gap-5">
          <div className="relative flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white font-display font-bold text-3xl">
                {initials}
              </div>
            )}
            {/* Camera overlay */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarLoading}
              className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-blue-700 transition-colors"
            >
              {avatarLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Camera className="w-4 h-4" />
              }
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => handleAvatarChange(e.target.files[0])}
            />
          </div>
          <div>
            <div className="font-display font-bold text-xl text-slate-900">{user?.full_name}</div>
            <div className="text-slate-500 text-sm">
              {form.designation || 'HR Professional'} {form.company_name ? `· ${form.company_name}` : ''}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs text-blue-600 hover:underline mt-1"
            >
              Change profile picture
            </button>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-display font-bold text-slate-900 mb-2">Company Info</h2>
          <input className="input" placeholder="Company Name" value={form.company_name} onChange={e => set('company_name', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Your Designation" value={form.designation} onChange={e => set('designation', e.target.value)} />
            <input className="input" placeholder="Industry" value={form.industry} onChange={e => set('industry', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select className="input" value={form.company_size} onChange={e => set('company_size', e.target.value)}>
              <option value="">Company Size</option>
              <option>1-10</option><option>11-50</option><option>51-200</option>
              <option>201-500</option><option>500+</option>
            </select>
            <input className="input" placeholder="Website URL" value={form.website} onChange={e => set('website', e.target.value)} />
          </div>
          <input className="input" placeholder="LinkedIn URL" value={form.linkedin} onChange={e => set('linkedin', e.target.value)} />
          <textarea className="input resize-none" rows={4} placeholder="About your company..." value={form.bio} onChange={e => set('bio', e.target.value)} />

          <button onClick={save} disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Profile
          </button>
        </div>
      </div>
    </PortalLayout>
  )
}
