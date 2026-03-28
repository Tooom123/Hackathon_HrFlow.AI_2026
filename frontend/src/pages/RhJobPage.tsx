import { useEffect, useState } from 'react'
import { getProfilesForJob, scoreProfiles, getSessionForJob, createInterviewSession, type JobCard, type Profile } from '../api/hrflow'

interface Props {
  job: JobCard
  onBack: () => void
  onOpenProfile: (profile: Profile, matchScore: number | null) => void
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

function Avatar({ profile }: { profile: Profile }) {
  const first = profile.info?.first_name?.[0] ?? ''
  const last = profile.info?.last_name?.[0] ?? ''
  const initials = (first + last).toUpperCase() || '?'
  const pic = profile.info?.picture
  if (pic) return <img src={pic} alt={initials} className="h-12 w-12 rounded-full object-cover" />
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand/10 text-base font-bold text-brand">
      {initials}
    </div>
  )
}

function SkillBadge({ name }: { name: string }) {
  return (
    <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
      {name}
    </span>
  )
}

function ScoreBadge({ label, value, color }: { label: string; value: number | null; color: 'brand' | 'amber' | 'zinc' }) {
  const display = value === null ? '–' : `${Math.round(value)}%`
  const colorClass = color === 'brand'
    ? 'bg-brand/10 text-brand border-brand/20'
    : color === 'amber'
    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    : 'bg-zinc-800/60 text-zinc-300 border-zinc-700'
  return (
    <div className={`flex flex-col items-center rounded-xl border px-3 py-2 ${colorClass}`}>
      <span className="text-lg font-bold tabular-nums leading-none">{display}</span>
      <span className="mt-1 text-[10px] font-medium opacity-70">{label}</span>
    </div>
  )
}

function extractInterviewScore(profile: Profile): number | null {
  const metas: { name: string; value: string }[] = (profile as any).metadatas ?? []
  // Prefer global score if already computed
  const global = metas.find(m => m.name === 'interview_global_score')
  if (global) {
    const v = parseFloat(global.value)
    if (!isNaN(v)) return Math.round((v / 10) * 100)
  }
  // Fallback: average individual scores (0–10 → %)
  const scores = metas
    .filter(m => /^interview_score_\d+$/.test(m.name))
    .map(m => parseFloat(m.value))
    .filter(v => !isNaN(v))
  if (!scores.length) return null
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  return Math.round((avg / 10) * 100)
}

function computeAvg(a: number | null, b: number | null): number | null {
  if (a !== null && b !== null) return Math.round((a + b) / 2)
  return null
}

function ProfileCard({ profile, matchScore, onClick }: { profile: Profile; matchScore: number | null; onClick: () => void }) {
  const fullName = [profile.info?.first_name, profile.info?.last_name].filter(Boolean).join(' ') || 'Candidat inconnu'
  const latestExp = profile.experiences?.[0]
  const latestEdu = profile.educations?.[0]
  const skills = profile.skills?.slice(0, 6) ?? []
  const hasMoreSkills = (profile.skills?.length ?? 0) > 6
  const interviewScore = extractInterviewScore(profile)
  const avgScore = computeAvg(matchScore, interviewScore)
  const date = profile.created_at
  const formattedDate = date
    ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl border border-zinc-800 p-5 transition-all hover:border-zinc-700 cursor-pointer active:scale-[0.99]"
      style={{
        background: 'linear-gradient(135deg, rgba(39,39,42,0.95) 0%, rgba(24,24,27,0.98) 100%)',
        boxShadow: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/[0.03] to-transparent rounded-t-2xl" />

      <div className="relative flex gap-5">
        {/* Left: identity + experience + skills */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-start gap-3">
            <Avatar profile={profile} />
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-zinc-100">{fullName}</p>
              {profile.info?.email && (
                <p className="truncate text-xs text-zinc-500">{profile.info.email}</p>
              )}
              {profile.info?.location?.text && (
                <p className="flex items-center gap-1 text-xs text-zinc-600 mt-0.5">
                  <svg viewBox="0 0 16 16" fill="none" className="h-2.5 w-2.5 shrink-0">
                    <path d="M8 1.5A4.5 4.5 0 0 1 12.5 6c0 3-4.5 8.5-4.5 8.5S3.5 9 3.5 6A4.5 4.5 0 0 1 8 1.5Z" stroke="currentColor" strokeWidth="1.3" />
                    <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                  {profile.info.location.text}
                </p>
              )}
              {formattedDate && (
                <p className="text-[11px] text-zinc-700 mt-0.5">Candidature le {formattedDate}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            {latestExp && (
              <div className="flex flex-1 items-start gap-2 rounded-lg bg-zinc-800/50 px-3 py-2">
                <svg viewBox="0 0 16 16" fill="none" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500">
                  <rect x="2" y="5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M5 5V4a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-zinc-300">{latestExp.title ?? 'Poste'}</p>
                  {latestExp.company && <p className="truncate text-[11px] text-zinc-500">{latestExp.company}</p>}
                </div>
              </div>
            )}
            {latestEdu && (
              <div className="flex flex-1 items-start gap-2 rounded-lg bg-zinc-800/50 px-3 py-2">
                <svg viewBox="0 0 16 16" fill="none" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500">
                  <path d="M2 6l6-3 6 3-6 3-6-3Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M5 7.5V11c1 1 5 1 6 0V7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-zinc-300">{latestEdu.title ?? 'Formation'}</p>
                  {latestEdu.school && <p className="truncate text-[11px] text-zinc-500">{latestEdu.school}</p>}
                </div>
              </div>
            )}
          </div>

          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {skills.map(s => <SkillBadge key={s.name} name={s.name} />)}
              {hasMoreSkills && (
                <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                  +{(profile.skills?.length ?? 0) - 6}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: scores */}
        <div className="flex shrink-0 flex-row gap-2 items-center">
          <ScoreBadge label="Matching" value={matchScore} color="brand" />
          <ScoreBadge label="Entretien" value={interviewScore} color="amber" />
          <ScoreBadge label="Moyenne" value={avgScore} color="zinc" />
        </div>
      </div>
    </div>
  )
}

type LinkState = 'idle' | 'creating' | 'ready'

export default function RhJobPage({ job, onBack, onOpenProfile }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [total, setTotal] = useState(0)
  const [matchScores, setMatchScores] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sortField, setSortField] = useState<'match' | 'interview' | 'moyenne' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function handleSort(field: 'match' | 'interview' | 'moyenne') {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortField(field); setSortDir('desc') }
  }

  const [linkState, setLinkState] = useState<LinkState>('idle')
  const [candidateLink, setCandidateLink] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Check for an existing waiting session on mount
  useEffect(() => {
    setLinkState('creating')
    getSessionForJob(job.key)
      .then(session => {
        if (session) {
          setCandidateLink(session.candidate_link)
          setLinkState('ready')
        } else {
          setLinkState('idle')
        }
      })
      .catch(() => setLinkState('idle'))
  }, [job.key])

  async function handleCreateLink() {
    setLinkState('creating')
    setLinkError(null)
    try {
      const session = await createInterviewSession(job.key)
      setCandidateLink(session.candidate_link)
      setLinkState('ready')
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Erreur')
      setLinkState('idle')
    }
  }

  function handleCopy() {
    if (!candidateLink) return
    navigator.clipboard.writeText(candidateLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    getProfilesForJob(job.key)
      .then(async ({ profiles, total }) => {
        setProfiles(profiles)
        setTotal(total)
        if (profiles.length) {
          const scores = await scoreProfiles(job.key, profiles)
          setMatchScores(scores)
        }
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [job.key])

  return (
    <div className="min-h-screen text-zinc-50">
      <header className="fixed inset-x-0 top-0 z-10 flex h-28 items-center justify-between border-b border-zinc-800/60 bg-zinc-950/80 px-10 backdrop-blur-md">
        <Logo />
        <span className="text-xl font-bold text-brand hidden sm:block">Espace recruteur</span>
        <div className="flex items-center gap-3">
          {linkState !== 'ready' && (
            <button
              onClick={handleCreateLink}
              disabled={linkState === 'creating'}
              className="flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-zinc-950 transition-all hover:bg-brand-dim active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {linkState === 'creating' ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Chargement…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                    <path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-1 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  Créer un lien candidat
                </>
              )}
            </button>
          )}
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3 text-sm font-semibold text-zinc-300 transition-all hover:border-zinc-700 hover:text-zinc-100 active:scale-[0.99]"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Retour
          </button>
        </div>
      </header>

      <main className="flex min-h-screen items-start justify-center px-8 pb-16 pt-40">
        <div className="w-full max-w-6xl space-y-6">

          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-50">{job.name}</h1>
            {job.summary && job.summary !== job.name && (
              <p className="text-sm text-zinc-500 max-w-2xl">{job.summary}</p>
            )}
            <div className="flex items-center gap-3 pt-1">
              {job.location?.text && (
                <span className="flex items-center gap-1 text-xs text-zinc-600">
                  <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
                    <path d="M8 1.5A4.5 4.5 0 0 1 12.5 6c0 3-4.5 8.5-4.5 8.5S3.5 9 3.5 6A4.5 4.5 0 0 1 8 1.5Z" stroke="currentColor" strokeWidth="1.3" />
                    <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                  {job.location.text}
                </span>
              )}
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
                {loading ? '…' : `${total} candidat${total !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>

          {linkState === 'ready' && candidateLink && (
            <div className="flex items-center gap-3 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3">
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0 text-brand">
                <path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-1 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <p className="flex-1 truncate font-mono text-sm text-zinc-300">{candidateLink}</p>
              <button
                onClick={handleCopy}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:border-brand hover:text-brand"
              >
                {copied ? (
                  <>
                    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-brand">
                      <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Copié
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                      <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M3 11V3.5A1.5 1.5 0 014.5 2H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    Copier
                  </>
                )}
              </button>
            </div>
          )}

          {linkError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3">
              <span className="text-red-400 text-sm">⚠</span>
              <p className="text-sm text-red-300">{linkError}</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3">
              <span className="text-red-400 text-sm">⚠</span>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" />
              ))}
            </div>
          )}

          {!loading && profiles.length === 0 && !error && (
            <div className="rounded-2xl border border-dashed border-zinc-800 px-4 py-12 text-center">
              <p className="text-sm text-zinc-600">Aucun candidat pour ce poste.</p>
            </div>
          )}

          {!loading && profiles.length > 0 && (
            <>
              {/* Sort header — aligns with score badges on the right */}
              <div className="flex items-center justify-end gap-2 pr-1">
                {([
                  { field: 'match' as const, label: 'Matching', activeColor: 'text-brand' },
                  { field: 'interview' as const, label: 'Entretien', activeColor: 'text-amber-400' },
                  { field: 'moyenne' as const, label: 'Moyenne', activeColor: 'text-zinc-300' },
                ]).map(({ field, label, activeColor }) => {
                  const active = sortField === field
                  return (
                    <button
                      key={field}
                      onClick={() => handleSort(field)}
                      className={`flex w-[72px] items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-all ${
                        active
                          ? `border-transparent bg-zinc-800 ${activeColor}`
                          : 'border-zinc-800 text-zinc-600 hover:text-zinc-400'
                      }`}
                    >
                      {label}
                      <svg viewBox="0 0 10 12" fill="none" className="h-2.5 w-2.5 shrink-0">
                        {active && sortDir === 'asc' ? (
                          <path d="M5 1v10M2 4l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        ) : active && sortDir === 'desc' ? (
                          <path d="M5 1v10M2 8l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        ) : (
                          <path d="M5 1v10M2 4l3-3 3 3M2 8l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        )}
                      </svg>
                    </button>
                  )
                })}
              </div>

              <div className="space-y-3">
                {[...profiles]
                  .sort((a, b) => {
                    if (!sortField) return 0
                    const getScore = (p: Profile) => {
                      const match = p.key ? (matchScores[p.key] ?? null) : null
                      const interview = extractInterviewScore(p)
                      if (sortField === 'match') return match
                      if (sortField === 'interview') return interview
                      return computeAvg(match, interview)
                    }
                    const sa = getScore(a) ?? -1
                    const sb = getScore(b) ?? -1
                    return sortDir === 'desc' ? sb - sa : sa - sb
                  })
                  .map(p => (
                    <ProfileCard
                      key={p.key ?? p.reference}
                      profile={p}
                      matchScore={p.key ? (matchScores[p.key] ?? null) : null}
                      onClick={() => onOpenProfile(p, p.key ? (matchScores[p.key] ?? null) : null)}
                    />
                  ))}
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  )
}
