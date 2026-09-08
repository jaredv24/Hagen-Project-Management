from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import attachments, playbooks, projects, tasks

app = FastAPI(title="Permitting Status Log API")

# Same-origin in production (frontend + API both served from the one Vercel
# project), but CORS is left open for local dev where Vite runs on its own port.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(attachments.router)
app.include_router(playbooks.router)


@app.get("/api/health")
def health():
    return {"ok": True}
