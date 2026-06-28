from fastapi import APIRouter, Depends, HTTPException
from utils.auth import get_current_user, get_current_hr
from models.schemas import InvitationCreate, InvitationRespond
from services.notification_service import create_notification
from database import get_db
from datetime import datetime, timezone
import uuid
from config import settings

router = APIRouter(prefix="/invitations", tags=["invitations"])

@router.post("/send")
async def send_invitation(data: InvitationCreate, user=Depends(get_current_hr)):
    db = get_db()

    hr_prof = db.table("hr_profiles").select("company_name")\
        .eq("user_id", user["id"]).execute()
    company = hr_prof.data[0]["company_name"] if hr_prof.data else "Our Company"

    if data.screening_result_id:
        existing = db.table("invitations").select("id")\
            .eq("screening_result_id", data.screening_result_id).execute()
        if existing.data:
            raise HTTPException(400, "Invitation already sent for this candidate")

    room_id   = f"ch-{uuid.uuid4().hex[:12]}"
    base_url = settings.FRONTEND_URL or "http://localhost:5173"
    meet_link = f"{base_url}/interview/{room_id}"

    invite_data = {
        "hr_user_id":      user["id"],
        "candidate_email": data.candidate_email,
        "candidate_name":  data.candidate_name,
        "job_title":       data.job_title,
        "company_name":    company,
        "message":         data.message,
        "status":          "pending",
        "interview_type":  data.interview_type,
        "meet_link":       meet_link,
        "room_id":         room_id,
        "round_name":      "Round 1",
    }
    if data.screening_result_id:
        invite_data["screening_result_id"] = data.screening_result_id
    if data.interview_date:
        invite_data["interview_date"] = data.interview_date.isoformat()

    res = db.table("invitations").insert(invite_data).execute()
    if not res.data:
        raise HTTPException(500, "Failed to create invitation")

    invitation = res.data[0]

    if data.screening_result_id:
        db.table("screening_results").update({"invited": True})\
            .eq("id", data.screening_result_id).execute()

    cand_user = db.table("users").select("id")\
        .eq("email", data.candidate_email).execute()
    if cand_user.data:
        cand_id = cand_user.data[0]["id"]
        db.table("invitations").update({"candidate_user_id": cand_id})\
            .eq("id", invitation["id"]).execute()
        await create_notification(
            user_id=cand_id,
            type="invitation",
            title=f"Interview invitation from {company}",
            message=f"You have been invited to interview for {data.job_title}. Tap to respond.",
            data={"invitation_id": invitation["id"]}
        )

    return invitation


@router.get("/hr/sent")
async def hr_sent_invitations(user=Depends(get_current_hr)):
    db = get_db()
    res = db.table("invitations").select("*")\
        .eq("hr_user_id", user["id"])\
        .order("created_at", desc=True).execute()
    return res.data or []


@router.get("/candidate/received")
async def candidate_invitations(user=Depends(get_current_user)):
    if user["role"] != "candidate":
        raise HTTPException(403, "Candidates only")
    db = get_db()

    by_id = db.table("invitations").select("*")\
        .eq("candidate_user_id", user["id"])\
        .order("created_at", desc=True).execute()

    by_email = db.table("invitations").select("*")\
        .eq("candidate_email", user.get("email") or "")\
        .order("created_at", desc=True).execute()

    seen = set()
    results = []
    for inv in (by_id.data or []) + (by_email.data or []):
        if inv["id"] not in seen:
            seen.add(inv["id"])
            results.append(inv)

    results.sort(key=lambda x: x["created_at"], reverse=True)
    return results


@router.patch("/{invitation_id}/respond")
async def respond_to_invitation(
    invitation_id: str,
    data: InvitationRespond,
    user=Depends(get_current_user),
):
    if user["role"] != "candidate":
        raise HTTPException(403, "Candidates only")
    if data.status not in ("accepted", "declined"):
        raise HTTPException(400, "Status must be accepted or declined")

    db = get_db()
    inv = db.table("invitations").select("*").eq("id", invitation_id).execute()
    if not inv.data:
        raise HTTPException(404, "Invitation not found")

    invitation = inv.data[0]
    if invitation["status"] not in ("pending",):
        raise HTTPException(400, f"Invitation already {invitation['status']}")

    db.table("invitations").update({
        "status":            data.status,
        "responded_at":      datetime.now(timezone.utc).isoformat(),
        "candidate_user_id": user["id"],
    }).eq("id", invitation_id).execute()

    if data.status == "accepted":
        room_id = invitation.get("room_id") or f"ch-{invitation_id[:8]}"
        try:
            db.table("interviews").insert({
                "invitation_id": invitation_id,
                "hr_user_id":    invitation["hr_user_id"],
                "candidate_id":  user["id"],
                "scheduled_at":  invitation.get("interview_date") or datetime.now(timezone.utc).isoformat(),
                "room_id":       room_id,
                "status":        "scheduled",
            }).execute()
        except Exception as e:
            print(f"Interview record error (non-fatal): {e}")

        try:
            db.table("applications").update({"status": "interview_scheduled"})\
                .eq("candidate_id", user["id"]).execute()
        except Exception as e:
            print(f"Application update error (non-fatal): {e}")

    await create_notification(
        user_id=invitation["hr_user_id"],
        type="invitation_response",
        title=f"{invitation['candidate_name']} {data.status} the interview",
        message=f"For {invitation['job_title']} — {data.status}. Mark result after the interview.",
        data={"invitation_id": invitation_id, "status": data.status}
    )

    return {"message": f"Invitation {data.status}", "status": data.status}


@router.patch("/{invitation_id}/result")
async def mark_interview_result(
    invitation_id: str,
    result: dict,
    user=Depends(get_current_hr),
):
    db = get_db()

    inv = db.table("invitations").select("*").eq("id", invitation_id)\
        .eq("hr_user_id", user["id"]).execute()
    if not inv.data:
        raise HTTPException(404, "Invitation not found")

    invitation = inv.data[0]
    outcome    = result.get("outcome")
    feedback   = result.get("feedback", "")

    if outcome not in ("selected", "rejected", "on_hold"):
        raise HTTPException(400, "Outcome must be selected, rejected, or on_hold")

    db.table("invitations").update({
        "interview_outcome":  outcome,
        "interview_feedback": feedback,
    }).eq("id", invitation_id).execute()

    status_map = {
        "selected": "offered",
        "rejected": "rejected",
        "on_hold":  "shortlisted",
    }

    if invitation.get("candidate_user_id"):
        db.table("applications").update({"status": status_map[outcome]})\
            .eq("candidate_id", invitation["candidate_user_id"]).execute()

        msg_map = {
            "selected": f"Congratulations! You have been selected for {invitation['job_title']}!",
            "rejected": f"Thank you for interviewing for {invitation['job_title']}. The position has been filled.",
            "on_hold":  f"Your interview for {invitation['job_title']} is complete. We will be in touch soon.",
        }
        await create_notification(
            user_id=invitation["candidate_user_id"],
            type="interview_result",
            title=f"Interview result — {invitation['job_title']}",
            message=msg_map[outcome],
            data={"outcome": outcome}
        )

    try:
        db.table("interviews").update({
            "status":   "completed",
            "feedback": feedback,
        }).eq("invitation_id", invitation_id).execute()
    except:
        pass

    return {"message": f"Result marked as {outcome}", "outcome": outcome}


@router.post("/{invitation_id}/next-round")
async def schedule_next_round(
    invitation_id: str,
    data: dict,
    user=Depends(get_current_hr),
):
    db = get_db()

    inv = db.table("invitations").select("*").eq("id", invitation_id)\
        .eq("hr_user_id", user["id"]).execute()
    if not inv.data:
        raise HTTPException(404, "Invitation not found")

    invitation = inv.data[0]

    if invitation.get("interview_outcome") != "on_hold":
        raise HTTPException(400, "Can only schedule next round for candidates on hold")

    room_id   = f"ch-{uuid.uuid4().hex[:12]}"
    meet_link = f"http://localhost:5173/interview/{room_id}"

    new_invite = {
        "hr_user_id":        user["id"],
        "candidate_email":   invitation["candidate_email"],
        "candidate_name":    invitation["candidate_name"],
        "candidate_user_id": invitation.get("candidate_user_id"),
        "job_title":         invitation["job_title"],
        "company_name":      invitation.get("company_name"),
        "message":           data.get("message", f"You have been invited for {data.get('round_name', 'Next Round')}"),
        "status":            "pending",
        "interview_type":    data.get("interview_type", "video"),
        "meet_link":         meet_link,
        "room_id":           room_id,
        "round_name":        data.get("round_name", "Next Round"),
    }
    if data.get("interview_date"):
        new_invite["interview_date"] = data["interview_date"]

    res = db.table("invitations").insert(new_invite).execute()
    if not res.data:
        raise HTTPException(500, "Failed to create next round invitation")

    new_invitation = res.data[0]

    if invitation.get("candidate_user_id"):
        await create_notification(
            user_id=invitation["candidate_user_id"],
            type="invitation",
            title=f"New interview round — {data.get('round_name', 'Next Round')}",
            message=f"You have been invited for another round for {invitation['job_title']}. Please respond.",
            data={"invitation_id": new_invitation["id"]}
        )

    return new_invitation


@router.get("/{invitation_id}")
async def get_invitation(invitation_id: str, user=Depends(get_current_user)):
    db = get_db()
    res = db.table("invitations").select("*").eq("id", invitation_id).execute()
    if not res.data:
        raise HTTPException(404, "Not found")
    return res.data[0]