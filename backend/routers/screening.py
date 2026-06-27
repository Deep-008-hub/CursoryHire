from fastapi import APIRouter, Depends, HTTPException, Form
from utils.auth import get_current_hr
from services.gemini_service import screen_resume, rank_results
from database import get_db
from typing import Optional
import asyncio

router = APIRouter(prefix="/screening", tags=["screening"])

@router.post("/screen-applicants/{job_id}")
async def screen_applicants(
    job_id: str,
    user=Depends(get_current_hr),
):
    db = get_db()

    job = db.table("jobs").select("*").eq("id", job_id)\
        .eq("hr_user_id", user["id"]).execute()
    if not job.data:
        raise HTTPException(404, "Job not found")

    job_data = job.data[0]

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

    apps = db.table("applications").select("*, users!applications_candidate_id_fkey(id, full_name, email, phone)")\
    .eq("job_id", job_id).eq("status", "applied").execute()

    if not apps.data:
        raise HTTPException(400, "No applicants found for this job")

    applicants = []
    for app in apps.data:
        candidate_id = app["candidate_id"]
        profile = db.table("candidate_profiles").select("resume_text, headline, skills, experience_years")\
            .eq("user_id", candidate_id).execute()

        resume_text = ""
        if profile.data:
            resume_text = profile.data[0].get("resume_text") or ""
            if not resume_text:
                p = profile.data[0]
                resume_text = f"""
Name: {app['users']['full_name']}
Headline: {p.get('headline', '')}
Skills: {', '.join(p.get('skills', []))}
Experience: {p.get('experience_years', 0)} years
                """.strip()

        applicants.append({
            "application_id":  app["id"],
            "candidate_id":    candidate_id,
            "candidate_name":  app["users"]["full_name"],
            "candidate_email": app["users"]["email"] or app["users"]["phone"],
            "resume_text":     resume_text,
        })

    session_res = db.table("screening_sessions").insert({
        "hr_user_id":      user["id"],
        "job_id":          job_id,
        "job_title":       job_data["title"],
        "job_description": job_description,
        "status":          "processing",
        "total_resumes":   len(applicants),
    }).execute()

    if not session_res.data:
        raise HTTPException(500, "Failed to create screening session")

    session_id = session_res.data[0]["id"]

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
            applicant["resume_text"], job_description, applicant["candidate_name"]
        )
        result["application_id"]  = applicant["application_id"]
        result["candidate_id"]    = applicant["candidate_id"]
        result["candidate_email"] = applicant["candidate_email"]
        result["resume_text"]     = applicant["resume_text"]
        return result

    raw_results = await asyncio.gather(*[screen_one(a) for a in applicants])
    ranked = rank_results(list(raw_results))

    saved_results = []
    for r in ranked:
        try:
            row = {
                "session_id":          session_id,
                "hr_user_id":          user["id"],
                "candidate_name":      r.get("candidate_name", ""),
                "candidate_email":     r.get("candidate_email", ""),
                "filename":            r.get("candidate_name", "resume"),
                "resume_text":         r.get("resume_text", "")[:5000],
                "rank":                r.get("rank", 99),
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
            if r.get("application_id"):
                db.table("applications").update({
                    "status":   "screening",
                    "ai_score": r.get("overall_score", 0),
                    "ai_rank":  r.get("rank", 99),
                }).eq("id", r["application_id"]).execute()
            saved_results.append(saved)
        except Exception as e:
            print(f"Save error: {e}")

    db.table("screening_sessions").update({"status": "completed"})\
        .eq("id", session_id).execute()

    return {
        "session_id": session_id,
        "job_title":  job_data["title"],
        "total":      len(ranked),
        "results":    saved_results,
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
        .eq("session_id", session_id).order("rank").execute()
    return {**sess.data[0], "results": results.data or []}