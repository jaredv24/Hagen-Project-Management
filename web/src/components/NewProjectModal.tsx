import { useState } from "react";
import { applyExtractedTasks, createProject } from "../api";
import { formatDateAsTyped, displayToIsoDate, isoToDisplayDate, isPlausibleProjectNumber } from "../lib/dates";
import { getUploadKind, readExcelAsText, renderPdfPagesToImages, sliceImageFileToImages } from "../lib/extraction";
import { invokeExtractApproval } from "../supabaseClient";
import type { DistinctOptions } from "../views/Dashboard";
import type { ExtractionResult, TaskExtraction } from "../types";

interface Fields {
  name: string;
  number: string;
  client: string;
  jurisdiction: string;
  state: string;
  type: string;
  engineer: string;
  start: string;
}

const EMPTY: Fields = { name: "", number: "", client: "", jurisdiction: "", state: "", type: "", engineer: "", start: "" };

export function NewProjectModal({
  options,
  onClose,
  onCreated,
}: {
  options: DistinctOptions;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [aiFilled, setAiFilled] = useState<Set<keyof Fields>>(new Set());
  const [pendingExtractions, setPendingExtractions] = useState<TaskExtraction[]>([]);
  const [autofillStatus, setAutofillStatus] = useState("");
  const [debugData, setDebugData] = useState<ExtractionResult | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [creating, setCreating] = useState(false);

  function set(field: keyof Fields, value: string) {
    setFields((f) => ({ ...f, [field]: value }));
    setAiFilled((prev) => {
      if (!prev.has(field)) return prev;
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  }

  function setDateTyped(value: string) {
    set("start", formatDateAsTyped(value));
  }

  async function handleAutofillFile(file: File) {
    const kind = getUploadKind(file);
    if (kind === "other") {
      setAutofillStatus("That file type can’t be auto-read — try a PDF, image, or Excel file.");
      return;
    }
    setAutofillStatus(kind === "excel" ? "Reading spreadsheet…" : "Rendering pages for a closer read…");
    try {
      let body: any;
      if (kind === "excel") {
        body = { mode: "project", textContent: await readExcelAsText(file) };
      } else if (kind === "pdf") {
        const images = await renderPdfPagesToImages(file);
        setAutofillStatus("Reading document with AI…");
        body = { mode: "project", images };
      } else {
        const images = await sliceImageFileToImages(file);
        setAutofillStatus("Reading document with AI…");
        body = { mode: "project", images };
      }

      const data: ExtractionResult = await invokeExtractApproval(body);
      setDebugData(data);
      setShowDebug(!!data?.error);
      if (data?.error) throw new Error(data.error);

      const filled: string[] = [];
      setFields((f) => {
        const next = { ...f };
        const newlyFilled = new Set<keyof Fields>();
        const map: [keyof Fields, string | undefined, string][] = [
          ["name", data.name, "Name"],
          ["number", isPlausibleProjectNumber(data.project_number) ? data.project_number : "", "Number"],
          ["client", data.client, "Client"],
          ["jurisdiction", data.jurisdiction, "Jurisdiction"],
          ["state", data.state, "State"],
          ["type", data.project_type, "Type"],
        ];
        map.forEach(([key, val, label]) => {
          if (!val) return;
          if (!next[key].trim()) {
            next[key] = val;
            newlyFilled.add(key);
            filled.push(label);
          }
        });
        if (data.start_date && !next.start.trim()) {
          const { iso, valid } = displayToIsoDate(data.start_date);
          if (valid && iso) {
            next.start = isoToDisplayDate(iso);
            newlyFilled.add("start");
            filled.push("Start Date");
          }
        }
        setAiFilled((prev) => new Set([...prev, ...newlyFilled]));
        return next;
      });

      const extractions = data.tasks || [];
      setPendingExtractions(extractions);
      const uncertainCount = extractions.filter((t) => t.uncertain).length;
      const taskNote = extractions.length
        ? ` Also found ${extractions.length} task${extractions.length > 1 ? "s" : ""} to pre-fill once created${uncertainCount ? ` (${uncertainCount} flagged ! for review)` : ""}.`
        : "";
      setAutofillStatus((filled.length ? `Auto-filled ${filled.join(", ")} — please review before saving.` : "No project-level fields could be filled from this document.") + taskNote);
    } catch (err: any) {
      setAutofillStatus("Auto-fill failed: " + (err.message || err));
    }
  }

  async function handleCreate() {
    if (!fields.name.trim()) return;
    const { iso: startIso, valid: startValid } = displayToIsoDate(fields.start);
    if (!startValid) {
      alert("That start date doesn’t look right — use MM/DD/YYYY.");
      return;
    }
    setCreating(true);
    try {
      const { project, tasks: newTasks } = await createProject({
        name: fields.name.trim(),
        projectNumber: fields.number.trim(),
        client: fields.client.trim(),
        jurisdiction: fields.jurisdiction.trim(),
        state: fields.state.trim(),
        projectType: fields.type.trim(),
        engineer: fields.engineer.trim(),
        startDate: startIso,
      });
      if (pendingExtractions.length) {
        try {
          await applyExtractedTasks(project.id, pendingExtractions);
        } catch (taskErr) {
          console.error("Could not pre-fill tasks from document:", taskErr);
        }
      }
      void newTasks;
      onCreated(project.id);
    } catch (err: any) {
      alert("Could not create project: " + (err.message || err));
      setCreating(false);
    }
  }

  const cls = (f: keyof Fields) => (aiFilled.has(f) ? "ai-filled" : "");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>New Project</h3>
        <div className="field" style={{ border: "1.5px dashed var(--blueprint)", borderRadius: "var(--radius)", padding: "10px 12px", background: "var(--blueprint-soft)" }}>
          <label style={{ marginBottom: 3 }}>Auto-fill from a document (optional)</label>
          <label className="upload-label" style={{ background: "var(--surface)" }}>
            + Upload proposal, scope letter, or filled-in Excel tracker
            <input
              type="file"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAutofillFile(file);
                e.target.value = "";
              }}
            />
          </label>
          <span className="mono" style={{ marginLeft: 8, fontSize: 11, color: "var(--ink-soft)" }}>
            {autofillStatus}
          </span>
          <div className="hint">
            Reads a PDF, image, or .xlsx and fills in whatever fields below — and matching tasks — it can find. Nothing you've already typed gets overwritten.{" "}
            <span style={{ background: "var(--warn-soft)", border: "1px solid var(--warn)", borderRadius: 2, padding: "0 4px" }}>Highlighted fields</span> below came from the document — give
            those a look before saving; the highlight clears once you touch a field.
          </div>
          {debugData && (
            <>
              <span className="toggle-cycles" onClick={() => setShowDebug((s) => !s)}>
                {showDebug ? "Hide what was read" : "Show what was read"}
              </span>
              {showDebug && (
                <pre style={{ marginTop: 8, maxHeight: 200, overflow: "auto", fontSize: 10.5, background: "var(--ink)", color: "#DCE6E9", padding: 8, borderRadius: "var(--radius)", whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(debugData, null, 2)}
                </pre>
              )}
            </>
          )}
        </div>

        <div className="field">
          <label>Project Name</label>
          <input className={cls("name")} value={fields.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Battleground Commons" />
        </div>
        <div className="field">
          <label>Project Number</label>
          <input className={cls("number")} value={fields.number} onChange={(e) => set("number", e.target.value)} placeholder="e.g. 24-118" />
        </div>
        <div className="field">
          <label>Client</label>
          <input className={cls("client")} list="clientList" value={fields.client} onChange={(e) => set("client", e.target.value)} placeholder="e.g. Riverstone Development" />
          <datalist id="clientList">
            {options.clientOptions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Jurisdiction (County/City)</label>
            <input className={cls("jurisdiction")} list="jurisdictionList" value={fields.jurisdiction} onChange={(e) => set("jurisdiction", e.target.value)} placeholder="e.g. Greensboro" />
            <datalist id="jurisdictionList">
              {options.jurisdictionOptions.map((j) => (
                <option key={j} value={j} />
              ))}
            </datalist>
          </div>
          <div className="field" style={{ maxWidth: 110 }}>
            <label>State</label>
            <input className={cls("state")} list="stateList" value={fields.state} onChange={(e) => set("state", e.target.value)} placeholder="NC" />
            <datalist id="stateList">
              {options.stateOptions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="field">
          <div className="hint" style={{ margin: "-8px 0 14px" }}>
            Used to group this project into a Jurisdiction Playbook.
          </div>
        </div>
        <div className="field">
          <label>Project Type</label>
          <input className={cls("type")} list="typeList" value={fields.type} onChange={(e) => set("type", e.target.value)} placeholder="e.g. Multi-Family / Apartments" />
          <datalist id="typeList">
            {options.typeOptions.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div className="field">
          <label>Engineer</label>
          <input list="engineerList" value={fields.engineer} onChange={(e) => set("engineer", e.target.value)} placeholder="e.g. Jordan Smith" />
          <datalist id="engineerList">
            {options.engineerOptions.map((e) => (
              <option key={e} value={e} />
            ))}
          </datalist>
          <div className="hint">Internal use only — not shown outside your team's view of this app.</div>
        </div>
        <div className="field">
          <label>Start Date</label>
          <input className={cls("start")} type="text" inputMode="numeric" maxLength={10} placeholder="MM/DD/YYYY" value={fields.start} onChange={(e) => setDateTyped(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={creating} onClick={handleCreate}>
            {creating ? "Creating…" : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
