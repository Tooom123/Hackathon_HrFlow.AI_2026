import poulpeLogo from '../../poulpelogo.png'
import { useState } from 'react'
import { setupJobInterview, type SetupJobResponse } from '../api/hrflow'
import StepIndicator from '../components/StepIndicator'

interface Props {
  onBack: () => void
  onComplete: (result: SetupJobResponse) => void
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


export default function RhSetupPage({ onBack, onComplete }: Props) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [questionCount, setQuestionCount] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await setupJobInterview({ text, title, question_count: questionCount })
      onComplete(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const sliderPercent = ((questionCount - 1) / 19) * 100

  return (
    <div className="min-h-screen text-zinc-50">
      <header className="fixed inset-x-0 top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-800/60 bg-zinc-950/80 px-6 backdrop-blur-md">
        <Logo />
        <StepIndicator current={1} />
        <button
          onClick={onBack}
          className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
      </header>

      <main className="flex min-h-screen items-start justify-center px-4 pb-16 pt-28">
        <div className="w-full max-w-xl space-y-8">

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
              Create an interview session
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Paste your job description and adjust the number of questions — the AI generates a tailored questionnaire.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-400">Job title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Senior Python Developer"
                required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-600 transition-all focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-400">Job description</label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste the full job posting text…"
                required
                rows={11}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm leading-relaxed text-zinc-100 placeholder-zinc-600 transition-all focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
              />
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-200">Interview questions</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Number of questions to generate</p>
                </div>
                <span className="text-4xl font-bold tabular-nums text-brand">{questionCount}</span>
              </div>

              <div className="relative flex h-5 items-center">
                <div className="absolute inset-x-0 h-1 rounded-full bg-zinc-800" />
                <div
                  className="absolute left-0 h-1 rounded-full bg-brand transition-all duration-75"
                  style={{ width: `${sliderPercent}%` }}
                />
                <input
                  type="range" min={1} max={20} value={questionCount}
                  onChange={e => setQuestionCount(Number(e.target.value))}
                  className="relative w-full cursor-pointer bg-transparent
                    [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px]
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm
                    [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-brand
                    [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110
                    [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:w-[18px]
                    [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white
                    [&::-moz-range-thumb]:ring-2 [&::-moz-range-thumb]:ring-brand
                    [&::-moz-range-thumb]:border-0"
                />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-zinc-600 select-none">
                {[1, 5, 10, 15, 20].map(v => <span key={v}>{v}</span>)}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3">
                <span className="text-red-400 text-sm mt-px">⚠</span>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group w-full rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-zinc-950 transition-all hover:bg-brand-dim active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Analyzing and generating…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Generate questions
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
