import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'

// Pages
import LandingPage     from './pages/LandingPage'
import AuthPage        from './pages/AuthPage'
import HRDashboard     from './pages/hr/HRDashboard'
import HRScreening     from './pages/hr/HRScreening'
import HRResults       from './pages/hr/HRResults'
import HRJobs          from './pages/hr/HRJobs'
import HRInvitations   from './pages/hr/HRInvitations'
import HRProfile       from './pages/hr/HRProfile'
import HRFinalRanking  from './pages/hr/HRFinalRanking'
import CandDashboard   from './pages/candidate/CandDashboard'
import CandInvitations from './pages/candidate/CandInvitations'
import CandJobs        from './pages/candidate/CandJobs'
import CandProfile     from './pages/candidate/CandProfile'
import CandApplications from './pages/candidate/CandApplications'
import VideoRoom       from './pages/VideoRoom'

function PrivateRoute({ children, role }) {
  const { isLoggedIn, user } = useAuthStore()
  if (!isLoggedIn()) return <Navigate to="/" replace />
  if (role && user?.role !== role) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { isLoggedIn, user } = useAuthStore()

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={
        isLoggedIn()
          ? <Navigate to={user?.role === 'hr' ? '/hr/dashboard' : '/candidate/dashboard'} replace />
          : <LandingPage />
      } />
      <Route path="/auth/:role" element={<AuthPage />} />

      {/* HR routes */}
      <Route path="/hr/dashboard"   element={<PrivateRoute role="hr"><HRDashboard /></PrivateRoute>} />
      <Route path="/hr/screening"   element={<PrivateRoute role="hr"><HRScreening /></PrivateRoute>} />
      <Route path="/hr/results/:id" element={<PrivateRoute role="hr"><HRResults /></PrivateRoute>} />
      <Route path="/hr/jobs"        element={<PrivateRoute role="hr"><HRJobs /></PrivateRoute>} />
      <Route path="/hr/invitations" element={<PrivateRoute role="hr"><HRInvitations /></PrivateRoute>} />
      <Route path="/hr/profile"     element={<PrivateRoute role="hr"><HRProfile /></PrivateRoute>} />
      <Route path="/hr/final-ranking/:jobId" element={<PrivateRoute role="hr"><HRFinalRanking /></PrivateRoute>} />

      {/* Candidate routes */}
      <Route path="/candidate/dashboard"    element={<PrivateRoute role="candidate"><CandDashboard /></PrivateRoute>} />
      <Route path="/candidate/invitations"  element={<PrivateRoute role="candidate"><CandInvitations /></PrivateRoute>} />
      <Route path="/candidate/jobs"         element={<PrivateRoute role="candidate"><CandJobs /></PrivateRoute>} />
      <Route path="/candidate/profile"      element={<PrivateRoute role="candidate"><CandProfile /></PrivateRoute>} />
      <Route path="/candidate/applications" element={<PrivateRoute role="candidate"><CandApplications /></PrivateRoute>} />

      {/* Video interview */}
      <Route path="/interview/:roomId" element={<PrivateRoute><VideoRoom /></PrivateRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/interview/:roomId" element={<VideoRoom />} />
    </Routes>
  )
}
