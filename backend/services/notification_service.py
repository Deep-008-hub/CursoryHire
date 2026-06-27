from database import get_db
from typing import Optional
import uuid

async def create_notification(
    user_id: str,
    type: str,
    title: str,
    message: str,
    data: Optional[dict] = None
) -> dict:
    db = get_db()
    notif = {
        "user_id": user_id,
        "type": type,
        "title": title,
        "message": message,
        "data": data or {},
        "read": False,
    }
    res = db.table("notifications").insert(notif).execute()
    return res.data[0] if res.data else notif

async def get_user_notifications(user_id: str, limit: int = 20) -> list:
    db = get_db()
    res = db.table("notifications")\
        .select("*")\
        .eq("user_id", user_id)\
        .order("created_at", desc=True)\
        .limit(limit)\
        .execute()
    return res.data or []

async def mark_notification_read(notif_id: str, user_id: str) -> bool:
    db = get_db()
    db.table("notifications").update({"read": True})\
        .eq("id", notif_id).eq("user_id", user_id).execute()
    return True

async def mark_all_read(user_id: str) -> bool:
    db = get_db()
    db.table("notifications").update({"read": True})\
        .eq("user_id", user_id).eq("read", False).execute()
    return True
