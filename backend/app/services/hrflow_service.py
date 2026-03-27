from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Optional

import httpx

from app.core.config import settings

HRFLOW_API_BASE = "https://api.hrflow.ai/v1"


class HrFlowService:
    """Minimal HrFlow service placeholder.

    This keeps the API runnable while the real external integration is being
    implemented.
    """

    async def check_connection(self) -> dict[str, str]:
        return {
            "workspace_email": settings.user_email,
            "board_key": settings.hrflow_board_key,
            "status": "configured",
        }

    async def parse_text(self, text: str, language: str = "fr") -> dict:
        return {
            "text": text,
            "language": language,
            "parsed": False,
            "message": "HrFlow parsing is not implemented yet.",
        }

    async def ask_job(
        self,
        prompt: str,
        board_key: Optional[str] = None,
        job_key: Optional[str] = None,
        job_reference: Optional[str] = None,
    ) -> dict:
        if not job_key and not job_reference:
            raise ValueError("Provide either `job_key` or `job_reference`.")

        return {
            "prompt": prompt,
            "board_key": board_key or settings.hrflow_board_key,
            "job_key": job_key,
            "job_reference": job_reference,
            "answered": False,
            "message": "HrFlow ask-job is not implemented yet.",
        }

    async def get_profiles_for_job(
        self,
        job_key: str,
        source_key: Optional[str] = None,
        page: int = 1,
        limit: int = 30,
    ) -> dict:
        """Return profiles linked to a job by filtering on the job_key tag."""
        headers = {
            "X-API-KEY": settings.api_key,
            "X-USER-EMAIL": settings.user_email,
        }
        # Fetch up to 100 profiles then post-filter by tag
        params = {
            "source_keys": json.dumps([source_key or settings.hrflow_source_key]),
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
        matched = [
            p for p in all_profiles
            if any(
                t.get("name") == "job_key" and t.get("value") == job_key
                for t in (p.get("tags") or [])
            )
        ]

        # Apply requested pagination on filtered results
        start = (page - 1) * limit
        paginated = matched[start: start + limit]

        return {
            "code": 200,
            "data": {"profiles": paginated},
            "meta": {
                "page": page,
                "count": len(paginated),
                "total": len(matched),
            },
        }

    async def upload_cv_for_job(
        self,
        file_bytes: bytes,
        file_name: str,
        job_key: str,
        board_key: Optional[str] = None,
        source_key: Optional[str] = None,
    ) -> dict:
        """Submit a CV to the HrFlow parsing queue with a unique reference.

        Parsing is asynchronous. The reference can be used to poll
        GET /profile/indexing once HrFlow finishes processing.
        """
        import uuid

        resolved_board_key = board_key or settings.hrflow_board_key
        resolved_source_key = source_key or settings.hrflow_source_key
        reference = str(uuid.uuid4())

        now = datetime.now(timezone.utc).isoformat()
        label = {
            "board_key": resolved_board_key,
            "job_key": job_key,
            "job_reference": job_key,
            "stage": "new",
            "date_stage": now,
            "rating": 1,
            "date_rating": now,
        }
        tag = {"name": "job_key", "value": job_key}

        headers = {
            "X-API-KEY": settings.api_key,
            "X-USER-EMAIL": settings.user_email,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{HRFLOW_API_BASE}/profile/parsing/file",
                headers=headers,
                data={
                    "source_key": resolved_source_key,
                    "reference": reference,
                    "content_type": "application/pdf",
                    "labels": json.dumps([label]),
                    "tags": json.dumps([tag]),
                },
                files={"file": (file_name, file_bytes, "application/pdf")},
            )
            if not response.is_success:
                raise ValueError(
                    f"HrFlow {response.status_code}: {response.text}"
                )

        return {
            "profile_key": None,
            "profile_reference": reference,
            "job_key": job_key,
            "board_key": resolved_board_key,
            "source_key": resolved_source_key,
            "message": "CV queued for parsing. Use profile_reference to poll status.",
        }

    async def get_profile_by_reference(
        self,
        reference: str,
        source_key: Optional[str] = None,
    ) -> dict:
        """Poll HrFlow for a profile by its reference once parsing is done."""
        headers = {
            "X-API-KEY": settings.api_key,
            "X-USER-EMAIL": settings.user_email,
        }
        params = {
            "source_key": source_key or settings.hrflow_source_key,
            "reference": reference,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{HRFLOW_API_BASE}/profile/indexing",
                headers=headers,
                params=params,
            )
            if not response.is_success:
                raise ValueError(
                    f"HrFlow {response.status_code}: {response.text}"
                )
            return response.json()

    async def create_job_from_text(
        self,
        text: str,
        title: str,
        board_key: Optional[str] = None,
        reference: Optional[str] = None,
    ) -> dict:
        return {
            "title": title,
            "text": text,
            "board_key": board_key or settings.hrflow_board_key,
            "reference": reference,
            "created": False,
            "message": "HrFlow job creation is not implemented yet.",
        }
