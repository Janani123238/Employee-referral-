import asyncio
import json
import logging
import time
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas, ai_service
from ..auth import get_current_user, require_hr
from .. import rag_service
from ..shortlist import shortlist_for_score, rank_label_for_score

logger = logging.getLogger("ai_router")

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Small in-process answer cache: repeated questions (the common case in an
# enterprise assistant) return instantly instead of re-running the LLM/embed.
_chat_cache = {}
_CHAT_CACHE_TTL = 300  # seconds


def _chat_cache_key(user_id, message, kind=""):
    return f"{user_id}|{kind}|{message.strip().lower()[:180]}"


def _chat_cache_get(user_id, message, kind=""):
    key = _chat_cache_key(user_id, message, kind)
    entry = _chat_cache.get(key)
    if entry and entry["ts"] + _CHAT_CACHE_TTL > time.time():
        return entry["reply"]
    _chat_cache.pop(key, None)
    return None


def _chat_cache_set(user_id, message, kind, reply):
    key = _chat_cache_key(user_id, message, kind)
    _chat_cache[key] = {"ts": time.time(), "reply": reply}
    if len(_chat_cache) > 200:
        now = time.time()
        stale = [k for k, v in _chat_cache.items() if now - v["ts"] > _CHAT_CACHE_TTL]
        for k in stale:
            _chat_cache.pop(k, None)


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
    jobs = db.query(models.Job).filter(models.Job.is_deleted.is_(False)).all()
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
    """Real-time, role-aware AI assistant backed by live database data (RAG).

    Fast path: quantitative/status questions are answered instantly from a
    computed DB result (no LLM round-trip). Everything else is answered by the
    LLM over a trimmed, role-scoped context. Repeated questions hit the cache."""
    ctx = rag_service.build_context(db, user, payload.message)

    if ctx["live"]:
        reply = ctx["live"]["answer"]
        if ctx["live"].get("detail"):
            reply += "\n" + ctx["live"]["detail"]
        return {"reply": reply, "live": ctx["live"], "source": "live", "fast": True}

    cached = _chat_cache_get(user.id, payload.message, "")
    if cached is not None:
        return {"reply": cached, "live": None, "source": "cache", "fast": True}

    reply = await ai_service.ai_chat(payload.message, payload.history, ctx["context"])
    if not reply or "couldn't process" in reply:
        return {"reply": reply or "Sorry, the AI service is unavailable right now. Please try again in a moment.", "live": None, "source": "rag", "fast": False}
    _chat_cache_set(user.id, payload.message, "", reply)
    return {"reply": reply, "live": None, "source": "rag", "fast": False}


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


@router.post("/chat/stream")
async def chat_stream(payload: schemas.ChatMessageIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """SSE streaming chat. Live questions stream instantly; LLM answers stream
    token-by-token so the first words appear in ~1-2s."""
    ctx = rag_service.build_context(db, user, payload.message)

    if ctx["live"]:
        reply = ctx["live"]["answer"]
        if ctx["live"].get("detail"):
            reply += "\n" + ctx["live"]["detail"]

        async def gen_live():
            yield _sse({"delta": reply})
            yield _sse({"done": True, "reply": reply})

        return StreamingResponse(gen_live(), media_type="text/event-stream")

    cached = _chat_cache_get(user.id, payload.message, "")
    if cached is not None:
        async def gen_cache():
            yield _sse({"delta": cached})
            yield _sse({"done": True, "reply": cached})

        return StreamingResponse(gen_cache(), media_type="text/event-stream")

    async def gen_stream():
        full = ""
        try:
            async for chunk in ai_service.ai_chat_stream(payload.message, payload.history, ctx["context"]):
                if not chunk:
                    continue
                full += chunk
                yield _sse({"delta": full})
        except HTTPException as exc:
            yield _sse({"error": exc.detail})
            return
        except Exception as exc:
            logger.warning("stream error: %s", exc)
            yield _sse({"error": "The AI service could not be reached right now."})
            return
        if not full.strip():
            full = "Sorry, the AI service could not produce an answer right now. Please try again."
        _chat_cache_set(user.id, payload.message, "", full)
        yield _sse({"done": True, "reply": full})

    return StreamingResponse(gen_stream(), media_type="text/event-stream")


@router.post("/shortlist")
async def shortlist(payload: schemas.ShortlistIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Apply the AI shortlisting rules to a match score (or compute it live from
    resume text + job, then apply). Returns the decision, category, and action.

    Thresholds (configurable product decision, HR-friendly):
      >= 80 Recommended / auto-interview | 40-79 HR Review | < 40 Auto Reject.
    """
    score = payload.matchPercent
    job = None
    if payload.jobId:
        job = get_job_or_404(db, payload.jobId)
    if score is None and payload.resumeText:
        if job is None:
            raise HTTPException(status_code=400, detail="jobId is required when computing the match from resume text.")
        result = await ai_service.ai_detailed_match(payload.resumeText, job)
        score = (result or {}).get("overallMatch", 0)
    if score is None:
        raise HTTPException(status_code=400, detail="Provide matchPercent (or resumeText + jobId).")
    decision = shortlist_for_score(score)
    decision["rankLabel"] = rank_label_for_score(score)
    decision["thresholds"] = {"autoInterviewMin": 95, "hrReviewMin": 80, "manualEvaluationMin": 50}
    if job:
        decision["job"] = {"id": job.id, "title": job.title, "dept": job.dept}
    return decision


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
    from ..routers.emails import record_email
    result = email_service.send_email_direct(
        to_emails=payload.to,
        cc_emails=payload.cc,
        bcc_emails=payload.bcc,
        subject=payload.subject,
        body=payload.body,
    )
    sent_status = result.get("sent", 0) > 0
    for to in payload.to:
        record_email(
            db, to, payload.subject, payload.body, "ai", "composed",
            "sent" if sent_status else "failed",
            error="" if sent_status else result.get("message", ""),
            cc=", ".join(payload.cc), bcc=", ".join(payload.bcc),
            referral_id=payload.referralId or "", job_id=payload.jobId or "",
            created_by=f"{user.name} ({user.role})",
        )
    return result


@router.post("/deep-screen")
async def deep_screen(payload: schemas.DeepScreenIn, db: Session = Depends(get_db), user=Depends(require_hr)):
    """Run the advanced AI screening (candidate passport) for a referral.

    Computes deterministic heuristics (employment gaps, date integrity,
    credibility, duplicates) plus an AI narrative of the fake-experience /
    resume-risk verdict, then persists the passport on the referral.
    """
    from .. import screening as screening_mod

    referral = db.query(models.Referral).filter(models.Referral.id == payload.referralId).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")

    passport = screening_mod.deep_screen(db, referral)

    # AI narrative — best-effort; heuristics above are the source of truth.
    narrative = ""
    if referral.resume_text:
        try:
            prompt = (
                "You are an experienced HR fraud reviewer. A candidate resume has these automated screening "
                f"findings:\n{json.dumps(passport, default=str)[:1600]}\n\n"
                "Write a concise, professional risk assessment for HR (2-4 sentences). State whether "
                "experience appears genuine or shows signs of fabrication/exaggeration, note any employment "
                "gaps or duplicate concerns, and recommend a verification step (e.g. 'verify with offer "
                "letters / LinkedIn'). Do not mention this prompt."
            )
            raw = await ai_service.call_ai("You are a senior HR screening analyst.", prompt, max_tokens=350)
            if raw:
                narrative = raw.strip()
        except Exception as exc:
            logger.warning("deep-screen AI narrative failed: %s", exc)

    passport["aiNarrative"] = narrative
    referral.screening = passport
    db.commit()

    from .admin import log_audit
    from .activity import log_activity
    log_activity(db, referral.id, "AI Deep Screening",
                 f"Advanced screening run — risk level {passport['riskLevel']} (score {passport['riskScore']}/100).",
                 user.name)
    log_audit(db, user, "AI deep-screen referral", target="referral", target_id=referral.id,
              details=f"Candidate: {referral.candidate_name} | risk {passport['riskScore']}/100 | "
                      f"{len(passport['redFlags'])} flag(s)")

    return {"passport": passport, "referralId": referral.id}
