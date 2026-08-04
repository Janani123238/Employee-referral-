from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas
from ..auth import get_current_user, require_hr
from ..routers.activity import log_activity
from ..routers.admin import log_audit
from .. import email_service

router = APIRouter(prefix="/api/interviews", tags=["interviews"])


def serialize(i: models.Interview):
    return {
        "id": i.id,
        "referralId": i.referral_id,
        "jobId": i.job_id,
        "candidateName": i.candidate_name,
        "roundName": i.round_name,
        "interviewType": i.interview_type,
        "interviewDate": i.interview_date,
        "startTime": i.start_time,
        "endTime": i.end_time,
        "interviewer": i.interviewer,
        "meetingLink": i.meeting_link,
        "meetingId": i.meeting_id or "",
        "location": i.location,
        "notes": i.notes,
        "status": i.status,
        "result": i.result,
        "feedback": i.feedback,
        "score": i.score,
        "created_at": i.created_at,
        "updated_at": i.updated_at,
    }


def _active():
    return models.Interview.is_deleted.is_(False)


@router.get("")
def list_interviews(db: Session = Depends(get_db), user=Depends(require_hr)):
    interviews = db.query(models.Interview).filter(_active()).order_by(models.Interview.created_at.desc()).all()
    return [serialize(i) for i in interviews]


@router.get("/calendar")
def interview_calendar(year: int = None, month: int = None,
                       db: Session = Depends(get_db), user=Depends(require_hr)):
    now = datetime.utcnow()
    year = year or now.year
    month = month or now.month
    interviews = db.query(models.Interview).filter(_active()).all()
    result = []
    for iv in interviews:
        if not iv.interview_date:
            continue
        try:
            parts = iv.interview_date.split("-")
            if int(parts[0]) == year and int(parts[1]) == month:
                result.append(serialize(iv))
        except Exception:
            continue
    return result


@router.get("/today")
def today_interviews(db: Session = Depends(get_db), user=Depends(require_hr)):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    interviews = db.query(models.Interview).filter(
        _active(),
        models.Interview.interview_date == today
    ).order_by(models.Interview.start_time).all()
    return [serialize(i) for i in interviews]


@router.get("/upcoming")
def upcoming_interviews(db: Session = Depends(get_db), user=Depends(require_hr)):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    interviews = db.query(models.Interview).filter(
        _active(),
        models.Interview.interview_date >= today,
        models.Interview.status.in_(["Scheduled", "Rescheduled"])
    ).order_by(models.Interview.interview_date, models.Interview.start_time).all()
    return [serialize(i) for i in interviews]


@router.get("/referral/{referral_id}")
def get_interviews_by_referral(referral_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    interviews = db.query(models.Interview).filter(
        _active(),
        models.Interview.referral_id == referral_id
    ).order_by(models.Interview.created_at.desc()).all()
    return [serialize(i) for i in interviews]


@router.post("")
def create_interview(payload: schemas.InterviewIn, db: Session = Depends(get_db), user=Depends(require_hr)):
    referral = db.query(models.Referral).filter(models.Referral.id == payload.referralId).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")

    job_id = payload.jobId or referral.job_id

    interview = models.Interview(
        referral_id=payload.referralId,
        job_id=job_id,
        candidate_name=payload.candidateName or referral.candidate_name,
        round_name=payload.roundName,
        interview_type=payload.interviewType,
        interview_date=payload.interviewDate,
        start_time=payload.startTime,
        end_time=payload.endTime,
        interviewer=payload.interviewer,
        meeting_link=payload.meetingLink,
        location=payload.location,
        notes=payload.notes,
        status="Scheduled",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)

    log_activity(
        db, payload.referralId,
        "Interview Scheduled",
        f"{payload.roundName} scheduled with {payload.interviewer} on {payload.interviewDate} ({payload.startTime}-{payload.endTime})",
        user.name,
    )
    log_audit(db, user, "Interview created", target="interview", target_id=interview.id,
              details=f"{payload.roundName} | candidate: {interview.candidate_name} | {payload.interviewDate}")

    return serialize(interview)


@router.put("/{interview_id}")
def update_interview(interview_id: str, payload: schemas.InterviewUpdate,
                     db: Session = Depends(get_db), user=Depends(require_hr)):
    interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if payload.interviewType is not None:
        interview.interview_type = payload.interviewType
    if payload.interviewDate is not None:
        interview.interview_date = payload.interviewDate
    if payload.startTime is not None:
        interview.start_time = payload.startTime
    if payload.endTime is not None:
        interview.end_time = payload.endTime
    if payload.interviewer is not None:
        interview.interviewer = payload.interviewer
    if payload.meetingLink is not None:
        interview.meeting_link = payload.meetingLink
    if payload.location is not None:
        interview.location = payload.location
    if payload.notes is not None:
        interview.notes = payload.notes
    if payload.status is not None:
        interview.status = payload.status
    if payload.result is not None:
        interview.result = payload.result
    if payload.feedback is not None:
        interview.feedback = payload.feedback
    if payload.score is not None:
        interview.score = payload.score

    interview.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(interview)

    log_activity(
        db, interview.referral_id,
        "Interview Updated",
        f"{interview.round_name} updated — status: {interview.status}",
        user.name,
    )
    log_audit(db, user, "Interview updated", target="interview", target_id=interview_id,
              details=f"{interview.round_name} | status: {interview.status} | result: {interview.result or '—'}")

    return serialize(interview)


@router.post("/{interview_id}/send-invitation")
def send_interview_invitation(interview_id: str, db: Session = Depends(get_db), user=Depends(require_hr)):
    interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    referral = db.query(models.Referral).filter(models.Referral.id == interview.referral_id).first()
    job = db.query(models.Job).filter(models.Job.id == interview.job_id).first()

    candidate_name = referral.candidate_name if referral else interview.candidate_name
    candidate_email = referral.email if referral else ""
    job_title = job.title if job else "the role"

    if not candidate_email:
        raise HTTPException(status_code=400, detail="Candidate has no email address on file")

    meeting_info = ""
    if interview.meeting_link:
        meeting_info = f"Meeting Link: {interview.meeting_link}"
    elif interview.location:
        meeting_info = f"Location: {interview.location}"

    try:
        email_service.send_interview_invitation_email(
            candidate_email, candidate_name, job_title,
            interview.interview_date, interview.start_time or interview.interview_time if hasattr(interview, 'interview_time') else interview.start_time,
            meeting_info, interview.notes or "",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

    log_activity(
        db, interview.referral_id,
        "Invitation Sent",
        f"{interview.round_name} invitation sent to {candidate_name}",
        user.name,
    )

    return {"ok": True, "message": f"Invitation sent to {candidate_email}"}


@router.post("/{interview_id}/create-teams-meeting")
def create_teams_meeting(interview_id: str, db: Session = Depends(get_db), user=Depends(require_hr)):
    """Create (or re-use) a Microsoft Teams online meeting for an interview.

    Requires the acting HR user to have signed in via Microsoft SSO so we can
    act on their behalf (Graph OnlineMeetings.ReadWrite). If SSO tokens aren't
    available it returns a 409 with a helpful message instead of failing loudly.
    """
    interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    from .. import ms_graph
    if not ms_graph.available(user.id):
        raise HTTPException(
            status_code=409,
            detail="Teams integration is not connected. Sign in via 'Continue with Microsoft' once, then retry.",
        )

    referral = db.query(models.Referral).filter(models.Referral.id == interview.referral_id).first()
    job = db.query(models.Job).filter(models.Job.id == interview.job_id).first()
    subject = f"Interview: {interview.candidate_name} — {interview.round_name}"
    if job:
        subject += f" ({job.title})"

    attendee = None
    if referral and referral.email:
        attendee = referral.email

    meeting = ms_graph.create_online_meeting(
        user.id,
        subject=subject,
        start_dt=interview.interview_date,
        start_time=interview.start_time,
        end_time=interview.end_time,
        attendee_email=attendee,
    )

    interview.meeting_link = meeting["joinUrl"]
    interview.meeting_id = meeting["id"]
    db.commit()
    db.refresh(interview)

    log_activity(
        db, interview.referral_id,
        "Teams Meeting Created",
        f"Microsoft Teams meeting created for {interview.round_name} — {interview.meeting_link}",
        user.name,
    )
    log_audit(db, user, "Teams meeting created", target="interview", target_id=interview_id,
              details=f"{interview.candidate_name} | {interview.round_name} | {meeting['joinUrl']}")

    if attendee:
        try:
            email_service.send_interview_invitation_email(
                attendee, interview.candidate_name,
                job.title if job else "the role",
                interview.interview_date, interview.start_time or "",
                f"Meeting Link: {interview.meeting_link}", interview.notes or "",
            )
        except Exception:
            pass

    return serialize(interview)


@router.delete("/{interview_id}")
def delete_interview(interview_id: str, db: Session = Depends(get_db), user=Depends(require_hr)):
    """Soft-delete an interview — hidden from calendars/lists but kept for audit."""
    interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.is_deleted:
        raise HTTPException(status_code=400, detail="This interview has already been deleted")

    referral_id = interview.referral_id
    round_name = interview.round_name
    interview.is_deleted = True
    interview.deleted_at = datetime.utcnow()
    interview.deleted_by = user.name
    db.commit()

    log_activity(
        db, referral_id,
        "Interview Deleted",
        f"{round_name} interview deleted",
        user.name,
    )
    log_audit(db, user, "Interview deleted (soft)", target="interview", target_id=interview_id,
              details=f"{round_name} | candidate: {interview.candidate_name}")

    return {"ok": True, "message": "Interview deleted. Record retained for audit."}
