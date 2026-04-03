import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import RecruiterApp from './pages/RecruiterApp'
import CandidateUploadPage from './pages/CandidateUploadPage'
import CandidateInterviewPage from './pages/CandidateInterviewPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<RecruiterApp />} />
      <Route path="/session/:sessionId" element={<CandidateUploadPage />} />
      <Route path="/session/:sessionId/interview" element={<CandidateInterviewPage />} />
    </Routes>
  )
}
