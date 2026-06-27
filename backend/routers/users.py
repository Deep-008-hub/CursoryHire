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
    from services.parser_service import save_upload_temp, parse_resume_file
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
    if avatar.content_type not in ["image/jpeg", "image/png", "image/webp", "image/gif"]:
        raise HTTPException(400, "Only JPEG, PNG or WebP images allowed")

    contents = await avatar.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(400, "Image must be under 2MB")

    try:
        db = get_db()
        ext = avatar.filename.split('.')[-1].lower()
        file_path = f"{user['id']}.{ext}"

        # Upload to Supabase Storage
        try:
            # Try to remove existing file first
            db.storage.from_("avatars").remove([file_path])
        except:
            pass

        # Upload new file
        db.storage.from_("avatars").upload(
            path=file_path,
            file=contents,
            file_options={"content-type": avatar.content_type}
        )

        # Get public URL
        url_response = db.storage.from_("avatars").get_public_url(file_path)
        
        # Handle both string and object response
        if isinstance(url_response, str):
            url = url_response
        else:
            url = url_response.get("publicUrl") or url_response.get("publicURL") or str(url_response)

        # Update user avatar_url in database
        db.table("users").update({"avatar_url": url})\
            .eq("id", user["id"]).execute()

        return {"avatar_url": url, "message": "Avatar uploaded successfully"}

    except Exception as e:
        print(f"Avatar upload error: {e}")
        raise HTTPException(500, f"Upload failed: {str(e)}")