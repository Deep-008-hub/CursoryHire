from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from models.schemas import RegisterRequest, SendOTPRequest, VerifyOTPRequest
from services.otp_service import generate_otp, save_otp, send_email_otp, send_sms_otp
from utils.auth import create_access_token
from database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/send-otp")
async def send_otp(req: SendOTPRequest):
    db = get_db()
    name = "User"

    if req.purpose == "login":
        field = "email" if req.method == "email" else "phone"
        try:
            res = db.table("users").select("id,full_name").eq(field, req.identifier).execute()
            if not res.data:
                raise HTTPException(404, "No account found. Please register first.")
            name = res.data[0]["full_name"]
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"Database error: {str(e)}")

    otp = generate_otp()
    await save_otp(req.identifier, otp, req.purpose)

    if req.method == "email":
        ok = await send_email_otp(req.identifier, otp, name, req.purpose)
    else:
        ok = await send_sms_otp(req.identifier, otp)

    if not ok:
        raise HTTPException(500, "Failed to send OTP.")

    return {"message": f"OTP sent to {req.identifier}", "method": req.method}


@router.post("/register")
async def register(req: RegisterRequest):
    db = get_db()

    if not req.email and not req.phone:
        raise HTTPException(400, "Email or phone required")

    try:
        existing_user = None

        if req.email:
            res = db.table("users").select("*").eq("email", req.email).execute()
            if res.data:
                existing_user = res.data[0]

        if not existing_user and req.phone:
            res = db.table("users").select("*").eq("phone", req.phone).execute()
            if res.data:
                existing_user = res.data[0]

        if existing_user:
            if existing_user["role"] != req.role:
                raise HTTPException(
                    400,
                    f"This account is already registered as {existing_user['role'].upper()}. "
                    f"Please use the {existing_user['role'].upper()} login page instead."
                )
            return {"message": "Account found. OTP will be sent.", "user_id": existing_user["id"]}

        user_data = {
            "full_name":   req.full_name,
            "role":        req.role,
            "is_verified": False,
            "is_active":   True,
        }
        if req.email: user_data["email"] = req.email
        if req.phone: user_data["phone"] = req.phone

        res = db.table("users").insert(user_data).execute()
        if not res.data:
            raise HTTPException(500, "Failed to create user")

        user = res.data[0]

        try:
            if req.role == "hr":
                db.table("hr_profiles").insert({"user_id": user["id"]}).execute()
            else:
                db.table("candidate_profiles").insert({"user_id": user["id"]}).execute()
        except Exception as e:
            print(f"Profile creation error (non-fatal): {e}")

        return {"message": "Registered successfully. OTP will be sent.", "user_id": user["id"]}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Register error: {e}")
        raise HTTPException(500, f"Registration error: {str(e)}")


@router.post("/verify-otp")
async def verify_otp_endpoint(data: VerifyOTPRequest):
    db = get_db()

    # Get OTP record
    otp_record = db.table("otp_codes").select("*")\
        .eq("identifier", data.identifier)\
        .eq("purpose",    data.purpose)\
        .eq("used",       False)\
        .execute()

    if not otp_record.data:
        raise HTTPException(400, "Invalid or expired OTP")

    otp = otp_record.data[0]

    # Check expiry
    if datetime.fromisoformat(otp["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(400, "OTP has expired")

    # Mark as used
    db.table("otp_codes").update({"used": True})\
        .eq("id", otp["id"]).execute()

    # Get user — try email first then phone
    user = db.table("users").select("*")\
        .eq("email", data.identifier).execute()

    if not user.data:
        user = db.table("users").select("*")\
            .eq("phone", data.identifier).execute()

    if not user.data:
        raise HTTPException(404, "User not found")
    user_data = user.data[0]

    # Mark verified
    db.table("users").update({"is_verified": True})\
        .eq("id", user_data["id"]).execute()

    # Generate token
    token =token = create_access_token({"sub": user_data["id"], "role": user_data["role"]})

    return {
        "access_token": token,
        "user_id":      user_data["id"],
        "role":         user_data["role"],
        "full_name":    user_data["full_name"],
    }