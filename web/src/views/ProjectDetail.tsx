import { useEffect, useState } from "react";
import { deleteAttachment, deleteProject, loadProjectWithTasks, updateProjectFields, updateTask, uploadAttachment } from "../api";
import { PHASES, PHASE_OPTIONS, isDone } from "../data/model";
import { CommitField } from "../components/CommitField";
import { DateField } from "../components/DateField";
import { TaskDetail } from "../components/TaskDetail";
import { ATTACH_ICON_SVG, VERIFY_ICON_SVG } from "../components/icons";
import { expiringItems, phaseProgressOf, progressOf, tasksByPhase } from "../lib/helpers";
import { daysUntil, displayToIsoDate, fmtDate, isoToDisplayDate } from "../lib/dates";
import { statusClass } from "../data/model";
import type { ExtraCycle, Project, Task } from "../types";

export function ProjectDetail({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(PHASES.map((p) => p.key)));
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [editUnlocked, setEditUnlocked] = useState<Set<string>>(new Set());
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    loadProjectWithTasks(projectId)
      .then(({ project, tasks }) => {
        setProject(project);
        setTasks(tasks);
        setExpandedTasks(new Set());
        setEditUnlocked(new Set());
      })
      .catch((err) => setError(err.message || String(err)))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="loading">Loading…</div>;
  if (error) return <div className="error-state">Error: {error}</div>;
  if (!project) return null;

  function saveProjectField(field: string, value: unknown) {
    setProject((p) => (p ? { ...p, [field]: value } : p));
    updateProjectFields(project!.id, { [field]: value }).catch((err) => alert("Save failed: " + (err.message || err)));
  }

  function updateTaskField(taskId: string, field: string, value: string | null) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const updates: Record<string, unknown> = { [field]: value };
    if (task.needs_verification) updates.needs_verification = false;

    if (field === "status" && value) {
      const derivedRequired = value === "N/A" ? "No" : "Yes";
      if (derivedRequired !== task.required) updates.required = derivedRequired;
    }
    if (field === "required" && value === "No" && task.status !== "N/A") {
      updates.status = "N/A";
    }

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));
    updateTask(taskId, updates).catch((err) => alert("Save failed: " + (err.message || err)));
  }

  function verifyTask(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, needs_verification: false } : t)));
    updateTask(taskId, { needs_verification: false }).catch((err) => console.error("Could not clear verification flag:", err));
    if (task && isDone({ ...task, needs_verification: false })) {
      setEditUnlocked((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
  }

  function addCycle(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const extra = [...(task.extra_cycles || []), { comments: "", resubmittal: "" }];
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, extra_cycles: extra } : t)));
    updateTask(taskId, { extra_cycles: extra }).catch((err) => alert("Save failed: " + (err.message || err)));
  }

  function removeCycle(taskId: string, idx: number) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const extra = [...(task.extra_cycles || [])];
    extra.splice(idx, 1);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, extra_cycles: extra } : t)));
    updateTask(taskId, { extra_cycles: extra }).catch((err) => alert("Save failed: " + (err.message || err)));
  }

  function changeCycle(taskId: string, idx: number, field: keyof ExtraCycle, value: string | null) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const extra = [...(task.extra_cycles || [])];
    extra[idx] = { ...extra[idx], [field]: value };
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, extra_cycles: extra } : t)));
    updateTask(taskId, { extra_cycles: extra }).catch((err) => alert("Save failed: " + (err.message || err)));
  }

  async function handleUpload(taskId: string, file: File) {
    setUploadStatus((s) => ({ ...s, [taskId]: "Uploading…" }));
    try {
      const row = await uploadAttachment(project!.id, taskId, file);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, attachments: [...(t.attachments || []), row] } : t)));
    } catch (err: any) {
      alert("Upload failed: " + (err.message || err));
    } finally {
      setUploadStatus((s) => ({ ...s, [taskId]: "" }));
    }
  }

  async function handleRemoveAttachment(taskId: string, attachmentId: string) {
    const task = tasks.find((t) => t.id === taskId);
    const attachment = task?.attachments.find((a) => a.id === attachmentId);
    if (!attachment) return;
    if (!confirm(`Remove "${attachment.file_name}"? This cannot be undone.`)) return;
    try {
      await deleteAttachment(attachmentId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, attachments: t.attachments.filter((a) => a.id !== attachmentId) } : t)));
    } catch (err: any) {
      alert("Could not remove file: " + (err.message || err));
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${project!.name}"? This cannot be undone.`)) return;
    try {
      await deleteProject(project!.id);
      onBack();
    } catch (err: any) {
      alert("Could not delete: " + (err.message || err));
    }
  }

  function toggleTask(taskId: string) {
    setExpandedTasks((prev) => (prev.has(taskId) ? new Set() : new Set([taskId])));
  }

  function togglePhase(key: string) {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const overall = progressOf(tasks);
  const exp = expiringItems(tasks);
  const byPhase = tasksByPhase(tasks);
  const projectAgencies = [...new Set(tasks.map((t) => t.agency).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  return (
    <>
      <datalist id="agencyListP">
        {projectAgencies.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      <div className="topbar">
        <span className="back" onClick={onBack}>
          ← All Projects
        </span>
        <button className="btn btn-danger btn-sm" onClick={handleDelete}>
          Delete Project
        </button>
      </div>
      <div className="titleblock">
        <div className="tb-top">
          <CommitField value={project.name} onCommit={(v) => saveProjectField("name", v.trim() || "Untitled Project")} placeholder="Project name" />
        </div>
        <div className="tb-grid">
          <div className="tb-field">
            <label>Project #</label>
            <CommitField value={project.project_number} onCommit={(v) => saveProjectField("project_number", v)} />
          </div>
          <div className="tb-field">
            <label>Client</label>
            <CommitField value={project.client} onCommit={(v) => saveProjectField("client", v)} />
          </div>
          <div className="tb-field">
            <label>Start Date</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={10}
              placeholder="MM/DD/YYYY"
              defaultValue={isoToDisplayDate(project.start_date)}
              key={project.start_date}
              onBlur={(e) => {
                const { iso, valid } = displayToIsoDate(e.target.value);
                if (!valid) {
                  alert("That start date doesn’t look right — use MM/DD/YYYY.");
                  e.target.value = isoToDisplayDate(project.start_date);
                  return;
                }
                e.target.value = isoToDisplayDate(iso);
                saveProjectField("start_date", iso);
              }}
            />
          </div>
          <div className="tb-field">
            <label>Jurisdiction (County/City)</label>
            <CommitField value={project.jurisdiction} onCommit={(v) => saveProjectField("jurisdiction", v)} />
          </div>
          <div className="tb-field">
            <label>State</label>
            <CommitField value={project.state} onCommit={(v) => saveProjectField("state", v)} />
          </div>
          <div className="tb-field">
            <label>Project Type</label>
            <CommitField value={project.project_type} onCommit={(v) => saveProjectField("project_type", v)} />
          </div>
          <div className="tb-field">
            <label>Current Phase</label>
            <select value={project.current_phase || ""} onChange={(e) => saveProjectField("current_phase", e.target.value)}>
              <option value="">—</option>
              {PHASE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div className="tb-field">
            <label>Engineer</label>
            <CommitField value={project.engineer} onCommit={(v) => saveProjectField("engineer", v)} />
          </div>
        </div>
        <div className="tb-overall">
          <span className="lbl">Overall Progress</span>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${overall.pct}%` }} />
          </div>
          <span className="lbl">
            {overall.approved} of {overall.required} required items approved
          </span>
        </div>
      </div>

      {exp.length > 0 && (
        <div className="alert-banner">
          {exp.length} item{exp.length > 1 ? "s" : ""} expiring within 30 days:{" "}
          {exp
            .slice(0, 4)
            .map((i) => `${i.name} (${i.days < 0 ? "expired" : i.days + "d"})`)
            .join(", ")}
          {exp.length > 4 ? "…" : ""}
        </div>
      )}

      {PHASES.map((ph) => (
        <PhaseBlock
          key={ph.key}
          phase={ph}
          tasksInPhase={byPhase[ph.key]}
          allTasks={tasks}
          isOpen={expandedPhases.has(ph.key)}
          onToggle={() => togglePhase(ph.key)}
          expandedTasks={expandedTasks}
          onToggleTask={toggleTask}
          editUnlocked={editUnlocked}
          uploadStatus={uploadStatus}
          onFieldChange={updateTaskField}
          onVerify={verifyTask}
          onLock={(id) =>
            setEditUnlocked((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            })
          }
          onUnlock={(id) => setEditUnlocked((prev) => new Set([...prev, id]))}
          onAddCycle={addCycle}
          onRemoveCycle={removeCycle}
          onCycleChange={changeCycle}
          onUpload={handleUpload}
          onRemoveAttachment={handleRemoveAttachment}
        />
      ))}
      <footer className="note">Changes save automatically.</footer>
    </>
  );
}

function PhaseBlock({
  phase,
  tasksInPhase,
  allTasks,
  isOpen,
  onToggle,
  expandedTasks,
  onToggleTask,
  editUnlocked,
  uploadStatus,
  onFieldChange,
  onVerify,
  onLock,
  onUnlock,
  onAddCycle,
  onRemoveCycle,
  onCycleChange,
  onUpload,
  onRemoveAttachment,
}: {
  phase: { key: string; title: string };
  tasksInPhase: Task[];
  allTasks: Task[];
  isOpen: boolean;
  onToggle: () => void;
  expandedTasks: Set<string>;
  onToggleTask: (id: string) => void;
  editUnlocked: Set<string>;
  uploadStatus: Record<string, string>;
  onFieldChange: (taskId: string, field: string, value: string | null) => void;
  onVerify: (taskId: string) => void;
  onLock: (taskId: string) => void;
  onUnlock: (taskId: string) => void;
  onAddCycle: (taskId: string) => void;
  onRemoveCycle: (taskId: string, idx: number) => void;
  onCycleChange: (taskId: string, idx: number, field: keyof ExtraCycle, value: string | null) => void;
  onUpload: (taskId: string, file: File) => void;
  onRemoveAttachment: (taskId: string, attachmentId: string) => void;
}) {
  const stat = phaseProgressOf(allTasks, phase.key);
  return (
    <div className="phase">
      <div className="phase-head" onClick={onToggle}>
        <h2>{phase.title}</h2>
        <div className="ph-right">
          <span className="ph-count">
            Approved: {stat.approved} of {stat.required}
          </span>
          <span className="chev" style={{ transform: `rotate(${isOpen ? "90deg" : "0deg"})` }}>
            ▶
          </span>
        </div>
      </div>
      <div className={`phase-body-wrap ${isOpen ? "open" : ""}`}>
        <div className="task-col-head">
          <span className="col-req">Req.</span>
          <span className="col-item">Item</span>
          <span className="col-approved">Approved</span>
          <span className="col-status">Status</span>
          <span className="col-expires">Expires</span>
          <span></span>
        </div>
        <div className="phase-body">
          {tasksInPhase.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              isOpen={expandedTasks.has(t.id)}
              onToggle={() => onToggleTask(t.id)}
              editUnlocked={editUnlocked.has(t.id)}
              uploadStatus={uploadStatus[t.id] || ""}
              onFieldChange={(field, value) => onFieldChange(t.id, field, value)}
              onVerify={() => onVerify(t.id)}
              onLock={() => onLock(t.id)}
              onUnlock={() => onUnlock(t.id)}
              onAddCycle={() => onAddCycle(t.id)}
              onRemoveCycle={(idx) => onRemoveCycle(t.id, idx)}
              onCycleChange={(idx, field, value) => onCycleChange(t.id, idx, field, value)}
              onUpload={(file) => onUpload(t.id, file)}
              onRemoveAttachment={(attId) => onRemoveAttachment(t.id, attId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TaskRow({
  task: t,
  isOpen,
  onToggle,
  ...detailProps
}: {
  task: Task;
  isOpen: boolean;
  onToggle: () => void;
  editUnlocked: boolean;
  uploadStatus: string;
  onFieldChange: (field: string, value: string | null) => void;
  onVerify: () => void;
  onLock: () => void;
  onUnlock: () => void;
  onAddCycle: () => void;
  onRemoveCycle: (idx: number) => void;
  onCycleChange: (idx: number, field: keyof ExtraCycle, value: string | null) => void;
  onUpload: (file: File) => void;
  onRemoveAttachment: (attachmentId: string) => void;
}) {
  const notReq = t.required === "No";
  const d = daysUntil(t.expiration_date);
  const soon = d !== null && d <= 30;
  const hasFiles = (t.attachments || []).length > 0;
  const needsVerify = !!t.needs_verification;

  return (
    <div>
      <div className={`task-row ${notReq ? "not-required" : ""}`} onClick={onToggle}>
        <span className="task-req-badge">{t.required || "Set"}</span>
        <span className="task-name">{t.task_name}</span>
        <span className="approved-date">{t.approval_date ? fmtDate(t.approval_date) : ""}</span>
        <span className="status-cell">
          <span className={`status-pill ${statusClass(t.status)}`}>
            {t.status || "Not Started"}
            {hasFiles && <span className="attach-flag" title="Has attachment" dangerouslySetInnerHTML={{ __html: ATTACH_ICON_SVG }} />}
          </span>
          {needsVerify && <span className="verify-icon" title="AI-filled — needs verification" dangerouslySetInnerHTML={{ __html: VERIFY_ICON_SVG }} />}
        </span>
        <span className={`exp-date ${soon ? "soon" : ""}`}>{t.expiration_date ? fmtDate(t.expiration_date) : ""}</span>
        <span className="task-chev" style={{ transform: `rotate(${isOpen ? "90deg" : "0deg"})` }}>
          ▶
        </span>
      </div>
      <div className={`task-detail-wrap ${isOpen ? "open" : ""}`} onClick={(e) => e.stopPropagation()}>
        {isOpen && <TaskDetail task={t} {...detailProps} />}
      </div>
    </div>
  );
}
