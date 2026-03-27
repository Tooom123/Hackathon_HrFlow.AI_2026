from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query

from app.dependencies.hrflow import get_hrflow_service
from app.schemas.profile import ApplyCVResponse
from app.services.hrflow_service import HrFlowService

router = APIRouter(prefix="/profiles", tags=["profiles"])

ALLOWED_CONTENT_TYPES = {"application/pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.get("/{reference}/status")
async def get_profile_status(
    reference: str,
    service: HrFlowService = Depends(get_hrflow_service),
) -> dict:
    """Poll the parsing status of a CV by its reference (returned by /apply).

    Returns the full profile once HrFlow finishes parsing, 404 if still pending.
    """
    try:
        data = await service.get_profile_by_reference(reference)
        profile = data.get("data")
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not yet indexed, try again later.")
        return data
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"HrFlow API error: {exc}")


@router.get("/job/{job_key}")
async def get_profiles_for_job(
    job_key: str,
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    service: HrFlowService = Depends(get_hrflow_service),
) -> dict:
    """Retrieve profiles linked to a job (filtered by job_key tag)."""
    try:
        return await service.get_profiles_for_job(
            job_key=job_key,
            page=page,
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"HrFlow API error: {exc}")


@router.post("/apply", response_model=ApplyCVResponse, status_code=202)
async def apply_cv_to_job(
    job_key: str = Query(..., description="HrFlow job key to link the application to"),
    cv: UploadFile = File(..., description="Candidate CV in PDF format"),
    service: HrFlowService = Depends(get_hrflow_service),
) -> ApplyCVResponse:
    """Upload a candidate CV and link it to a job via a HrFlow label.

    The CV is parsed by HrFlow and a profile is created in the configured
    source. A label is attached to the profile to associate it with the
    specified job, enabling recruitment pipeline tracking.
    """
    if cv.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{cv.content_type}'. Only PDF is accepted.",
        )

    file_bytes = await cv.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="CV file exceeds the 10 MB limit.",
        )
    if len(file_bytes) == 0:
        raise HTTPException(status_code=422, detail="CV file is empty.")

    try:
        result = await service.upload_cv_for_job(
            file_bytes=file_bytes,
            file_name=cv.filename or "cv.pdf",
            job_key=job_key,
        )
        return ApplyCVResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"HrFlow API error: {exc}")
