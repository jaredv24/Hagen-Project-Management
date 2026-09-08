import { useEffect, useState } from "react";
import { fetchDistinctValues, fetchProjectProgress, listProjects } from "../api";
import { Brand, Tabs } from "../components/Brand";
import { NewProjectModal } from "../components/NewProjectModal";
import { BulkImportModal } from "../components/BulkImportModal";
import { expiringItems, progressOf, SORT_FIELDS, sortProjects } from "../lib/helpers";
import { VERIFY_ICON_SVG } from "../components/icons";
import type { Project } from "../types";

export interface DistinctOptions {
  jurisdictionOptions: string[];
  stateOptions: string[];
  typeOptions: string[];
  clientOptions: string[];
  engineerOptions: string[];
}

const PROJECT_TYPE_SUGGESTIONS = [
  "Single Family Residential",
  "Multi-Family / Apartments",
  "Commercial / Retail",
  "Industrial / Warehouse",
  "Office",
  "Mixed-Use",
  "Institutional / Municipal",
  "Other",
];

export function Dashboard({ onOpenProject, onOpenPlaybooks }: { onOpenProject: (id: string) => void; onOpenPlaybooks: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [options, setOptions] = useState<DistinctOptions>({
    jurisdictionOptions: [],
    stateOptions: [],
    typeOptions: PROJECT_TYPE_SUGGESTIONS,
    clientOptions: [],
    engineerOptions: [],
  });
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("updated_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showNewModal, setShowNewModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [projectList, dv] = await Promise.all([listProjects(), fetchDistinctValues() as Promise<any[]>]);
      setProjects(projectList);
      setOptions({
        jurisdictionOptions: [...new Set(dv.map((x) => x.jurisdiction).filter(Boolean))],
        stateOptions: [...new Set(dv.map((x) => x.state).filter(Boolean))],
        typeOptions: [...new Set([...PROJECT_TYPE_SUGGESTIONS, ...dv.map((x) => x.project_type).filter(Boolean)])],
        clientOptions: [...new Set(dv.map((x) => x.client).filter(Boolean))],
        engineerOptions: [...new Set(dv.map((x) => x.engineer).filter(Boolean))],
      });
    } catch (err: any) {
      setError(err.message || String(err));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="loading">Loading…</div>;
  if (error) return <div className="error-state">Error: {error}</div>;

  const q = search.trim().toLowerCase();
  let list = projects.filter(
    (p) =>
      !q ||
      (p.name || "").toLowerCase().includes(q) ||
      (p.project_number || "").toLowerCase().includes(q) ||
      (p.client || "").toLowerCase().includes(q) ||
      (p.jurisdiction || "").toLowerCase().includes(q) ||
      (p.state || "").toLowerCase().includes(q) ||
      (p.engineer || "").toLowerCase().includes(q)
  );
  list = sortProjects(list, sortField, sortDir);

  return (
    <>
      <div className="topbar">
        <Brand />
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setShowBulkModal(true)}>
            Bulk Upload
          </button>
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
            + New Project
          </button>
        </div>
      </div>
      <Tabs active="projects" onProjects={() => {}} onPlaybooks={onOpenPlaybooks} />
      <div className="dash-head">
        <div>
          <h1>Projects</h1>
          <p>
            {projects.length} project{projects.length === 1 ? "" : "s"} on file
          </p>
        </div>
        <div className="dash-controls">
          <input
            className="search"
            placeholder="Search name, number, client, jurisdiction, engineer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="sort-select" value={sortField} onChange={(e) => setSortField(e.target.value)}>
            {SORT_FIELDS.map((f) => (
              <option key={f.key} value={f.key}>
                Sort: {f.label}
              </option>
            ))}
          </select>
          <button className="sort-dir" title="Toggle sort direction" onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}>
            {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <h2>No projects yet</h2>
          <p>Start a permitting log for your first project.</p>
        </div>
      ) : list.length === 0 ? (
        <div className="empty-state">
          <p>No projects match "{search}".</p>
        </div>
      ) : (
        <div className="project-grid">
          {list.map((p) => (
            <ProjectCard key={p.id} project={p} onOpen={() => onOpenProject(p.id)} />
          ))}
        </div>
      )}

      {showNewModal && (
        <NewProjectModal
          options={options}
          onClose={() => setShowNewModal(false)}
          onCreated={(id) => {
            setShowNewModal(false);
            onOpenProject(id);
          }}
        />
      )}
      {showBulkModal && (
        <BulkImportModal
          onClose={() => setShowBulkModal(false)}
          onViewProject={(id) => {
            setShowBulkModal(false);
            onOpenProject(id);
          }}
          onDone={load}
        />
      )}
      <footer className="note">Stored in Supabase.</footer>
    </>
  );
}

function ProjectCard({ project: p, onOpen }: { project: Project; onOpen: () => void }) {
  const [stats, setStats] = useState<{ pct: number; approved: number; required: number; expCount: number; verifyCount: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchProjectProgress(p.id)
      .then((data) => {
        if (cancelled) return;
        const prog = progressOf(data as any);
        const exp = expiringItems(data as any);
        const verifyCount = (data || []).filter((t) => t.needs_verification).length;
        setStats({ pct: prog.pct, approved: prog.approved, required: prog.required, expCount: exp.length, verifyCount });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [p.id]);

  const jurisFull = [p.jurisdiction, p.state].filter(Boolean).join(", ");

  return (
    <div className="project-card" onClick={onOpen}>
      <div className="pc-main">
        <p className="pc-name">{p.name}</p>
        <div className="pc-meta">
          {p.project_number && <span className="mono">#{p.project_number}</span>}
          {p.client && <span>{p.client}</span>}
          {jurisFull && <span>{jurisFull}</span>}
          {p.engineer && <span>Eng: {p.engineer}</span>}
        </div>
        <div className="pc-tags">
          {p.current_phase && <span className="pc-phase">{p.current_phase}</span>}
          {p.project_type && <span className="pc-type">{p.project_type}</span>}
        </div>
      </div>
      <div className="pc-right">
        {stats ? (
          <>
            <span className="pc-progress-label mono">
              {stats.approved} / {stats.required} approved
            </span>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${stats.pct}%` }} />
            </div>
            {stats.verifyCount > 0 && (
              <span className="pc-verify-alert" dangerouslySetInnerHTML={{ __html: `${VERIFY_ICON_SVG} ${stats.verifyCount} need${stats.verifyCount === 1 ? "s" : ""} verification` }} />
            )}
            {stats.expCount > 0 && <span className="pc-alert">{stats.expCount} expiring ≤30d</span>}
          </>
        ) : (
          <span className="pc-progress-label mono">loading…</span>
        )}
      </div>
    </div>
  );
}
