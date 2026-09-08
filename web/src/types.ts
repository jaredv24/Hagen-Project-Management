export interface ExtraCycle {
  comments: string | null;
  resubmittal: string | null;
}

export interface Attachment {
  id: string;
  task_id: string;
  file_name: string;
  storage_path: string;
  content_type: string | null;
  file_size: number | null;
  uploaded_at: string;
  public_url: string;
}

export interface Task {
  id: string;
  project_id: string;
  phase_key: string;
  sort_order: number;
  task_name: string;
  required: string;
  agency: string;
  status: string;
  original_submittal: string | null;
  comments_1: string | null;
  resubmittal_1: string | null;
  comments_2: string | null;
  resubmittal_2: string | null;
  comments_3: string | null;
  resubmittal_3: string | null;
  extra_cycles?: ExtraCycle[];
  approval_date: string | null;
  expiration_date: string | null;
  notes: string;
  needs_verification?: boolean;
  attachments: Attachment[];
}

export interface Project {
  id: string;
  name: string;
  project_number: string;
  client: string;
  jurisdiction: string;
  state: string;
  project_type: string;
  current_phase: string | null;
  engineer: string;
  start_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithTasks {
  project: Project;
  tasks: Task[];
}

export interface PlaybookRow {
  task_name: string;
  phase_key: string;
  required: string;
  agency: string;
  projects: { id: string; jurisdiction: string; state: string; project_type: string };
}

export interface TaskExtraction {
  task_name: string;
  required?: string | null;
  agency?: string | null;
  status?: string | null;
  approval_date?: string | null;
  uncertain?: boolean;
}

export interface ExtractionResult {
  name?: string;
  project_number?: string;
  client?: string;
  jurisdiction?: string;
  state?: string;
  project_type?: string;
  start_date?: string;
  tasks?: TaskExtraction[];
  error?: string;
}

export type BulkJobStatus = "pending" | "reading" | "creating" | "done" | "error";

export interface BulkResult {
  fileName: string;
  status: BulkJobStatus;
  message?: string;
  projectId?: string;
  projectName?: string;
  taskCount?: number;
  uncertainCount?: number;
}
