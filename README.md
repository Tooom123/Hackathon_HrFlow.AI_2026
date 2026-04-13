# FirstRound

FirstRound is an AI-powered technical pre-screening platform built during the HrFlow.AI 2026 hackathon.

The product covers the full early interview loop:

- a recruiter creates a job from a raw job description
- HrFlow.ai parses and indexes the job
- the backend generates interview questions with a local LLM
- a recruiter shares a candidate link
- a candidate uploads a CV and completes a voice interview
- the recruiter reviews the transcript, answer-by-answer scoring, and CV/job matching

## What The Project Does

FirstRound has two user journeys.

**Recruiter flow**

1. Paste a job description.
2. Generate and validate interview questions.
3. Create a session and share a candidate link.
4. Review candidate profiles, matching score, transcript, and per-question evaluation.

**Candidate flow**

1. Open the shared session link.
2. Upload a CV as PDF.
3. Allow microphone access.
4. Complete the AI-led interview in the browser.

## Main Features

- Job parsing and indexing with HrFlow.ai
- Candidate CV upload and profile parsing with HrFlow.ai
- Interview question generation with a local Ollama model
- Real-time voice interview over WebSocket
- Speech-to-text with `mlx-whisper`
- Voice activity detection with `silero-vad`
- Text-to-speech with `edge-tts`
- Recruiter dashboard to inspect results

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | FastAPI, WebSocket, Pydantic Settings |
| Job and CV parsing | HrFlow.ai |
| LLM | Ollama |
| STT | `mlx-whisper` |
| VAD | `silero-vad` |
| TTS | `edge-tts` |

## Repository Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # REST and WebSocket endpoints
│   │   ├── core/               # app config and model loading
│   │   ├── dependencies/       # FastAPI dependencies
│   │   ├── schemas/            # Pydantic schemas
│   │   └── services/           # HrFlow, interview orchestration, AI services
│   ├── requirements.txt
│   └── scripts/
├── frontend/
│   ├── src/
│   │   ├── api/                # frontend API client
│   │   ├── components/
│   │   ├── pages/              # recruiter and candidate pages
│   │   └── styles/
│   ├── package.json
│   └── public/
└── docs/
    └── architecture.md
```

## Runtime Architecture

For the live interview, audio is streamed from the browser to the backend through a WebSocket pipeline:

```text
Candidate microphone
  -> VAD (detect end of speech)
  -> STT (transcribe spoken answer)
  -> LLM (score answer, evaluate, decide next question or follow-up)
  -> TTS (synthesize spoken response)
  -> audio streamed back to the browser
```

The project currently stores interview sessions in memory in the FastAPI process. That means:

- sessions are lost when the backend restarts
- this setup is suitable for local demo/hackathon usage
- a database or Redis would be needed for production-grade persistence

## Prerequisites

You need the following installed locally:

- Python `3.12+`
- Node.js `18+`
- `npm`
- [Ollama](https://ollama.com/) installed locally
- a working HrFlow.ai account
- a HrFlow.ai API key
- a HrFlow.ai board key for jobs
- a HrFlow.ai source key for profiles

## Clone The Repository

```bash
git clone git@github.com:Tooom123/Hackathon_HrFlow.AI_2026-FirstRound.git firstround
cd firstround
```

## Environment Variables

The backend reads its configuration from `backend/.env` or `.env` at the repository root.

Create `backend/.env` with the following values:

```env
API_KEY=your_hrflow_api_key
USER_EMAIL=your_hrflow_account_email
HRFLOW_BOARD_KEY=your_board_key
HRFLOW_SOURCE_KEY=your_source_key

FRONTEND_BASE_URL=http://localhost:5173

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
OLLAMA_TEMPERATURE=0.3

WHISPER_MODEL=mlx-community/whisper-large-v3-turbo
WHISPER_LANGUAGE=fr

VAD_THRESHOLD=0.5
VAD_MIN_SILENCE_MS=700
VAD_MIN_SPEECH_MS=250
VAD_INPUT_SAMPLE_RATE=24000

TTS_VOICE=fr-FR-HenriNeural
TTS_SAMPLE_RATE=24000
TTS_CHUNK_SIZE=4096
```

### Variable Reference

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `API_KEY` | yes | none | HrFlow.ai API key |
| `USER_EMAIL` | yes | none | HrFlow.ai user email |
| `HRFLOW_BOARD_KEY` | yes | empty | board used to index jobs |
| `HRFLOW_SOURCE_KEY` | yes | empty | source used to index profiles |
| `FRONTEND_BASE_URL` | no | `http://localhost:5173` | used to generate candidate links |
| `OLLAMA_BASE_URL` | no | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | no | `llama3.2` | local model name used for question generation and interview evaluation |
| `WHISPER_MODEL` | no | `mlx-community/whisper-large-v3-turbo` | speech-to-text model |
| `WHISPER_LANGUAGE` | no | `fr` | transcription language |
| `TTS_VOICE` | no | `fr-FR-HenriNeural` | generated voice used during interview |

The frontend optionally supports:

```env
VITE_API_BASE=http://localhost:8000
```

If you do not define it, the frontend defaults to `http://localhost:8000`.

## How To Run The Project Locally

### 1. Start Ollama

Make sure Ollama is installed and running, then pull the model used by the backend:

```bash
ollama pull llama3.2
```

If you want to use another local model, update `OLLAMA_MODEL` in `backend/.env`.

### 2. Start The Backend

From the repository root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend will be available at:

- API root: `http://localhost:8000`
- healthcheck: `http://localhost:8000/health`
- Swagger UI: `http://localhost:8000/docs`

### 3. Start The Frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at:

- app: `http://localhost:5173`

## Recommended Local Startup Order

Use this order to avoid most local issues:

1. Start Ollama.
2. Start the backend.
3. Check `http://localhost:8000/health`.
4. Start the frontend.
5. Open `http://localhost:5173`.

## How To Use The App Locally

### Recruiter Demo

1. Open `http://localhost:5173`.
2. Create a new interview flow from a job description.
3. Review or edit the generated questions.
4. Generate a candidate session link.
5. Copy the candidate link and open it in another browser tab or window.

### Candidate Demo

1. Open the session link.
2. Upload a PDF CV.
3. Allow microphone access in the browser.
4. Complete the voice interview.

### Review Results

After the candidate finishes, the recruiter side can inspect:

- parsed candidate profile
- job/profile matching score
- transcript of answers
- per-question score and evaluation
- overall session score

## Main API Endpoints

### Health

- `GET /health`: basic health check

### HrFlow / jobs

- `GET /hrflow/ping`: test HrFlow.ai connectivity
- `GET /hrflow/jobs`: list indexed jobs
- `POST /hrflow/jobs/parse`: parse raw job text
- `POST /hrflow/jobs/setup`: parse, index, and generate interview questions
- `PUT /hrflow/jobs/questions`: save validated questions to job metadata
- `POST /hrflow/jobs/{job_key}/scoring`: score profiles against a job

### Profiles

- `POST /profiles/apply?job_key=...`: upload a candidate CV
- `GET /profiles/{reference}/status`: poll CV parsing status
- `GET /profiles/job/{job_key}`: list profiles attached to a job

### Interview

- `GET /interview/sessions?job_key=...`: retrieve waiting session for a job
- `POST /interview/sessions?job_key=...`: create a session
- `POST /interview/sessions/{session_id}/join?profile_reference=...`: attach candidate to session
- `GET /interview/sessions/{session_id}`: get session status and results
- `WS /interview/ws/{session_id}`: live interview socket

## Local Development Notes

- CORS is configured for `http://localhost:5173`.
- Candidate CV upload only accepts PDF files.
- Maximum CV file size is `10 MB`.
- The browser must be allowed to access the microphone.
- The frontend expects the backend on port `8000` unless `VITE_API_BASE` is overridden.

## Troubleshooting

### Backend does not start

Check:

- your virtual environment is activated
- dependencies were installed with `pip install -r requirements.txt`
- `backend/.env` exists and contains valid HrFlow.ai credentials

### HrFlow requests fail

Check:

- `API_KEY` is valid
- `USER_EMAIL` matches the HrFlow.ai account
- `HRFLOW_BOARD_KEY` and `HRFLOW_SOURCE_KEY` point to existing resources
- `GET /hrflow/ping` returns a successful response

### Ollama errors or missing model

Check:

- Ollama is running locally
- the configured model exists locally
- `OLLAMA_BASE_URL` matches the local Ollama server

Useful command:

```bash
ollama list
```

### Candidate cannot start interview

Check:

- the backend is running
- the session exists and has not been lost after a backend restart
- the browser granted microphone access
- the candidate uploaded a valid PDF file

### No audio or broken interview flow

Check:

- browser microphone permissions
- local audio output
- WebSocket connectivity to `ws://localhost:8000/interview/ws/<session_id>`
- model loading logs in the backend terminal

## Project Limits

This repository is currently optimized for demo/local usage rather than production. Important limits:

- no persistent storage for sessions
- no authentication layer
- no deployment configuration
- no job queue for long-running AI tasks
- no production hardening around retries, observability, or scaling

## Additional Documentation

- Backend notes: [backend/README.md](/Users/elouan/Documents/Hackathon_HrFlow.AI_2026/backend/README.md)
- Frontend notes: [frontend/README.md](/Users/elouan/Documents/Hackathon_HrFlow.AI_2026/frontend/README.md)
- Architecture notes: [docs/architecture.md](/Users/elouan/Documents/Hackathon_HrFlow.AI_2026/docs/architecture.md)

## Quick Start

If you just want the shortest path to a local demo:

```bash
# terminal 1
ollama pull llama3.2

# terminal 2
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# terminal 3
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173`.
