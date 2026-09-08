import type { Task } from "../types";

export function AttachmentsSection({
  task,
  locked,
  uploadStatus,
  onUpload,
  onRemove,
}: {
  task: Task;
  locked: boolean;
  uploadStatus: string;
  onUpload: (file: File) => void;
  onRemove: (attachmentId: string) => void;
}) {
  const atts = task.attachments || [];
  return (
    <div className="td-field" style={{ marginTop: 14 }}>
      <label>Approval Letter / Attachments</label>
      {atts.length > 0 && (
        <div className="attachment-list">
          {atts.map((a) => (
            <div className="attachment-row" key={a.id}>
              <a href={a.public_url} target="_blank" rel="noopener noreferrer" className="attachment-link">
                {a.file_name}
              </a>
              {!locked && (
                <span
                  className="attachment-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(a.id);
                  }}
                >
                  Remove
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {!locked && (
        <>
          <label className="upload-label" onClick={(e) => e.stopPropagation()}>
            + Upload file
            <input
              type="file"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                e.target.value = "";
              }}
            />
          </label>
          <span className="mono" style={{ marginLeft: 8, fontSize: 11, color: "var(--ink-soft)" }}>
            {uploadStatus}
          </span>
        </>
      )}
    </div>
  );
}
