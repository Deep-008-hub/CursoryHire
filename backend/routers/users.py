from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from utils.auth import get_current_user
from models.schemas import HRProfileUpdate, CandidateProfileUpdate, UserOut
from database import get_db
import tempfile, os

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    db = get_db()
    result = {"user": user}
    if user["role"] == "hr":
        prof = db.table("hr_profiles").select("*").eq("user_id", user["id"]).execute()
        result["profile"] = prof.data[0] if prof.data else {}
    else:
        prof = db.table("candidate_profiles").select("*").eq("user_id", user["id"]).execute()
        result["profile"] = prof.data[0] if prof.data else {}
    return result

@router.patch("/hr/profile")
async def update_hr_profile(data: HRProfileUpdate, user=Depends(get_current_user)):
    if user["role"] != "hr":
        raise HTTPException(403, "HR only")
    db = get_db()
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    existing = db.table("hr_profiles").select("id").eq("user_id", user["id"]).execute()
    if existing.data:
        db.table("hr_profiles").update(update_data).eq("user_id", user["id"]).execute()
    else:
        update_data["user_id"] = user["id"]
        db.table("hr_profiles").insert(update_data).execute()
    return {"message": "Profile updated"}

@router.patch("/candidate/profile")
async def update_candidate_profile(data: CandidateProfileUpdate, user=Depends(get_current_user)):
    if user["role"] != "candidate":
        raise HTTPException(403, "Candidate only")
    db = get_db()
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    existing = db.table("candidate_profiles").select("id").eq("user_id", user["id"]).execute()
    if existing.data:
        db.table("candidate_profiles").update(update_data).eq("user_id", user["id"]).execute()
    else:
        update_data["user_id"] = user["id"]
        db.table("candidate_profiles").insert(update_data).execute()
    return {"message": "Profile updated"}

@router.get("/notifications")
async def get_notifications(user=Depends(get_current_user)):
    from services.notification_service import get_user_notifications
    notifs = await get_user_notifications(user["id"])
    return notifs

@router.patch("/notifications/{notif_id}/read")
async def mark_read(notif_id: str, user=Depends(get_current_user)):
    from services.notification_service import mark_notification_read
    await mark_notification_read(notif_id, user["id"])
    return {"message": "Marked read"}

@router.patch("/notifications/read-all")
async def mark_all_read(user=Depends(get_current_user)):
    from services.notification_service import mark_all_read
    await mark_all_read(user["id"])
    return {"message": "All marked read"}

@router.post("/extract-resume")
async def extract_resume(
    resume: UploadFile = File(...),
    user=Depends(get_current_user)
):
    """Extract text from uploaded resume PDF/TXT."""
    from services.parser_service import save_upload_temp, parse_resume_file, validate_resume_text
    import os

    tmp_path = None
    try:
        tmp_path, filename = await save_upload_temp(resume)
        parsed = parse_resume_file(tmp_path, filename)
        text = parsed.get("text", "")
        if not text:
            return {"text": "", "error": "Could not extract text from file"}
        return {"text": text, "words": len(text.split())}
    except Exception as e:
        return {"text": "", "error": str(e)}
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try: os.remove(tmp_path)
            except: pass

@router.post("/upload-avatar")
async def upload_avatar(
    avatar: UploadFile = File(...),
    user=Depends(get_current_user)
):
    """Upload profile picture to Supabase Storage."""
    import base64
    from database import get_db

    # Validate file type
    if avatar.content_type not in ["image/jpeg", "image/png", "image/webp", "image/gif"]:
        raise HTTPException(400, "Only JPEG, PNG, WebP or GIF images allowed")

    # Validate file size (max 2MB)
    contents = await avatar.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(400, "Image must be under 2MB")

    try:
        db = get_db()
        ext = avatar.filename.split('.')[-1].lower()
        file_path = f"avatars/{user['id']}.{ext}"

        # Upload to Supabase Storage
        res = db.storage.from_("avatars").upload(
            file_path,
            contents,
            {"content-type": avatar.content_type, "upsert": "true"}
        )

        # Get public URL
        url = db.storage.from_("avatars").get_public_url(file_path)

        # Update user avatar_url
        db.table("users").update({"avatar_url": url})\
            .eq("id", user["id"]).execute()

        return {"avatar_url": url, "message": "Avatar uploaded successfully"}

    except Exception as e:
        print(f"Avatar upload error: {e}")
        raise HTTPException(500, f"Upload failed: {str(e)}")


@router.post("/upload-resume-pdf")
async def upload_resume_pdf(
    resume: UploadFile = File(...),
    user=Depends(get_current_user)
):
    """Upload resume PDF to Supabase Storage and save URL."""
    if user["role"] != "candidate":
        raise HTTPException(403, "Candidates only")

    # Validate file type
    ext = resume.filename.split('.')[-1].lower()
    if ext not in ['pdf', 'docx', 'doc', 'txt']:
        raise HTTPException(400, "Only PDF, DOCX or TXT files allowed")

    contents = await resume.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(400, "File must be under 5MB")

    try:
        db = get_db()
        file_path = f"resumes/{user['id']}.{ext}"

        # Remove existing file
        try:
            db.storage.from_("resumes").remove([file_path])
        except:
            pass

        # Upload to Supabase Storage
        db.storage.from_("resumes").upload(
            path=file_path,
            file=contents,
            file_options={"content-type": resume.content_type or "application/pdf"}
        )

        # Get public URL
        url = db.storage.from_("resumes").get_public_url(file_path)
        if not isinstance(url, str):
            url = url.get("publicUrl") or str(url)

        # Also extract text for AI screening
        from services.parser_service import parse_resume_file
        import tempfile, os
        tmp_path = None
        resume_text = ""
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
                tmp.write(contents)
                tmp_path = tmp.name
            parsed = parse_resume_file(tmp_path, resume.filename)
            resume_text = parsed.get("text", "")
        except Exception as e:
            print(f"Text extraction error: {e}")
        finally:
            if tmp_path and os.path.exists(tmp_path):
                try: os.remove(tmp_path)
                except: pass

        # Update candidate profile with both URL and text
        existing = db.table("candidate_profiles").select("id")\
            .eq("user_id", user["id"]).execute()
        update_data = {"resume_url": url}
        if resume_text:
            update_data["resume_text"] = resume_text

        if existing.data:
            db.table("candidate_profiles").update(update_data)\
                .eq("user_id", user["id"]).execute()
        else:
            update_data["user_id"] = user["id"]
            db.table("candidate_profiles").insert(update_data).execute()

        return {
            "resume_url":  url,
            "resume_text": resume_text,
            "words":       len(resume_text.split()) if resume_text else 0,
            "message":     "Resume uploaded successfully"
        }

    except Exception as e:
        print(f"Resume upload error: {e}")
        raise HTTPException(500, f"Upload failed: {str(e)}")
