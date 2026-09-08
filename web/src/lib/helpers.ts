import { isDone, PHASES, PLAYBOOK_PHASE_KEYS } from "../data/model";
import { daysUntil } from "./dates";
import type { PlaybookRow, Project, Task } from "../types";

export const SORT_FIELDS: { key: string; label: string }[] = [
  { key: "project_number", label: "Project Number" },
  { key: "name", label: "Name" },
  { key: "created_at", label: "Date Added" },
  { key: "client", label: "Client" },
  { key: "jurisdiction", label: "Jurisdiction" },
  { key: "engineer", label: "Engineer" },
];

export function sortProjects(list: Project[], field: string, dir: "asc" | "desc"): Project[] {
  const sorted = [...list].sort((a: any, b: any) => {
    let av = a[field];
    let bv = b[field];
    if (field === "created_at") {
      av = av ? new Date(av).getTime() : 0;
      bv = bv ? new Date(bv).getTime() : 0;
    } else {
      av = (av || "").toString().toLowerCase();
      bv = (bv || "").toString().toLowerCase();
      if (field === "project_number") {
        const an = parseFloat(av);
        const bn = parseFloat(bv);
        if (!isNaN(an) && !isNaN(bn) && an !== bn) return dir === "asc" ? an - bn : bn - an;
      }
    }
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });
  return sorted;
}

export function tasksByPhase(tasks: Task[]): Record<string, Task[]> {
  const map: Record<string, Task[]> = {};
  PHASES.forEach((ph) => {
    map[ph.key] = tasks.filter((t) => t.phase_key === ph.key).sort((a, b) => a.sort_order - b.sort_order);
  });
  return map;
}

export function progressOf(tasks: Task[]) {
  const required = tasks.filter((t) => t.required === "Yes");
  const approved = required.filter(isDone);
  return {
    required: required.length,
    approved: approved.length,
    pct: required.length ? Math.round((approved.length / required.length) * 100) : 0,
  };
}

export function phaseProgressOf(tasks: Task[], phaseKey: string) {
  const list = tasks.filter((t) => t.phase_key === phaseKey);
  const required = list.filter((t) => t.required === "Yes");
  const approved = required.filter(isDone);
  return { required: required.length, approved: approved.length };
}

export function expiringItems(tasks: Task[]) {
  return tasks
    .filter((t) => t.expiration_date && (daysUntil(t.expiration_date) as number) <= 30)
    .map((t) => ({ name: t.task_name, days: daysUntil(t.expiration_date) as number }))
    .sort((a, b) => a.days - b.days);
}

export interface PlaybookTaskStat {
  name: string;
  pct: number;
  agency: string;
  total: number;
}
export interface PlaybookPhaseGroup {
  key: string;
  title: string;
  tasks: PlaybookTaskStat[];
}
export interface PlaybookGroup {
  jurisdiction: string;
  stateOnly: string;
  projectType: string;
  projectCount: number;
  phases: PlaybookPhaseGroup[];
}

export function buildPlaybookGroups(rows: PlaybookRow[]): PlaybookGroup[] {
  interface Accum {
    jurisdiction: string;
    stateOnly: string;
    projectType: string;
    projectIds: Set<string>;
    taskMap: Record<string, { phaseKey: string; name: string; total: number; requiredCount: number; agencies: Record<string, number> }>;
  }
  const groups: Record<string, Accum> = {};
  rows.forEach((r) => {
    const cityOnly = r.projects.jurisdiction || "Unspecified Jurisdiction";
    const stateOnly = r.projects.state || "";
    const juris = cityOnly + (stateOnly ? ", " + stateOnly : "");
    const type = r.projects.project_type || "Unspecified Type";
    const gKey = juris + "|" + type;
    if (!groups[gKey]) {
      groups[gKey] = { jurisdiction: juris, stateOnly, projectType: type, projectIds: new Set(), taskMap: {} };
    }
    const g = groups[gKey];
    g.projectIds.add(r.projects.id);
    const tKey = r.phase_key + "::" + r.task_name;
    if (!g.taskMap[tKey]) {
      g.taskMap[tKey] = { phaseKey: r.phase_key, name: r.task_name, total: 0, requiredCount: 0, agencies: {} };
    }
    const t = g.taskMap[tKey];
    t.total++;
    if (r.required === "Yes") t.requiredCount++;
    if (r.agency && r.agency.trim()) t.agencies[r.agency.trim()] = (t.agencies[r.agency.trim()] || 0) + 1;
  });
  return Object.values(groups)
    .map((g) => {
      const phases = PHASES.filter((ph) => PLAYBOOK_PHASE_KEYS.includes(ph.key))
        .map((ph) => ({
          key: ph.key,
          title: ph.title,
          tasks: ph.tasks
            .map((name) => {
              const t = g.taskMap[ph.key + "::" + name];
              if (!t) return { name, pct: 0, agency: "", total: g.projectIds.size };
              const topAgency = Object.entries(t.agencies).sort((a, b) => b[1] - a[1])[0];
              return {
                name,
                pct: Math.round((t.requiredCount / g.projectIds.size) * 100),
                agency: topAgency ? topAgency[0] : "",
                total: g.projectIds.size,
              };
            })
            .filter((t) => t.pct > 0),
        }))
        .filter((ph) => ph.tasks.length > 0);
      return {
        jurisdiction: g.jurisdiction,
        stateOnly: g.stateOnly,
        projectType: g.projectType,
        projectCount: g.projectIds.size,
        phases,
      };
    })
    .sort((a, b) => b.projectCount - a.projectCount);
}
