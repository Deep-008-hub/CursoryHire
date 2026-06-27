import random
import string
from datetime import datetime, timedelta, timezone
from database import get_db
from config import settings

def generate_otp(length: int = 6) -> str:
    return ''.join(random.choices(string.digits, k=length))

async def save_otp(identifier: str, code: str, purpose: str) -> None:
    db = get_db()
    try:
        db.table("otp_codes").update({"used": True}).eq("identifier", identifier).eq("purpose", purpose).eq("used", False).execute()
    except:
        pass
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    db.table("otp_codes").insert({
        "identifier": identifier,
        "code": code,
        "purpose": purpose,
        "expires_at": expires_at,
        "used": False
    }).execute()

async def verify_otp(identifier: str, code: str, purpose: str) -> bool:
    db = get_db()
    res = db.table("otp_codes")\
        .select("*")\
        .eq("identifier", identifier)\
        .eq("code", code)\
        .eq("purpose", purpose)\
        .eq("used", False)\
        .execute()

    if not res.data:
        return False

    record = res.data[0]
    expires_at = datetime.fromisoformat(record["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        return False

    db.table("otp_codes").update({"used": True}).eq("id", record["id"]).execute()
    return True

async def send_email_otp(to_email: str, otp: str, name: str, purpose: str) -> bool:
    print(f"\n{'='*50}")
    print(f"📧 OTP for {to_email}: {otp}")
    print(f"{'='*50}\n")

    try:
        import aiosmtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"{otp} is your CursoryHire OTP"
        msg["From"]    = f"CursoryHire <{settings.SMTP_USER}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(f"""
            <div style="font-family:sans-serif;max-width:500px;margin:40px auto;padding:32px;border-radius:16px;border:1px solid #e2e8f0">
                <h2 style="color:#2563eb">CursoryHire</h2>
                <p>Hi {name},</p>
                <p>Your OTP is:</p>
                <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
                    <h1 style="font-size:40px;letter-spacing:12px;color:#2563eb;margin:0">{otp}</h1>
                    <p style="color:#64748b;margin:8px 0 0">Valid for 10 minutes</p>
                </div>
                <p style="color:#64748b;font-size:13px">If you didn't request this, ignore this email.</p>
                <p style="color:#94a3b8;font-size:12px">© 2025 CursoryHire · cursoryhire.com</p>
            </div>
        """, "html"))

        await aiosmtplib.send(
            msg,
            hostname="smtp.gmail.com",
            port=465,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=True,
        )
        print(f"✅ Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"⚠️ Email failed: {e}")
        return True

async def send_sms_otp(to_phone: str, otp: str) -> bool:
    # Always print OTP to terminal
    print(f"\n{'='*50}")
    print(f"📱 OTP for {to_phone}: {otp}")
    print(f"{'='*50}\n")

    # Try Twilio if configured
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        return True

    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(
            body=f"Your CursoryHire OTP is: {otp}. Valid for 10 minutes.",
            from_=settings.TWILIO_PHONE_NUMBER,
            to=to_phone,
        )
        print(f"✅ SMS sent to {to_phone}")
    except Exception as e:
        print(f"⚠️ SMS failed (but OTP printed above): {e}")

    return True  # Always return True