from collections import OrderedDict, deque
from threading import Lock
import time

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.assistant.schemas import ChatRequest, ChatResponse
from app.assistant.service import AssistantError, configuration, reply

router = APIRouter(prefix="/assistant", tags=["Field companion"])
_requests: OrderedDict[str, deque] = OrderedDict()
_lock = Lock()


def allowed(identifier: str, now: float | None = None) -> bool:
    """Per-process guard, not a substitute for a distributed production WAF limit."""
    now = time.monotonic() if now is None else now
    with _lock:
        bucket = _requests.setdefault(identifier, deque())
        while bucket and bucket[0] <= now - 3600:
            bucket.popleft()
        if len(bucket) >= 30:
            return False
        bucket.append(now)
        _requests.move_to_end(identifier)
        while len(_requests) > 2000:
            _requests.popitem(last=False)
        return True


@router.get("/status")
def status():
    key, model = configuration()
    return {"configured": bool(key), "provider": "gemini", "model": model if key else None, "guide_available": True}


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, request: Request):
    identifier = request.client.host if request.client else "unknown"
    if not allowed(identifier):
        return JSONResponse(status_code=429, headers={"Retry-After": "60"}, content={"error": {"code": "assistant_rate_limit", "message": "Please give Pacha a short break. The guided steps remain available."}})
    try:
        return await reply(payload)
    except AssistantError as exc:
        return JSONResponse(status_code=exc.status, content={"error": {"code": exc.code, "message": exc.message}})
