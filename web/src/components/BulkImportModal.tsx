import { useState } from "react";
import { applyExtractedTasks, createProject } from "../api";
import { displayToIsoDate } from "../lib/dates";
import { getUploadKind, loadPdfDocument, readExcelAsText, renderPdfPageRangeToImages, sliceImageFileToImages } from "../lib/extraction";
import { invokeExtractApproval } from "../supabaseClient";
import type { BulkResult, ExtractionResult } from "../types";

interface Job {
  kind: "pdf-range" | "excel" | "image" | "load-error";
  label: string;
  file?: File;
  pdf?: any;
  pageStart?: number;
  pageEnd?: number;
  message?: string;
}

export function BulkImportModal({
  onClose,
  onViewProject,
  onDone,
}: {
  onClose: () => void;
  onViewProject: (id: string) => void;
  onDone: () => void;
}) {
  const [results, setResults] = useState<BulkResult[]>([]);
  const [running, setRunning] = useState(false);
  const [pagesPerProject, setPagesPerProject] = useState(2);

  async function runBulkUpload(files: File[]) {
    setRunning(true);
    const jobs: Job[] = [];
    for (const file of files) {
      const kind = getUploadKind(file);
      if (kind === "pdf") {
        try {
          const pdf = await loadPdfDocument(file);
          const totalPages = pdf.numPages;
          for (let start = 1; start <= totalPages; start += pagesPerProject) {
            const end = Math.min(start + pagesPerProject - 1, totalPages);
            const label = totalPages > pagesPerProject ? `${file.name} — pages ${start}–${end}` : file.name;
            jobs.push({ kind: "pdf-range", pdf, pageStart: start, pageEnd: end, label });
          }
        } catch (err: any) {
          jobs.push({ kind: "load-error", label: file.name, message: "Could not read that PDF: " + (err.message || err) });
        }
      } else if (kind === "excel" || kind === "image") {
        jobs.push({ kind, file, label: file.name });
      } else {
        jobs.push({ kind: "load-error", label: file.name, message: "Unsupported file type — use a PDF, image, or .xlsx." });
      }
    }

    const initial: BulkResult[] = jobs.map((j) => (j.kind === "load-error" ? { fileName: j.label, status: "error", message: j.message } : { fileName: j.label, status: "pending" }));
    setResults(initial);

    const next = [...initial];
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      if (job.kind === "load-error") continue;
      next[i] = { ...next[i], status: "reading" };
      setResults([...next]);
      try {
        let body: any;
        if (job.kind === "pdf-range") {
          body = { mode: "project", images: await renderPdfPageRangeToImages(job.pdf, job.pageStart!, job.pageEnd!) };
        } else if (job.kind === "excel") {
          body = { mode: "project", textContent: await readExcelAsText(job.file!) };
        } else {
          body = { mode: "project", images: await sliceImageFileToImages(job.file!) };
        }

        const data: ExtractionResult = await invokeExtractApproval(body);
        if (data?.error) throw new Error(data.error);

        next[i] = { ...next[i], status: "creating" };
        setResults([...next]);

        const extractions = data.tasks || [];
        let startIso: string | null = null;
        if (data.start_date) {
          const { iso, valid } = displayToIsoDate(data.start_date);
          if (valid && iso) startIso = iso;
        }
        const fallbackName = job.label.replace(/\.[^.]+$/, "");
        const { project } = await createProject({
          name: data.name || fallbackName,
          projectNumber: data.project_number || "",
          client: data.client || "",
          jurisdiction: data.jurisdiction || "",
          state: data.state || "",
          projectType: data.project_type || "",
          engineer: "",
          startDate: startIso,
        });

        let updatedIds: string[] = [];
        if (extractions.length) {
          try {
            const res = await applyExtractedTasks(project.id, extractions);
            updatedIds = res.updated_ids;
          } catch (taskErr) {
            console.error("Bulk: could not pre-fill tasks for", job.label, taskErr);
          }
        }
        const uncertainCount = extractions.filter((t) => t.uncertain).length;
        next[i] = {
          fileName: job.label,
          status: "done",
          projectId: project.id,
          projectName: project.name,
          taskCount: updatedIds.length,
          uncertainCount,
        };
      } catch (err: any) {
        next[i] = { fileName: job.label, status: "error", message: err.message || String(err) };
      }
      setResults([...next]);
    }

    setRunning(false);
    onDone();
  }

  const statusLabel: Record<string, string> = { pending: "Waiting…", reading: "Reading document…", creating: "Creating project…", done: "Created", error: "Failed" };
  const statusColor = (s: string) => (s === "done" ? "var(--good)" : s === "error" ? "var(--danger)" : "var(--ink-soft)");

  return (
    <div className="modal-backdrop" onClick={running ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Bulk Upload</h3>
        <div className="hint" style={{ marginBottom: 12 }}>
          Upload one combined PDF with several trackers back-to-back — it's automatically split every N pages into a separate project (leave at 2 for a standard 2-page tracker). You can also
          select multiple separate files (PDF/image/Excel) instead; each one becomes its own project.
        </div>
        {!running && results.length === 0 && (
          <>
            <div className="field" style={{ maxWidth: 160 }}>
              <label>Pages per project</label>
              <input type="number" min={1} max={20} value={pagesPerProject} onChange={(e) => setPagesPerProject(Math.max(1, parseInt(e.target.value, 10) || 2))} />
            </div>
            <label className="upload-label" style={{ background: "var(--surface)" }}>
              + Choose file(s)
              <input
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length) runBulkUpload(files);
                }}
              />
            </label>
          </>
        )}
        {results.length > 0 && (
          <div className="bulk-list">
            {results.map((r, i) => (
              <div className="bulk-row" key={i}>
                <div className="bulk-row-name">{r.fileName}</div>
                <div className="bulk-row-status" style={{ color: statusColor(r.status) }}>
                  {statusLabel[r.status] || r.status}
                </div>
                {r.status === "done" && (
                  <>
                    <div className="bulk-row-detail">
                      {r.projectName || ""} — {r.taskCount || 0} task{r.taskCount === 1 ? "" : "s"} pre-filled
                      {r.uncertainCount ? `, ${r.uncertainCount} flagged ⚠` : ""}
                    </div>
                    <button className="btn btn-sm" onClick={() => onViewProject(r.projectId!)}>
                      View
                    </button>
                  </>
                )}
                {r.status === "error" && <div className="bulk-row-detail" style={{ color: "var(--danger)" }}>{r.message || "Unknown error"}</div>}
              </div>
            ))}
          </div>
        )}
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            {running ? "Close (keeps running)" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
