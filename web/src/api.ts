import type { Attachment, Project, ProjectWithTasks, TaskExtraction } from "./types";

const BASE = import.meta.env.VITE_API_BASE || "";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers: options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json", ...options.headers } : options.headers,
  });
  if (!res.ok) {
    let message = res.statusText || `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.detail || message;
    } catch {
      /* no JSON body */
    }
    throw new Error(`${path}: ${message}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function listProjects(): Promise<Project[]> {
  return request("/projects");
}

export function createProject(fields: {
  name: string;
  projectNumber?: string;
  client?: string;
  jurisdiction?: string;
  state?: string;
  projectType?: string;
  engineer?: string;
  startDate?: string | null;
}): Promise<ProjectWithTasks> {
  return request("/projects", {
    method: "POST",
    body: JSON.stringify({
      name: fields.name,
      project_number: fields.projectNumber || "",
      client: fields.client || "",
      jurisdiction: fields.jurisdiction || "",
      state: fields.state || "",
      project_type: fields.projectType || "",
      engineer: fields.engineer || "",
      start_date: fields.startDate || null,
    }),
  });
}

export function loadProjectWithTasks(id: string): Promise<ProjectWithTasks> {
  return request(`/projects/${id}`);
}

export function fetchProjectProgress(
  id: string
): Promise<{ required: string; status: string; expiration_date: string | null; needs_verification: boolean }[]> {
  return request(`/projects/${id}/progress`);
}

export function updateProjectFields(id: string, fields: Record<string, unknown>): Promise<void> {
  return request(`/projects/${id}`, { method: "PATCH", body: JSON.stringify({ fields }) });
}

export function updateTask(taskId: string, fields: Record<string, unknown>): Promise<void> {
  return request(`/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ fields }) });
}

export function deleteProject(id: string): Promise<void> {
  return request(`/projects/${id}`, { method: "DELETE" });
}

export function applyExtractedTasks(projectId: string, extractions: TaskExtraction[]): Promise<{ updated_ids: string[] }> {
  return request(`/projects/${projectId}/apply-extractions`, {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, extractions }),
  });
}

export async function uploadAttachment(projectId: string, taskId: string, file: File): Promise<Attachment> {
  const form = new FormData();
  form.append("project_id", projectId);
  form.append("task_id", taskId);
  form.append("file", file);
  return request("/attachments", { method: "POST", body: form });
}

export function deleteAttachment(attachmentId: string): Promise<void> {
  return request(`/attachments/${attachmentId}`, { method: "DELETE" });
}

export function fetchPlaybookRows() {
  return request("/playbooks");
}

export function fetchDistinctValues() {
  return request("/distinct-values");
}

export function fetchHiddenPlaybooks() {
  return request("/hidden-playbooks");
}

export function hidePlaybook(jurisdiction: string, projectType: string): Promise<void> {
  return request("/hidden-playbooks", {
    method: "POST",
    body: JSON.stringify({ jurisdiction, project_type: projectType }),
  });
}
