import poulpeLogo from '../../poulpelogo.png'
import { useState, useEffect } from 'react'
import { createInterviewSession, type CreateSessionResponse } from '../api/hrflow'
import StepIndicator from '../components/StepIndicator'

interface Props {
  jobKey: string
  jobTitle: string
  onDone: () => void
}

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

export default function RhSessionLinkPage({ jobKey, jobTitle, onDone }: Props) {
  const [session, setSession] = useState<CreateSessionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    createInterviewSession(jobKey)
      .then(setSession)
      .catch(err => setError(err instanceof Error ? err.message : 'Error creating session'))
      .finally(() => setLoading(false))
  }, [jobKey])

  function handleCopy() {
    if (!session) return
    navigator.clipboard.writeText(session.candidate_link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen text-zinc-50">
      <header className="fixed inset-x-0 top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-800/60 bg-zinc-950/80 px-6 backdrop-blur-md">
        <Logo />
        <StepIndicator current={3} />
        <div />
      </header>

      <main className="flex min-h-screen items-start justify-center px-4 pb-16 pt-28">
        <div className="w-full max-w-xl space-y-8">

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
              Session created
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Share this link with the candidate so they can upload their CV and start the interview.
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-3 py-12">
              <svg className="h-5 w-5 animate-spin text-brand" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-sm text-zinc-400">Creating session…</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3">
              <span className="text-red-400 text-sm mt-px">⚠</span>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {session && (
            <div className="space-y-6">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10">
                    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-brand">
                      <path d="M6 2h4a4 4 0 010 8H6V2z" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M6 6h4" stroke="currentColor" strokeWidth="1.3" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{jobTitle}</p>
                    <p className="text-xs text-zinc-500">{session.total_questions} questions</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-400">Candidate link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={session.candidate_link}
                      className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-300 font-mono select-all focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:border-brand hover:text-brand"
                    >
                      {copied ? (
                        <>
                          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-brand">
                            <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Copied
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                            <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                            <path d="M3 11V3.5A1.5 1.5 0 014.5 2H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={onDone}
                className="group w-full rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-zinc-950 transition-all hover:bg-brand-dim active:scale-[0.99]"
              >
                <span className="flex items-center justify-center gap-2">
                  Back to home
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
