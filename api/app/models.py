from typing import Any, Optional

from pydantic import BaseModel, Field

# Columns writable via PATCH. Anything outside these sets is rejected rather
# than passed through to Supabase, since the backend now owns the anon
# browser never touches these tables directly anymore.
PROJECT_WRITABLE_FIELDS = {
    "name",
    "project_number",
    "client",
    "jurisdiction",
    "state",
    "project_type",
    "engineer",
    "start_date",
    "current_phase",
}

TASK_WRITABLE_FIELDS = {
    "required",
    "agency",
    "status",
    "original_submittal",
    "comments_1",
    "resubmittal_1",
    "comments_2",
    "resubmittal_2",
    "comments_3",
    "resubmittal_3",
    "extra_cycles",
    "approval_date",
    "expiration_date",
    "notes",
    "needs_verification",
}


class ProjectCreate(BaseModel):
    name: str
    project_number: Optional[str] = ""
    client: Optional[str] = ""
    jurisdiction: Optional[str] = ""
    state: Optional[str] = ""
    project_type: Optional[str] = ""
    engineer: Optional[str] = ""
    start_date: Optional[str] = None


class ProjectUpdate(BaseModel):
    fields: dict[str, Any] = Field(default_factory=dict)


class TaskUpdate(BaseModel):
    fields: dict[str, Any] = Field(default_factory=dict)


class TaskExtraction(BaseModel):
    task_name: str
    required: Optional[str] = None
    agency: Optional[str] = None
    status: Optional[str] = None
    approval_date: Optional[str] = None
    uncertain: Optional[bool] = False


class BulkApplyRequest(BaseModel):
    project_id: str
    extractions: list[TaskExtraction] = Field(default_factory=list)


class HiddenPlaybookCreate(BaseModel):
    jurisdiction: str
    project_type: str


def pick_writable(fields: dict[str, Any], allowed: set[str]) -> dict[str, Any]:
    return {k: v for k, v in fields.items() if k in allowed}
