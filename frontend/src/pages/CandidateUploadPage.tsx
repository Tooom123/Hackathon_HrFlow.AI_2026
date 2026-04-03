import poulpeLogo from '../../poulpelogo.png'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSessionStatus, uploadCV, joinInterviewSession } from '../api/hrflow'

type Phase = 'loading' | 'ready' | 'uploading' | 'joining' | 'error'

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <img src={poulpeLogo} alt="FirstRound" className="h-7 w-7 object-contain" />
      <span className="text-sm font-semibold tracking-tight text-zinc-100">
        First<span className="text-brand">Round</span>
      </span>
    </div>
  )
}

export default function CandidateUploadPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const [phase, setPhase] = useState<Phase>('loading')
  const [jobTitle, setJobTitle] = useState('')
  const [jobKey, setJobKey] = useState('')
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch session info on mount
  useEffect(() => {
    if (!sessionId) return
    getSessionStatus(sessionId)
      .then(status => {
        setJobTitle(status.job_title)
        setJobKey(status.job_key)
        setTotalQuestions(status.total_questions)
        setPhase('ready')
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Session not found')
        setPhase('error')
      })
  }, [sessionId])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.type === 'application/pdf') {
      setFile(dropped)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragActive(false)
  }, [])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) setFile(selected)
  }

  async function handleSubmit() {
    if (!file || !sessionId || !jobKey) return
    setError(null)
    setPhase('uploading')

    try {
      const applyResult = await uploadCV(file, jobKey)

      setPhase('joining')
      await joinInterviewSession(sessionId, applyResult.profile_reference, email || undefined)

      navigate(`/session/${sessionId}/interview`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setPhase('ready')
    }
  }

  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-50">
        <div className="flex items-center gap-3">
          <svg className="h-5 w-5 animate-spin text-brand" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm text-zinc-400">Loading session…</span>
        </div>
      </div>
    )
  }

  if (phase === 'error' && !jobKey) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-50">
        <div className="max-w-md space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-950/50 border border-red-900/50">
            <span className="text-lg">⚠</span>
          </div>
          <h1 className="text-xl font-bold text-zinc-100">Session not found</h1>
          <p className="text-sm text-zinc-400">{error}</p>
        </div>
      </div>
    )
  }

  const isSubmitting = phase === 'uploading' || phase === 'joining'

  return (
    <div className="min-h-screen text-zinc-50">
      <header className="fixed inset-x-0 top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-800/60 bg-zinc-950/80 px-6 backdrop-blur-md">
        <Logo />
        <span className="text-xs font-medium text-zinc-500">Candidate space</span>
        <div />
      </header>

      <main className="flex min-h-screen items-start justify-center px-4 pb-16 pt-28">
        <div className="w-full max-w-xl space-y-8">

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
              Interview — {jobTitle}
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Upload your CV in PDF format then start the interview. You will answer {totalQuestions} questions in conversation with our AI.
            </p>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="candidate-email" className="block text-sm font-medium text-zinc-300">
              Email address <span className="text-zinc-600">(optional — to be contacted)</span>
            </label>
            <input
              id="candidate-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="firstname.lastname@example.com"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand/30"
            />
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
              dragActive
                ? 'border-brand bg-brand/5'
                : file
                ? 'border-brand/40 bg-brand/5'
                : 'border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            {file ? (
              <div className="space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10">
                  <svg viewBox="0 0 16 16" fill="none" className="h-6 w-6 text-brand">
                    <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-zinc-200">{file.name}</p>
                <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(0)} Ko</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  className="text-xs text-zinc-500 underline transition-colors hover:text-zinc-300"
                >
                  Change file
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800">
                  <svg viewBox="0 0 16 16" fill="none" className="h-6 w-6 text-zinc-500">
                    <path d="M8 10V3M5 5.5L8 3l3 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 10v2.5A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-300">
                    Drop your CV here
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    or click to browse — PDF only, 10 MB max
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3">
              <span className="text-red-400 text-sm mt-px">⚠</span>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!file || isSubmitting}
            className="group w-full rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-zinc-950 transition-all hover:bg-brand-dim active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                {phase === 'uploading' ? 'Uploading CV…' : 'Preparing the interview…'}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Start the interview
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </button>

        </div>
      </main>
    </div>
  )
}
