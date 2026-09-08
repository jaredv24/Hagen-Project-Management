from fastapi import APIRouter

from ..db import get_supabase
from ..models import HiddenPlaybookCreate
from ..phases import PLAYBOOK_PHASE_KEYS

router = APIRouter(prefix="/api", tags=["playbooks"])


@router.get("/playbooks")
def fetch_playbook_rows():
    sb = get_supabase()
    res = (
        sb.table("tasks")
        .select("task_name, phase_key, required, agency, projects!inner(id, jurisdiction, state, project_type)")
        .in_("phase_key", PLAYBOOK_PHASE_KEYS)
        .execute()
    )
    return res.data


@router.get("/distinct-values")
def fetch_distinct_values():
    sb = get_supabase()
    res = sb.table("projects").select("jurisdiction, state, project_type, client, engineer").execute()
    return res.data


@router.get("/hidden-playbooks")
def fetch_hidden_playbooks():
    sb = get_supabase()
    res = sb.table("hidden_playbooks").select("jurisdiction, project_type").execute()
    return res.data


@router.post("/hidden-playbooks")
def hide_playbook(body: HiddenPlaybookCreate):
    sb = get_supabase()
    sb.table("hidden_playbooks").insert(
        {"jurisdiction": body.jurisdiction, "project_type": body.project_type}
    ).execute()
    return {"ok": True}
