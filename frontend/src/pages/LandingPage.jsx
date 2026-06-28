import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Briefcase, Users, Zap, Star, ChevronRight, CheckCircle2, Brain, Video, Shield } from 'lucide-react'

const FEATURES = [
  { icon: Brain,        title: 'AI-Powered Screening',   desc: 'Gemini AI reads and ranks multiple resumes against your JD in seconds.' },
  { icon: Star,         title: 'Smart Ranking',           desc: 'Candidates auto-ranked by suitability score with detailed breakdown.' },
  { icon: Video,        title: 'Built-in Video Calls',    desc: '1-on-1 browser video interviews — no Zoom needed.' },
  { icon: Shield,       title: 'OTP Authentication',      desc: 'Secure email or SMS OTP login for both HR and candidates.' },
  { icon: Zap,          title: 'Instant Invitations',     desc: 'Send interview invites with one click. Candidates see them instantly.' },
  { icon: CheckCircle2, title: 'Full Application History', desc: 'Track every application, screening, and interview in one place.' },
]

const STATS = [
  { value: '10×', label: 'Faster Screening' },
  { value: '95%', label: 'Accuracy Rate' },
  { value: '500+', label: 'Resumes / Hour' },
  { value: '1-click', label: 'Interview Invite' },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-slate-900">CursoryHire</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/auth/hr')} className="btn-secondary text-sm py-2">
              HR Login
            </button>
            <button onClick={() => navigate('/auth/candidate')} className="btn-primary text-sm py-2">
              Candidate Login
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-violet-50" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse-slow" />
        <div className="absolute bottom-10 left-10 w-60 h-60 bg-violet-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse-slow" />

        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 text-sm font-medium text-blue-700 mb-6">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                TRANSFORM HIRING PROCESS
              </div>
              <h1 className="font-display text-5xl font-bold text-slate-900 leading-tight mb-6">
                Hire Smarter with{' '}
                <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                  AI Screening
                </span>
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed mb-8">
                Upload 20 resumes, get AI-ranked candidates in 60 seconds.
                Send invitations, schedule video interviews — all in one platform.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/auth/hr')}
                  className="btn-primary text-base px-7 py-3"
                >
                  <Briefcase className="w-5 h-5" />
                  I'm Hiring
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/auth/candidate')}
                  className="btn-secondary text-base px-7 py-3"
                >
                  <Users className="w-5 h-5" />
                  I'm a Candidate
                </button>
              </div>
              {/* Trust badges */}
              <div className="flex items-center gap-6 mt-10 text-sm text-slate-500">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />Free to start</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />OTP secured</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />No credit card</div>
              </div>
            </motion.div>

            {/* Right — Dashboard preview card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 relative">
                {/* Mini dashboard mockup */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-xs text-slate-400 font-medium mb-1">SCREENING SESSION</div>
                    <div className="font-display font-bold text-slate-900">Senior React Developer</div>
                  </div>
                  <span className="badge-green">✓ Complete</span>
                </div>
                {/* Ranked candidates */}
                {[
                  { rank:1, name:'Rahul Sharma', score:92, grade:'A+', color:'rank-1' },
                  { rank:2, name:'Priya Singh',  score:87, grade:'A',  color:'rank-2' },
                  { rank:3, name:'Deep Saha',    score:81, grade:'B+', color:'rank-3' },
                  { rank:4, name:'Anita Roy',    score:74, grade:'B',  color:'' },
                  { rank:5, name:'Vikram Joshi', score:68, grade:'C+', color:'' },
                ].map(c => (
                  <div key={c.rank} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${c.color || 'bg-slate-100 text-slate-500'}`}>
                      {c.rank}
                    </div>
                    <div className="flex-1 font-medium text-slate-800 text-sm">{c.name}</div>
                    <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full" style={{ width: `${c.score}%` }} />
                    </div>
                    <div className="text-sm font-bold text-slate-700 w-8 text-right">{c.score}</div>
                    <span className="badge-blue text-xs">{c.grade}</span>
                  </div>
                ))}
                <button className="w-full mt-4 btn-primary text-sm py-2.5 justify-center">
                  Send Invitations
                </button>
              </div>
              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-card border border-slate-100 px-4 py-2.5 flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <div>
                  <div className="text-xs font-bold text-slate-900">AI Screened</div>
                  <div className="text-xs text-slate-500">5 resumes in 12s</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-gradient-to-r from-blue-600 to-violet-600 py-14">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(s => (
            <div key={s.label} className="text-center text-white">
              <div className="font-display text-4xl font-bold mb-1">{s.value}</div>
              <div className="text-blue-100 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-slate-900 mb-4">
              Everything you need to hire faster
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              CursoryHire brings AI screening, candidate management, and video interviews into one clean platform.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-violet-50 rounded-2xl flex items-center justify-center mb-4 border border-blue-100">
                  <f.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-4xl font-bold text-white mb-4">
            Ready to transform your hiring?
          </h2>
          <p className="text-slate-400 text-lg mb-10">
            Join CursoryHire today. No credit card required.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={() => navigate('/auth/hr')} className="btn-primary text-base px-8 py-3.5">
              <Briefcase className="w-5 h-5" /> Start Hiring →
            </button>
            <button onClick={() => navigate('/auth/candidate')} className="btn-secondary text-base px-8 py-3.5 !bg-white/10 !text-white !border-white/20 hover:!bg-white/20">
              <Users className="w-5 h-5" /> Find a Job →
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-900 border-t border-slate-800 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="font-display font-bold">CursoryHire</span>
          </div>
          <p className="text-slate-500 text-sm">
            © 2026 CursoryHire · cursoryhire.com · NITK Major Project
          </p>
          <p className="text-slate-400 text-sm font-medium">
            Made with ❤️ by <span className="text-blue-400 font-semibold">Deep Saha</span>
          </p>
        </div>
      </footer>

    </div>
  )
}