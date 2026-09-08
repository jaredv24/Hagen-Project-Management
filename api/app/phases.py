# Mirrors the PHASES data model from the original client-side app so the
# backend can build default task rows the same way createProject() used to.

PHASES = [
    {
        "key": "preliminary",
        "title": "Preliminary / Pre-Design",
        "tasks": [
            "Client Project Scope Discussion",
            "Obtain Building Footprints",
            "Sketch Plan Review",
            "Utility Availability Letter / Map",
            "Basemap Completion",
            "Proposal Submitted to Client",
            "Request Survey Proposal",
        ],
    },
    {
        "key": "permits",
        "title": "Permits & Approvals",
        "tasks": [
            "Zoning Application",
            "Planning Board Approval",
            "Zoning Variance Approval",
            "Annexation Approval",
            "Council Approval",
            "TRC Submittal",
            "Construction Drawing Submittal",
            "Grading Permit – Local",
            "Grading Permit – State",
            "Stormwater Permit – Local",
            "Stormwater Permit – State",
            "Water Permit – Local",
            "Water Permit – State",
            "Sewer Permit – Local",
            "Sewer Permit – State",
            "DOT 3-Party Encroachment (Utility)",
            "DOT 2-Party (Road Widening)",
            "State C/A Encroachment Permit",
            "Driveway Permit – Local",
            "Driveway Permit – State",
            "Fire Marshal – Local",
            "Fire Marshal – State",
            "Building Inspections / ADA",
            "Building Permit Approval",
            "Pump Station Approval",
            "Stream Disturbance Permit",
            "Wetland Disturbance Permit",
        ],
    },
    {
        "key": "thirdParty",
        "title": "Third-Party Coordination",
        "tasks": [
            "Architect",
            "Plumbing / HVAC",
            "Landscape Plan",
            "Lighting Plan",
            "Geotech Report",
            "Wetlands Delineation",
            "Stream / Wetlands Permitting",
            "Water Pressure (Engineered Solutions)",
            "Hydrant Flow Test",
        ],
    },
    {
        "key": "asbuilts",
        "title": "As-Builts & Closeout",
        "tasks": [
            "Pond As-Built",
            "Sanitary Sewer As-Built",
            "Storm As-Built",
            "Water As-Built",
            "Existing Utility As-Builts",
            "Plat Recorded",
            "Water / Sewer Testing Complete",
        ],
    },
]

INTERNAL_TASKS = {
    "Client Project Scope Discussion",
    "Obtain Building Footprints",
    "Basemap Completion",
    "Proposal Submitted to Client",
    "Request Survey Proposal",
    "Architect",
    "Plumbing / HVAC",
    "Landscape Plan",
    "Lighting Plan",
    "Geotech Report",
    "Wetlands Delineation",
    "Water Pressure (Engineered Solutions)",
    "Hydrant Flow Test",
    "Pond As-Built",
    "Sanitary Sewer As-Built",
    "Storm As-Built",
    "Water As-Built",
    "Existing Utility As-Builts",
    "Plat Recorded",
    "Water / Sewer Testing Complete",
}

STATUS_OPTIONS = [
    "Not Started",
    "In Progress",
    "Submitted",
    "Under Review",
    "Comments Received",
    "Approved",
    "N/A",
]
INTERNAL_STATUS_OPTIONS = ["Not Started", "In Progress", "Completed", "N/A"]

PLAYBOOK_PHASE_KEYS = ["permits", "asbuilts"]


def default_task_rows() -> list[dict]:
    rows = []
    for phase in PHASES:
        for i, name in enumerate(phase["tasks"]):
            rows.append(
                {
                    "phase_key": phase["key"],
                    "sort_order": i,
                    "task_name": name,
                    "required": "",
                    "agency": "",
                    "status": "Not Started",
                    "original_submittal": None,
                    "comments_1": None,
                    "resubmittal_1": None,
                    "comments_2": None,
                    "resubmittal_2": None,
                    "comments_3": None,
                    "resubmittal_3": None,
                    "approval_date": None,
                    "expiration_date": None,
                    "notes": "",
                }
            )
    return rows


def get_task_type(name: str) -> str:
    return "internal" if name in INTERNAL_TASKS else "agency"
