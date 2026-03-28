import { useState } from 'react'
import type { JobCard, Profile, SetupJobResponse } from './api/hrflow'
import RhHomePage from './pages/RhHomePage'
import RhSetupPage from './pages/RhSetupPage'
import RhQuestionsPage from './pages/RhQuestionsPage'
import RhJobPage from './pages/RhJobPage'
import RhInterviewPage from './pages/RhInterviewPage'

type Step = 'home' | 'setup' | 'questions' | 'job' | 'interview'

interface SessionState {
  result: SetupJobResponse
  questions: string[]
}

export default function App() {
  const [step, setStep] = useState<Step>('home')
  const [session, setSession] = useState<SessionState | null>(null)
  const [recentJob, setRecentJob] = useState<JobCard | null>(null)
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [selectedProfileMatchScore, setSelectedProfileMatchScore] = useState<number | null>(null)

  if (step === 'setup') {
    return (
      <RhSetupPage
        onBack={() => setStep('home')}
        onComplete={(result) => {
          setSession({ result, questions: result.questions })
          setStep('questions')
        }}
      />
    )
  }

  if (step === 'interview' && selectedJob && selectedProfile) {
    return (
      <RhInterviewPage
        job={selectedJob}
        profile={selectedProfile}
        matchScore={selectedProfileMatchScore}
        onBack={() => setStep('job')}
      />
    )
  }

  if (step === 'job' && selectedJob) {
    return (
      <RhJobPage
        job={selectedJob}
        onBack={() => setStep('home')}
        onOpenProfile={(profile, matchScore) => {
          setSelectedProfile(profile)
          setSelectedProfileMatchScore(matchScore)
          setStep('interview')
        }}
      />
    )
  }

  if (step === 'questions' && session) {
    return (
      <RhQuestionsPage
        result={session.result}
        onBack={() => setStep('setup')}
        onContinue={(questions) => {
          setRecentJob({
            key: session.result.job_key,
            reference: session.result.job_reference,
            name: session.result.job_title,
            summary: session.result.job_title,
          })
          setSession(prev => prev ? { ...prev, questions } : null)
          setStep('home')
        }}
      />
    )
  }

  return (
    <RhHomePage
      recentJob={recentJob}
      onNewSession={() => { setRecentJob(null); setStep('setup') }}
      onOpenJob={(job: JobCard) => {
        setSelectedJob(job)
        setStep('job')
      }}
    />
  )
}
