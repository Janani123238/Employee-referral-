from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from .database import Base, engine, SessionLocal
from .config import settings
from .seed import bootstrap
from .routers import auth, jobs, referrals, employees, settings as settings_router, ai, resumes, notifications, policy, admin, reports, interviews, activity, candidates

Base.metadata.create_all(bind=engine)

app = FastAPI(title="MuraAI Refer API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(referrals.router)
app.include_router(employees.router)
app.include_router(settings_router.router)
app.include_router(ai.router)
app.include_router(resumes.router)
app.include_router(notifications.router)
app.include_router(policy.router)
app.include_router(admin.router)
app.include_router(reports.router)
app.include_router(interviews.router)
app.include_router(activity.router)
app.include_router(candidates.router)


@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        bootstrap(db)
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}


FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.isdir(FRONTEND_DIR):
    CSS_DIR = os.path.join(FRONTEND_DIR, "css")
    JS_DIR = os.path.join(FRONTEND_DIR, "js")
    if os.path.isdir(CSS_DIR):
        app.mount("/css", StaticFiles(directory=CSS_DIR), name="css")
    if os.path.isdir(JS_DIR):
        app.mount("/js", StaticFiles(directory=JS_DIR), name="js")
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        index_path = os.path.join(FRONTEND_DIR, "index.html")
        return FileResponse(index_path)
