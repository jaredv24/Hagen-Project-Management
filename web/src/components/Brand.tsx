export function Brand() {
  return (
    <div className="brand">
      <img src="/logo-wordmark.png" alt="Hagen Engineering" className="brand-logo" />
      <span className="tag">PERMIT TRACKER</span>
    </div>
  );
}

export function Tabs({ active, onProjects, onPlaybooks }: { active: "projects" | "playbooks"; onProjects: () => void; onPlaybooks: () => void }) {
  return (
    <div className="tabs">
      <span className={`tab ${active === "projects" ? "active" : ""}`} onClick={onProjects}>
        Projects
      </span>
      <span className={`tab ${active === "playbooks" ? "active" : ""}`} onClick={onPlaybooks}>
        Playbooks
      </span>
    </div>
  );
}
