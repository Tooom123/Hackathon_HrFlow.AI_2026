const API_BASE = 'http://localhost:8000'

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
  skills?: { name: string }[]
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
    location?: { text?: string }
    picture?: string
  }
  experiences?: { title?: string; company?: string; date_start?: string; date_end?: string }[]
  educations?: { title?: string; school?: string; date_start?: string; date_end?: string }[]
  skills?: { name: string; type?: string }[]
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
  console.log('[saveQuestions] PUT', `${API_BASE}/hrflow/jobs/questions`, body)
  const res = await fetch(`${API_BASE}/hrflow/jobs/questions`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  console.log('[saveQuestions] response status:', res.status)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `Erreur serveur (${res.status})`)
  }
}
