from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from utils.auth import get_current_user, get_current_hr
from models.schemas import JobCreate
from database import get_db
from typing import Optional
import tempfile, os

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.post("/")
async def create_job(data: JobCreate, user=Depends(get_current_hr)):
    db = get_db()
    job_data = data.model_dump()
    job_data["hr_user_id"] = user["id"]
    job_data["status"] = "active"
    res = db.table("jobs").insert(job_data).execute()
    return res.data[0]

@router.get("/")
async def list_jobs(status: Optional[str] = None, user=Depends(get_current_user)):
    db = get_db()
    if user["role"] == "hr":
        q = db.table("jobs").select("*").eq("hr_user_id", user["id"])
        if status:
            q = q.eq("status", status)
    else:
        q = db.table("jobs").select("*").eq("status", "active")
    res = q.order("created_at", desc=True).execute()
    return res.data or []

@router.get("/candidate/applications")
async def my_applications(user=Depends(get_current_user)):
    if user["role"] != "candidate":
        raise HTTPException(403, "Candidates only")
    db = get_db()
    res = db.table("applications")\
        .select("*, jobs(*)")\
        .eq("candidate_id", user["id"])\
        .order("applied_at", desc=True)\
        .execute()
    return res.data or []

@router.get("/{job_id}")
async def get_job(job_id: str, user=Depends(get_current_user)):
    db = get_db()
    res = db.table("jobs").select("*").eq("id", job_id).execute()
    if not res.data:
        raise HTTPException(404, "Job not found")
    return res.data[0]

@router.patch("/{job_id}")
async def update_job(job_id: str, data: dict, user=Depends(get_current_hr)):
    db = get_db()
    res = db.table("jobs").select("hr_user_id").eq("id", job_id).execute()
    if not res.data or res.data[0]["hr_user_id"] != user["id"]:
        raise HTTPException(403, "Not authorized")
    db.table("jobs").update(data).eq("id", job_id).execute()
    return {"message": "Job updated"}

@router.delete("/{job_id}")
async def delete_job(job_id: str, user=Depends(get_current_hr)):
    db = get_db()
    res = db.table("jobs").select("hr_user_id").eq("id", job_id).execute()
    if not res.data or res.data[0]["hr_user_id"] != user["id"]:
        raise HTTPException(403, "Not authorized")
    db.table("jobs").update({"status": "closed"}).eq("id", job_id).execute()
    return {"message": "Job closed"}

@router.post("/{job_id}/apply")
async def apply_job(job_id: str, user=Depends(get_current_user)):
    if user["role"] != "candidate":
        raise HTTPException(403, "Candidates only")
    db = get_db()
    job = db.table("jobs").select("*").eq("id", job_id).execute()
    if not job.data:
        raise HTTPException(404, "Job not found")
    if job.data[0]["status"] != "active":
        raise HTTPException(400, "Job is no longer active")
    existing = db.table("applications").select("id")\
        .eq("job_id", job_id).eq("candidate_id", user["id"]).execute()
    if existing.data:
        raise HTTPException(400, "You have already applied for this job")
    profile = db.table("candidate_profiles").select("resume_text, resume_url")\
        .eq("user_id", user["id"]).execute()
    resume_text = ""
    resume_url = ""
    if profile.data:
        resume_text = profile.data[0].get("resume_text") or ""
        resume_url  = profile.data[0].get("resume_url") or ""
    if not resume_text:
        raise HTTPException(400, "Please upload your resume in your profile before applying")
    res = db.table("applications").insert({
        "job_id":       job_id,
        "candidate_id": user["id"],
        "hr_user_id":   job.data[0]["hr_user_id"],
        "status":       "applied",
        "resume_url":   resume_url,
    }).execute()
    return res.data[0]

@router.get("/{job_id}/applicants")
async def get_applicants(job_id: str, user=Depends(get_current_hr)):
    db = get_db()
    job = db.table("jobs").select("*").eq("id", job_id)\
        .eq("hr_user_id", user["id"]).execute()
    if not job.data:
        raise HTTPException(404, "Job not found")
    apps = db.table("applications").select("*, users!applications_candidate_id_fkey(id, full_name, email, phone)")\
    .eq("job_id", job_id).order("applied_at", desc=True).execute()
    result = []
    for app in (apps.data or []):
        profile = db.table("candidate_profiles").select("*")\
            .eq("user_id", app["candidate_id"]).execute()
        app["profile"] = profile.data[0] if profile.data else {}
        result.append(app)
    return {"job": job.data[0], "applicants": result, "total": len(result)}