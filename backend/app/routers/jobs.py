from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas
from ..auth import get_current_user, require_hr

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("/public", response_model=list[schemas.JobOut])
def list_jobs_public(db: Session = Depends(get_db)):
    """Public endpoint — no auth needed. For the landing page."""
    return db.query(models.Job).filter(models.Job.status == "Open").order_by(models.Job.posted.desc()).all()


@router.get("", response_model=list[schemas.JobOut])
def list_jobs(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(models.Job).order_by(models.Job.posted.desc()).all()


@router.post("", response_model=schemas.JobOut)
def create_job(payload: schemas.JobIn, db: Session = Depends(get_db), user=Depends(require_hr)):
    job = models.Job(**payload.dict(), posted=datetime.utcnow())
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.put("/{job_id}", response_model=schemas.JobOut)
def update_job(job_id: str, payload: schemas.JobIn, db: Session = Depends(get_db), user=Depends(require_hr)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    for k, v in payload.dict().items():
        setattr(job, k, v)
    db.commit()
    db.refresh(job)
    return job


@router.delete("/{job_id}")
def delete_job(job_id: str, db: Session = Depends(get_db), user=Depends(require_hr)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    referral_count = db.query(models.Referral).filter(models.Referral.job_id == job_id).count()
    if referral_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"This role has {referral_count} referral(s) against it and can't be deleted — set its status to Closed instead."
        )
    db.delete(job)
    db.commit()
    return {"ok": True}
