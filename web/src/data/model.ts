import type { Task } from "../types";

export interface Phase {
  key: string;
  title: string;
  tasks: string[];
}

export const PHASES: Phase[] = [
  {
    key: "preliminary",
    title: "Preliminary / Pre-Design",
    tasks: [
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
    key: "permits",
    title: "Permits & Approvals",
    tasks: [
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
    key: "thirdParty",
    title: "Third-Party Coordination",
    tasks: [
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
    key: "asbuilts",
    title: "As-Builts & Closeout",
    tasks: [
      "Pond As-Built",
      "Sanitary Sewer As-Built",
      "Storm As-Built",
      "Water As-Built",
      "Existing Utility As-Builts",
      "Plat Recorded",
      "Water / Sewer Testing Complete",
    ],
  },
];

export const STATUS_OPTIONS = [
  "Not Started",
  "In Progress",
  "Submitted",
  "Under Review",
  "Comments Received",
  "Approved",
  "N/A",
];
export const INTERNAL_STATUS_OPTIONS = ["Not Started", "In Progress", "Completed", "N/A"];
export const PHASE_OPTIONS = [
  "Site Review & Feasibility",
  "Preliminary Design",
  "Agency Coordination",
  "Construction Documents",
  "Permit Approval",
  "Under Construction",
  "As-Builts / Closeout",
  "Complete",
];
export const PROJECT_TYPE_SUGGESTIONS = [
  "Single Family Residential",
  "Multi-Family / Apartments",
  "Commercial / Retail",
  "Industrial / Warehouse",
  "Office",
  "Mixed-Use",
  "Institutional / Municipal",
  "Other",
];

export const INTERNAL_TASKS = new Set([
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
]);

export const AS_BUILT_AGENCY_TASKS = new Set([
  "Pond As-Built",
  "Sanitary Sewer As-Built",
  "Storm As-Built",
  "Water As-Built",
  "Plat Recorded",
  "Water / Sewer Testing Complete",
]);

export const PLAYBOOK_PHASE_KEYS = ["permits", "asbuilts"];

export function getTaskType(name: string): "internal" | "agency" {
  return INTERNAL_TASKS.has(name) ? "internal" : "agency";
}
export function isDone(t: Task): boolean {
  return t.status === "Approved" || t.status === "Completed";
}
export function statusClass(s: string | null | undefined): string {
  return "status-" + (s || "Not Started").replace(/\s+/g, "-").replace("N/A", "N-A");
}
export function isStateSpecificTask(name: string): boolean {
  return /\bstate\b/i.test(name);
}
