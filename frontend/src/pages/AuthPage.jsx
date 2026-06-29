import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Mail, Phone, Zap, Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import useAuthStore from '../store/authStore'

const ROLE_CONFIG = {
  hr: {
    label: 'HR / Recruiter',
    color: 'from-blue-600 to-violet-600',
    bg: 'from-blue-50 to-violet-50',
    accent: 'blue',
    icon: '🧑‍💼',
    desc: 'Screen resumes, rank candidates, and conduct interviews',
  },
  candidate: {
    label: 'Job Seeker',
    color: 'from-emerald-500 to-teal-600',
    bg: 'from-emerald-50 to-teal-50',
    accent: 'emerald',
    icon: '👤',
    desc: 'Find jobs, track applications, and attend video interviews',
  },
}

export default function AuthPage() {
  const { role } = useParams()
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.hr

  const [step, setStep]           = useState('form')    // form → otp → done
  const [mode, setMode]           = useState('login')   // login | register
  const [otpMethod, setOtpMethod] = useState(null)      // email | sms
  const [loading, setLoading]     = useState(false)

  // Form state
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [phone, setPhone]       = useState('')
  const [otp, setOtp]           = useState(['', '', '', '', '', ''])
  const [identifier, setIdentifier] = useState('')

  const hasEmail = email.trim().length > 3
  const hasPhone = phone.trim().length > 7

  // ── Step 1: Send OTP ──────────────────────────────────────
  const handleSendOTP = async (method) => {
    const id = method === 'email' ? email.trim() : phone.trim()
    if (!id) return toast.error(`Please enter your ${method}`)

    if (mode === 'register') {
      if (!fullName.trim()) return toast.error('Please enter your full name')
      // Register user first
      try {
        setLoading(true)
        await api.post('/auth/register', {
          full_name: fullName.trim(),
          email: hasEmail ? email.trim() : undefined,
          phone: hasPhone ? phone.trim() : undefined,
          role,
        })
      } catch (e) {
        const msg = e.response?.data?.detail
        // Ignore "already registered" — just send OTP anyway
        if (!msg?.includes('already')) {
          setLoading(false)
          return toast.error(msg || 'Registration failed')
        }
      }
    }

    try {
      setLoading(true)
      await api.post('/auth/send-otp', {
        identifier: id,
        purpose: mode === 'register' ? 'register' : 'login',
        method,
      })
      setIdentifier(id)
      setOtpMethod(method)
      setStep('otp')
      toast.success(`OTP sent to your ${method}!`)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Verify OTP ────────────────────────────────────
  const handleVerifyOTP = async () => {
    const code = otp.join('')
    if (code.length !== 6) return toast.error('Enter all 6 digits')

    try {
      setLoading(true)
      const res = await api.post('/auth/verify-otp', {
        identifier,
        code,
        purpose: mode === 'register' ? 'register' : 'login',
        expected_role: role,  
      })
      const { access_token, user_id, role: userRole, full_name } = res.data
      setAuth(access_token, { id: user_id, role: userRole, full_name })
      toast.success(`Welcome${mode === 'register' ? ' to CursoryHire' : ' back'}, ${full_name}!`)
      navigate(userRole === 'hr' ? '/hr/dashboard' : '/candidate/dashboard', { replace: true })
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  // OTP input handler
  const handleOtpChange = (idx, val) => {
    if (!/^[0-9]?$/.test(val)) return
    const next = [...otp]
    next[idx] = val
    setOtp(next)
    if (val && idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus()
  }

  const handleOtpKey = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0)
      document.getElementById(`otp-${idx - 1}`)?.focus()
    if (e.key === 'Enter') handleVerifyOTP()
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${cfg.bg} flex items-center justify-center p-4`}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Back */}
        <button
          onClick={() => step === 'otp' ? setStep('form') : navigate('/')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className={`bg-gradient-to-r ${cfg.color} p-8 text-center text-white`}>
            <div className="text-4xl mb-3">{cfg.icon}</div>
            <h1 className="font-display text-2xl font-bold mb-1">
              {step === 'otp' ? 'Enter OTP' : `${mode === 'login' ? 'Sign in as' : 'Join as'} ${cfg.label}`}
            </h1>
            <p className="text-white/80 text-sm">
              {step === 'otp' ? `Code sent to ${identifier}` : cfg.desc}
            </p>
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">

              {/* ── FORM STEP ── */}
              {step === 'form' && (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                  {/* Mode toggle */}
                  <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
                    {['login', 'register'].map(m => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                          mode === m ? 'bg-white shadow text-slate-800' : 'text-slate-500'
                        }`}
                      >
                        {m === 'login' ? 'Sign In' : 'Register'}
                      </button>
                    ))}
                  </div>

                  {mode === 'register' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
                      <input
                        className="input"
                        placeholder="e.g. Rahul Sharma"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      <Mail className="w-4 h-4 inline mr-1" />Email
                    </label>
                    <input
                      className="input"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      <Phone className="w-4 h-4 inline mr-1" />Phone (optional)
                    </label>
                    <input
                      className="input"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </div>

                  {/* OTP method choice */}
                  <p className="text-xs text-slate-500 mb-3 text-center">Choose how to receive your OTP</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleSendOTP('email')}
                      disabled={!hasEmail || loading}
                      className="flex flex-col items-center gap-1.5 p-4 border-2 border-blue-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-40"
                    >
                      {loading && otpMethod === 'email'
                        ? <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                        : <Mail className="w-6 h-6 text-blue-600" />
                      }
                      <span className="text-sm font-semibold text-blue-700">Email OTP</span>
                    </button>
                    <button
                      onClick={() => handleSendOTP('sms')}
                      disabled={!hasPhone || loading}
                      className="flex flex-col items-center gap-1.5 p-4 border-2 border-violet-200 rounded-2xl hover:border-violet-400 hover:bg-violet-50 transition-all disabled:opacity-40"
                    >
                      {loading && otpMethod === 'sms'
                        ? <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
                        : <Phone className="w-6 h-6 text-violet-600" />
                      }
                      <span className="text-sm font-semibold text-violet-700">SMS OTP</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 text-center mt-4">
                    Enter email for email OTP · Enter phone for SMS OTP · Or both for your choice
                  </p>
                </motion.div>
              )}

              {/* ── OTP STEP ── */}
              {step === 'otp' && (
                <motion.div key="otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <p className="text-center text-slate-600 mb-8 text-sm">
                    We sent a 6-digit code to<br />
                    <strong className="text-slate-900">{identifier}</strong>
                  </p>

                  <div className="flex justify-center gap-2 mb-8">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-${i}`}
                        className="otp-input"
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKey(i, e)}
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleVerifyOTP}
                    disabled={loading || otp.join('').length !== 6}
                    className="btn-primary w-full justify-center py-3 text-base"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    Verify & Continue
                  </button>

                  <button
                    onClick={() => { setStep('form'); setOtp(['','','','','','']) }}
                    className="w-full text-center text-sm text-slate-500 hover:text-slate-700 mt-4 transition-colors"
                  >
                    Resend OTP
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
