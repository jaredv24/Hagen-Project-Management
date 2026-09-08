from fastapi import APIRouter, HTTPException

from ..db import ATTACHMENTS_BUCKET, get_supabase
from ..extraction import build_task_updates, dedupe_extracted_tasks
from ..models import (
    PROJECT_WRITABLE_FIELDS,
    BulkApplyRequest,
    ProjectCreate,
    ProjectUpdate,
    pick_writable,
)
from ..phases import default_task_rows

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("")
def list_projects():
    sb = get_supabase()
    res = sb.table("projects").select("*").order("updated_at", desc=True).execute()
    return res.data


@router.post("")
def create_project(body: ProjectCreate):
    sb = get_supabase()
    payload = {
        "name": body.name,
        "project_number": body.project_number or "",
        "client": body.client or "",
        "jurisdiction": body.jurisdiction or "",
        "state": body.state or "",
        "project_type": body.project_type or "",
        "engineer": body.engineer or "",
        "start_date": body.start_date or None,
    }
    project_res = sb.table("projects").insert(payload).execute()
    if not project_res.data:
        raise HTTPException(status_code=400, detail="Could not create project")
    project = project_res.data[0]

    rows = [{**r, "project_id": project["id"]} for r in default_task_rows()]
    tasks_res = sb.table("tasks").insert(rows).execute()
    return {"project": project, "tasks": tasks_res.data}


@router.get("/{project_id}")
def get_project(project_id: str):
    sb = get_supabase()
    project_res = sb.table("projects").select("*").eq("id", project_id).single().execute()
    if not project_res.data:
        raise HTTPException(status_code=404, detail="Project not found")
    project = project_res.data

    tasks_res = (
        sb.table("tasks").select("*").eq("project_id", project_id).order("sort_order").execute()
    )
    tasks = tasks_res.data or []

    task_ids = [t["id"] for t in tasks]
    attachments = []
    if task_ids:
        att_res = (
            sb.table("task_attachments")
            .select("*")
            .in_("task_id", task_ids)
            .order("uploaded_at")
            .execute()
        )
        attachments = att_res.data or []

    by_task: dict[str, list] = {}
    for a in attachments:
        a["public_url"] = sb.storage.from_(ATTACHMENTS_BUCKET).get_public_url(a["storage_path"])
        by_task.setdefault(a["task_id"], []).append(a)
    for t in tasks:
        t["attachments"] = by_task.get(t["id"], [])

    return {"project": project, "tasks": tasks}


@router.patch("/{project_id}")
def update_project(project_id: str, body: ProjectUpdate):
    sb = get_supabase()
    fields = pick_writable(body.fields, PROJECT_WRITABLE_FIELDS)
    if not fields:
        raise HTTPException(status_code=400, detail="No writable fields provided")
    sb.table("projects").update(fields).eq("id", project_id).execute()
    return {"ok": True}


@router.delete("/{project_id}")
def delete_project(project_id: str):
    sb = get_supabase()
    sb.table("projects").delete().eq("id", project_id).execute()
    return {"ok": True}


@router.get("/{project_id}/progress")
def get_project_progress(project_id: str):
    """Lightweight per-card stats for the dashboard list (required/approved
    counts, expiring-soon items, items needing verification) without pulling
    full task rows."""
    sb = get_supabase()
    res = (
        sb.table("tasks")
        .select("required, status, expiration_date, needs_verification")
        .eq("project_id", project_id)
        .execute()
    )
    return res.data


@router.post("/{project_id}/apply-extractions")
def apply_extractions(project_id: str, body: BulkApplyRequest):
    """Applies AI-extracted task field values (from the extract-approval edge
    function) onto a project's freshly-created default tasks. Ported from
    applyExtractedTasksToNewTasks so both the New Project autofill and the
    Bulk Import flow share one implementation."""
    sb = get_supabase()
    tasks_res = sb.table("tasks").select("*").eq("project_id", project_id).execute()
    tasks_by_name = {t["task_name"].strip().lower(): t for t in (tasks_res.data or [])}

    extractions = dedupe_extracted_tasks([e.model_dump() for e in body.extractions])
    updated_ids = []
    for ex in extractions:
        task = tasks_by_name.get(str(ex.get("task_name") or "").strip().lower())
        if not task:
            continue
        updates = build_task_updates(task["task_name"], task["status"], ex)
        if not updates:
            continue
        sb.table("tasks").update(updates).eq("id", task["id"]).execute()
        updated_ids.append(task["id"])

    return {"updated_ids": updated_ids}
