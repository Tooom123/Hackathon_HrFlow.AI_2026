import { useState, useEffect } from 'react'
import { getJobDetail } from '../api/hrflow'
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

type Tab = 'interview' | 'profile'

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
    const entryMatch = m.name.match(/^interview_entry_(\d+)$/)
    if (entryMatch) {
      const idx = parseInt(entryMatch[1])
      try {
        const parsed = JSON.parse(m.value)
        map[idx] = {
          index: idx,
          question: parsed.q ?? '',
          answer: parsed.a ?? '',
          score: parsed.s != null ? parseFloat(parsed.s) : null,
          evaluation: parsed.e ?? null,
        }
      } catch { /* skip */ }
      continue
    }
    const legacyMatch = m.name.match(/^interview_(question|answer|score|evaluation)_(\d+)$/)
    if (!legacyMatch) continue
    const [, field, idxStr] = legacyMatch
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

function normalizeSkill(s: string): string {
  return s.toLowerCase().replace(/[\s\-_./]+/g, ' ').trim()
}

export default function RhInterviewPage({ job, profile, matchScore, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('interview')
  const [fullJob, setFullJob] = useState<JobCard>(job)

  // Fetch full job (with skills) the first time the CV tab is opened
  useEffect(() => {
    if (tab !== 'profile') return
    if (fullJob.skills !== undefined) return // already enriched
    getJobDetail(job.key).then(setFullJob).catch(() => { /* keep partial job */ })
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const fullName = [profile.info?.first_name, profile.info?.last_name].filter(Boolean).join(' ') || 'Candidat'
  const initials = ((profile.info?.first_name?.[0] ?? '') + (profile.info?.last_name?.[0] ?? '')).toUpperCase() || '?'
  const turns = extractInterviewTurns(profile)
  const interviewPct = extractInterviewScore(profile)
  const completedAt = extractCompletedAt(profile)
  const hasInterview = turns.length > 0
  const avgScore = (matchScore !== null && interviewPct !== null)
    ? Math.round((matchScore + interviewPct) / 2)
    : null

  // PDF attachment from HrFlow
  const cvUrl = profile.attachments?.find(a => a.file_url)?.file_url
    ?? profile.attachments?.find(a => a.public_url)?.public_url
    ?? null

  // Skill matching for the "Profil CV" tab — uses fullJob which has skills from /job/indexing
  const jobSkillsNorm = new Set((fullJob.skills ?? []).map(s => normalizeSkill(s.name)))
  const profileSkills = profile.skills ?? []

  const matchedSkills = profileSkills.filter(s => {
    const n = normalizeSkill(s.name)
    return [...jobSkillsNorm].some(js => n === js || n.includes(js) || js.includes(n))
  })
  const missingSkills = [...jobSkillsNorm].filter(js =>
    !profileSkills.some(ps => {
      const n = normalizeSkill(ps.name)
      return n === js || n.includes(js) || js.includes(n)
    })
  )

  // Experience relevance — compare titles/companies against job name keywords
  const jobWords = new Set(fullJob.name.toLowerCase().split(/\s+/).filter(w => w.length > 3))
  const relevantExp = (profile.experiences ?? []).filter(exp => {
    const text = `${exp.title ?? ''} ${exp.company ?? ''}`.toLowerCase()
    return [...jobWords].some(w => text.includes(w))
  })
  const otherExp = (profile.experiences ?? []).filter(exp => !relevantExp.includes(exp))

  return (
    <div className="min-h-screen text-zinc-50 flex flex-col">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-10 flex h-20 items-center justify-between border-b border-zinc-800/60 bg-zinc-950/90 px-8 backdrop-blur-md">
        <Logo />
        <span className="text-xl font-bold text-brand hidden sm:block">Espace recruteur</span>
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition-all hover:border-zinc-700 hover:text-zinc-100"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Retour
        </button>
      </header>

      <main className="flex flex-col flex-1 pt-20">
        {/* Candidate bar */}
        <div className="border-b border-zinc-800/60 bg-zinc-900/40 px-8 py-4">
          <div className="mx-auto max-w-6xl flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {profile.info?.picture ? (
                <img src={profile.info.picture} alt={initials} className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                  {initials}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-zinc-100">{fullName}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {profile.info?.email && <span className="text-xs text-zinc-500">{profile.info.email}</span>}
                  {completedAt && <span className="text-xs text-zinc-600">Entretien le {completedAt}</span>}
                  <span className="text-xs text-zinc-700">{job.name}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 shrink-0">
              <div className="flex flex-col items-center rounded-xl border border-brand/20 bg-brand/10 px-4 py-2">
                <span className="text-lg font-bold tabular-nums text-brand leading-none">
                  {matchScore !== null ? `${Math.round(matchScore)}%` : '–'}
                </span>
                <span className="mt-0.5 text-[10px] font-medium text-brand/70">Matching</span>
              </div>
              <div className="flex flex-col items-center rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2">
                <span className="text-lg font-bold tabular-nums text-amber-400 leading-none">
                  {interviewPct !== null ? `${interviewPct}%` : '–'}
                </span>
                <span className="mt-0.5 text-[10px] font-medium text-amber-400/70">Entretien</span>
              </div>
              <div className="flex flex-col items-center rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2">
                <span className="text-lg font-bold tabular-nums text-zinc-200 leading-none">
                  {avgScore !== null ? `${avgScore}%` : '–'}
                </span>
                <span className="mt-0.5 text-[10px] font-medium text-zinc-500">Moyenne</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-zinc-800/60 px-8">
          <div className="mx-auto max-w-6xl flex gap-1 pt-3">
            {([['interview', 'Entretien'], ['profile', 'Profil CV']] as [Tab, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                  tab === id
                    ? 'bg-zinc-900 text-zinc-100 border border-b-0 border-zinc-800'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab: Entretien ── */}
        {tab === 'interview' && (
          <div className="flex-1 overflow-y-auto px-4 py-8">
            <div className="mx-auto max-w-3xl space-y-6">
              {!hasInterview && (
                <div className="rounded-2xl border border-dashed border-zinc-800 px-4 py-12 text-center">
                  <p className="text-sm text-zinc-600">Aucun entretien enregistré pour ce candidat.</p>
                </div>
              )}

              {turns.map((turn) => (
                <div key={turn.index} className="space-y-3">
                  {/* Question */}
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

                  {/* Answer */}
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
        )}

        {/* ── Tab: Profil CV ── */}
        {tab === 'profile' && (
          <div className="flex-1 overflow-hidden">
            <div className="h-full grid grid-cols-1 lg:grid-cols-2">

              {/* Left: PDF viewer */}
              <div className="border-r border-zinc-800/60 flex flex-col">
                <div className="px-5 py-3 border-b border-zinc-800/40">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">CV importé</p>
                </div>
                <div className="flex-1 overflow-hidden">
                  {cvUrl ? (
                    <iframe
                      src={`${cvUrl}#toolbar=0&navpanes=0`}
                      className="h-full w-full"
                      style={{ minHeight: 'calc(100vh - 220px)' }}
                      title="CV du candidat"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center"
                      style={{ minHeight: 'calc(100vh - 220px)' }}>
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
                        <svg viewBox="0 0 16 16" fill="none" className="h-7 w-7 text-zinc-600">
                          <path d="M4 2h5l3 3v9H4V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                          <path d="M9 2v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                          <path d="M6 8h4M6 10.5h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-400">CV non disponible</p>
                        <p className="mt-1 text-xs text-zinc-600 max-w-xs">
                          HrFlow n'a pas retourné d'URL de fichier pour ce profil.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: strong / weak points */}
              <div className="overflow-y-auto px-6 py-6 space-y-5" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Analyse du profil</p>
                  <p className="text-xs text-zinc-600">Justifie la note de matching ({matchScore !== null ? `${Math.round(matchScore)}%` : '–'})</p>
                </div>

                {/* Points forts */}
                <div className="rounded-2xl border border-brand/25 bg-brand/5 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-brand shrink-0">
                      <path d="M8 2v9M5 8l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" transform="rotate(180 8 8)" />
                    </svg>
                    <p className="text-sm font-semibold text-brand">Points forts</p>
                  </div>

                  {matchedSkills.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-500">
                        {matchedSkills.length} compétence{matchedSkills.length > 1 ? 's' : ''} requise{matchedSkills.length > 1 ? 's' : ''} présente{matchedSkills.length > 1 ? 's' : ''} sur {Math.max(jobSkillsNorm.size, matchedSkills.length)}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {matchedSkills.map((s, i) => (
                          <span key={i} className="rounded-lg border border-brand/25 bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
                            ✓ {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-600 italic">Aucune compétence requise identifiée dans le profil.</p>
                  )}

                  {relevantExp.length > 0 && (
                    <div className="space-y-2 border-t border-brand/10 pt-3">
                      <p className="text-xs text-zinc-500">Expériences pertinentes pour le poste</p>
                      <div className="space-y-1.5">
                        {relevantExp.map((exp, i) => (
                          <div key={i} className="flex items-baseline gap-2">
                            <span className="text-brand text-xs shrink-0">·</span>
                            <p className="text-xs text-zinc-300">
                              {exp.title}{exp.company ? ` — ${exp.company}` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {matchedSkills.length === 0 && relevantExp.length === 0 && (
                    <p className="text-xs text-zinc-600 italic">Aucun point fort identifié automatiquement.</p>
                  )}
                </div>

                {/* Points faibles */}
                <div className="rounded-2xl border border-red-900/30 bg-red-950/15 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-red-400 shrink-0">
                      <path d="M8 2v9M5 8l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="text-sm font-semibold text-red-400">Points faibles</p>
                  </div>

                  {missingSkills.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-500">
                        {missingSkills.length} compétence{missingSkills.length > 1 ? 's' : ''} requise{missingSkills.length > 1 ? 's' : ''} absente{missingSkills.length > 1 ? 's' : ''} du profil
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {missingSkills.slice(0, 10).map((s, i) => (
                          <span key={i} className="rounded-lg border border-red-900/40 bg-red-950/20 px-2.5 py-1 text-xs font-medium text-red-400/80">
                            ✗ {s}
                          </span>
                        ))}
                        {missingSkills.length > 10 && (
                          <span className="text-xs text-zinc-600 self-center">+{missingSkills.length - 10}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-600 italic">Toutes les compétences requises sont présentes.</p>
                  )}

                  {otherExp.length > 0 && missingSkills.length > 0 && (
                    <div className="space-y-2 border-t border-red-900/20 pt-3">
                      <p className="text-xs text-zinc-500">Expériences non directement liées au poste</p>
                      <div className="space-y-1.5">
                        {otherExp.slice(0, 3).map((exp, i) => (
                          <div key={i} className="flex items-baseline gap-2">
                            <span className="text-red-400/60 text-xs shrink-0">·</span>
                            <p className="text-xs text-zinc-500">
                              {exp.title}{exp.company ? ` — ${exp.company}` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {missingSkills.length === 0 && otherExp.length === 0 && (
                    <p className="text-xs text-zinc-600 italic">Aucun point faible identifié automatiquement.</p>
                  )}
                </div>

                {/* No job skills indexed — informational only, backend uses text-based scoring */}
                {jobSkillsNorm.size === 0 && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
                    <p className="text-xs text-zinc-500">
                      Aucune compétence explicitement indexée sur cette offre. Le score de matching est calculé par analyse textuelle du CV et de la description du poste.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  )
}
