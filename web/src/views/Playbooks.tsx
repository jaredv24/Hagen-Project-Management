import { useEffect, useState } from "react";
import { fetchHiddenPlaybooks, fetchPlaybookRows, hidePlaybook } from "../api";
import { Brand, Tabs } from "../components/Brand";
import { buildPlaybookGroups, type PlaybookGroup } from "../lib/helpers";
import type { PlaybookRow } from "../types";

export function Playbooks({ onOpenProjects, onOpenPlaybook }: { onOpenProjects: () => void; onOpenPlaybook: (g: PlaybookGroup) => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState<PlaybookGroup[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [rows, hidden] = await Promise.all([fetchPlaybookRows() as Promise<PlaybookRow[]>, fetchHiddenPlaybooks() as Promise<{ jurisdiction: string; project_type: string }[]>]);
      const hiddenKeys = new Set(hidden.map((h) => h.jurisdiction + "|" + h.project_type));
      setGroups(buildPlaybookGroups(rows).filter((g) => !hiddenKeys.has(g.jurisdiction + "|" + g.projectType)));
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

  async function handleRemove(g: PlaybookGroup) {
    if (!confirm(`Remove "${g.projectType} — ${g.jurisdiction}" from Playbooks? This only hides this view — your projects and their data are not affected, and you can bring it back later by re-adding the row in Supabase's hidden_playbooks table.`)) return;
    try {
      await hidePlaybook(g.jurisdiction, g.projectType);
      setGroups((prev) => prev.filter((x) => x !== g));
    } catch (err: any) {
      alert("Could not remove: " + (err.message || err));
    }
  }

  return (
    <>
      <div className="topbar">
        <Brand />
      </div>
      <Tabs active="playbooks" onProjects={onOpenProjects} onPlaybooks={() => {}} />
      <div className="dash-head">
        <div>
          <h1>Jurisdiction Playbooks</h1>
          <p>What a project type typically needs, by jurisdiction — built from your own project history.</p>
        </div>
      </div>
      {groups.length === 0 ? (
        <div className="empty-state">
          <h2>No playbook data yet</h2>
          <p>Add jurisdiction and project type to a few projects, and typical requirements will build up here automatically.</p>
        </div>
      ) : (
        <div className="playbook-grid">
          {groups.map((g, i) => (
            <div className="playbook-card" key={i} onClick={() => onOpenPlaybook(g)}>
              <div>
                <p className="pb-title">
                  {g.projectType} — {g.jurisdiction}
                </p>
                <p className="pb-sub">Typical permits & agencies based on projects on file</p>
              </div>
              <span className="pb-count mono">
                {g.projectCount} project{g.projectCount === 1 ? "" : "s"}
              </span>
              <button
                className="btn btn-danger btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(g);
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <footer className="note">Percentages are the share of projects in that group where the item was marked Required.</footer>
    </>
  );
}
