import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas, ai_service
from ..auth import get_current_user, require_hr
from ..routers.notifications import create_notification
from ..routers.activity import log_activity
from .. import email_service

router = APIRouter(prefix="/api/referrals", tags=["referrals"])


def serialize(r: models.Referral):
    return {
        "id": r.id,
        "candidateName": r.candidate_name,
        "phone": r.phone,
        "email": r.email,
        "resumeText": r.resume_text,
        "resumeFileUrl": r.resume_file_url,
        "resumeFileName": r.resume_file_name,
        "linkedin": r.linkedin,
        "github": r.github,
        "portfolio": r.portfolio,
        "location": r.location,
        "expectedSalary": r.expected_salary,
        "noticePeriod": r.notice_period,
        "currentCompany": r.current_company,
        "currentDesignation": r.current_designation or "",
        "totalExperience": r.total_experience or "",
        "relevantExperience": r.relevant_experience or "",
        "skills": r.skills or [],
        "education": r.education or "",
        "certifications": r.certifications or [],
        "projects": r.projects or [],
        "relationship": r.relationship_to_referrer,
        "referredBy": r.referred_by,
        "jobId": r.job_id,
        "status": r.status,
        "submittedDate": r.submitted_date,
        "aiSummary": r.ai_summary,
        "aiScore": r.ai_score,
        "matchPercent": r.match_percent,
        "atsScore": r.ats_score or 0,
        "missingSkills": r.missing_skills,
        "tags": r.tags,
        "fraudFlags": r.fraud_flags,
        "interviewPrediction": r.interview_prediction,
        "strengths": r.strengths or [],
        "weaknesses": r.weaknesses or [],
        "recommendation": r.recommendation or "",
        "rankLabel": r.rank_label or "",
    }


@router.get("")
def list_referrals(db: Session = Depends(get_db), user=Depends(get_current_user)):
    q = db.query(models.Referral).order_by(models.Referral.submitted_date.desc())
    return [serialize(r) for r in q.all()]


@router.get("/mine")
def my_referrals(db: Session = Depends(get_db), user=Depends(get_current_user)):
    if not user.employee_id:
        return []
    q = db.query(models.Referral).filter(models.Referral.referred_by == user.employee_id).order_by(
        models.Referral.submitted_date.desc())
    return [serialize(r) for r in q.all()]


@router.get("/check-duplicate")
def check_duplicate(email: str = "", phone: str = "", name: str = "",
                     db: Session = Depends(get_db), user=Depends(get_current_user)):
    q = db.query(models.Referral)
    match = None
    for r in q.all():
        if email and r.email and r.email.lower() == email.lower():
            match = r
            break
        if phone and r.phone and r.phone.replace(" ", "") == phone.replace(" ", ""):
            match = r
            break
        if name and r.candidate_name.lower() == name.lower():
            match = r
            break
    if not match:
        return {"duplicate": False}
    referrer = db.query(models.Employee).filter(models.Employee.id == match.referred_by).first()
    return {
        "duplicate": True,
        "candidateName": match.candidate_name,
        "referredByName": referrer.name if referrer else None,
        "submittedDate": match.submitted_date,
    }


@router.post("")
async def create_referral(payload: schemas.ReferralIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if not user.employee_id:
        raise HTTPException(status_code=400, detail="Only employee accounts can submit referrals")

    job = db.query(models.Job).filter(models.Job.id == payload.jobId).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    referral = models.Referral(
        candidate_name=payload.candidateName,
        phone=payload.phone,
        email=payload.email,
        resume_text=payload.resumeText or "No resume text provided.",
        resume_file_url=payload.resumeFileUrl,
        resume_file_name=payload.resumeFileName,
        linkedin=payload.linkedin,
        github=payload.github,
        portfolio=payload.portfolio,
        location=payload.location,
        expected_salary=payload.expectedSalary,
        notice_period=payload.noticePeriod,
        current_company=payload.currentCompany,
        current_designation=payload.currentDesignation,
        total_experience=payload.totalExperience,
        relevant_experience=payload.relevantExperience,
        skills=payload.skills,
        education=payload.education,
        certifications=payload.certifications,
        projects=payload.projects,
        relationship_to_referrer=payload.relationship,
        referred_by=user.employee_id,
        job_id=payload.jobId,
        status="Submitted",
        submitted_date=datetime.utcnow(),
        ai_score={"resumeQuality": 70, "skillMatch": 70, "communication": 70, "experienceMatch": 70, "overall": 70},
        match_percent=70,
        interview_prediction={"chance": 60, "reasons": []},
    )

    db.add(referral)
    db.commit()
    db.refresh(referral)

    # Best-effort AI enrichment runs in background (non-blocking)
    import asyncio as _bg_asyncio
    async def _enrich(referral_id, resume_text, job_dict):
        from ..database import SessionLocal
        _db = SessionLocal()
        try:
            _ref = _db.query(models.Referral).filter(models.Referral.id == referral_id).first()
            if not _ref:
                return
            summary, score, tags, fraud, prediction, match_detail = await _bg_asyncio.gather(
                ai_service.ai_summary(resume_text),
                ai_service.ai_quality_score(resume_text),
                ai_service.ai_auto_tags(resume_text),
                ai_service.ai_fraud_check(resume_text),
                ai_service.ai_interview_prediction(resume_text, job_dict),
                ai_service.ai_match_job(resume_text, job_dict),
                return_exceptions=True,
            )
            if isinstance(summary, dict):
                _ref.ai_summary = summary.get("summary", "")
            if isinstance(score, dict):
                _ref.ai_score = score
            if isinstance(tags, list) and tags:
                _ref.tags = tags
            if isinstance(fraud, dict):
                _ref.fraud_flags = fraud.get("flags", [])
            if isinstance(prediction, dict):
                _ref.interview_prediction = prediction
            if isinstance(match_detail, dict):
                _ref.match_percent = match_detail.get("matchPercent", _ref.match_percent)
                _ref.missing_skills = match_detail.get("missingSkills", [])
            _db.commit()
        except Exception:
            pass
        finally:
            _db.close()

    job_dict = {"id": job.id, "title": job.title, "skills": job.skills, "description": job.description, "exp": job.exp} if job else {}
    try:
        loop = _bg_asyncio.get_event_loop()
        if loop.is_running():
            _bg_asyncio.ensure_future(_enrich(referral.id, referral.resume_text, job_dict))
        else:
            loop.create_task(_enrich(referral.id, referral.resume_text, job_dict))
    except Exception:
        pass

    # Notify all HR users
    hr_users = db.query(models.User).filter(models.User.role.in_(["hr", "admin"])).all()
    for hr in hr_users:
        create_notification(db, hr.id, "New Referral Submitted",
                          f"{user.name} referred {payload.candidateName} for {job.title}",
                          "info", "referral")

    # Email referrer
    try:
        email_service.send_referral_submitted_email(user.email, user.name, payload.candidateName, job.title)
    except Exception:
        pass

    return serialize(referral)


@router.patch("/{referral_id}/status")
def update_status(referral_id: str, payload: schemas.ReferralStatusUpdate,
                   db: Session = Depends(get_db), user=Depends(require_hr)):
    referral = db.query(models.Referral).filter(models.Referral.id == referral_id).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")

    old_status = referral.status
    referral.status = payload.status
    db.commit()
    db.refresh(referral)

    # Log activity
    log_activity(db, referral_id, f"Status changed to {payload.status}",
                 f"Status changed from {old_status} to {payload.status} by {user.name}",
                 user.name)

    # Audit log
    from .admin import log_audit
    log_audit(db, user, f"Referral status: {old_status} -> {payload.status}",
              target="referral", target_id=referral_id,
              details=f"Candidate: {referral.candidate_name}")

    # Auto-create interview record when moving to interview stages
    interview_rounds = ["Technical Round", "Manager Round", "HR Round", "HR Screening",
                        "Technical Round 1", "Technical Round 2", "Director Round", "HR Final Discussion"]
    if payload.status in interview_rounds:
        existing = db.query(models.Interview).filter(
            models.Interview.referral_id == referral_id,
            models.Interview.round_name == payload.status
        ).first()
        if not existing:
            interview = models.Interview(
                referral_id=referral_id,
                job_id=referral.job_id,
                candidate_name=referral.candidate_name,
                round_name=payload.status,
                status="Scheduled",
            )
            db.add(interview)
            db.commit()

    # Find referrer's user account for notification
    job = db.query(models.Job).filter(models.Job.id == referral.job_id).first()
    job_title = job.title if job else "the role"
    referrer_emp = db.query(models.Employee).filter(models.Employee.id == referral.referred_by).first()
    if referrer_emp:
        referrer_user = db.query(models.User).filter(models.User.employee_id == referrer_emp.id).first()
        if referrer_user:
            create_notification(db, referrer_user.id, f"Referral Update — {referral.candidate_name}",
                              f"Status changed from {old_status} to {payload.status}",
                              "success" if payload.status in ("Offer", "Joined") else "info",
                              "referral", f"/tracking")
            try:
                email_service.send_referral_status_email(referrer_user.email, referral.candidate_name,
                                                        payload.status, job_title)
            except Exception:
                pass

            if payload.status in ("Interview", "Technical Round", "Manager Round", "HR Round"):
                try:
                    email_service.send_interview_scheduled_email(referrer_user.email, referral.candidate_name,
                                                                job_title, payload.status)
                except Exception:
                    pass
            elif payload.status == "Offer":
                try:
                    email_service.send_offer_email(referrer_user.email, referral.candidate_name, job_title)
                except Exception:
                    pass
            elif payload.status == "Rejected":
                try:
                    email_service.send_rejection_email(referrer_user.email, referral.candidate_name, job_title)
                except Exception:
                    pass
            elif payload.status == "Joined":
                bonus_amount = job.bonus if job else 0
                if bonus_amount > 0:
                    try:
                        email_service.send_bonus_credited_email(referrer_user.email, referrer_user.name, bonus_amount, referral.candidate_name)
                    except Exception:
                        pass
                    create_notification(db, referrer_user.id, f"Referral Bonus Credited",
                                      f"A bonus of ₹{bonus_amount:,} has been credited for {referral.candidate_name}",
                                      "success", "bonus", "/rewards")

    if payload.status == "Submitted":
        log_activity(db, referral_id, "Referral submitted",
                     f"Referral submitted by {user.name}", user.name)
    elif payload.status == "Offer":
        if referral.email:
            try:
                email_service.send_offer_email(referral.email, referral.candidate_name, job_title)
            except Exception:
                pass
    elif payload.status == "Rejected":
        if referral.email:
            try:
                email_service.send_rejection_email(referral.email, referral.candidate_name, job_title)
            except Exception:
                pass
    elif payload.status == "Joined":
        if referral.email:
            try:
                email_service.send_joining_confirmation_email(referral.email, referral.candidate_name, job_title)
            except Exception:
                pass

    return serialize(referral)


@router.delete("/{referral_id}")
def delete_referral(referral_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    referral = db.query(models.Referral).filter(models.Referral.id == referral_id).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")
    if referral.referred_by != user.employee_id:
        raise HTTPException(status_code=403, detail="You can only delete your own referrals")
    if referral.status not in ("Submitted", "Applied"):
        raise HTTPException(status_code=400, detail=f"Cannot delete a referral with status '{referral.status}'. Only referrals in 'Submitted' or 'Applied' status can be withdrawn.")

    candidate_name = referral.candidate_name

    # Delete child rows that have foreign keys to referrals
    db.query(models.ActivityLog).filter(models.ActivityLog.referral_id == referral_id).delete(synchronize_session=False)
    db.query(models.Interview).filter(models.Interview.referral_id == referral_id).delete(synchronize_session=False)
    db.commit()

    from .admin import log_audit
    log_audit(db, user, "Referral withdrawn",
              target="referral", target_id=referral_id,
              details=f"Candidate: {candidate_name}")

    db.delete(referral)
    db.commit()
    return {"ok": True, "message": "Referral withdrawn successfully"}


@router.get("/{referral_id}")
def get_referral(referral_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    referral = db.query(models.Referral).filter(models.Referral.id == referral_id).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")
    return serialize(referral)
