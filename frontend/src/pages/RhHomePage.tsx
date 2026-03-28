import { useEffect, useState } from 'react'
import { listJobs, type JobCard } from '../api/hrflow'

interface Props {
  recentJob: JobCard | null
  onNewSession: () => void
  onOpenJob: (job: JobCard) => void
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

function SkillBadge({ name }: { name: string }) {
  return (
    <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
      {name}
    </span>
  )
}

function JobCardItem({ job, onClick }: { job: JobCard; onClick: () => void }) {
  const skills = job.skills?.slice(0, 3) ?? []
  const hasMore = (job.skills?.length ?? 0) > 3
  const date = job.updated_at ?? job.created_at
  const formattedDate = date
    ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    : null

  return (
    <button
      onClick={onClick}
      className="group relative w-full overflow-hidden text-left rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition-all hover:border-zinc-700 active:scale-[0.98]"
      style={{
        background: 'linear-gradient(135deg, rgba(39,39,42,0.95) 0%, rgba(24,24,27,0.98) 100%)',
        boxShadow: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      {/* Glossy highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/[0.03] to-transparent rounded-t-2xl" />

      <div className="relative space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-snug text-zinc-100 group-hover:text-white line-clamp-2">
            {job.name}
          </p>
          <svg
            viewBox="0 0 16 16" fill="none"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-700 transition-all group-hover:translate-x-0.5 group-hover:text-brand"
          >
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {job.summary && (
          <p className="text-xs leading-relaxed text-zinc-500 line-clamp-2">{job.summary}</p>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {skills.map(s => <SkillBadge key={s.name} name={s.name} />)}
            {hasMore && (
              <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                +{(job.skills?.length ?? 0) - 3}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {job.location?.text && (
              <span className="flex items-center gap-0.5 text-[11px] text-zinc-600">
                <svg viewBox="0 0 16 16" fill="none" className="h-2.5 w-2.5">
                  <path d="M8 1.5A4.5 4.5 0 0 1 12.5 6c0 3-4.5 8.5-4.5 8.5S3.5 9 3.5 6A4.5 4.5 0 0 1 8 1.5Z" stroke="currentColor" strokeWidth="1.3" />
                  <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                </svg>
                {job.location.text}
              </span>
            )}
            {formattedDate && (
              <span className="text-[11px] text-zinc-700">{formattedDate}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

export default function RhHomePage({ recentJob, onNewSession, onOpenJob }: Props) {
  const [jobs, setJobs] = useState<JobCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listJobs()
      .then(fetched => {
        if (recentJob) {
          const alreadyIn = fetched.some(j => j.key === recentJob.key)
          setJobs(alreadyIn ? fetched : [recentJob, ...fetched])
        } else {
          setJobs(fetched)
        }
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen text-zinc-50">
      <header className="fixed inset-x-0 top-0 z-10 flex h-28 items-center justify-between border-b border-zinc-800/60 bg-zinc-950/80 px-10 backdrop-blur-md">
        <Logo />
        <span className="text-xl font-bold text-brand hidden sm:block">Espace recruteur</span>
        <button
          onClick={onNewSession}
          className="flex items-center gap-2.5 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-zinc-950 transition-all hover:bg-brand-dim active:scale-[0.99]"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Nouvelle session
        </button>
      </header>

      <main className="flex min-h-screen items-start justify-center px-8 pb-16 pt-40">
        <div className="w-full max-w-6xl space-y-6">

          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Sessions d'entretien</h1>
            <p className="text-sm text-zinc-500">
              {loading ? 'Chargement…' : `${jobs.length} offre${jobs.length !== 1 ? 's' : ''} sur le board`}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3">
              <span className="text-red-400 text-sm">⚠</span>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {loading && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-28 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" />
              ))}
            </div>
          )}

          {!loading && jobs.length === 0 && !error && (
            <div className="rounded-2xl border border-dashed border-zinc-800 px-4 py-12 text-center">
              <p className="text-sm text-zinc-600">Aucune offre indexée sur ce board.</p>
              <button
                onClick={onNewSession}
                className="mt-4 text-sm font-medium text-brand transition-colors hover:text-brand/80"
              >
                Créer la première session →
              </button>
            </div>
          )}

          {!loading && jobs.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map(job => (
                <JobCardItem key={job.key} job={job} onClick={() => onOpenJob(job)} />
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
