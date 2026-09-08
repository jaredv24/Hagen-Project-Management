"""
Ports the extraction-normalization logic that used to run client-side after
calling the Supabase Edge Function `extract-approval` (which is unchanged
and still called directly from the frontend). This module only deals with
turning that function's raw JSON output into task field updates.
"""

import re
from datetime import date

from .phases import INTERNAL_STATUS_OPTIONS, STATUS_OPTIONS, get_task_type

_SEP_DATE = re.compile(r"^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})$")


def display_to_iso_date(display: str | None) -> tuple[str | None, bool]:
    s = (display or "").strip()
    if s == "":
        return None, True
    m = _SEP_DATE.match(s)
    if m:
        mm, dd, yyyy = m.group(1).zfill(2), m.group(2).zfill(2), m.group(3)
        yyyy = "20" + yyyy if len(yyyy) == 2 else yyyy
    else:
        digits = re.sub(r"[^0-9]", "", s)
        if len(digits) == 0:
            return None, True
        if len(digits) == 8:
            mm, dd, yyyy = digits[0:2], digits[2:4], digits[4:8]
        elif len(digits) == 6:
            mm, dd, yyyy = digits[0:2], digits[2:4], "20" + digits[4:6]
        else:
            return None, False
    try:
        d = date(int(yyyy), int(mm), int(dd))
    except ValueError:
        return None, False
    return f"{d.year:04d}-{d.month:02d}-{d.day:02d}", True


def is_plausible_project_number(val: str | None) -> bool:
    if not val:
        return False
    m = re.match(r"^(\d{4})-(\d{2,3})$", str(val).strip())
    if not m:
        return False
    year = int(m.group(1))
    current_year = date.today().year
    return 2020 <= year <= current_year + 1


def dedupe_extracted_tasks(extractions: list[dict]) -> list[dict]:
    by_name: dict[str, dict] = {}
    for ex in extractions or []:
        key = str(ex.get("task_name") or "").strip().lower()
        if not key:
            continue
        if key not in by_name:
            by_name[key] = dict(ex)
            continue
        merged = by_name[key]
        for f in ("required", "agency", "status", "approval_date"):
            if not merged.get(f) and ex.get(f):
                merged[f] = ex[f]
        merged["uncertain"] = bool(merged.get("uncertain") or ex.get("uncertain"))
    return list(by_name.values())


def normalize_extracted_status(raw: str | None, task_type: str) -> str:
    if not raw:
        return ""
    valid = INTERNAL_STATUS_OPTIONS if task_type == "internal" else STATUS_OPTIONS
    trimmed = str(raw).strip()
    for v in valid:
        if v.lower() == trimmed.lower():
            return v
    lower = trimmed.lower()
    if lower == "complete":
        return "Completed" if task_type == "internal" else "Approved"
    if lower == "approved" and task_type == "internal":
        return "Completed"
    if lower == "completed" and task_type == "agency":
        return "Approved"
    if lower in ("n/a", "na"):
        return "N/A"
    return ""


def normalize_extracted_required(raw: str | None) -> str:
    if not raw:
        return ""
    t = str(raw).strip().lower()
    if t in ("y", "yes"):
        return "Yes"
    if t in ("n", "no"):
        return "No"
    return ""


def build_task_updates(task_name: str, current_status: str, ex: dict) -> dict:
    """Given one existing task's name/status and one extraction row for it,
    return the field updates to apply (mirrors applyExtractedTasksToNewTasks)."""
    task_type = get_task_type(task_name)
    updates: dict = {}
    if ex.get("agency"):
        updates["agency"] = ex["agency"]
    normalized_status = normalize_extracted_status(ex.get("status"), task_type)
    normalized_required = normalize_extracted_required(ex.get("required"))

    if normalized_required == "No":
        updates["required"] = "No"
        updates["status"] = "N/A"
    elif normalized_required == "Yes":
        updates["required"] = "Yes"
        if normalized_status:
            updates["status"] = normalized_status
    elif normalized_status:
        updates["status"] = normalized_status
        updates["required"] = "No" if normalized_status == "N/A" else "Yes"

    final_status = updates.get("status", current_status)
    if ex.get("approval_date") and final_status in ("Approved", "Completed"):
        iso, valid = display_to_iso_date(ex["approval_date"])
        if valid and iso:
            updates["approval_date"] = iso

    if ex.get("uncertain"):
        updates["notes"] = "! Verify — AI wasn’t fully sure reading this row."

    if updates:
        updates["needs_verification"] = True
    return updates
