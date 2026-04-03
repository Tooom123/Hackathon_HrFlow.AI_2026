import poulpeLogo from '../../poulpelogo.png'
import { useState, useRef } from 'react'
import { saveQuestions } from '../api/hrflow'
import type { SetupJobResponse } from '../api/hrflow'
import StepIndicator from '../components/StepIndicator'

interface Props {
  result: SetupJobResponse
  onBack: () => void
  onContinue: (questions: string[]) => void
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


export default function RhQuestionsPage({ result, onBack, onContinue }: Props) {
  const [questions, setQuestions] = useState<string[]>(result.questions)
  const [newQuestion, setNewQuestion] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const dragIndex = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  function deleteQuestion(index: number) {
    setQuestions(prev => prev.filter((_, i) => i !== index))
  }

  function addQuestion() {
    const trimmed = newQuestion.trim()
    if (!trimmed) return
    setQuestions(prev => [...prev, trimmed])
    setNewQuestion('')
  }

  function handleDragStart(index: number) {
    dragIndex.current = index
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    setDragOver(index)
  }

  function handleDrop(index: number) {
    const from = dragIndex.current
    if (from === null || from === index) { setDragOver(null); return }
    setQuestions(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(index, 0, moved)
      return next
    })
    dragIndex.current = null
    setDragOver(null)
  }

  function handleDragEnd() {
    dragIndex.current = null
    setDragOver(null)
  }

  return (
    <div className="min-h-screen text-zinc-50">
      <header className="fixed inset-x-0 top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-800/60 bg-zinc-950/80 px-6 backdrop-blur-md">
        <Logo />
        <StepIndicator current={2} />
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
        <div className="w-full max-w-xl space-y-6">

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Interview questions</h1>
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
                {questions.length}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Ref. <span className="font-mono text-zinc-400">{result.job_reference}</span>
              {' · '}Drag to reorder, hover to delete.
            </p>
          </div>

          <div className="space-y-2">
            {questions.length === 0 && (
              <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center">
                <p className="text-sm text-zinc-600">No questions — add one below.</p>
              </div>
            )}
            {questions.map((q, i) => (
              <div
                key={i}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={e => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={handleDragEnd}
                className={`group flex items-start gap-3 rounded-xl border bg-zinc-900 px-4 py-3 transition-all cursor-grab active:cursor-grabbing select-none ${
                  dragOver === i
                    ? 'border-brand shadow-[0_0_0_1px] shadow-brand/30 scale-[1.01]'
                    : dragIndex.current === i
                    ? 'border-zinc-700 opacity-40'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="mt-0.5 shrink-0 flex flex-col gap-[3px] pt-0.5 opacity-30 group-hover:opacity-70 transition-opacity">
                  <div className="w-3 h-px bg-zinc-400 rounded" />
                  <div className="w-3 h-px bg-zinc-400 rounded" />
                  <div className="w-3 h-px bg-zinc-400 rounded" />
                </div>
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand/10 text-[10px] font-bold text-brand">
                  {i + 1}
                </span>
                <p className="flex-1 text-sm leading-relaxed text-zinc-200">{q}</p>
                <button
                  onClick={() => deleteQuestion(i)}
                  title="Delete"
                  className="mt-0.5 shrink-0 text-zinc-700 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                >
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                    <path d="M6 2h4M2 4h12M5 4l.5 9h5l.5-9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newQuestion}
              onChange={e => setNewQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addQuestion() } }}
              placeholder="Add a custom question…"
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-600 transition-all focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <button
              onClick={addQuestion}
              disabled={!newQuestion.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition-all hover:border-brand hover:text-brand disabled:opacity-30"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {saveError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3">
              <span className="text-red-400 text-sm mt-px">⚠</span>
              <p className="text-sm text-red-300">{saveError}</p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-zinc-800/60 pt-4">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </button>
            <button
              onClick={async () => {
                setSaveError(null)
                setSaving(true)
                try {
                  await saveQuestions(result.job_key, result.job_title ?? '', questions)
                  onContinue(questions)
                } catch (err) {
                  setSaveError(err instanceof Error ? err.message : 'Error saving questions')
                } finally {
                  setSaving(false)
                }
              }}
              disabled={questions.length === 0 || saving}
              className="group flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-all hover:bg-brand-dim active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  Continue
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          </div>

        </div>
      </main>
    </div>
  )
}
