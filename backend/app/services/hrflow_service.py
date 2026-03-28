from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

import httpx

from app.core.config import settings

HRFLOW_API_BASE = "https://api.hrflow.ai/v1"
logger = logging.getLogger(__name__)


def _auth_headers() -> dict:
    return {
        "accept": "application/json",
        "X-API-KEY": settings.api_key,
        "X-USER-EMAIL": settings.user_email,
    }


class HrFlowService:

    # ------------------------------------------------------------------
    # Auth
    # ------------------------------------------------------------------

    async def check_connection(self) -> dict:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{HRFLOW_API_BASE}/auth",
                headers=_auth_headers(),
            )
            response.raise_for_status()
            return response.json()

    # ------------------------------------------------------------------
    # Text parsing
    # ------------------------------------------------------------------

    async def parse_text(self, text: str, language: str = "fr") -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{HRFLOW_API_BASE}/text/parsing",
                headers={**_auth_headers(), "content-type": "application/json"},
                json={"text": text, "language": language},
            )
            response.raise_for_status()
            return response.json()

    # ------------------------------------------------------------------
    # Jobs
    # ------------------------------------------------------------------

    async def create_job_from_text(
        self,
        text: str,
        title: str,
        board_key: Optional[str] = None,
        reference: Optional[str] = None,
    ) -> dict:
        """Parse text → build job object → index on board."""
        resolved_board_key = board_key or settings.hrflow_board_key
        if not resolved_board_key:
            raise ValueError("board_key requis (paramètre ou HRFLOW_BOARD_KEY dans .env)")

        # 1. Parse
        parse_result = await self.parse_text(text)
        raw_data = parse_result.get("data") if isinstance(parse_result, dict) else None
        parsing = raw_data.get("parsing", {}) if isinstance(raw_data, dict) else {}

        skills = [
            {"name": s["name"], "type": s.get("type")}
            for s in (parsing.get("skills", []) if isinstance(parsing, dict) else [])
            if isinstance(s, dict) and s.get("name")
        ]
        raw_locations = parsing.get("locations", []) if isinstance(parsing, dict) else []
        first_loc = raw_locations[0] if raw_locations and isinstance(raw_locations[0], dict) else {}
        loc: dict = {"text": first_loc.get("text") or ""}
        if first_loc.get("lat") is not None:
            loc["lat"] = first_loc["lat"]
        if first_loc.get("lng") is not None:
            loc["lng"] = first_loc["lng"]

        # 2. Build job payload (flat, board_key at root — format HrFlow SDK)
        job_ref = reference or f"job-{uuid.uuid4().hex[:8]}"
        payload = {
            "board_key": resolved_board_key,
            "key": str(uuid.uuid4()),
            "reference": job_ref,
            "name": title,
            "location": loc,
            "sections": [{"name": "description", "title": "Description du poste", "description": text}],
            "skills": skills,
        }

        # 3. Index
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{HRFLOW_API_BASE}/job/indexing",
                headers={**_auth_headers(), "content-type": "application/json"},
                json=payload,
            )
            response.raise_for_status()
            return response.json()

    async def ask_job(
        self,
        prompt: str,
        board_key: Optional[str] = None,
        job_key: Optional[str] = None,
        job_reference: Optional[str] = None,
    ) -> dict:
        resolved_board_key = board_key or settings.hrflow_board_key
        if not resolved_board_key:
            raise ValueError("board_key requis (paramètre ou HRFLOW_BOARD_KEY dans .env)")
        if not job_key and not job_reference:
            raise ValueError("job_key ou job_reference requis")

        params: list[tuple[str, str]] = [("board_key", resolved_board_key)]
        if job_key:
            params.append(("key", job_key))
        if job_reference:
            params.append(("reference", job_reference))
        params.append(("questions", prompt))

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{HRFLOW_API_BASE}/job/asking",
                headers=_auth_headers(),
                params=params,
            )
            response.raise_for_status()
            return response.json()

    async def setup_job_interview(
        self,
        text: str,
        title: str,
        question_count: int,
        board_key: Optional[str] = None,
    ) -> dict:
        """Flow complet RH : parse → indexe → génère N questions techniques."""
        # 1. Indexer
        index_result = await self.create_job_from_text(text, title, board_key)
        logger.info("[setup] index code=%s message=%s", index_result.get("code"), index_result.get("message"))

        raw_job = index_result.get("data") if isinstance(index_result, dict) else None
        job_data = raw_job if isinstance(raw_job, dict) else {}
        job_key = job_data.get("key", "")
        job_reference = job_data.get("reference", "")
        logger.info("[setup] job_key=%r job_reference=%r", job_key, job_reference)

        if not job_key:
            logger.error("[setup] ABORT: job_key vide")
            return {"job_key": "", "job_reference": job_reference, "questions": []}

        # 2. Ask questions
        prompt = (
            f"À partir de cette offre d'emploi, génère exactement {question_count} questions "
            f"techniques pertinentes pour évaluer un candidat lors d'un entretien. "
            f"Réponds uniquement avec les questions, une par ligne, sans introduction ni commentaire."
        )
        ask_result = await self.ask_job(prompt=prompt, board_key=board_key, job_key=job_key)
        logger.info("[setup] ask_result: %s", ask_result)

        questions = self._extract_questions(ask_result, question_count)
        logger.info("[setup] %d questions extraites", len(questions))

        return {"job_key": job_key, "job_reference": job_reference, "job_title": title, "questions": questions}

    def _extract_questions(self, ask_result: dict, expected: int) -> list[str]:
        raw_data = ask_result.get("data") if isinstance(ask_result, dict) else None

        if isinstance(raw_data, list):
            answer_text = "\n".join(str(i) for i in raw_data if i)
        elif isinstance(raw_data, dict):
            ql = raw_data.get("questions", [])
            answer_text = ql[0].get("answer", "") if ql and isinstance(ql[0], dict) else (
                raw_data.get("answer", "") or raw_data.get("message", "")
            )
        elif isinstance(raw_data, str):
            answer_text = raw_data
        else:
            return []

        # Normalise les \n littéraux
        answer_text = answer_text.replace("\\n", "\n")
        lines = [l.strip() for l in answer_text.splitlines() if l.strip()]

        # Fallback si tout est sur une ligne : découpe sur les numéros
        if len(lines) == 1:
            lines = [p.strip() for p in re.split(r"(?<=[?!.])\s+(?=\d+[.)])", lines[0]) if p.strip()]

        questions: list[str] = []
        for line in lines:
            cleaned = re.sub(r"^[\d]+[.)]\s*|^[-•*]\s*", "", line).strip()
            if cleaned:
                questions.append(cleaned)

        return questions[:expected]

    async def save_questions_to_job(
        self,
        job_key: str,
        questions: list[str],
        job_title: str,
        board_key: Optional[str] = None,
    ) -> dict:
        """Persiste les questions finales comme metadata du job (PUT /job/indexing).

        Fetches the existing job first to get all required fields, then PUTs
        back the full object with metadatas updated.
        """
        resolved_board_key = board_key or settings.hrflow_board_key
        if not resolved_board_key:
            raise ValueError("board_key requis")

        # 1. GET existing job to retrieve all required fields
        async with httpx.AsyncClient(timeout=30.0) as client:
            get_resp = await client.get(
                f"{HRFLOW_API_BASE}/job/indexing",
                headers=_auth_headers(),
                params={"board_key": resolved_board_key, "key": job_key},
            )
            logger.info("[save_questions] GET job status=%s", get_resp.status_code)
            if not get_resp.is_success:
                raise ValueError(f"HrFlow GET job {get_resp.status_code}: {get_resp.text}")
            job_data = (get_resp.json().get("data") or {})

        # 2. Build metadata list
        metadata = [{"name": f"question_{i + 1}", "value": q} for i, q in enumerate(questions)]

        # 3. PUT full job object with updated metadata
        payload = {
            "board_key": resolved_board_key,
            "key": job_key,
            "reference": job_data.get("reference", ""),
            "name": job_data.get("name") or job_title,
            "location": job_data.get("location") or {"text": ""},
            "sections": job_data.get("sections") or [],
            "skills": job_data.get("skills") or [],
            "metadatas": metadata,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.put(
                f"{HRFLOW_API_BASE}/job/indexing",
                headers={**_auth_headers(), "content-type": "application/json"},
                json=payload,
            )
            logger.info("[save_questions] PUT status=%s body=%s", response.status_code, response.text)
            if not response.is_success:
                raise ValueError(f"HrFlow {response.status_code}: {response.text}")
            return response.json()

    # ------------------------------------------------------------------
    # Job questions (read from metadata)
    # ------------------------------------------------------------------

    async def get_job_questions(
        self,
        job_key: str,
        board_key: Optional[str] = None,
        question_count: int = 20,
    ) -> tuple[list[str], str]:
        """Fetch questions for a job.

        Strategy:
        1. Try to read questions from job metadata (question_0 … question_N)
        2. Fallback: generate questions on the fly via /job/asking

        Returns:
            (questions list, job_title)
        """
        resolved_board_key = board_key or settings.hrflow_board_key
        headers = _auth_headers()

        # --- Try fetching job data for metadata + title ---
        job_title = ""
        questions: list[str] = []

        try:
            params = {"board_key": resolved_board_key, "key": job_key}
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{HRFLOW_API_BASE}/job/indexing",
                    headers=headers,
                    params=params,
                )
                response.raise_for_status()
                data = response.json()

            job_data = data.get("data") or {}
            job_title = job_data.get("name", "")

            # Extract questions from metadata (question_0 … question_N)
            metadatas = job_data.get("metadatas") or []
            question_map: dict[int, str] = {}
            for meta in metadatas:
                name = meta.get("name", "")
                if name.startswith("question_"):
                    try:
                        idx = int(name.split("_", 1)[1])
                        question_map[idx] = meta.get("value", "")
                    except (ValueError, IndexError):
                        continue

            questions = [question_map[k] for k in sorted(question_map.keys())]
        except Exception:
            logger.warning("[get_job_questions] Could not fetch job metadata for %s, will fallback to generation", job_key)

        if questions:
            return questions, job_title

        # --- Fallback: generate questions via ask_job ---
        logger.info("[get_job_questions] No metadata questions found, generating via ask_job")
        prompt = (
            f"À partir de cette offre d'emploi, génère exactement {question_count} questions "
            f"techniques pertinentes pour évaluer un candidat lors d'un entretien. "
            f"Réponds uniquement avec les questions, une par ligne, sans introduction ni commentaire."
        )
        ask_result = await self.ask_job(
            prompt=prompt,
            board_key=resolved_board_key,
            job_key=job_key,
        )
        questions = self._extract_questions(ask_result, question_count)

        return questions, job_title or f"Job {job_key}"

    # ------------------------------------------------------------------
    # Interview results → profile metadata
    # ------------------------------------------------------------------

    async def save_interview_to_profile(
        self,
        profile_reference: str,
        answers: list[dict],
        global_score: float,
        source_key: Optional[str] = None,
    ) -> dict:
        """Persist interview answers + scores as metadata on the HrFlow profile.

        Metadata written:
            interview_question_N   → question text
            interview_answer_N     → candidate transcript
            interview_score_N      → score 0-10
            interview_evaluation_N → LLM evaluation
            interview_global_score → average score (rounded, 0-10)
            interview_completed_at → ISO timestamp

        Args:
            profile_reference: Reference returned by /profiles/apply.
            answers: List of dicts with keys question, transcript, score, evaluation.
            global_score: Pre-computed average score.
        """
        from datetime import datetime, timezone

        resolved_source_key = source_key or settings.hrflow_source_key
        headers = _auth_headers()

        # 1. GET profile by reference to retrieve key + required info fields
        async with httpx.AsyncClient(timeout=30.0) as client:
            get_resp = await client.get(
                f"{HRFLOW_API_BASE}/profile/indexing",
                headers=headers,
                params={"source_key": resolved_source_key, "reference": profile_reference},
            )
            logger.info("[save_interview] GET profile status=%s body=%s", get_resp.status_code, get_resp.text[:300])
            if not get_resp.is_success:
                raise ValueError(f"HrFlow GET profile {get_resp.status_code}: {get_resp.text}")
            profile_data = get_resp.json().get("data") or {}

        if not profile_data:
            raise ValueError(f"Profile not found for reference: {profile_reference}")

        profile_key = profile_data.get("key", "")
        info = profile_data.get("info") or {}
        logger.info("[save_interview] profile_key=%r info_keys=%s", profile_key, list(info.keys()))

        # 2. Build metadata list with answers + scores
        metadatas: list[dict] = []
        for i, answer in enumerate(answers):
            metadatas += [
                {"name": f"interview_question_{i}", "value": answer.get("question", "")},
                {"name": f"interview_answer_{i}", "value": answer.get("transcript", "")},
                {"name": f"interview_score_{i}", "value": str(answer.get("score", 0))},
                {"name": f"interview_evaluation_{i}", "value": answer.get("evaluation", "")},
            ]

        metadatas += [
            {"name": "interview_global_score", "value": str(round(global_score, 1))},
            {"name": "interview_completed_at", "value": datetime.now(timezone.utc).isoformat()},
        ]

        # 3. PUT profile — keep all existing fields, only override metadatas
        payload = {
            "source_key": resolved_source_key,
            "profile": {
                "key": profile_key,
                "reference": profile_reference,
                "info": {
                    "full_name": info.get("full_name", ""),
                    "first_name": info.get("first_name", ""),
                    "last_name": info.get("last_name", ""),
                    "email": info.get("email", ""),
                    "phone": info.get("phone", ""),
                    "summary": info.get("summary", ""),
                    "location": info.get("location") or {"text": ""},
                    "urls": info.get("urls") or {},
                },
                "text": profile_data.get("text", ""),
                "text_language": profile_data.get("text_language", ""),
                "experiences": profile_data.get("experiences") or [],
                "educations": profile_data.get("educations") or [],
                "skills": profile_data.get("skills") or [],
                "languages": profile_data.get("languages") or [],
                "certifications": profile_data.get("certifications") or [],
                "courses": profile_data.get("courses") or [],
                "tasks": profile_data.get("tasks") or [],
                "interests": profile_data.get("interests") or [],
                "tags": profile_data.get("tags") or [],
                "labels": profile_data.get("labels") or [],
                "metadatas": metadatas,
            },
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            put_resp = await client.put(
                f"{HRFLOW_API_BASE}/profile/indexing",
                headers={**headers, "content-type": "application/json"},
                json=payload,
            )
            if not put_resp.is_success:
                raise ValueError(f"HrFlow PUT profile {put_resp.status_code}: {put_resp.text}")

        logger.info(
            "[save_interview] Saved %d answers (global score: %.1f) to profile %s",
            len(answers), global_score, profile_reference,
        )
        return put_resp.json()

    # ------------------------------------------------------------------
    # Profiles (candidat — ne pas modifier)
    # ------------------------------------------------------------------

    async def get_profiles_for_job(
        self,
        job_key: str,
        source_key: Optional[str] = None,
        page: int = 1,
        limit: int = 30,
    ) -> dict:
        """Return full profiles (with metadatas) linked to a job.

        /profiles/searching returns lightweight profiles without metadatas.
        We enrich each matched profile via GET /profile/indexing to include
        the full object (metadatas, interview results, etc.).
        """
        resolved_source_key = source_key or settings.hrflow_source_key
        headers = {"X-API-KEY": settings.api_key, "X-USER-EMAIL": settings.user_email}

        # 1. Search for profiles in the source
        params = {
            "source_keys": json.dumps([resolved_source_key]),
            "page": page,
            "limit": 100,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{HRFLOW_API_BASE}/profiles/searching",
                headers=headers,
                params=params,
            )
            if not response.is_success:
                raise ValueError(f"HrFlow {response.status_code}: {response.text}")
            data = response.json()

        all_profiles = (data.get("data") or {}).get("profiles") or []

        # 2. Filter by job_key tag
        matched = [
            p for p in all_profiles
            if any(
                t.get("name") == "job_key" and t.get("value") == job_key
                for t in (p.get("tags") or [])
            )
        ]

        start = (page - 1) * limit
        paginated = matched[start: start + limit]

        # 3. Enrich each profile with full data (metadatas included)
        enriched: list[dict] = []
        async with httpx.AsyncClient(timeout=30.0) as client:
            for profile in paginated:
                ref = profile.get("reference") or profile.get("key")
                if not ref:
                    enriched.append(profile)
                    continue
                detail_resp = await client.get(
                    f"{HRFLOW_API_BASE}/profile/indexing",
                    headers=headers,
                    params={"source_key": resolved_source_key, "reference": ref},
                )
                if detail_resp.is_success:
                    full = detail_resp.json().get("data") or profile
                    enriched.append(full)
                else:
                    enriched.append(profile)

        return {
            "code": 200,
            "data": {"profiles": enriched},
            "meta": {"page": page, "count": len(enriched), "total": len(matched)},
        }

    async def upload_cv_for_job(
        self,
        file_bytes: bytes,
        file_name: str,
        job_key: str,
        board_key: Optional[str] = None,
        source_key: Optional[str] = None,
    ) -> dict:
        """Submit a CV to the HrFlow parsing queue with a unique reference."""
        resolved_board_key = board_key or settings.hrflow_board_key
        resolved_source_key = source_key or settings.hrflow_source_key
        reference = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        label = {"board_key": resolved_board_key, "job_key": job_key, "job_reference": job_key, "stage": "new", "date_stage": now, "rating": 1, "date_rating": now}
        tag = {"name": "job_key", "value": job_key}
        headers = {"X-API-KEY": settings.api_key, "X-USER-EMAIL": settings.user_email}

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{HRFLOW_API_BASE}/profile/parsing/file",
                headers=headers,
                data={"source_key": resolved_source_key, "reference": reference, "content_type": "application/pdf", "labels": json.dumps([label]), "tags": json.dumps([tag])},
                files={"file": (file_name, file_bytes, "application/pdf")},
            )
            if not response.is_success:
                raise ValueError(f"HrFlow {response.status_code}: {response.text}")

        return {"profile_key": None, "profile_reference": reference, "job_key": job_key, "board_key": resolved_board_key, "source_key": resolved_source_key, "message": "CV queued for parsing. Use profile_reference to poll status."}

    async def get_profile_by_reference(self, reference: str, source_key: Optional[str] = None) -> dict:
        """Poll HrFlow for a profile by its reference once parsing is done."""
        headers = {"X-API-KEY": settings.api_key, "X-USER-EMAIL": settings.user_email}
        params = {"source_key": source_key or settings.hrflow_source_key, "reference": reference}
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{HRFLOW_API_BASE}/profile/indexing", headers=headers, params=params)
            if not response.is_success:
                raise ValueError(f"HrFlow {response.status_code}: {response.text}")
            return response.json()
