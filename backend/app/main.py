from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from sqlalchemy import text

from .database import Base, engine, SessionLocal
from .config import settings
from .seed import bootstrap
from .routers import auth, jobs, referrals, employees, settings as settings_router, ai, resumes, notifications, policy, admin, reports, interviews, activity, candidates, emails, kb

Base.metadata.create_all(bind=engine)


def ensure_columns():
    """Idempotent, migration-safe column backfills for existing SQLite databases."""
    if not settings.DATABASE_URL.startswith("sqlite"):
        return
    db = SessionLocal()
    try:
        backfills = {
            "employees": [("phone", "TEXT DEFAULT ''"), ("location", "TEXT DEFAULT ''")],
            "jobs": [("is_deleted", "BOOLEAN DEFAULT 0"), ("deleted_at", "DATETIME"), ("deleted_by", "TEXT DEFAULT ''")],
            "referrals": [("is_deleted", "BOOLEAN DEFAULT 0"), ("deleted_at", "DATETIME"),
                          ("deleted_by", "TEXT DEFAULT ''"), ("screening", "TEXT"),
                          ("auto_rejected", "BOOLEAN DEFAULT 0"),
                          ("rejection_reason", "TEXT DEFAULT ''"),
                          ("original_match", "INTEGER DEFAULT 0"),
                          ("evaluation_history", "TEXT")],
            "interviews": [("is_deleted", "BOOLEAN DEFAULT 0"), ("deleted_at", "DATETIME"),
                           ("deleted_by", "TEXT DEFAULT ''"), ("meeting_id", "TEXT DEFAULT ''")],
        }
        for table, cols in backfills.items():
            try:
                existing = {row[1] for row in db.execute(text(f"PRAGMA table_info({table})")).fetchall()}
            except Exception:
                continue
            for col, ddl in cols:
                if col not in existing:
                    db.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}"))
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


ensure_columns()

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
app.include_router(emails.router)
app.include_router(kb.router)


@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        bootstrap(db)
    finally:
        db.close()
    _build_vector_index_background()


def _build_vector_index_background():
    """Warm the semantic embedding index on startup without blocking the server.
    Best-effort: if Ollama is down the index just gets built on first chat."""
    try:
        from concurrent.futures import ThreadPoolExecutor
        from . import vector_store, models

        def work():
            db = SessionLocal()
            try:
                if db.query(models.DocumentChunk).count() == 0:
                    vector_store.reindex(db)
            except Exception as exc:
                import logging
                logging.getLogger("startup").warning("vector index warm-up skipped: %s", exc)
            finally:
                db.close()

        ThreadPoolExecutor(max_workers=1).submit(work)
    except Exception:
        pass


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
