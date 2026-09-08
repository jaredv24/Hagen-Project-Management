import { AS_BUILT_AGENCY_TASKS, INTERNAL_STATUS_OPTIONS, STATUS_OPTIONS, getTaskType, isDone } from "../data/model";
import { AttachmentsSection } from "./AttachmentsSection";
import { CommitField } from "./CommitField";
import { DateField } from "./DateField";
import type { ExtraCycle, Task } from "../types";

export interface TaskDetailProps {
  task: Task;
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
}

function LockBanner({ task, editUnlocked, onVerify, onUnlock, onLock }: Pick<TaskDetailProps, "task" | "editUnlocked" | "onVerify" | "onUnlock" | "onLock">) {
  const needsVerify = !!task.needs_verification;
  const locked = isDone(task) && !editUnlocked && !needsVerify;
  if (needsVerify) {
    return (
      <div className="info-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12, background: "var(--warn-soft)", borderColor: "var(--warn)" }}>
        <span>! AI-filled — please review before relying on these values.</span>
        <button className="btn btn-sm" onClick={onVerify}>
          Verify
        </button>
      </div>
    );
  }
  if (locked) {
    return (
      <div className="info-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span>Marked {task.status} — shown as view-only.</span>
        <button className="btn btn-sm" onClick={onUnlock}>
          Edit
        </button>
      </div>
    );
  }
  if (isDone(task)) {
    return (
      <div className="info-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span>Editing unlocked.</span>
        <button className="btn btn-sm" onClick={onLock}>
          Done
        </button>
      </div>
    );
  }
  return null;
}

export function TaskDetail(props: TaskDetailProps) {
  const { task: t, editUnlocked, uploadStatus, onFieldChange, onVerify, onLock, onUnlock, onAddCycle, onRemoveCycle, onCycleChange, onUpload, onRemoveAttachment } = props;
  const type = getTaskType(t.task_name);
  const needsVerify = !!t.needs_verification;
  const locked = isDone(t) && !editUnlocked && !needsVerify;
  const aiAttr = needsVerify;

  if (type === "internal") {
    const statusOpts = INTERNAL_STATUS_OPTIONS.includes(t.status) || !t.status ? INTERNAL_STATUS_OPTIONS : [...INTERNAL_STATUS_OPTIONS, t.status];
    const showParty = t.phase_key === "thirdParty";
    const showAsBuiltAgency = AS_BUILT_AGENCY_TASKS.has(t.task_name);
    return (
      <div className="task-detail">
        <LockBanner task={t} editUnlocked={editUnlocked} onVerify={onVerify} onUnlock={onUnlock} onLock={onLock} />
        <div className="td-grid">
          <div className="td-field">
            <label>Required</label>
            <select data-ai-highlight={aiAttr ? "1" : undefined} disabled={locked} value={t.required} onChange={(e) => onFieldChange("required", e.target.value)}>
              <option value="">—</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div className="td-field">
            <label>Status</label>
            <select data-ai-highlight={aiAttr ? "1" : undefined} disabled={locked} value={t.status} onChange={(e) => onFieldChange("status", e.target.value)}>
              {statusOpts.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <DateField label="Completed Date" iso={t.approval_date} disabled={locked} onCommit={(v) => onFieldChange("approval_date", v)} />
          {showParty && (
            <div className="td-field">
              <label>Party / Company</label>
              <CommitField ariaHighlight={aiAttr} disabled={locked} value={t.agency} list="agencyListP" placeholder="e.g. Smith & Associates Architects" onCommit={(v) => onFieldChange("agency", v)} />
            </div>
          )}
          {showAsBuiltAgency && (
            <div className="td-field">
              <label>Agency</label>
              <CommitField ariaHighlight={aiAttr} disabled={locked} value={t.agency} list="agencyListP" onCommit={(v) => onFieldChange("agency", v)} />
            </div>
          )}
        </div>
        <div className="td-field" style={{ marginTop: 12 }}>
          <label>Notes</label>
          <CommitField multiline rows={2} disabled={locked} value={t.notes} onCommit={(v) => onFieldChange("notes", v)} />
        </div>
        <AttachmentsSection task={t} locked={locked} uploadStatus={uploadStatus} onUpload={onUpload} onRemove={onRemoveAttachment} />
      </div>
    );
  }

  const extra = t.extra_cycles || [];
  return (
    <div className="task-detail">
      <LockBanner task={t} editUnlocked={editUnlocked} onVerify={onVerify} onUnlock={onUnlock} onLock={onLock} />
      <div className="td-grid">
        <div className="td-field">
          <label>Required</label>
          <select data-ai-highlight={aiAttr ? "1" : undefined} disabled={locked} value={t.required} onChange={(e) => onFieldChange("required", e.target.value)}>
            <option value="">—</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div className="td-field">
          <label>Agency</label>
          <CommitField ariaHighlight={aiAttr} disabled={locked} value={t.agency} list="agencyListP" onCommit={(v) => onFieldChange("agency", v)} />
        </div>
        <div className="td-field">
          <label>Status</label>
          <select data-ai-highlight={aiAttr ? "1" : undefined} disabled={locked} value={t.status} onChange={(e) => onFieldChange("status", e.target.value)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <DateField label="Original Submittal" iso={t.original_submittal} disabled={locked} onCommit={(v) => onFieldChange("original_submittal", v)} />
      </div>

      <div className="cycle-block-label" style={{ marginBottom: 6 }}>
        Review Cycles
      </div>
      {[1, 2, 3].map((n) => (
        <div className="cycle-block" key={n}>
          <div className="cycle-block-label">Round {n}</div>
          <div className="td-grid cycle">
            <DateField label="Comments Received" iso={(t as any)[`comments_${n}`]} disabled={locked} onCommit={(v) => onFieldChange(`comments_${n}`, v)} />
            <DateField label={`Resubmittal ${n}`} iso={(t as any)[`resubmittal_${n}`]} disabled={locked} onCommit={(v) => onFieldChange(`resubmittal_${n}`, v)} />
          </div>
        </div>
      ))}
      {extra.map((c, i) => (
        <div className="cycle-block" key={i}>
          <div className="cycle-block-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Round {i + 4}</span>
            {!locked && (
              <span className="toggle-cycles" onClick={() => onRemoveCycle(i)}>
                Remove
              </span>
            )}
          </div>
          <div className="td-grid cycle">
            <DateField label="Comments Received" iso={c.comments} disabled={locked} onCommit={(v) => onCycleChange(i, "comments", v)} />
            <DateField label={`Resubmittal ${i + 4}`} iso={c.resubmittal} disabled={locked} onCommit={(v) => onCycleChange(i, "resubmittal", v)} />
          </div>
        </div>
      ))}
      {!locked && (
        <span className="toggle-cycles" onClick={onAddCycle}>
          + Add another review cycle
        </span>
      )}

      <div className="td-grid" style={{ marginTop: 16 }}>
        <DateField label="Approval Date" iso={t.approval_date} disabled={locked} onCommit={(v) => onFieldChange("approval_date", v)} />
        <DateField label="Expiration Date" iso={t.expiration_date} disabled={locked} onCommit={(v) => onFieldChange("expiration_date", v)} />
      </div>
      <div className="td-field" style={{ marginTop: 12 }}>
        <label>Notes</label>
        <CommitField multiline rows={2} disabled={locked} value={t.notes} onCommit={(v) => onFieldChange("notes", v)} />
      </div>
      <AttachmentsSection task={t} locked={locked} uploadStatus={uploadStatus} onUpload={onUpload} onRemove={onRemoveAttachment} />
    </div>
  );
}
