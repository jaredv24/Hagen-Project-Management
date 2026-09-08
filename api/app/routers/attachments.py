import re
import time

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..db import ATTACHMENTS_BUCKET, get_supabase

router = APIRouter(prefix="/api/attachments", tags=["attachments"])

_UNSAFE = re.compile(r"[^a-zA-Z0-9._-]")


@router.post("")
async def upload_attachment(
    project_id: str = Form(...),
    task_id: str = Form(...),
    file: UploadFile = File(...),
):
    sb = get_supabase()
    safe_name = _UNSAFE.sub("_", file.filename or "file")
    path = f"{project_id}/{task_id}/{int(time.time() * 1000)}_{safe_name}"
    contents = await file.read()

    sb.storage.from_(ATTACHMENTS_BUCKET).upload(
        path, contents, {"content-type": file.content_type or "application/octet-stream"}
    )

    row_res = (
        sb.table("task_attachments")
        .insert(
            {
                "task_id": task_id,
                "file_name": file.filename,
                "storage_path": path,
                "content_type": file.content_type,
                "file_size": len(contents),
            }
        )
        .execute()
    )
    if not row_res.data:
        raise HTTPException(status_code=400, detail="Could not record attachment")
    row = row_res.data[0]
    row["public_url"] = sb.storage.from_(ATTACHMENTS_BUCKET).get_public_url(path)
    return row


@router.delete("/{attachment_id}")
def delete_attachment(attachment_id: str):
    sb = get_supabase()
    att_res = sb.table("task_attachments").select("*").eq("id", attachment_id).single().execute()
    if not att_res.data:
        raise HTTPException(status_code=404, detail="Attachment not found")
    att = att_res.data
    sb.storage.from_(ATTACHMENTS_BUCKET).remove([att["storage_path"]])
    sb.table("task_attachments").delete().eq("id", attachment_id).execute()
    return {"ok": True}
