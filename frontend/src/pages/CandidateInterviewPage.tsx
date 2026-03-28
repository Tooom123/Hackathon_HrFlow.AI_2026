import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { buildWsUrl } from '../api/hrflow'

type SessionState = 'connecting' | 'ready' | 'asking' | 'listening' | 'processing' | 'done' | 'error'

interface ChatMessage {
  id: number
  role: 'ai' | 'user'
  text: string
}

// ── Sub-components ──

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand">
        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
          <circle cx="8" cy="8" r="5.5" stroke="white" strokeWidth="1.5" />
          <path d="M8 5v3.5l2 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <span className="text-sm font-semibold tracking-tight text-zinc-100">
        First<span className="text-brand">Round</span>
      </span>
    </div>
  )
}

function StateBadge({ state }: { state: SessionState }) {
  const config: Record<SessionState, { label: string; color: string }> = {
    connecting: { label: 'Connexion…', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    ready: { label: 'Prêt', color: 'bg-brand/10 text-brand border-brand/20' },
    asking: { label: 'Question en cours', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    listening: { label: 'À vous de parler', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
    processing: { label: 'Analyse…', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    done: { label: 'Terminé', color: 'bg-brand/10 text-brand border-brand/20' },
    error: { label: 'Erreur', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  }
  const { label, color } = config[state]
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

function ConnectingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      {/* Pulsing logo */}
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-brand/20" style={{ animationDuration: '2s' }} />
        <div className="absolute -inset-4 animate-pulse rounded-full bg-brand/5" style={{ animationDuration: '3s' }} />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand/10 border border-brand/20">
          <svg viewBox="0 0 16 16" fill="none" className="h-10 w-10 text-brand">
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Préparation de l'entretien
        </h1>
        <p className="text-sm text-zinc-500 max-w-xs mx-auto leading-relaxed">
          Connexion au serveur, vérification du micro et chargement des questions…
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-3 w-full max-w-xs">
        {['Connexion au serveur', 'Initialisation audio', 'Chargement des questions'].map((step, i) => (
          <div key={step} className="flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-4 py-3"
            style={{ animationDelay: `${i * 0.3}s` }}>
            <svg className="h-4 w-4 shrink-0 animate-spin text-brand" viewBox="0 0 24 24" fill="none"
              style={{ animationDelay: `${i * 0.15}s` }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-sm text-zinc-400">{step}</span>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="flex items-center gap-2 rounded-lg bg-zinc-900/50 px-4 py-2.5 border border-zinc-800/40">
        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0 text-zinc-600">
          <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
        </svg>
        <p className="text-xs text-zinc-600">
          Autorisez l'accès au microphone lorsque le navigateur le demande
        </p>
      </div>
    </div>
  )
}

function AiBubble({ text, isPlaying }: { text: string; isPlaying: boolean }) {
  return (
    <div className="flex items-start gap-3 max-w-[85%]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10">
        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-brand">
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="space-y-1.5">
        <div className="rounded-2xl rounded-tl-md border border-zinc-800 bg-zinc-900 px-4 py-3">
          <p className="text-sm leading-relaxed text-zinc-100">{text}</p>
        </div>
        {isPlaying && (
          <div className="flex items-center gap-1.5 px-1">
            <div className="flex items-center gap-0.5">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 rounded-full bg-brand"
                  style={{ animation: `audio-bar 0.5s ease-in-out ${i * 0.12}s infinite alternate` }}
                />
              ))}
            </div>
            <span className="text-[11px] text-zinc-500">Lecture audio…</span>
          </div>
        )}
      </div>
    </div>
  )
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-brand/15 border border-brand/20 px-4 py-3">
        <p className="text-sm leading-relaxed text-zinc-100">{text}</p>
      </div>
    </div>
  )
}

function ListeningIndicator() {
  return (
    <div className="flex justify-end">
      <div className="flex items-center gap-2 rounded-2xl rounded-tr-md border border-green-500/20 bg-green-500/5 px-4 py-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
        </span>
        <div className="flex items-center gap-0.5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-0.5 rounded-full bg-green-400"
              style={{ animation: `audio-bar 0.6s ease-in-out ${i * 0.1}s infinite alternate` }}
            />
          ))}
        </div>
        <span className="text-xs text-green-400">Enregistrement…</span>
      </div>
    </div>
  )
}

// ── Main component ──

export default function CandidateInterviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>()

  const [state, setState] = useState<SessionState>('connecting')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState<string | null>(null)
  const [globalScore, setGlobalScore] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioQueueRef = useRef<{ buffer: AudioBuffer; resolve: () => void }[]>([])
  const isPlayingRef = useRef(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const msgIdRef = useRef(0)
  const stateRef = useRef<SessionState>('connecting')

  // When true, mic should start as soon as audio finishes
  const pendingMicStartRef = useRef(false)

  // Keep stateRef in sync
  useEffect(() => { stateRef.current = state }, [state])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, state, liveTranscript])

  function addMessage(role: 'ai' | 'user', text: string) {
    const id = ++msgIdRef.current
    setMessages(prev => [...prev, { id, role, text }])
  }

  // ── Audio context ──
  function getAudioContext(): AudioContext {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 })
    }
    return audioContextRef.current
  }

  // ── Microphone ──
  const stopMicrophone = useCallback(() => {
    pendingMicStartRef.current = false
    processorRef.current?.disconnect()
    processorRef.current = null
    mediaStreamRef.current?.getTracks().forEach(t => t.stop())
    mediaStreamRef.current = null
  }, [])

  const startMicrophone = useCallback(async () => {
    // If audio is still playing, defer — mic will start when playback ends
    if (isPlayingRef.current) {
      pendingMicStartRef.current = true
      return
    }

    pendingMicStartRef.current = false

    // Already running
    if (processorRef.current) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 24000, channelCount: 1 },
      })
      mediaStreamRef.current = stream

      const ctx = getAudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        // Hard guard: only send audio in listening state AND when nothing is playing
        if (wsRef.current?.readyState !== WebSocket.OPEN) return
        if (stateRef.current !== 'listening') return
        if (isPlayingRef.current) return

        const float32 = e.inputBuffer.getChannelData(0)
        const int16 = new Int16Array(float32.length)
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]))
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }
        wsRef.current.send(int16.buffer)
      }

      source.connect(processor)
      processor.connect(ctx.destination)
    } catch {
      setError("Impossible d'accéder au microphone. Vérifiez les permissions.")
      setState('error')
    }
  }, [stopMicrophone])

  // ── Sequential audio playback queue ──
  const onPlaybackFinished = useCallback(() => {
    isPlayingRef.current = false
    setIsAudioPlaying(false)

    // Audio done — if mic was waiting, start it now
    if (pendingMicStartRef.current && stateRef.current === 'listening') {
      startMicrophone()
    }
  }, [startMicrophone])

  const playNext = useCallback(() => {
    const next = audioQueueRef.current.shift()
    if (!next) {
      onPlaybackFinished()
      return
    }
    const ctx = getAudioContext()
    const source = ctx.createBufferSource()
    source.buffer = next.buffer
    source.connect(ctx.destination)
    source.onended = () => {
      next.resolve()
      playNext()
    }
    source.start()
  }, [onPlaybackFinished])

  const enqueueAudio = useCallback((base64: string) => {
    const ctx = getAudioContext()
    const raw = atob(base64)
    const int16 = new Int16Array(raw.length / 2)
    for (let i = 0; i < int16.length; i++) {
      int16[i] = raw.charCodeAt(i * 2) | (raw.charCodeAt(i * 2 + 1) << 8)
    }
    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 0x8000
    }
    const buffer = ctx.createBuffer(1, float32.length, 24000)
    buffer.copyToChannel(float32, 0)

    return new Promise<void>(resolve => {
      audioQueueRef.current.push({ buffer, resolve })
      if (!isPlayingRef.current) {
        isPlayingRef.current = true
        setIsAudioPlaying(true)
        playNext()
      }
    })
  }, [playNext])

  // ── WebSocket ──
  useEffect(() => {
    if (!sessionId) return

    const ws = new WebSocket(buildWsUrl(sessionId))
    wsRef.current = ws

    ws.onopen = () => setState('ready')

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      switch (msg.type) {
        case 'state_change': {
          const newState = msg.state as SessionState
          setState(newState)

          if (newState === 'listening') {
            setLiveTranscript(null)
            // Start mic — will defer if audio is still playing
            startMicrophone()
          } else if (newState === 'asking' || newState === 'processing' || newState === 'done') {
            stopMicrophone()
          }

          if (newState === 'done' && msg.global_score != null) {
            setGlobalScore(msg.global_score)
          }
          break
        }
        case 'question_text':
          addMessage('ai', msg.text)
          break
        case 'audio_chunk':
          enqueueAudio(msg.audio)
          break
        case 'transcript':
          setLiveTranscript(msg.text)
          if (msg.text) {
            addMessage('user', msg.text)
            setLiveTranscript(null)
          }
          break
        case 'error':
          setError(msg.message)
          setState('error')
          break
      }
    }

    ws.onclose = () => {
      stopMicrophone()
      setState(prev => (prev === 'done' || prev === 'error') ? prev : 'error')
      if (stateRef.current !== 'done' && stateRef.current !== 'error') {
        setError('Connexion perdue')
      }
    }

    ws.onerror = () => {
      setState('error')
      setError('Erreur de connexion WebSocket')
    }

    return () => {
      stopMicrophone()
      ws.close()
    }
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ──

  // Full-screen loading
  if (state === 'connecting' || state === 'ready') {
    return <ConnectingScreen />
  }

  const lastAiIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'ai') return i
    }
    return -1
  })()

  return (
    <div className="flex min-h-screen flex-col text-zinc-50">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-800/60 bg-zinc-950/80 px-6 backdrop-blur-md">
        <Logo />
        <StateBadge state={state} />
        <div className="w-24" />
      </header>

      {/* Chat area */}
      <main className="flex-1 overflow-y-auto px-4 pb-32 pt-20">
        <div className="mx-auto w-full max-w-2xl space-y-4">

          {/* Chat messages */}
          {messages.map((msg, i) => (
            msg.role === 'ai'
              ? <AiBubble
                  key={msg.id}
                  text={msg.text}
                  isPlaying={isAudioPlaying && i === lastAiIdx}
                />
              : <UserBubble key={msg.id} text={msg.text} />
          ))}

          {/* Live listening indicator */}
          {state === 'listening' && !isAudioPlaying && <ListeningIndicator />}

          {/* Live transcript preview */}
          {state === 'listening' && liveTranscript && (
            <div className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-tr-md border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm italic text-zinc-500">
                {liveTranscript}
              </p>
            </div>
          )}

          {/* Processing indicator */}
          {state === 'processing' && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10">
                <svg className="h-4 w-4 animate-spin text-brand" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
              <div className="rounded-2xl rounded-tl-md border border-zinc-800 bg-zinc-900 px-4 py-3">
                <p className="text-sm text-zinc-500">Analyse de votre réponse…</p>
              </div>
            </div>
          )}

          {/* Done */}
          {state === 'done' && (
            <div className="rounded-2xl border border-brand/30 bg-brand/5 p-8 text-center space-y-4 mt-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/10">
                <svg viewBox="0 0 16 16" fill="none" className="h-7 w-7 text-brand">
                  <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-zinc-100">Entretien terminé</h2>
              <p className="text-sm text-zinc-400">
                Merci pour votre participation. Le recruteur recevra vos résultats.
              </p>
              {globalScore != null && (
                <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-2">
                  <span className="text-sm font-medium text-zinc-300">Score global</span>
                  <span className="text-lg font-bold text-brand">{globalScore.toFixed(1)}/10</span>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && state === 'error' && (
            <div className="flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3">
              <span className="text-red-400 text-sm mt-px">⚠</span>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </main>

      {/* Bottom bar — mic status */}
      {state !== 'done' && state !== 'error' && (
        <div className="fixed inset-x-0 bottom-0 border-t border-zinc-800/60 bg-zinc-950/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-2xl items-center justify-center gap-3 px-4 py-4">
            {state === 'listening' && !isAudioPlaying ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                </span>
                <span className="text-sm font-medium text-green-400">Micro actif — parlez maintenant</span>
              </>
            ) : state === 'asking' || isAudioPlaying ? (
              <>
                <div className="flex items-center gap-0.5">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="w-0.5 rounded-full bg-blue-400"
                      style={{ animation: `audio-bar 0.5s ease-in-out ${i * 0.12}s infinite alternate` }}
                    />
                  ))}
                </div>
                <span className="text-sm text-zinc-400">L'IA pose une question…</span>
                <span className="rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-[11px] font-medium text-red-400">
                  Micro coupé
                </span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 animate-spin text-amber-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="text-sm text-zinc-500">Traitement en cours…</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
