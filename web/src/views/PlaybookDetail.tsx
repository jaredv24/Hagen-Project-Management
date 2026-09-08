import { hidePlaybook } from "../api";
import { isStateSpecificTask } from "../data/model";
import type { PlaybookGroup } from "../lib/helpers";

export function PlaybookDetail({ group: g, onBack, onRemoved }: { group: PlaybookGroup; onBack: () => void; onRemoved: () => void }) {
  async function handleRemove() {
    if (!confirm(`Remove "${g.projectType} — ${g.jurisdiction}" from Playbooks? This only hides this view — your projects and their data are not affected.`)) return;
    try {
      await hidePlaybook(g.jurisdiction, g.projectType);
      onRemoved();
    } catch (err: any) {
      alert("Could not remove: " + (err.message || err));
    }
  }

  return (
    <>
      <div className="topbar">
        <span className="back" onClick={onBack}>
          ← Playbooks
        </span>
        <button className="btn btn-danger btn-sm" onClick={handleRemove}>
          Remove Playbook
        </button>
      </div>
      <div className="titleblock">
        <div className="tb-top">
          <h1 className="serif" style={{ fontSize: 22, margin: "0 0 4px", fontWeight: 600 }}>
            {g.projectType} — {g.jurisdiction}
          </h1>
          <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13 }}>
            Based on {g.projectCount} project{g.projectCount === 1 ? "" : "s"} on file
          </p>
        </div>
      </div>
      {g.phases.length === 0 ? (
        <div className="empty-state">
          <p>No items have been marked Required yet for this group.</p>
        </div>
      ) : (
        g.phases.map((ph) => (
          <div className="pb-phase-block" key={ph.key}>
            <div className="pb-phase-head">{ph.title}</div>
            <div className="pb-col-head">
              <span className="pb-task-name">Item</span>
              <span className="pb-agency">Agency</span>
              <span className="pb-freq-head">How Often Required</span>
            </div>
            {[...ph.tasks]
              .sort((a, b) => b.pct - a.pct)
              .map((t) => (
                <div className="pb-task" key={t.name}>
                  <span className="pb-task-name">
                    {t.name}
                    {isStateSpecificTask(t.name) && g.stateOnly && <span className="pb-state-badge">{g.stateOnly}</span>}
                  </span>
                  <span className="pb-agency">{t.agency}</span>
                  <div className="pb-freq-bar">
                    <div className="pb-freq-fill" style={{ width: `${t.pct}%` }} />
                  </div>
                  <span className="pb-freq-label">{t.pct}%</span>
                </div>
              ))}
          </div>
        ))
      )}
      <footer className="note">
        % = share of the {g.projectCount} project{g.projectCount === 1 ? "" : "s"} in this group where the item was marked Required. Items never marked Required are hidden. Agency shown is the
        most common one used.
      </footer>
    </>
  );
}
