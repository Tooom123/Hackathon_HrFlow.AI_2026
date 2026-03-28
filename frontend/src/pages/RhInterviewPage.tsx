import type { JobCard, Profile } from '../api/hrflow'

interface Props {
  job: JobCard
  profile: Profile
  matchScore: number | null
  onBack: () => void
}

interface InterviewTurn {
  index: number
  question: string
  answer: string
  score: number | null
  evaluation: string | null
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand">
        <svg viewBox="0 0 16 16" fill="none" className="h-6 w-6">
          <circle cx="8" cy="8" r="5.5" stroke="white" strokeWidth="1.5" />
          <path d="M8 5v3.5l2 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <span className="text-xl font-bold tracking-tight text-zinc-100">
        First<span className="text-brand">Round</span>
      </span>
    </div>
  )
}

function scoreColor(score: number): string {
  if (score >= 7) return 'text-brand bg-brand/10 border-brand/20'
  if (score >= 4) return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
  return 'text-red-400 bg-red-500/10 border-red-500/20'
}

function extractInterviewTurns(profile: Profile): InterviewTurn[] {
  const metas = profile.metadatas ?? []
  const map: Record<number, Partial<InterviewTurn>> = {}

  for (const m of metas) {
    const match = m.name.match(/^interview_(question|answer|score|evaluation)_(\d+)$/)
    if (!match) continue
    const [, field, idxStr] = match
    const idx = parseInt(idxStr)
    if (!map[idx]) map[idx] = { index: idx }
    if (field === 'question') map[idx].question = m.value
    if (field === 'answer') map[idx].answer = m.value
    if (field === 'score') map[idx].score = parseFloat(m.value)
    if (field === 'evaluation') map[idx].evaluation = m.value
  }

  return Object.values(map)
    .filter(t => t.question || t.answer)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map(t => ({
      index: t.index ?? 0,
      question: t.question ?? '',
      answer: t.answer ?? '',
      score: t.score ?? null,
      evaluation: t.evaluation ?? null,
    }))
}

function extractGlobalScore(profile: Profile): number | null {
  const m = profile.metadatas?.find(m => m.name === 'interview_global_score')
  if (!m) return null
  const v = parseFloat(m.value)
  return isNaN(v) ? null : v
}

function extractCompletedAt(profile: Profile): string | null {
  const m = profile.metadatas?.find(m => m.name === 'interview_completed_at')
  if (!m) return null
  try {
    return new Date(m.value).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return null }
}

function extractInterviewScore(profile: Profile): number | null {
  const g = extractGlobalScore(profile)
  if (g !== null) return Math.round((g / 10) * 100)
  const scores = (profile.metadatas ?? [])
    .filter(m => /^interview_score_\d+$/.test(m.name))
    .map(m => parseFloat(m.value))
    .filter(v => !isNaN(v))
  if (!scores.length) return null
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length / 10) * 100)
}

export default function RhInterviewPage({ job, profile, matchScore, onBack }: Props) {
  const fullName = [profile.info?.first_name, profile.info?.last_name].filter(Boolean).join(' ') || 'Candidat'
  const initials = ((profile.info?.first_name?.[0] ?? '') + (profile.info?.last_name?.[0] ?? '')).toUpperCase() || '?'
  const turns = extractInterviewTurns(profile)
  const globalScore = extractGlobalScore(profile)
  const interviewPct = extractInterviewScore(profile)
  const completedAt = extractCompletedAt(profile)
  const hasInterview = turns.length > 0

  return (
    <div className="min-h-screen text-zinc-50 flex flex-col">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-10 flex h-28 items-center justify-between border-b border-zinc-800/60 bg-zinc-950/80 px-10 backdrop-blur-md">
        <Logo />
        <span className="text-xl font-bold text-brand hidden sm:block">Espace recruteur</span>
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3 text-sm font-semibold text-zinc-300 transition-all hover:border-zinc-700 hover:text-zinc-100 active:scale-[0.99]"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Retour
        </button>
      </header>

      <main className="flex flex-col flex-1 pt-28">
        {/* Candidate info bar */}
        <div
          className="border-b border-zinc-800/60 px-10 py-5"
          style={{ background: 'linear-gradient(135deg, rgba(39,39,42,0.8) 0%, rgba(24,24,27,0.9) 100%)' }}
        >
          <div className="mx-auto max-w-3xl flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {profile.info?.picture ? (
                <img src={profile.info.picture} alt={initials} className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand/10 text-base font-bold text-brand">
                  {initials}
                </div>
              )}
              <div>
                <p className="text-base font-semibold text-zinc-100">{fullName}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {profile.info?.email && <span className="text-xs text-zinc-500">{profile.info.email}</span>}
                  {completedAt && <span className="text-xs text-zinc-600">Entretien le {completedAt}</span>}
                </div>
                <p className="text-xs text-zinc-600 mt-0.5">{job.name}</p>
              </div>
            </div>
            <div className="flex gap-3 shrink-0">
              <div className="flex flex-col items-center rounded-xl border border-brand/20 bg-brand/10 px-5 py-2.5">
                <span className="text-xl font-bold tabular-nums text-brand leading-none">
                  {matchScore !== null ? `${Math.round(matchScore)}%` : '–'}
                </span>
                <span className="mt-1 text-[10px] font-medium text-brand/70">Matching</span>
              </div>
              <div className="flex flex-col items-center rounded-xl border border-amber-500/20 bg-amber-500/10 px-5 py-2.5">
                <span className="text-xl font-bold tabular-nums text-amber-400 leading-none">
                  {interviewPct !== null ? `${interviewPct}%` : '–'}
                </span>
                <span className="mt-1 text-[10px] font-medium text-amber-400/70">Entretien</span>
              </div>
              {globalScore !== null && (
                <div className="flex flex-col items-center rounded-xl border border-zinc-700 bg-zinc-800/60 px-5 py-2.5">
                  <span className="text-xl font-bold tabular-nums text-zinc-200 leading-none">
                    {globalScore.toFixed(1)}<span className="text-sm text-zinc-500">/10</span>
                  </span>
                  <span className="mt-1 text-[10px] font-medium text-zinc-500">Score global</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-y-auto px-4 py-8">
          <div className="mx-auto max-w-3xl space-y-6">
            {!hasInterview && (
              <div className="rounded-2xl border border-dashed border-zinc-800 px-4 py-12 text-center">
                <p className="text-sm text-zinc-600">Aucun entretien enregistré pour ce candidat.</p>
              </div>
            )}

            {turns.map((turn) => (
              <div key={turn.index} className="space-y-3">
                {/* Question — left, FirstRound */}
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand mt-0.5">
                    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                      <circle cx="8" cy="8" r="5.5" stroke="white" strokeWidth="1.4" />
                      <path d="M8 5v3.5l2 1.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="max-w-[75%] space-y-1">
                    <p className="text-[11px] font-semibold text-brand">FirstRound</p>
                    <div className="rounded-2xl rounded-tl-sm bg-zinc-800 px-4 py-3">
                      <p className="text-sm leading-relaxed text-zinc-200">{turn.question}</p>
                    </div>
                    <p className="text-[10px] text-zinc-700 pl-1">Question {turn.index + 1}</p>
                  </div>
                </div>

                {/* Answer — right, candidate */}
                {turn.answer && (
                  <div className="flex items-start justify-end gap-3">
                    <div className="max-w-[75%] space-y-1">
                      <p className="text-[11px] font-semibold text-zinc-400 text-right">{fullName}</p>
                      <div
                        className="rounded-2xl rounded-tr-sm px-4 py-3"
                        style={{ background: 'linear-gradient(135deg, rgba(39,39,42,0.95) 0%, rgba(24,24,27,0.98) 100%)', border: '1px solid rgba(63,63,70,0.8)' }}
                      >
                        <p className="text-sm leading-relaxed text-zinc-100">{turn.answer}</p>
                      </div>

                      {/* Evaluation + score */}
                      <div className="flex items-start justify-end gap-2 pt-0.5">
                        {turn.evaluation && (
                          <p className="flex-1 text-right text-[11px] italic leading-relaxed text-zinc-600">
                            {turn.evaluation}
                          </p>
                        )}
                        {turn.score !== null && (
                          <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-bold tabular-nums ${scoreColor(turn.score)}`}>
                            {turn.score}/10
                          </span>
                        )}
                      </div>
                    </div>
                    {profile.info?.picture ? (
                      <img src={profile.info.picture} alt={initials} className="h-8 w-8 shrink-0 rounded-full object-cover mt-0.5" />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 mt-0.5 text-xs font-bold text-zinc-400">
                        {initials}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
