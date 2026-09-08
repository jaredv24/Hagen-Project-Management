from fastapi import APIRouter, HTTPException

from ..db import get_supabase
from ..models import TASK_WRITABLE_FIELDS, TaskUpdate, pick_writable

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.patch("/{task_id}")
def update_task(task_id: str, body: TaskUpdate):
    sb = get_supabase()
    fields = pick_writable(body.fields, TASK_WRITABLE_FIELDS)
    if not fields:
        raise HTTPException(status_code=400, detail="No writable fields provided")
    sb.table("tasks").update(fields).eq("id", task_id).execute()
    return {"ok": True}
