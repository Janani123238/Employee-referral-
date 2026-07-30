import json
import re
import logging
import httpx
from fastapi import HTTPException
from .config import settings

logger = logging.getLogger("ai_service")

OLLAMA_URL = "{base_url}/api/chat"
OPENAI_URL = "https://api.openai.com/v1/chat/completions"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"

OLLAMA_TIMEOUT_SECONDS = 30

# Cache for AI availability check (avoid repeated 30s timeouts)
_ai_available_cache = {"checked": False, "available": False}

async def _check_ai_available():
    """Quick check if the configured AI provider is reachable. Cached after first call."""
    global _ai_available_cache
    if _ai_available_cache["checked"]:
        return _ai_available_cache["available"]
    ps = _get_provider_settings()
    provider = ps["provider"]
    try:
        if provider == "ollama":
            url = settings.OLLAMA_BASE_URL.rstrip("/") + "/api/tags"
            async with httpx.AsyncClient(timeout=3) as client:
                resp = await client.get(url)
                available = resp.status_code == 200
        elif provider == "openai":
            available = bool(ps.get("api_key") or settings.OPENAI_API_KEY)
        elif provider == "anthropic":
            available = bool(ps.get("api_key") or settings.ANTHROPIC_API_KEY)
        elif provider == "gemini":
            available = bool(ps.get("api_key") or settings.GEMINI_API_KEY)
        else:
            available = False
    except Exception:
        available = False
    _ai_available_cache = {"checked": True, "available": available}
    if not available:
        logger.warning("AI provider '%s' is not available — using fallback mode", provider)
    return available


def _get_provider_settings():
    """Read AI provider config from the database (app_settings table).
    Falls back to env-based config for Ollama."""
    try:
        from .database import SessionLocal
        from . import models
        db = SessionLocal()
        s = db.query(models.AppSettings).first()
        db.close()
        if s:
            return {
                "provider": s.ai_provider or "ollama",
                "model": s.ai_model or settings.OLLAMA_MODEL,
                "api_key": s.ai_api_key or "",
                "temperature": s.ai_temperature or 0.2,
                "max_tokens": s.ai_max_tokens or 1000,
            }
    except Exception:
        pass
    return {
        "provider": "ollama",
        "model": settings.OLLAMA_MODEL,
        "api_key": "",
        "temperature": 0.2,
        "max_tokens": 1000,
    }


async def call_ai(system: str, user_content: str, max_tokens: int = 1000, history=None) -> str:
    """Unified AI call that routes to the configured provider."""
    ps = _get_provider_settings()
    provider = ps["provider"]

    if provider == "openai":
        return await _call_openai(system, user_content, ps, max_tokens, history)
    elif provider == "gemini":
        return await _call_gemini(system, user_content, ps, max_tokens, history)
    elif provider == "anthropic":
        return await _call_anthropic(system, user_content, ps, max_tokens, history)
    else:
        return await call_ollama(system, user_content, max_tokens, history)


async def _call_openai(system: str, user_content: str, ps: dict, max_tokens: int, history=None) -> str:
    api_key = ps["api_key"] or settings.OPENAI_API_KEY if hasattr(settings, 'OPENAI_API_KEY') else ps.get("api_key", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key is not configured. Set it in Admin > AI Settings.")

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    if history:
        for item in history:
            if isinstance(item, dict):
                messages.append({"role": item.get("role", "user"), "content": item.get("content", "")})
    messages.append({"role": "user", "content": user_content})

    body = {
        "model": ps["model"],
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": ps["temperature"],
    }

    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT_SECONDS) as client:
            resp = await client.post(OPENAI_URL, json=body, headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"})
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI service timed out. Please try again.")
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach OpenAI: {exc}")

    try:
        data = resp.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="OpenAI returned an unreadable response")

    if resp.status_code != 200:
        detail = data.get("error", {}).get("message", f"HTTP {resp.status_code}")
        raise HTTPException(status_code=502, detail=f"OpenAI error: {detail}")

    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    if not text.strip():
        raise HTTPException(status_code=502, detail="OpenAI returned an empty response")
    return text


async def _call_gemini(system: str, user_content: str, ps: dict, max_tokens: int, history=None) -> str:
    api_key = ps.get("api_key", "") or settings.GEMINI_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key is not configured. Set it in Admin > AI Settings.")

    contents = []
    if history:
        for item in history:
            if isinstance(item, dict):
                role = "user" if item.get("role") == "user" else "model"
                contents.append({"role": role, "parts": [{"text": item.get("content", "")}]})
    contents.append({"role": "user", "parts": [{"text": (system + "\n\n" + user_content) if system else user_content}]})

    model = ps["model"] or settings.GEMINI_MODEL
    url = GEMINI_URL.format(model=model)
    body = {
        "contents": contents,
        "generationConfig": {"maxOutputTokens": max_tokens, "temperature": ps["temperature"]},
    }

    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT_SECONDS) as client:
            resp = await client.post(url + f"?key={api_key}", json=body, headers={"Content-Type": "application/json"})
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Gemini timed out. Please try again.")
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach Gemini: {exc}")

    try:
        data = resp.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="Gemini returned an unreadable response")

    if resp.status_code != 200:
        detail = data.get("error", {}).get("message", f"HTTP {resp.status_code}")
        raise HTTPException(status_code=502, detail=f"Gemini error: {detail}")

    text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
    if not text.strip():
        raise HTTPException(status_code=502, detail="Gemini returned an empty response")
    return text


async def _call_anthropic(system: str, user_content: str, ps: dict, max_tokens: int, history=None) -> str:
    api_key = ps.get("api_key", "") or settings.ANTHROPIC_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key is not configured. Set it in Admin > AI Settings.")

    messages = []
    if history:
        for item in history:
            if isinstance(item, dict):
                messages.append({"role": item.get("role", "user"), "content": item.get("content", "")})
    messages.append({"role": "user", "content": user_content})

    model = ps["model"] or settings.ANTHROPIC_MODEL
    body = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": messages,
        "temperature": ps["temperature"],
    }
    if system:
        body["system"] = system

    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT_SECONDS) as client:
            resp = await client.post(ANTHROPIC_URL, json=body, headers={
                "x-api-key": api_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"
            })
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Anthropic timed out. Please try again.")
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach Anthropic: {exc}")

    try:
        data = resp.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="Anthropic returned an unreadable response")

    if resp.status_code != 200:
        detail = data.get("error", {}).get("message", f"HTTP {resp.status_code}")
        raise HTTPException(status_code=502, detail=f"Anthropic error: {detail}")

    text = data.get("content", [{}])[0].get("text", "")
    if not text.strip():
        raise HTTPException(status_code=502, detail="Anthropic returned an empty response")
    return text


async def call_ollama(system: str, user_content: str, max_tokens: int = 1000, history=None) -> str:
    if not settings.OLLAMA_BASE_URL:
        raise HTTPException(status_code=500, detail="OLLAMA_BASE_URL is not configured on the server")

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    if history:
        for item in history:
            if isinstance(item, dict):
                role = item.get("role", "user")
                text = item.get("content") or item.get("text") or ""
                if text:
                    messages.append({"role": role, "content": str(text)})
            elif item:
                messages.append({"role": "user", "content": str(item)})
    messages.append({"role": "user", "content": user_content})

    body = {
        "model": settings.OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "num_predict": max_tokens,
            "temperature": 0.2,
        },
    }
    url = OLLAMA_URL.format(base_url=settings.OLLAMA_BASE_URL.rstrip('/'))

    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT_SECONDS) as client:
            resp = await client.post(url, json=body)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI service timed out. The model may be loading — please try again in a moment.")
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach AI service: {exc}")

    try:
        data = resp.json()
    except ValueError:
        raise HTTPException(
            status_code=502,
            detail=f"AI service returned an unreadable response (HTTP {resp.status_code})",
        )

    if resp.status_code != 200 or "error" in data:
        message = data.get("error") or f"AI service returned HTTP {resp.status_code}"
        raise HTTPException(status_code=502, detail=f"AI error: {message}")

    text = data.get("message", {}).get("content", "")
    if not text.strip():
        raise HTTPException(status_code=502, detail="AI service returned an empty response")
    return text


async def call_claude(system: str, user_content: str, max_tokens: int = 1000, history=None) -> str:
    return await call_ai(system, user_content, max_tokens=max_tokens, history=history)


async def safe_ai_call(system: str, user_content: str, max_tokens: int = 1000, history=None):
    """Wraps call_ai and returns None on failure instead of raising, so
    callers can degrade gracefully when a single AI call fails."""
    try:
        return await call_ai(system, user_content, max_tokens=max_tokens, history=history)
    except HTTPException:
        return None
    except Exception as exc:
        logger.warning("safe_ai_call failed: %s", exc)
        return None


def extract_json(text: str):
    if not text:
        return None
    t = text.strip()
    t = re.sub(r"^```json\s*", "", t, flags=re.IGNORECASE).strip()
    t = re.sub(r"^```\s*", "", t).strip()
    t = re.sub(r"\s*```$", "", t).strip()
    start_obj, start_arr = t.find("{"), t.find("[")
    candidates = [i for i in (start_obj, start_arr) if i != -1]
    if not candidates:
        return None
    s = min(candidates)
    end_obj, end_arr = t.rfind("}"), t.rfind("]")
    e = max(end_obj, end_arr)
    if e == -1:
        return None
    raw = t[s:e + 1]
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    try:
        cleaned = re.sub(r",\s*([}\]])", r"\1", raw)
        return json.loads(cleaned)
    except Exception:
        logger.warning("Failed to extract JSON from AI response (len=%d)", len(text))
        return None


def regex_parse_resume(text: str):
    """Fast regex-based resume parser. No AI needed — works instantly."""
    if not text:
        return {}

    t = text.strip()
    result = {
        "name": "",
        "email": "",
        "phone": "",
        "currentCompany": "",
        "totalExperienceYears": 0,
        "education": "",
        "skills": [],
        "certifications": [],
        "projects": [],
        "suggestedRole": "",
        "linkedin": "",
        "github": "",
    }

    # Email
    m = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', t)
    if m:
        result["email"] = m.group(0)

    # Phone (Indian or US formats)
    m = re.search(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}', t)
    if m:
        result["phone"] = m.group(0).strip()

    # LinkedIn
    m = re.search(r'linkedin\.com/in/[\w-]+', t, re.IGNORECASE)
    if m:
        result["linkedin"] = "https://www." + m.group(0)

    # GitHub
    m = re.search(r'github\.com/[\w-]+', t, re.IGNORECASE)
    if m:
        result["github"] = "https://" + m.group(0)

    # Name: first non-empty line that's short and has no @ or digits
    for line in t.split("\n"):
        line = line.strip()
        if line and len(line) < 60 and "@" not in line and not re.search(r'\d{3}', line) and not re.search(r'(experience|education|skills|summary|profile|objective|address|phone|email)', line, re.IGNORECASE):
            result["name"] = line.split(",")[0].strip()
            break

    # Experience years
    m = re.search(r'(\d{1,2})\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)', t, re.IGNORECASE)
    if m:
        result["totalExperienceYears"] = int(m.group(1))

    # Current company: look for "Company:" or last employer line
    m = re.search(r'(?:Company|Employer|Organization)\s*[:\-]\s*(.+)', t, re.IGNORECASE)
    if m:
        result["currentCompany"] = m.group(1).strip()[:80]
    else:
        # Try to find "at <Company>" or "<Company> — <Role>"
        m = re.search(r'(?:at|@\s*)([A-Z][A-Za-z &.]{2,40})', t)
        if m:
            result["currentCompany"] = m.group(1).strip()

    # Education
    edu_patterns = [
        r'((?:Bachelor|Master|B\.?S\.?|M\.?S\.?|B\.?Tech|M\.?Tech|B\.?E\.?|M\.?E\.?|MBA|Ph\.?D)[^,\n]{0,80})',
        r'((?:B\.?Sc|M\.?Sc|B\.?A|M\.?A|B\.?Com|M\.?Com)[^,\n]{0,60})',
    ]
    for pat in edu_patterns:
        m = re.search(pat, t, re.IGNORECASE)
        if m:
            result["education"] = m.group(1).strip()[:100]
            break

    # Skills: look for skills section
    skills_section = ""
    for marker in ["skills", "technical skills", "core competencies", "technologies", "tech stack"]:
        idx = re.search(rf'(?:^|\n)[\s]*{marker}[\s:]*\n', t, re.IGNORECASE)
        if idx:
            start = idx.end()
            # Take next 3-5 lines or until a blank line
            lines_after = t[start:start+500].split("\n")[:5]
            skills_section = " ".join(l.strip() for l in lines_after if l.strip())
            break
    if skills_section:
        # Split on commas, bullets, pipes, or newlines
        skills = re.split(r'[,|•\-\n]+', skills_section)
        result["skills"] = [s.strip() for s in skills if s.strip() and len(s.strip()) < 50][:20]
    else:
        # Fallback: look for common tech keywords
        common = ["Python", "Java", "JavaScript", "TypeScript", "React", "Angular", "Vue", "Node",
                   "AWS", "Azure", "GCP", "Docker", "Kubernetes", "SQL", "PostgreSQL", "MongoDB",
                   "Git", "REST", "API", "HTML", "CSS", "Spring", "Django", "Flask", "FastAPI",
                   "Machine Learning", "AI", "Deep Learning", "NLP", "TensorFlow", "PyTorch"]
        found = [kw for kw in common if re.search(rf'\b{re.escape(kw)}\b', t, re.IGNORECASE)]
        result["skills"] = found[:15]

    # Certifications
    cert_m = re.findall(r'(?:Certified?|Certification)[^\n]{5,80}', t, re.IGNORECASE)
    result["certifications"] = [c.strip()[:80] for c in cert_m][:10]

    return result


async def ai_parse_resume(resume_text: str):
    """Parse resume using fast regex. Always instant — no AI call needed for parsing."""
    return regex_parse_resume(resume_text)


async def ai_match_job(resume_text: str, job):
    system = (
        "You are the AI job-matching engine inside MuraAI Refer. Compare the candidate resume text "
        "against the job below and return ONLY valid JSON matching:\n"
        '{"matchPercent":number,"matchedSkills":string[],"missingSkills":string[],"reason":string}\n'
        "matchPercent is 0-100. Be realistic and specific, referencing only skills implied by the resume text.\n"
        f"JOB: {job.title} | Department: {job.dept} | Experience needed: {job.exp} | "
        f"Required skills: {', '.join(job.skills or [])}"
    )
    raw = await safe_ai_call(system, resume_text, max_tokens=500)
    return extract_json(raw)


def _regex_summary(resume_text: str):
    """Heuristic summary from resume text — no AI needed."""
    if not resume_text or len(resume_text.strip()) < 20:
        return None
    r = regex_parse_resume(resume_text)
    t = resume_text.strip().lower()

    years = r.get("totalExperienceYears", 0)
    if not years:
        m = re.search(r'(\d{1,2})\+?\s*(?:years?|yrs?)', t)
        if m:
            years = int(m.group(1))
    skills = r.get("skills", [])
    certs = r.get("certifications", [])
    edu = r.get("education", "")
    name = r.get("name", "the candidate")
    company = r.get("currentCompany", "")

    summary_parts = [f"{name} is a professional"]
    if company:
        summary_parts[0] += f" currently at {company}"
    if years:
        summary_parts[0] += f" with {years} years of experience"
    summary_parts[0] += "."
    if skills:
        summary_parts.append(f"Key technical skills include {', '.join(skills[:6])}.")
    if edu:
        summary_parts.append(f"Education: {edu}.")
    if certs:
        summary_parts.append(f"Holds certifications in {', '.join(certs[:3])}.")

    soft_skills = []
    for sk in ["leadership", "communication", "teamwork", "mentoring", "agile", "scrum", "project management"]:
        if sk in t:
            soft_skills.append(sk.title())
    if soft_skills:
        summary_parts.append(f"Soft skills: {', '.join(soft_skills)}.")

    domains = []
    for d in ["fintech", "healthcare", "e-commerce", "saas", "banking", "telecom", "gaming", "edtech", "logistics", "manufacturing"]:
        if d in t:
            domains.append(d.title())
    if domains:
        summary_parts.append(f"Domain expertise: {', '.join(domains)}.")

    rec_role = ""
    if any(kw in t for kw in ["machine learning", "deep learning", "nlp", "data scien"]):
        rec_role = "ML / Data Scientist"
    elif any(kw in t for kw in ["react", "angular", "vue", "frontend", "front-end"]):
        rec_role = "Frontend Engineer"
    elif any(kw in t for kw in ["backend", "api", "microservice", "spring", "django", "fastapi", "node"]):
        rec_role = "Backend Engineer"
    elif any(kw in t for kw in ["full stack", "fullstack", "mern", "mean"]):
        rec_role = "Full Stack Engineer"
    elif any(kw in t for kw in ["devops", "ci/cd", "docker", "kubernetes", "terraform"]):
        rec_role = "DevOps Engineer"
    elif any(kw in t for kw in ["cloud", "aws", "azure", "gcp"]):
        rec_role = "Cloud Engineer"
    elif any(kw in t for kw in ["product", "roadmap", "stakeholder"]):
        rec_role = "Product Manager"
    elif any(kw in t for kw in ["manager", "director", "head", "lead"]):
        rec_role = "Engineering Manager"
    else:
        rec_role = "Software Engineer"

    strength_count = len(skills) + (1 if years and years >= 3 else 0) + (1 if edu else 0) + len(certs)
    if strength_count >= 5:
        hire = "Strong Hire"
    elif strength_count >= 3:
        hire = "Hire"
    elif strength_count >= 1:
        hire = "Maybe"
    else:
        hire = "Maybe"

    strengths = []
    if skills:
        strengths.append(f"Strong technical skill set ({len(skills)} skills listed)")
    if years and years >= 3:
        strengths.append(f"{years} years of relevant experience")
    if edu:
        strengths.append(f"Relevant educational background")
    if certs:
        strengths.append(f"Professional certifications ({len(certs)})")
    if not strengths:
        strengths = ["Resume submitted for review"]

    weaknesses = []
    if not certs:
        weaknesses.append("No certifications listed")
    if len(skills) < 3:
        weaknesses.append("Limited skills listed in resume")
    if not years:
        weaknesses.append("Experience level not clearly stated")
    if len(weaknesses) < 2:
        weaknesses.append("Resume could benefit from more quantified achievements")

    return {
        "professionalSummary": " ".join(summary_parts),
        "yearsOfExperience": years or 0,
        "technicalSkills": skills,
        "softSkills": soft_skills,
        "domainExpertise": domains,
        "educationSummary": edu,
        "certifications": certs,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommendedPosition": rec_role,
        "hiringRecommendation": hire,
        "suitableFor": f"{rec_role} roles",
    }


async def ai_summary(resume_text: str):
    system = (
        "You are MuraAI's AI candidate-summary engine. Read the resume text carefully and produce "
        "a comprehensive professional candidate profile. Return ONLY valid JSON:\n"
        '{"professionalSummary":string,"yearsOfExperience":number,"technicalSkills":string[],'
        '"softSkills":string[],"domainExpertise":string[],"educationSummary":string,'
        '"certifications":string[],"strengths":string[],"weaknesses":string[],'
        '"recommendedPosition":string,"hiringRecommendation":string,"suitableFor":string}\n'
        "- professionalSummary: 3-5 sentences profiling the candidate\n"
        "- yearsOfExperience: total years estimated from resume\n"
        "- technicalSkills: key technical skills extracted\n"
        "- softSkills: communication, leadership, teamwork, etc.\n"
        "- domainExpertise: industries/domains they have worked in\n"
        "- educationSummary: highest degree and institution\n"
        "- certifications: any professional certifications\n"
        "- strengths: top 3-5 strengths\n"
        "- weaknesses: 2-3 areas for improvement\n"
        "- recommendedPosition: best-fit role title\n"
        "- hiringRecommendation: 'Strong Hire' | 'Hire' | 'Maybe' | 'No Hire'\n"
        "- suitableFor: brief role suggestion\n"
        "Never invent data not present in the resume. If a field can't be determined, use empty string/number/[]/null."
    )
    raw = await safe_ai_call(system, resume_text, max_tokens=1200)
    result = extract_json(raw)
    if result:
        return result
    return _regex_summary(resume_text)


def _regex_quality_score(resume_text: str):
    """Heuristic quality score — no AI needed."""
    if not resume_text or len(resume_text.strip()) < 20:
        return None
    r = regex_parse_resume(resume_text)
    t = resume_text.strip().lower()

    # Resume quality: structure, length, sections
    rq = 40
    if len(resume_text) > 500: rq += 10
    if len(resume_text) > 1500: rq += 10
    if r.get("email"): rq += 5
    if r.get("phone"): rq += 5
    if r.get("education"): rq += 5
    if r.get("linkedin"): rq += 5
    if r.get("skills"): rq += 10
    if any(sec in t for sec in ["experience", "education", "skills", "summary", "project"]):
        rq += 10
    rq = min(rq, 100)

    # Skill match: breadth of skills
    skills = r.get("skills", [])
    sm = min(20 + len(skills) * 6, 100)

    # Communication: writing clarity (sentence length, no typos)
    comm = 50
    sentences = [s for s in resume_text.split(".") if s.strip()]
    avg_len = sum(len(s.split()) for s in sentences) / max(len(sentences), 1)
    if 5 < avg_len < 30:
        comm += 15
    if len(sentences) > 5:
        comm += 10
    if r.get("name"):
        comm += 5
    if r.get("email"):
        comm += 5
    if len(resume_text) > 300:
        comm += 10
    comm = min(comm, 100)

    # Experience match
    years = r.get("totalExperienceYears", 0)
    em = 30
    if years:
        em += min(years * 8, 40)
    if r.get("currentCompany"):
        em += 15
    if r.get("education"):
        em += 10
    em = min(em, 100)

    overall = round(rq * 0.3 + sm * 0.25 + comm * 0.25 + em * 0.2)

    return {
        "resumeQuality": rq,
        "skillMatch": sm,
        "communication": comm,
        "experienceMatch": em,
        "experienceYears": years,
        "hiringProbability": min(overall + 10, 100),
        "overall": overall,
    }


async def ai_quality_score(resume_text: str):
    system = (
        "You are MuraAI's AI referral quality scoring engine. Score the resume on these "
        "dimensions (0-100 each): resumeQuality (clarity, structure, completeness), skillMatch (breadth/depth "
        "of in-demand skills), communication (writing clarity), experienceMatch (seniority/relevance signal). "
        'Return ONLY valid JSON:\n{"resumeQuality":number,"skillMatch":number,"communication":number,'
        '"experienceMatch":number,"experienceYears":number,"hiringProbability":number,"overall":number}\n'
        "- overall is a holistic weighted average\n"
        "- experienceYears: estimated years of experience from resume\n"
        "- hiringProbability: 0-100 chance of getting hired based on resume quality"
    )
    raw = await safe_ai_call(system, resume_text, max_tokens=400)
    result = extract_json(raw)
    if result:
        return result
    return _regex_quality_score(resume_text)


def _regex_improvement(resume_text: str):
    """Heuristic improvement suggestions — no AI needed."""
    if not resume_text or len(resume_text.strip()) < 20:
        return None
    r = regex_parse_resume(resume_text)
    t = resume_text.strip().lower()

    skills = r.get("skills", [])

    # Missing skills: check for important modern skills not present
    important_skills = {
        "Docker": ["docker", "container"],
        "Kubernetes": ["kubernetes", "k8s"],
        "AWS": ["aws"],
        "CI/CD": ["ci/cd", "ci cd", "continuous integration", "jenkins", "github actions"],
        "Git": ["git"],
        "REST API": ["rest", "api", "restful"],
        "Testing": ["test", "jest", "pytest", "junit", "selenium"],
        "Agile/Scrum": ["agile", "scrum", "sprint"],
        "System Design": ["system design", "architecture", "microservice"],
        "SQL": ["sql", "mysql", "postgres"],
        "Cloud": ["cloud", "aws", "azure", "gcp"],
        "Machine Learning": ["machine learning", "ml", "deep learning", "neural"],
        "Communication": ["communication", "presentation", "stakeholder"],
        "Leadership": ["leadership", "lead", "mentor", "team lead"],
    }
    missing = [sk for sk, keywords in important_skills.items()
               if not any(k in t for k in keywords) and sk.lower() not in [s.lower() for s in skills]]

    # Missing keywords for ATS
    ats_keywords = ["results-driven", "cross-functional", "stakeholder", "scalable",
                    "optimized", "performance", "metrics", "KPI", "deliverables"]
    missing_kw = [kw for kw in ats_keywords if kw.lower() not in t]

    # ATS score: how ATS-friendly is the format
    ats = 50
    if r.get("email"): ats += 8
    if r.get("phone"): ats += 8
    if r.get("skills"): ats += 12
    if r.get("education"): ats += 8
    if len(resume_text) > 500: ats += 5
    if r.get("linkedin"): ats += 4
    if r.get("name"): ats += 5
    ats = min(ats, 100)

    # Formatting suggestions
    fmt = []
    if not r.get("linkedin"):
        fmt.append("Add LinkedIn profile URL")
    if not r.get("github") and any(k in t for k in ["github", "repository", "code"]):
        fmt.append("Add GitHub profile link")
    if len(resume_text) < 800:
        fmt.append("Add more detail — resume appears too brief")
    if not any(sec in t for sec in ["summary", "objective", "profile"]):
        fmt.append("Add a professional summary or objective statement")
    bullets = resume_text.count("\n•") + resume_text.count("\n-") + resume_text.count("\n▸")
    if bullets < 3:
        fmt.append("Use more bullet points for skills and experience")

    # Grammar issues (basic)
    grammar = []
    if "  " in resume_text:
        grammar.append("Multiple consecutive spaces detected")
    if len(resume_text.split("\n")) < 5:
        grammar.append("Consider adding more line breaks for readability")

    # Skill gap
    gap = [sk for sk in ["Data Structures", "Algorithms", "System Design", "Cloud Architecture",
                           "DevOps", "CI/CD", "Security", "Performance Optimization"]
           if sk.lower() not in t and sk.lower() not in [s.lower() for s in skills]]

    # Certification recs
    cert_recs = []
    if any(k in t for k in ["python", "data", "ml", "machine learning"]) and not any("aws" in c.lower() for c in r.get("certifications", [])):
        cert_recs.append("AWS Certified Developer")
    if any(k in t for k in ["scrum", "agile", "sprint"]) and not any("scrum" in c.lower() for c in r.get("certifications", [])):
        cert_recs.append("Certified Scrum Master")
    if any(k in t for k in ["security", "cyber", "infosec"]):
        cert_recs.append("CISSP or CEH")
    if any(k in t for k in ["cloud", "aws"]):
        cert_recs.append("AWS Solutions Architect")

    # Project recs
    proj_recs = []
    if any(k in t for k in ["python", "django", "flask", "fastapi"]):
        proj_recs.append("Build and deploy a REST API project")
    if any(k in t for k in ["react", "angular", "vue"]):
        proj_recs.append("Create a full-stack web application")
    if any(k in t for k in ["data", "ml", "analytics"]):
        proj_recs.append("Contribute to open-source data/ML projects")
    if not proj_recs:
        proj_recs.append("Build a portfolio project showcasing your top skills")

    # Overall rating
    overall = ats
    if skills: overall += 5
    if missing: overall -= len(missing) * 2
    if fmt: overall -= len(fmt) * 2
    overall = max(min(overall, 100), 20)

    suggestions = []
    if missing:
        suggestions.append(f"Add these in-demand skills: {', '.join(missing[:3])}")
    if missing_kw:
        suggestions.append(f"Include ATS keywords: {', '.join(missing_kw[:3])}")
    if not r.get("linkedin"):
        suggestions.append("Add your LinkedIn profile URL")
    if len(resume_text) < 800:
        suggestions.append("Expand resume with more project details and quantified achievements")
    if r.get("totalExperienceYears") and r["totalExperienceYears"] < 2:
        suggestions.append("Highlight internships, personal projects, and open-source contributions")
    if len(suggestions) < 3:
        suggestions.append("Quantify achievements with specific numbers and metrics")
        suggestions.append("Tailor your resume to match the target job description")
    if len(suggestions) < 5:
        suggestions.append("Include links to your portfolio, GitHub, or published work")

    return {
        "missingSkills": missing[:8],
        "missingKeywords": missing_kw[:6],
        "atsScore": ats,
        "formattingSuggestions": fmt[:5],
        "grammarIssues": grammar[:3],
        "skillGapAnalysis": gap[:6],
        "certificationRecommendations": cert_recs[:4],
        "projectRecommendations": proj_recs[:4],
        "overallRating": overall,
        "suggestions": suggestions[:5],
    }


async def ai_improvement(resume_text: str):
    system = (
        "You are MuraAI's AI resume-improvement coach. Analyze the resume thoroughly and return "
        "ONLY valid JSON:\n"
        '{"missingSkills":string[],"missingKeywords":string[],"atsScore":number,'
        '"formattingSuggestions":string[],"grammarIssues":string[],"skillGapAnalysis":string[],'
        '"certificationRecommendations":string[],"projectRecommendations":string[],'
        '"overallRating":number,"suggestions":string[]}\n'
        "- missingSkills: important skills for modern roles that are absent\n"
        "- missingKeywords: ATS-optimized keywords missing\n"
        "- atsScore: estimated ATS compatibility score 0-100\n"
        "- formattingSuggestions: specific formatting improvements\n"
        "- grammarIssues: any grammar/clarity problems\n"
        "- skillGapAnalysis: skills needed for target roles but missing\n"
        "- certificationRecommendations: relevant certifications to pursue\n"
        "- projectRecommendations: project types that would strengthen the resume\n"
        "- overallRating: resume quality rating 0-100\n"
        "- suggestions: top 5 actionable improvements\n"
        "Be specific and actionable. Keep each array item short (one sentence max)."
    )
    raw = await safe_ai_call(system, resume_text, max_tokens=800)
    result = extract_json(raw)
    if result:
        return result
    return _regex_improvement(resume_text)


async def ai_fraud_check(resume_text: str):
    system = (
        "You are the AI fraud-detection engine inside MuraAI Refer. Look for signs of exaggerated experience, "
        "inconsistent dates/timelines, generic AI-generated resume phrasing, or implausible claims. Return "
        'ONLY valid JSON:\n{"riskLevel":"low"|"medium"|"high","flags":string[],"aiGeneratedProbability":number}\n'
        "aiGeneratedProbability is 0-100. Be conservative — only flag real, specific concerns; an empty flags "
        "array with riskLevel \"low\" is a normal, expected result."
    )
    raw = await safe_ai_call(system, resume_text, max_tokens=400)
    return extract_json(raw)


async def ai_interview_prediction(resume_text: str, job):
    system = (
        "You are the AI interview-prediction engine inside MuraAI Refer. Estimate the candidate's likelihood "
        "of clearing interviews for the role below, based only on resume signal. Return ONLY valid JSON:\n"
        '{"chance":number,"reasons":string[]}\nchance is 0-100. reasons has 2-4 short bullet points.\n'
        f"JOB: {job.title} | Required skills: {', '.join(job.skills or [])} | Experience needed: {job.exp}"
    )
    raw = await safe_ai_call(system, resume_text, max_tokens=400)
    return extract_json(raw)


async def ai_auto_tags(resume_text: str):
    system = (
        'Extract the top 6-10 most relevant skill/technology tags from this resume text. Return ONLY valid '
        'JSON: {"tags":string[]}. Use short canonical names (e.g. "React", "AWS", "Python").'
    )
    raw = await safe_ai_call(system, resume_text, max_tokens=200)
    j = extract_json(raw)
    return j.get("tags", []) if j else []


async def ai_compare_candidates(ref_a, ref_b, job):
    resume_a = ref_a.resume_text or ""
    resume_b = ref_b.resume_text or ""
    if not resume_a.strip() and not resume_b.strip():
        return {
            "strongerCandidate": "A",
            "verdict": "Both candidates lack resume data for comparison.",
            "candidateAStrengths": [],
            "candidateBStrengths": [],
        }
    system = (
        "You are the AI candidate-comparison engine inside MuraAI Refer, comparing two referrals for the "
        'same role. Return ONLY valid JSON:\n{"strongerCandidate":"A"|"B","verdict":string,'
        '"candidateAStrengths":string[],"candidateBStrengths":string[]}\n'
        f"JOB: {job.title if job else 'the role'}, required skills: {', '.join(job.skills) if job else 'n/a'}."
    )
    user = (
        f"CANDIDATE A ({ref_a.candidate_name}): {resume_a[:3000]}\n\n"
        f"CANDIDATE B ({ref_b.candidate_name}): {resume_b[:3000]}"
    )
    raw = await safe_ai_call(system, user, max_tokens=600)
    result = extract_json(raw)
    if not result:
        return {
            "strongerCandidate": "A",
            "verdict": "AI comparison could not be completed. Both candidates are under review.",
            "candidateAStrengths": [f"{ref_a.candidate_name}: has submitted a referral"],
            "candidateBStrengths": [f"{ref_b.candidate_name}: has submitted a referral"],
        }
    return result


async def ai_generate_email(referral, job):
    system = (
        "Write a warm, professional referral introduction email an employee can send to their HR/recruiting "
        "team, introducing a candidate they're referring. Keep it under 130 words, plain text, no markdown, "
        'no subject line prefix like "Subject:" beyond a first line labeled Subject.'
    )
    user = (
        f"Candidate: {referral.candidate_name}, applying for {job.title if job else 'an open role'} at MuraAI. "
        f"Candidate background: {referral.resume_text[:2000] if referral.resume_text else 'N/A'}. "
        f"Referrer relationship to candidate: {referral.relationship_to_referrer or 'colleague'}."
    )
    raw = await safe_ai_call(system, user, max_tokens=350)
    return raw or f"Subject: Referral for {referral.candidate_name}\n\nHi Team,\n\nI'd like to refer {referral.candidate_name} for the {job.title if job else 'open'} role. They come with relevant experience and I believe they'd be a strong fit.\n\nPlease let me know if you need any additional details.\n\nBest regards"


async def ai_generate_jd(brief: str):
    system = (
        "You are the AI job-description generator inside MuraAI Refer's HR panel. Given a short brief from HR, "
        "write a complete, well-structured job description with sections: Role Summary, Responsibilities, "
        'Requirements, Nice to Have. Use plain text with clear line breaks and short bullet-style lines '
        'starting with "- ". No markdown headers (##), just capitalized section titles on their own line. '
        "Keep it concise and specific to the brief."
    )
    raw = await safe_ai_call(system, brief, max_tokens=700)
    return raw or f"Role Summary\n{brief}\n\nResponsibilities\n- To be discussed\n\nRequirements\n- Relevant experience required"


async def ai_chat(user_message: str, history: list, context: str):
    system = (
        "You are the MuraAI Refer AI Assistant, embedded in an employee referral platform. Answer the "
        "employee's question helpfully and briefly (2-5 sentences unless a list is clearer). Use the CONTEXT "
        "below (their real referral data, open jobs, and policy) to answer specifically — never invent data "
        "not present in context. If asked something unrelated to referrals/hiring/MuraAI, answer briefly then "
        f"gently steer back.\nCONTEXT:\n{context}"
    )
    raw = await safe_ai_call(system, user_message, max_tokens=500, history=history)
    return raw or "I'm sorry, I couldn't process that right now. Please try again in a moment."


def _regex_detailed_match(resume_text: str, job):
    """Regex-based detailed match — no AI needed."""
    if not resume_text or len(resume_text.strip()) < 20:
        return {
            "overallMatch": 0,
            "skillsMatch": {"score": 0, "matched": [], "missing": list(job.skills or [])},
            "experienceMatch": {"score": 0, "required": job.exp or "N/A", "candidate": "N/A"},
            "educationMatch": {"score": 0, "required": "N/A", "candidate": "N/A"},
            "certificationMatch": {"score": 0, "matched": [], "missing": []},
            "domainMatch": {"score": 0},
            "keywordMatch": {"score": 0, "matched": [], "missing": []},
            "strengths": [],
            "weaknesses": ["No resume text provided"],
            "recommendation": "Insufficient Data",
            "detailedAnalysis": "Unable to analyze — no resume text available.",
        }

    r = regex_parse_resume(resume_text)
    t = resume_text.strip().lower()
    job_skills = [s.lower() for s in (job.skills or [])]

    # --- Skills match ---
    candidate_skills = [s.lower() for s in r.get("skills", [])]
    matched_skills = []
    missing_skills = []
    for js in job_skills:
        found = any(js in cs or cs in js for cs in candidate_skills)
        if found:
            matched_skills.append(js.title())
        else:
            missing_skills.append(js.title())
    skills_score = round(len(matched_skills) / max(len(job_skills), 1) * 100) if job_skills else 50

    # --- Experience match ---
    candidate_exp = r.get("totalExperienceYears", 0)
    exp_match = re.search(r'(\d+)', job.exp or "")
    required_exp = int(exp_match.group(1)) if exp_match else 0
    if required_exp > 0 and candidate_exp > 0:
        exp_score = min(round(candidate_exp / required_exp * 100), 100)
    elif candidate_exp > 0:
        exp_score = 70
    else:
        exp_score = 30

    # --- Education match ---
    edu = r.get("education", "")
    edu_score = 50
    if edu:
        edu_score = 80
        if any(kw in edu.lower() for kw in ["b.tech", "bachelor", "master", "mba", "ph.d", "m.tech"]):
            edu_score = 100

    # --- Certification match ---
    certs = [c.lower() for c in r.get("certifications", [])]
    cert_matched = []
    cert_missing = []
    job_cert_keywords = ["aws", "azure", "gcp", "scrum", "pmp", "cissp", "ceh", "kubernetes", "docker"]
    for ck in job_cert_keywords:
        if any(ck in c for c in certs):
            cert_matched.append(ck.upper())
        else:
            cert_missing.append(ck.upper())
    cert_score = round(len(cert_matched) / max(len(job_cert_keywords), 1) * 100) if job_cert_keywords else 50

    # --- Domain match ---
    domain_score = 50
    domain_keywords = ["fintech", "healthcare", "e-commerce", "saas", "banking", "telecom", "gaming", "edtech"]
    if any(d in t for d in domain_keywords):
        domain_score = 85

    # --- Keyword match ---
    keyword_matched = []
    keyword_missing = []
    ats_keywords = ["microservices", "rest api", "graphql", "ci/cd", "agile", "scrum",
                    "system design", "scalable", "distributed", "cloud", "serverless"]
    for kw in ats_keywords:
        if kw in t:
            keyword_matched.append(kw.title())
        else:
            keyword_missing.append(kw.title())
    keyword_score = round(len(keyword_matched) / max(len(ats_keywords), 1) * 100)

    # --- Overall weighted ---
    overall = round(
        skills_score * 0.35
        + exp_score * 0.25
        + edu_score * 0.15
        + cert_score * 0.10
        + domain_score * 0.05
        + keyword_score * 0.10
    )

    # --- Strengths / Weaknesses ---
    strengths = []
    if matched_skills:
        strengths.append(f"Strong skill alignment: {', '.join(matched_skills[:4])}")
    if candidate_exp and candidate_exp >= (required_exp or 3):
        strengths.append(f"Sufficient experience ({candidate_exp} years)")
    if edu:
        strengths.append(f"Relevant education: {edu}")
    if cert_matched:
        strengths.append(f"Holds relevant certifications: {', '.join(cert_matched[:3])}")
    if keyword_matched:
        strengths.append(f"Covers ATS keywords: {', '.join(keyword_matched[:3])}")
    if not strengths:
        strengths = ["Resume submitted for review"]

    weaknesses = []
    if missing_skills:
        weaknesses.append(f"Missing required skills: {', '.join(missing_skills[:3])}")
    if not candidate_exp:
        weaknesses.append("Experience level not clearly stated")
    if candidate_exp and required_exp and candidate_exp < required_exp:
        weaknesses.append(f"Below required experience ({candidate_exp} < {required_exp} years)")
    if cert_missing:
        weaknesses.append("No matching certifications found")
    if len(weaknesses) < 2:
        weaknesses.append("Resume could benefit from more quantified achievements")

    recommendation = "Suitable"
    if overall >= 80:
        recommendation = "Strongly Suitable"
    elif overall >= 60:
        recommendation = "Suitable"
    elif overall >= 40:
        recommendation = "Marginally Suitable"
    else:
        recommendation = "Not Suitable"

    analysis_parts = []
    if matched_skills:
        analysis_parts.append(f"The candidate matches {len(matched_skills)}/{len(job_skills)} required skills")
    if candidate_exp:
        analysis_parts.append(f"with {candidate_exp} years of experience")
    if missing_skills:
        analysis_parts.append(f"but is missing {', '.join(missing_skills[:2])}")
    analysis_parts.append(f"Overall suitability: {recommendation} ({overall}% match).")

    return {
        "overallMatch": overall,
        "skillsMatch": {"score": skills_score, "matched": matched_skills, "missing": missing_skills},
        "experienceMatch": {"score": exp_score, "required": job.exp or "N/A", "candidate": f"{candidate_exp} years" if candidate_exp else "N/A"},
        "educationMatch": {"score": edu_score, "required": job.exp or "N/A", "candidate": edu or "N/A"},
        "certificationMatch": {"score": cert_score, "matched": cert_matched, "missing": cert_missing},
        "domainMatch": {"score": domain_score},
        "keywordMatch": {"score": keyword_score, "matched": keyword_matched, "missing": keyword_missing},
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommendation": recommendation,
        "detailedAnalysis": " ".join(analysis_parts),
    }


async def ai_detailed_match(resume_text: str, job):
    system = (
        "You are MuraAI's AI detailed job-matching engine. Compare the candidate resume text "
        "against the job below and return ONLY valid JSON:\n"
        '{"overallMatch":number,"skillsMatch":{"score":number,"matched":string[],"missing":string[]},'
        '"experienceMatch":{"score":number,"required":string,"candidate":string},'
        '"educationMatch":{"score":number,"required":string,"candidate":string},'
        '"certificationMatch":{"score":number,"matched":string[],"missing":string[]},'
        '"domainMatch":{"score":number},'
        '"keywordMatch":{"score":number,"matched":string[],"missing":string[]},'
        '"strengths":string[],"weaknesses":string[],"recommendation":string,"detailedAnalysis":string}\n'
        "- overallMatch is 0-100 weighted average\n"
        "- Each sub-score is 0-100\n"
        "- recommendation: 'Strongly Suitable' | 'Suitable' | 'Marginally Suitable' | 'Not Suitable'\n"
        "- detailedAnalysis: 2-3 sentences summarizing the match\n"
        "- Be realistic, reference only skills implied by the resume text\n"
        f"JOB: {job.title} | Department: {job.dept} | Experience needed: {job.exp} | "
        f"Required skills: {', '.join(job.skills or [])}"
    )
    raw = await safe_ai_call(system, resume_text, max_tokens=1200)
    result = extract_json(raw)
    if result:
        return result
    return _regex_detailed_match(resume_text, job)
