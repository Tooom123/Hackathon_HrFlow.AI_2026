const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

export interface SetupJobRequest {
  text: string
  title: string
  question_count: number
  board_key?: string
}

export interface SetupJobResponse {
  job_key: string
  job_reference: string
  job_title: string
  questions: string[]
}

export interface JobCard {
  key: string
  reference: string
  name: string
  summary?: string
  location?: { text?: string }
  skills?: { name: string; type?: string }[]
  languages?: { name: string; value?: string }[]
  sections?: { name: string; title?: string; description?: string }[]
  tags?: { name: string; value?: string }[]
  ranges_float?: { name: string; value_min?: number; value_max?: number; unit?: string }[]
  ranges_date?: { name: string; value_min?: string; value_max?: string }[]
  metadatas?: { name: string; value: string }[]
  created_at?: string
  updated_at?: string
}

export interface ProfileMetadata {
  name: string
  value: string
}

export interface Profile {
  key: string
  reference: string
  info?: {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    summary?: string
    location?: { text?: string }
    picture?: string
  }
  experiences?: { title?: string; company?: string; description?: string; date_start?: string; date_end?: string }[]
  educations?: { title?: string; school?: string; description?: string; date_start?: string; date_end?: string }[]
  skills?: { name: string; type?: string }[]
  languages?: { name: string; value?: string }[]
  attachments?: { type?: string; file_name?: string; file_url?: string; public_url?: string }[]
  metadatas?: ProfileMetadata[]
  created_at?: string
}

export async function scoreProfiles(job_key: string, profiles: Profile[]): Promise<Record<string, number>> {
  if (!profiles.length) return {}
  const res = await fetch(`${API_BASE}/hrflow/jobs/${job_key}/scoring`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profiles }),
  })
  if (!res.ok) return {}
  const data = await res.json()
  return data.scores ?? {}
}

export async function getProfilesForJob(job_key: string, page = 1, limit = 30): Promise<{ profiles: Profile[]; total: number }> {
  const res = await fetch(`${API_BASE}/profiles/job/${job_key}?page=${page}&limit=${limit}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `Erreur serveur (${res.status})`)
  }
  const data = await res.json()
  return {
    profiles: (data?.data?.profiles ?? []) as Profile[],
    total: data?.meta?.total ?? 0,
  }
}

export async function getJobDetail(job_key: string): Promise<JobCard> {
  const res = await fetch(`${API_BASE}/hrflow/jobs/${encodeURIComponent(job_key)}`)
  if (!res.ok) throw new Error(`Job ${job_key} introuvable`)
  return res.json()
}

export async function listJobs(page = 1, limit = 30): Promise<JobCard[]> {
  const res = await fetch(`${API_BASE}/hrflow/jobs?page=${page}&limit=${limit}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `Erreur serveur (${res.status})`)
  }
  const data = await res.json()
  return (data?.data?.jobs ?? []) as JobCard[]
}

export async function setupJobInterview(data: SetupJobRequest): Promise<SetupJobResponse> {
  const res = await fetch(`${API_BASE}/hrflow/jobs/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `Erreur serveur (${res.status})`)
  }
  return res.json()
}

export async function saveQuestions(job_key: string, job_title: string, questions: string[], board_key?: string): Promise<void> {
  const body = JSON.stringify({ job_key, job_title, questions, board_key })
  const res = await fetch(`${API_BASE}/hrflow/jobs/questions`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `Erreur serveur (${res.status})`)
  }
}

// ── Interview session (recruiter creates, candidate joins) ──

export interface CreateSessionResponse {
  session_id: string
  job_key: string
  job_title: string
  state: string
  total_questions: number
  candidate_link: string
}

export async function getSessionForJob(job_key: string): Promise<CreateSessionResponse | null> {
  const res = await fetch(`${API_BASE}/interview/sessions?job_key=${encodeURIComponent(job_key)}`)
  if (!res.ok) return null
  const data = await res.json()
  return data.session ?? null
}

export async function createInterviewSession(job_key: string): Promise<CreateSessionResponse> {
  const res = await fetch(`${API_BASE}/interview/sessions?job_key=${encodeURIComponent(job_key)}`, {
    method: 'POST',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `Erreur serveur (${res.status})`)
  }
  return res.json()
}

export interface ApplyResponse {
  profile_reference: string
  job_key: string
  message: string
}

export async function uploadCV(file: File, job_key: string): Promise<ApplyResponse> {
  const form = new FormData()
  form.append('cv', file)
  const res = await fetch(`${API_BASE}/profiles/apply?job_key=${encodeURIComponent(job_key)}`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `Erreur serveur (${res.status})`)
  }
  return res.json()
}

export interface JoinSessionResponse {
  session_id: string
  state: string
  total_questions: number
  ws_url: string
}

export async function joinInterviewSession(session_id: string, profile_reference: string, candidate_email?: string): Promise<JoinSessionResponse> {
  const params = new URLSearchParams({ profile_reference })
  if (candidate_email) params.set('candidate_email', candidate_email)
  const res = await fetch(
    `${API_BASE}/interview/sessions/${encodeURIComponent(session_id)}/join?${params}`,
    { method: 'POST' },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `Erreur serveur (${res.status})`)
  }
  return res.json()
}

export interface SessionStatus {
  session_id: string
  job_key: string
  job_title: string
  state: string
  total_questions: number
  current_question_index: number
  answers_count: number
  global_score: number | null
}

export async function getSessionStatus(session_id: string): Promise<SessionStatus> {
  const res = await fetch(`${API_BASE}/interview/sessions/${encodeURIComponent(session_id)}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `Erreur serveur (${res.status})`)
  }
  return res.json()
}

export function buildWsUrl(session_id: string): string {
  const base = API_BASE.replace(/^http/, 'ws')
  return `${base}/interview/ws/${session_id}`
}
