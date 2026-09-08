import { useState } from "react";
import { Dashboard } from "./views/Dashboard";
import { ProjectDetail } from "./views/ProjectDetail";
import { Playbooks } from "./views/Playbooks";
import { PlaybookDetail } from "./views/PlaybookDetail";
import type { PlaybookGroup } from "./lib/helpers";

type View = "dashboard" | "detail" | "playbooks" | "playbookDetail";

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentPlaybook, setCurrentPlaybook] = useState<PlaybookGroup | null>(null);

  return (
    <div id="app">
      {view === "dashboard" && (
        <Dashboard
          onOpenProject={(id) => {
            setCurrentProjectId(id);
            setView("detail");
          }}
          onOpenPlaybooks={() => setView("playbooks")}
        />
      )}
      {view === "detail" && currentProjectId && (
        <ProjectDetail
          projectId={currentProjectId}
          onBack={() => {
            setCurrentProjectId(null);
            setView("dashboard");
          }}
        />
      )}
      {view === "playbooks" && (
        <Playbooks
          onOpenProjects={() => setView("dashboard")}
          onOpenPlaybook={(g) => {
            setCurrentPlaybook(g);
            setView("playbookDetail");
          }}
        />
      )}
      {view === "playbookDetail" && currentPlaybook && (
        <PlaybookDetail
          group={currentPlaybook}
          onBack={() => {
            setCurrentPlaybook(null);
            setView("playbooks");
          }}
          onRemoved={() => {
            setCurrentPlaybook(null);
            setView("playbooks");
          }}
        />
      )}
    </div>
  );
}
