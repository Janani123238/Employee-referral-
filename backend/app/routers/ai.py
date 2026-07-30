import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas, ai_service
from ..auth import get_current_user, require_hr

logger = logging.getLogger("ai_router")

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.get("/status")
async def ai_status(user=Depends(get_current_user)):
    """Check if the AI provider is configured and reachable."""
    ps = ai_service._get_provider_settings()
    provider = ps["provider"]
    available = await ai_service._check_ai_available()
    return {
        "provider": provider,
        "model": ps["model"],
        "available": available,
        "message": f"AI ({provider}) is ready." if available else f"AI ({provider}) is not available. Using built-in analysis instead.",
    }


def get_job_or_404(db, job_id):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


def get_referral_or_404(db, ref_id):
    r = db.query(models.Referral).filter(models.Referral.id == ref_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Referral not found")
    return r


@router.post("/parse-resume")
async def parse_resume(payload: schemas.ResumeTextIn, user=Depends(get_current_user)):
    result = await ai_service.ai_parse_resume(payload.resumeText)
    if result is None:
        raise HTTPException(status_code=502, detail="AI could not parse the resume. Please try again or paste the text manually.")
    return result


@router.post("/match-job")
async def match_job(payload: schemas.MatchJobIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    job = get_job_or_404(db, payload.jobId)
    result = await ai_service.ai_match_job(payload.resumeText, job)
    if result is None:
        raise HTTPException(status_code=502, detail="AI matching failed. Please try again.")
    return result


@router.post("/detailed-match")
async def detailed_match(
    payload: schemas.ResumeTextIn,
    jobId: str = "",
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if not jobId:
        raise HTTPException(status_code=400, detail="jobId query parameter is required")
    job = get_job_or_404(db, jobId)
    result = await ai_service.ai_detailed_match(payload.resumeText, job)
    return result


@router.post("/match-all-jobs")
async def match_all_jobs(payload: schemas.ResumeTextIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    jobs = db.query(models.Job).all()
    if not jobs:
        return []

    async def match_one(job):
        m = await ai_service.ai_match_job(payload.resumeText, job)
        if m:
            return {
                "job": {"id": job.id, "title": job.title, "dept": job.dept, "location": job.location},
                "match": m,
            }
        return None

    tasks = [match_one(job) for job in jobs]
    results_raw = await asyncio.gather(*tasks, return_exceptions=True)
    results = [r for r in results_raw if r is not None and not isinstance(r, Exception)]
    results.sort(key=lambda x: x["match"].get("matchPercent", 0), reverse=True)
    return results


@router.post("/summary")
async def summary(payload: schemas.ResumeTextIn, user=Depends(get_current_user)):
    result = await ai_service.ai_summary(payload.resumeText)
    if result is None:
        return {"summary": "AI summary unavailable — the model may be loading.", "suitableFor": ""}
    return result


@router.post("/quality-score")
async def quality_score(payload: schemas.ResumeTextIn, user=Depends(get_current_user)):
    result = await ai_service.ai_quality_score(payload.resumeText)
    if result is None:
        return {"resumeQuality": 50, "skillMatch": 50, "communication": 50, "experienceMatch": 50, "overall": 50}
    return result


@router.post("/improvement")
async def improvement(payload: schemas.ResumeTextIn, user=Depends(get_current_user)):
    result = await ai_service.ai_improvement(payload.resumeText)
    if result is None:
        return {"missingSkills": [], "grammarIssues": [], "weakSections": [], "suggestions": ["AI analysis unavailable — please try again."]}
    return result


@router.post("/fraud-check")
async def fraud_check(payload: schemas.ResumeTextIn, user=Depends(get_current_user)):
    result = await ai_service.ai_fraud_check(payload.resumeText)
    if result is None:
        return {"riskLevel": "low", "flags": [], "aiGeneratedProbability": 0}
    return result


@router.post("/interview-prediction")
async def interview_prediction(payload: schemas.MatchJobIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    job = get_job_or_404(db, payload.jobId)
    result = await ai_service.ai_interview_prediction(payload.resumeText, job)
    if result is None:
        return {"chance": 50, "reasons": ["AI prediction unavailable — please try again."]}
    return result


@router.post("/auto-tags")
async def auto_tags(payload: schemas.ResumeTextIn, user=Depends(get_current_user)):
    return {"tags": await ai_service.ai_auto_tags(payload.resumeText)}


@router.post("/compare-candidates")
async def compare_candidates(payload: schemas.CompareIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    ref_a = get_referral_or_404(db, payload.referralIds[0])
    ref_b = get_referral_or_404(db, payload.referralIds[1])
    job = db.query(models.Job).filter(models.Job.id == ref_a.job_id).first()
    result = await ai_service.ai_compare_candidates(ref_a, ref_b, job)
    if result is None:
        return {
            "strongerCandidate": "A",
            "verdict": "AI comparison could not be completed at this time.",
            "candidateAStrengths": [f"{ref_a.candidate_name}: referral submitted"],
            "candidateBStrengths": [f"{ref_b.candidate_name}: referral submitted"],
        }
    return result


@router.post("/generate-email")
async def generate_email(payload: schemas.GenerateEmailIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    referral = get_referral_or_404(db, payload.referralId)
    job = db.query(models.Job).filter(models.Job.id == referral.job_id).first()
    text = await ai_service.ai_generate_email(referral, job)
    return {"email": text}


@router.post("/generate-jd")
async def generate_jd(payload: schemas.GenerateJdIn, user=Depends(get_current_user)):
    text = await ai_service.ai_generate_jd(payload.brief)
    return {"jd": text}


@router.post("/chat")
async def chat(payload: schemas.ChatMessageIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    jobs = db.query(models.Job).all()
    jobs_list = "\n".join(f"- {j.title} ({j.dept}, {j.exp}, bonus ₹{j.bonus}) skills: {', '.join(j.skills or [])}" for j in jobs)

    mine = []
    if user.employee_id:
        mine = db.query(models.Referral).filter(models.Referral.referred_by == user.employee_id).all()

    refs_list_parts = []
    for r in mine:
        job = db.query(models.Job).filter(models.Job.id == r.job_id).first()
        job_title = job.title if job else "—"
        score = r.ai_score.get("overall", "—") if r.ai_score else "—"
        refs_list_parts.append(f"- {r.candidate_name} for {job_title}: status {r.status}, score {score}")
    refs_list = "\n".join(refs_list_parts) or "No referrals yet."

    context = (
        f"Open jobs:\n{jobs_list}\n\nYour referrals:\n{refs_list}\n\n"
        "Policy: Referral bonus is paid 30 days after the candidate joins and completes probation confirmation. "
        "Duplicate referrals within 90 days are not eligible for bonus."
    )
    reply = await ai_service.ai_chat(payload.message, payload.history, context)
    return {"reply": reply}


@router.post("/compose-email")
async def compose_email(payload: schemas.AiComposeEmailIn, user=Depends(get_current_user)):
    """AI-powered email composer. Generates professional email content from a prompt."""
    context_map = {
        "interview_invite": "Generate a professional interview invitation email",
        "reminder": "Generate a professional interview reminder email",
        "rejection": "Generate a professional and empathetic rejection email",
        "offer": "Generate a professional job offer letter email",
        "follow_up": "Generate a professional follow-up email",
        "document_request": "Generate a professional document request email",
        "general": "Generate a professional business email",
    }

    context_instruction = context_map.get(payload.context, context_map["general"])

    prompt = (
        f"{context_instruction}.\n\n"
        f"Candidate Name: {payload.candidateName or 'the candidate'}\n"
        f"Job Title: {payload.jobTitle or 'the position'}\n"
        f"Company: {payload.companyName}\n"
        f"Additional context from HR: {payload.prompt}\n\n"
        "Return the result as JSON with exactly these keys:\n"
        "subject: the email subject line\n"
        "body: the full email body (use proper paragraphs, professional tone)\n"
        "Do NOT include any other keys. Return valid JSON only."
    )

    try:
        raw = await ai_service.call_ai("You are a professional HR email composer.", prompt, max_tokens=800)
    except Exception as e:
        logger.warning("AI compose-email failed: %s", e)
        raw = None
    if not raw:
        return {
            "subject": f"Regarding {payload.jobTitle or 'your application'} at {payload.companyName}",
            "body": f"Dear {payload.candidateName or 'Candidate'},\n\n{payload.prompt}\n\nBest regards,\n{payload.companyName} HR Team"
        }

    import json
    try:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = "\n".join(cleaned.split("\n")[1:-1])
        data = json.loads(cleaned)
        return {"subject": data.get("subject", ""), "body": data.get("body", "")}
    except (json.JSONDecodeError, KeyError):
        return {
            "subject": f"Regarding {payload.jobTitle or 'your application'} at {payload.companyName}",
            "body": raw
        }


@router.post("/send-email")
async def send_email(payload: schemas.SendEmailIn, db: Session = Depends(get_db), user=Depends(require_hr)):
    """Send an email directly from the email composer."""
    from .. import email_service
    result = email_service.send_email_direct(
        to_emails=payload.to,
        cc_emails=payload.cc,
        bcc_emails=payload.bcc,
        subject=payload.subject,
        body=payload.body,
    )
    return result
