from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routers import auth, users, jobs, screening, invitations

app = FastAPI(
    title="CursoryHire API",
    description="AI-Powered Recruitment Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(jobs.router)
app.include_router(screening.router)
app.include_router(invitations.router)

@app.get("/")
async def root():
    return {"name": "CursoryHire API", "version": "1.0.0", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

# ── WebSocket Signaling for WebRTC ────────────────────────────────────────
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List
import json

rooms: Dict[str, List[WebSocket]] = {}

@app.websocket("/ws/room/{room_id}")
async def websocket_room(websocket: WebSocket, room_id: str):
    await websocket.accept()

    if room_id not in rooms:
        rooms[room_id] = []
    rooms[room_id].append(websocket)

    print(f"User joined room {room_id}. Total: {len(rooms[room_id])}")

    try:
        for ws in rooms[room_id]:
            if ws != websocket:
                await ws.send_text(json.dumps({
                    "type": "peer-joined",
                    "count": len(rooms[room_id])
                }))

        while True:
            data = await websocket.receive_text()
            msg  = json.loads(data)
            for ws in rooms[room_id]:
                if ws != websocket:
                    await ws.send_text(json.dumps(msg))

    except WebSocketDisconnect:
        rooms[room_id].remove(websocket)
        print(f"User left room {room_id}. Remaining: {len(rooms[room_id])}")

        for ws in rooms[room_id]:
            try:
                await ws.send_text(json.dumps({"type": "peer-left"}))
            except:
                pass

        if not rooms[room_id]:
            del rooms[room_id]
