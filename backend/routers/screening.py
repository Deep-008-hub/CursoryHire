from fastapi import APIRouter, Depends, HTTPException
from utils.auth import get_current_hr
from services.gemini_service import screen_resume, rank_results
from database import get_db
from typing import List, Optional
import asyncio

router = APIRouter(prefix="/screening", tags=["screening"])


@router.post("/batch/{job_id}")
async def screen_batch(
    job_id: str,
    data: dict,
    user=Depends(get_current_hr),
):
    """
    HR selects specific application IDs to screen in a batch.
    data: { "application_ids": ["id1", "id2", ...] }
    Each batch is screened and saved. Final ranking shown when HR requests it.
    """
    db = get_db()

    # Verify job belongs to HR
    job = db.table("jobs").select("*").eq("id", job_id)\
        .eq("hr_user_id", user["id"]).execute()
    if not job.data:
        raise HTTPException(404, "Job not found")

    job_data = job.data[0]
    application_ids = data.get("application_ids", [])

    if not application_ids:
        raise HTTPException(400, "Select at least one application to screen")
    if len(application_ids) > 20:
        raise HTTPException(400, "Maximum 20 resumes per batch")

    # Build job description
    job_description = f"""
Job Title: {job_data['title']}
Department: {job_data.get('department', '')}
Location: {job_data.get('location', '')}
Job Type: {job_data.get('job_type', '')}
Experience Required: {job_data.get('experience_min', 0)}-{job_data.get('experience_max', 10)} years
Education: {job_data.get('education_required', 'Any Graduate')}
Required Skills: {', '.join(job_data.get('skills_required', []))}
Description: {job_data.get('description', '')}
    """.strip()

    # Get next batch number for this job
    existing_sessions = db.table("screening_sessions")\
        .select("id")\
        .eq("job_id", job_id)\
        .eq("hr_user_id", user["id"])\
        .execute()
    batch_number = len(existing_sessions.data or []) + 1

    # Create screening session for this batch
    session_res = db.table("screening_sessions").insert({
        "hr_user_id":      user["id"],
        "job_id":          job_id,
        "job_title":       job_data["title"],
        "job_description": job_description,
        "status":          "processing",
        "total_resumes":   len(application_ids),
    }).execute()

    if not session_res.data:
        raise HTTPException(500, "Failed to create screening session")

    session_id = session_res.data[0]["id"]

    # Get selected applications with candidate info
    applicants = []
    for app_id in application_ids:
        app = db.table("applications")\
            .select("*, users!applications_candidate_id_fkey(id, full_name, email, phone)")\
            .eq("id", app_id)\
            .eq("job_id", job_id)\
            .execute()

        if not app.data:
            continue

        app_data = app.data[0]
        candidate_id = app_data["candidate_id"]

        # Get resume from profile
        profile = db.table("candidate_profiles")\
            .select("resume_text, headline, skills, experience_years")\
            .eq("user_id", candidate_id).execute()

        resume_text = ""
        if profile.data:
            resume_text = profile.data[0].get("resume_text") or ""
            if not resume_text:
                p = profile.data[0]
                resume_text = f"""
Name: {app_data['users']['full_name']}
Headline: {p.get('headline', '')}
Skills: {', '.join(p.get('skills', []))}
Experience: {p.get('experience_years', 0)} years
                """.strip()

        applicants.append({
            "application_id":  app_id,
            "candidate_id":    candidate_id,
            "candidate_name":  app_data["users"]["full_name"],
            "candidate_email": app_data["users"]["email"] or app_data["users"]["phone"] or "",
            "resume_text":     resume_text,
        })

    if not applicants:
        raise HTTPException(400, "No valid applicants found")

    # Screen all in batch concurrently with Gemini
    async def screen_one(applicant: dict) -> dict:
        if not applicant["resume_text"]:
            return {
                **applicant,
                "overall_score": 0, "grade": "F",
                "recommendation": "Not Suitable",
                "executive_summary": "No resume found.",
                "scores": {}, "matched_skills": [], "missing_skills": [],
                "bonus_skills": [], "strengths": [], "weaknesses": [],
                "red_flags": [], "interview_questions": [],
            }
        result = await screen_resume(
            applicant["resume_text"],
            job_description,
            applicant["candidate_name"]
        )
        result["application_id"]  = applicant["application_id"]
        result["candidate_id"]    = applicant["candidate_id"]
        result["candidate_email"] = applicant["candidate_email"]
        result["resume_text"]     = applicant["resume_text"]
        return result

    raw_results = await asyncio.gather(*[screen_one(a) for a in applicants])

    # Save results WITHOUT final ranking (ranking done after all batches)
    saved_results = []
    for r in raw_results:
        try:
            row = {
                "session_id":          session_id,
                "hr_user_id":          user["id"],
                "candidate_name":      r.get("candidate_name", ""),
                "candidate_email":     r.get("candidate_email", ""),
                "filename":            r.get("candidate_name", "resume"),
                "resume_text":         r.get("resume_text", "")[:5000],
                "rank":                0,  # Will be set during final ranking
                "overall_score":       r.get("overall_score", 0),
                "grade":               r.get("grade", ""),
                "recommendation":      r.get("recommendation", ""),
                "executive_summary":   r.get("executive_summary", ""),
                "scores":              r.get("scores", {}),
                "matched_skills":      r.get("matched_skills", []),
                "missing_skills":      r.get("missing_skills", []),
                "bonus_skills":        r.get("bonus_skills", []),
                "strengths":           r.get("strengths", []),
                "weaknesses":          r.get("weaknesses", []),
                "red_flags":           r.get("red_flags", []),
                "interview_questions": r.get("interview_questions", []),
                "raw_gemini_response": r,
                "invited":             False,
            }
            res = db.table("screening_results").insert(row).execute()
            saved = res.data[0] if res.data else row

            # Mark application as screened
            if r.get("application_id"):
                db.table("applications").update({
                    "status":           "screening",
                    "screened":         True,
                    "screening_batch":  batch_number,
                    "ai_score":         r.get("overall_score", 0),
                }).eq("id", r["application_id"]).execute()

            saved_results.append(saved)
        except Exception as e:
            print(f"Save error: {e}")

    # Update session status
    db.table("screening_sessions").update({"status": "completed"})\
        .eq("id", session_id).execute()

    return {
        "session_id":   session_id,
        "batch_number": batch_number,
        "job_title":    job_data["title"],
        "screened":     len(saved_results),
        "results":      saved_results,
    }


@router.get("/final-ranking/{job_id}")
async def get_final_ranking(job_id: str, user=Depends(get_current_hr)):
    """
    Get final ranking of ALL screened candidates for a job across all batches.
    Ranks everyone together by overall_score.
    """
    db = get_db()

    # Verify job belongs to HR
    job = db.table("jobs").select("*").eq("id", job_id)\
        .eq("hr_user_id", user["id"]).execute()
    if not job.data:
        raise HTTPException(404, "Job not found")

    # Get all screening sessions for this job
    sessions = db.table("screening_sessions").select("id")\
        .eq("job_id", job_id).eq("hr_user_id", user["id"]).execute()

    if not sessions.data:
        raise HTTPException(400, "No screening done yet for this job")

    session_ids = [s["id"] for s in sessions.data]

    # Get ALL results across all batches
    all_results = []
    for session_id in session_ids:
        res = db.table("screening_results").select("*")\
            .eq("session_id", session_id).execute()
        all_results.extend(res.data or [])

    if not all_results:
        raise HTTPException(400, "No screening results found")

    # Rank ALL candidates together by score
    all_results.sort(key=lambda x: x.get("overall_score", 0), reverse=True)
    for i, r in enumerate(all_results):
        r["rank"] = i + 1
        # Update rank in DB
        try:
            db.table("screening_results").update({"rank": i + 1})\
                .eq("id", r["id"]).execute()
            # Update application with final rank
            if r.get("candidate_email"):
                apps = db.table("applications")\
                    .select("id")\
                    .eq("job_id", job_id)\
                    .eq("status", "screening")\
                    .execute()
                for app in (apps.data or []):
                    db.table("applications").update({"ai_rank": i + 1})\
                        .eq("id", app["id"]).execute()
        except:
            pass

    return {
        "job_title":      job.data[0]["title"],
        "total_screened": len(all_results),
        "total_batches":  len(session_ids),
        "results":        all_results,
    }


@router.get("/job-screening-status/{job_id}")
async def get_job_screening_status(job_id: str, user=Depends(get_current_hr)):
    """Get screening progress for a job."""
    db = get_db()

    job = db.table("jobs").select("*").eq("id", job_id)\
        .eq("hr_user_id", user["id"]).execute()
    if not job.data:
        raise HTTPException(404, "Job not found")

    # Total applicants
    total = db.table("applications").select("id", count="exact")\
        .eq("job_id", job_id).execute()

    # Screened applicants
    screened = db.table("applications").select("id", count="exact")\
        .eq("job_id", job_id).eq("screened", True).execute()

    # Batches done
    sessions = db.table("screening_sessions").select("id", count="exact")\
        .eq("job_id", job_id).eq("hr_user_id", user["id"]).execute()

    return {
        "total_applicants":   total.count or 0,
        "screened_count":     screened.count or 0,
        "unscreened_count":   (total.count or 0) - (screened.count or 0),
        "batches_completed":  sessions.count or 0,
        "all_screened":       (total.count or 0) == (screened.count or 0),
    }


@router.get("/sessions")
async def list_sessions(user=Depends(get_current_hr)):
    db = get_db()
    res = db.table("screening_sessions").select("*")\
        .eq("hr_user_id", user["id"]).order("created_at", desc=True).execute()
    return res.data or []


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, user=Depends(get_current_hr)):
    db = get_db()
    sess = db.table("screening_sessions").select("*")\
        .eq("id", session_id).eq("hr_user_id", user["id"]).execute()
    if not sess.data:
        raise HTTPException(404, "Session not found")
    results = db.table("screening_results").select("*")\
        .eq("session_id", session_id).order("overall_score", desc=True).execute()
    return {**sess.data[0], "results": results.data or []}
