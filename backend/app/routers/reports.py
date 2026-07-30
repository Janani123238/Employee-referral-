from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from ..database import get_db
from .. import models, schemas
from ..auth import get_current_user, require_hr

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("/referral-report")
def referral_report(payload: schemas.ReportFilterIn, db: Session = Depends(get_db),
                    user=Depends(require_hr)):
    q = db.query(models.Referral)
    if payload.status:
        q = q.filter(models.Referral.status == payload.status)
    if payload.jobId:
        q = q.filter(models.Referral.job_id == payload.jobId)
    if payload.startDate:
        q = q.filter(models.Referral.submitted_date >= payload.startDate)
    if payload.endDate:
        q = q.filter(models.Referral.submitted_date <= payload.endDate)
    if payload.dept:
        job_ids = [j.id for j in db.query(models.Job).filter(models.Job.dept == payload.dept).all()]
        q = q.filter(models.Referral.job_id.in_(job_ids))
    referrals = q.order_by(models.Referral.submitted_date.desc()).all()

    results = []
    for r in referrals:
        job = db.query(models.Job).filter(models.Job.id == r.job_id).first()
        emp = db.query(models.Employee).filter(models.Employee.id == r.referred_by).first()
        results.append({
            "id": r.id,
            "candidateName": r.candidate_name,
            "email": r.email,
            "phone": r.phone,
            "jobTitle": job.title if job else "—",
            "department": job.dept if job else "—",
            "referredBy": emp.name if emp else "—",
            "status": r.status,
            "aiScore": r.ai_score.get("overall", 0) if r.ai_score else 0,
            "matchPercent": r.match_percent,
            "atsScore": r.ats_score,
            "submittedDate": r.submitted_date,
        })

    summary = {
        "total": len(results),
        "byStatus": {},
    }
    for r in results:
        s = r["status"]
        summary["byStatus"][s] = summary["byStatus"].get(s, 0) + 1

    return {"results": results, "summary": summary}


@router.post("/hiring-analytics")
def hiring_analytics(payload: schemas.ReportFilterIn, db: Session = Depends(get_db),
                     user=Depends(require_hr)):
    q = db.query(models.Referral)
    if payload.startDate:
        q = q.filter(models.Referral.submitted_date >= payload.startDate)
    if payload.endDate:
        q = q.filter(models.Referral.submitted_date <= payload.endDate)
    if payload.dept:
        job_ids = [j.id for j in db.query(models.Job).filter(models.Job.dept == payload.dept).all()]
        q = q.filter(models.Referral.job_id.in_(job_ids))
    all_refs = q.all()

    total_referrals = len(all_refs)
    total_jobs = db.query(models.Job).filter(models.Job.status == "Open").count()
    total_employees = db.query(models.Employee).filter(models.Employee.is_active == True).count()
    joined = sum(1 for r in all_refs if r.status == "Joined")
    offers = sum(1 for r in all_refs if r.status == "Offer")
    rejected = sum(1 for r in all_refs if r.status == "Rejected")
    inPipeline = total_referrals - joined - rejected

    scores = [r.ai_score.get("overall", 0) for r in all_refs if r.ai_score and r.ai_score.get("overall")]
    avg_score = round(sum(scores) / len(scores)) if scores else 0
    conversionRate = round(joined / total_referrals * 100) if total_referrals else 0

    depts = {}
    for r in all_refs:
        job = db.query(models.Job).filter(models.Job.id == r.job_id).first()
        if job:
            depts[job.dept] = depts.get(job.dept, 0) + 1

    topReferrers = {}
    for r in all_refs:
        emp = db.query(models.Employee).filter(models.Employee.id == r.referred_by).first()
        if emp:
            topReferrers[emp.name] = topReferrers.get(emp.name, 0) + 1

    return {
        "totalReferrals": total_referrals,
        "openPositions": total_jobs,
        "activeEmployees": total_employees,
        "joined": joined,
        "offers": offers,
        "rejected": rejected,
        "inPipeline": inPipeline,
        "avgAiScore": avg_score,
        "conversionRate": conversionRate,
        "byDepartment": depts,
        "topReferrers": dict(sorted(topReferrers.items(), key=lambda x: x[1], reverse=True)[:10]),
    }


@router.post("/bonus-report")
def bonus_report(payload: schemas.ReportFilterIn, db: Session = Depends(get_db),
                 user=Depends(require_hr)):
    q = db.query(models.Referral).filter(models.Referral.status == "Joined")
    if payload.startDate:
        q = q.filter(models.Referral.submitted_date >= payload.startDate)
    if payload.endDate:
        q = q.filter(models.Referral.submitted_date <= payload.endDate)
    if payload.dept:
        job_ids = [j.id for j in db.query(models.Job).filter(models.Job.dept == payload.dept).all()]
        q = q.filter(models.Referral.job_id.in_(job_ids))
    joined = q.all()
    results = []
    totalBonus = 0
    for r in joined:
        job = db.query(models.Job).filter(models.Job.id == r.job_id).first()
        emp = db.query(models.Employee).filter(models.Employee.id == r.referred_by).first()
        bonus = job.bonus if job else 0
        totalBonus += bonus
        results.append({
            "candidateName": r.candidate_name,
            "jobTitle": job.title if job else "—",
            "referredBy": emp.name if emp else "—",
            "bonus": bonus,
            "joinedDate": r.submitted_date,
        })
    return {"results": results, "totalBonus": totalBonus, "totalPaid": len(results)}
