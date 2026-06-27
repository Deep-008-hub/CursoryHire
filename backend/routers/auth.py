from fastapi import APIRouter, HTTPException
from models.schemas import (
    RegisterRequest, SendOTPRequest,
    VerifyOTPRequest, TokenResponse
)
from services.otp_service import (
    generate_otp, save_otp, verify_otp,
    send_email_otp, send_sms_otp
)
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
                raise HTTPException(404, f"No account found. Please register first.")
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
        raise HTTPException(500, "Failed to send OTP. Check your SMTP/Twilio config.")

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
            return {
                "message": "Account found. OTP will be sent.",
                "user_id": existing_user["id"]
            }

        user_data = {
            "full_name": req.full_name,
            "role": req.role,
            "is_verified": False,
            "is_active": True,
        }
        if req.email:
            user_data["email"] = req.email
        if req.phone:
            user_data["phone"] = req.phone

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

        return {
            "message": "Registered successfully. OTP will be sent.",
            "user_id": user["id"]
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Register error: {e}")
        raise HTTPException(500, f"Registration error: {str(e)}")


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp_and_login(req: VerifyOTPRequest):
    db = get_db()

    ok = await verify_otp(req.identifier, req.code, req.purpose)
    print(f"DEBUG OTP verify result: {ok}")
    if not ok:
        raise HTTPException(400, "Invalid or expired OTP. Please try again.")

    try:
        field = "email" if "@" in req.identifier else "phone"
        res = db.table("users").select("*").eq(field, req.identifier).execute()
        print(f"DEBUG verify - field: {field}, identifier: {req.identifier}, found: {res.data}")

        if not res.data:
            raise HTTPException(404, "User not found. Please register first.")
        user = res.data[0]

        db.table("users").update({"is_verified": True}).eq("id", user["id"]).execute()

        token = create_access_token({"sub": user["id"], "role": user["role"]})

        return TokenResponse(
            access_token=token,
            user_id=user["id"],
            role=user["role"],
            full_name=user["full_name"],
            is_new_user=req.purpose == "register",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Login error: {str(e)}")