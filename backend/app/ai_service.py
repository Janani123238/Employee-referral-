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

OLLAMA_TIMEOUT_SECONDS = 120

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
        async with httpx.AsyncClient(timeout=httpx.Timeout(OLLAMA_TIMEOUT_SECONDS)) as client:
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


async def call_ollama_stream(system: str, user_content: str, max_tokens: int = 500, history=None):
    """Stream a chat completion from Ollama token-by-token (NDJSON lines)."""
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
        "stream": True,
        "options": {
            "num_predict": max_tokens,
            "temperature": 0.2,
        },
    }
    url = OLLAMA_URL.format(base_url=settings.OLLAMA_BASE_URL.rstrip('/'))

    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(connect=10, read=OLLAMA_TIMEOUT_SECONDS, write=30, pool=10)
        ) as client:
            async with client.stream("POST", url, json=body) as resp:
                if resp.status_code != 200:
                    raw = (await resp.aread()).decode("utf-8", "ignore")
                    raise HTTPException(status_code=502, detail=f"AI error: {raw[:200]}")
                async for line in resp.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line)
                    except ValueError:
                        continue
                    if data.get("error"):
                        raise HTTPException(status_code=502, detail=f"AI error: {data['error']}")
                    chunk = data.get("message", {}).get("content", "")
                    if chunk:
                        yield chunk
                    if data.get("done"):
                        break
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI service timed out. The model may be loading — please try again in a moment.")
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach AI service: {exc}")


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


def _balanced_json_end(s: str, start_char: str, end_char: str):
    """Index of the end_char that closes the first start_char, respecting
    JSON string literals. Returns -1 if unbalanced."""
    depth = 0
    in_str = False
    esc = False
    for i, ch in enumerate(s):
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == start_char:
            depth += 1
        elif ch == end_char:
            depth -= 1
            if depth == 0:
                return i
    return -1


def extract_json(text: str):
    if not text:
        return None
    t = text.strip()
    t = re.sub(r"^```json\s*", "", t, flags=re.IGNORECASE).strip()
    t = re.sub(r"^```\s*", "", t).strip()
    t = re.sub(r"\s*```$", "", t).strip()
    starts = [(t.find(start), start, end) for start, end in (("{", "}"), ("[", "]")) if t.find(start) != -1]
    if not starts:
        return None
    s, start_char, end_char = min(starts, key=lambda x: x[0])
    e = _balanced_json_end(t, start_char, end_char)
    if e != -1:
        raw = t[s:e + 1]
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
        try:
            cleaned = re.sub(r",\s*([}\]])", r"\1", raw)
            return json.loads(cleaned)
        except Exception:
            pass
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

    # Experience years (several common phrasings)
    exp_pats = [
        r'(\d{1,2})\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp|work)\b',
        r'(?:experience|exp|worked)\s*(?:of|for|:)?\s*(\d{1,2})\+?\s*(?:years?|yrs?)\b',
        r'(\d{1,2})\+?\s*(?:years?|yrs?)\s+(?:building|developing|working|designing|engineering|hands-on)\b',
        r'(\d{1,2})\+?\s*(?:years?|yrs?)\s+(?:in|of)\b',
    ]
    for ep in exp_pats:
        m = re.search(ep, t, re.IGNORECASE)
        if m:
            result["totalExperienceYears"] = int(m.group(1))
            break

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

    # Skills: look for skills section (own line) or inline "Skills: ..."
    skills_section = ""
    for marker in ["skills", "technical skills", "core competencies", "technologies", "tech stack"]:
        idx = re.search(rf'(?:^|\n)[\s]*{marker}[\s:]*\n', t, re.IGNORECASE)
        if idx:
            start = idx.end()
            # Take next 3-5 lines or until a blank line
            lines_after = t[start:start+500].split("\n")[:5]
            skills_section = " ".join(l.strip() for l in lines_after if l.strip())
            break
    if not skills_section:
        m = re.search(r'(?:^|\n)\s*skills?\s*[:\-]\s*([^\n]{3,300})', t, re.IGNORECASE)
        if m:
            skills_section = m.group(1).strip()
    if not skills_section:
        m = re.search(r'skills?\s*[:\-]\s*([^\n]{3,300})', t, re.IGNORECASE)
        if m:
            skills_section = m.group(1).strip()
    if skills_section:
        # Trim trailing sentences that are not part of the skill list
        # (e.g. "System Design. M.Tech ..." -> keep only "System Design").
        cut = re.search(r'\.\s*[A-Z]', skills_section)
        if cut:
            skills_section = skills_section[:cut.start()]
        # Also drop the resume tail if the list was followed by a new section.
        tail = re.split(r'\s+(?:education|experience|projects|summary|objective|profile)\s*[:\-]', skills_section, maxsplit=1, flags=re.IGNORECASE)
        skills_section = tail[0]
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


def _job_field(job, name, default):
    if job is None:
        return default
    if isinstance(job, dict):
        return job.get(name, default)
    return getattr(job, name, default)


def _jd_match_system(job):
    """System prompt for accurate, evidence-based ATS Resume vs JD scoring.

    Weights: Skills 50%, Experience 20%, Education 10%, Responsibilities 10%,
    Projects 5%, Certifications 5%. Output is the new ATS schema; legacy
    aliases are added later by _normalize_jd_match."""
    title = _job_field(job, "title", "")
    dept = _job_field(job, "dept", "")
    exp = _job_field(job, "exp", "")
    skills = _job_field(job, "skills", []) or []
    description = _job_field(job, "description", "") or ""
    jd_parts = []
    if title:
        jd_parts.append(f"Job Title: {title}")
    if dept:
        jd_parts.append(f"Department: {dept}")
    if exp:
        jd_parts.append(f"Experience Required: {exp}")
    if skills:
        jd_parts.append(f"Required Skills: {', '.join(skills)}")
    if description:
        jd_parts.append(f"Description: {description}")
    jd = "\n".join(jd_parts) or "Job Title: Unknown"
    return (
        "You are an Enterprise ATS Engine and Senior Technical Recruiter.\n\n"
        "Your task is to compare the candidate resume ONLY against the provided Job Description.\n\n"
        "CRITICAL RULES:\n"
        "1. Do NOT give scores based on resume quality alone.\n"
        "2. Every score must be derived from the Job Description requirements.\n"
        "3. Do NOT assume skills or experience that are not explicitly mentioned in the resume.\n"
        "4. Missing mandatory skills must heavily reduce the score.\n"
        "5. If required experience is not met, Experience Match Score = 0.\n"
        "6. If experience is not mentioned in the resume, Experience Match Score = 0.\n"
        "7. If less than 50% of mandatory skills are matched, Overall Score cannot exceed 50.\n"
        "8. If less than 30% of mandatory skills are matched, Overall Score cannot exceed 35.\n"
        "9. ATS Score is NOT Resume Quality. ATS Score means how well the resume matches the JD.\n"
        "10. Do not inflate scores for education, formatting, or generic soft skills.\n\n"
        "STEP 1: Extract JD Requirements internally: Mandatory Skills, Preferred Skills, "
        "Required Experience, Required Education, Job Responsibilities.\n\n"
        "STEP 2: Compare Resume Against JD, scoring each criterion 0-100:\n"
        "Skills Match (50%): score = (matched_mandatory_skills / total_mandatory_skills) x 100.\n"
        "Experience Match (20%): Meets or exceeds requirement = 100; Partially meets = 50; "
        "Below requirement = 0; Not mentioned = 0.\n"
        "Education Match (10%): Exact match = 100; Related degree = 70; Not matching = 0.\n"
        "Responsibilities Match (10%): Compare JD responsibilities with actual resume experience. "
        "Score only based on evidence.\n"
        "Projects Match (5%): Relevant projects only.\n"
        "Certifications Match (5%): Relevant certifications only.\n\n"
        "STEP 3: Generate Final Result. Return ONLY valid JSON matching this exact schema "
        "(no extra keys, no markdown):\n"
        '{"overall_score":0,"ats_match_score":0,"hiring_probability":0,'
        '"recommendation":"Strong Hire | Hire | Consider | Reject",'
        '"mandatory_skills":[],"matched_skills":[],"missing_skills":[],'
        '"required_experience":"","candidate_experience":"","experience_match_score":0,'
        '"required_education":"","candidate_education":"","education_match_score":0,'
        '"skills_match_score":0,"responsibility_match_score":0,"project_match_score":0,'
        '"certification_match_score":0,"strengths":[],"gaps":[],'
        '"rejection_reasons":[],"summary":""}\n\n"'
        "STRICT HIRING RULES:\n"
        "* Missing 3 or more mandatory skills -> Recommendation = Reject.\n"
        "* Experience below requirement -> Recommendation cannot be Strong Hire.\n"
        "* No relevant experience -> Hiring Probability <= 25.\n"
        "* Missing mandatory skill list must come ONLY from the JD.\n"
        "* Never suggest Docker, AWS, Kubernetes, CI/CD, etc. unless they actually appear in the JD.\n"
        "* Never generate generic missing skills.\n"
        "* Every missing skill must be traceable to the Job Description.\n\n"
        "JOB DESCRIPTION:\n"
        + jd
    )


def _clamp_int(value, default=0):
    try:
        return max(0, min(100, int(round(float(value or default)))))
    except (TypeError, ValueError):
        return default


def _norm_list(value):
    if isinstance(value, list):
        return [str(x) for x in value if x]
    return []


def _normalize_jd_match(data, job=None, resume_text=None):
    """Normalize ATS match output into the product schema, plus legacy aliases.

    All numeric scores and skill lists are computed deterministically from the
    JD + resume text using the ATS spec rules, so the result is always complete
    and rule-compliant even when the model is unreliable. The AI's response is
    used for narrative fields (strengths/gaps/rejection reasons/summary/strings)
    when present.
    """
    ref = _regex_detailed_match(resume_text, job) if resume_text else {}
    if not isinstance(ref, dict):
        ref = {}

    def _ref(key, default=None):
        v = ref.get(key)
        return default if v is None else v

    # Skill lists: deterministic (JD-derived), never generic.
    mandatory = _norm_list(_ref("mandatory_skills"))
    matched = _norm_list(_ref("matched_skills"))
    missing = _norm_list(_ref("missing_skills"))
    if not mandatory:
        mandatory = _norm_list(data.get("mandatory_skills"))
    if not matched:
        matched = _norm_list(data.get("matched_skills") or data.get("matchedSkills"))
    if not missing:
        missing = _norm_list(data.get("missing_skills") or data.get("missingSkills"))

    # Scores: deterministic from the ATS rules.
    skills_score = _clamp_int(_ref("skills_match_score"))
    exp_score = _clamp_int(_ref("experience_match_score"))
    edu_score = _clamp_int(_ref("education_match_score"))
    resp_score = _clamp_int(_ref("responsibility_match_score"))
    proj_score = _clamp_int(_ref("project_match_score"))
    cert_score = _clamp_int(_ref("certification_match_score"))

    overall = round(
        skills_score * 0.50
        + exp_score * 0.20
        + edu_score * 0.10
        + resp_score * 0.10
        + proj_score * 0.05
        + cert_score * 0.05
    )
    # Caps: <50% mandatory matched -> overall <= 50; <30% -> overall <= 35.
    if mandatory:
        mandatory_lower = [m.lower() for m in mandatory]
        ratio = len([s for s in matched if s.lower() in mandatory_lower]) / len(mandatory)
        if ratio < 0.30:
            overall = min(overall, 35)
        elif ratio < 0.50:
            overall = min(overall, 50)

    # ATS and hiring scores are derived deterministically from overall (the
    # model's versions are unreliable on small local models).
    ats_score = overall
    hire_prob = overall
    required_experience = str(data.get("required_experience") or "").strip() or str(_ref("required_experience", "") or "").strip()
    candidate_experience = str(data.get("candidate_experience") or "").strip() or str(_ref("candidate_experience", "") or "").strip()
    required_education = str(data.get("required_education") or "").strip() or str(_ref("required_education", "") or "").strip()
    candidate_education = str(data.get("candidate_education") or "").strip() or str(_ref("candidate_education", "") or "").strip()

    strengths = _norm_list(data.get("strengths")) or _norm_list(_ref("strengths"))
    gaps = _norm_list(data.get("gaps") or data.get("weaknesses")) or _norm_list(_ref("gaps") or _ref("weaknesses"))

    # Experience signals for hiring-rule enforcement.
    req_years_m = re.search(r'(\d+)', required_experience)
    req_years = int(req_years_m.group(1)) if req_years_m else 0
    cand_years_m = re.search(r'(\d+)', candidate_experience)
    cand_years = int(cand_years_m.group(1)) if cand_years_m else None
    exp_not_mentioned = cand_years is None or cand_years == 0
    exp_below = bool(req_years and cand_years and cand_years < req_years)

    rejection_reasons = _norm_list(data.get("rejection_reasons"))
    if not rejection_reasons:
        if len(missing) >= 3:
            rejection_reasons.append(f"Missing {len(missing)} mandatory skills from the job description")
        if exp_below:
            rejection_reasons.append(f"Experience below requirement ({cand_years} < {req_years} years)")
        if exp_not_mentioned:
            rejection_reasons.append("Experience level not mentioned in resume")

    recommendation = (
        "Strong Hire" if overall >= 80
        else "Hire" if overall >= 60
        else "Consider" if overall >= 40
        else "Reject"
    )
    # Strict hiring rules.
    if len(missing) >= 3:
        recommendation = "Reject"
    elif exp_below and recommendation == "Strong Hire":
        recommendation = "Hire"
    if exp_not_mentioned:
        hire_prob = min(hire_prob, 25)

    summary = str(data.get("summary") or "").strip() or str(_ref("summary", "") or "").strip()
    if not summary:
        parts = list(rejection_reasons) or gaps
        if parts:
            summary = " ".join(parts)
        else:
            summary = f"Overall suitability: {recommendation} ({overall}% match)."

    result = {
        # New ATS schema
        "overall_score": overall,
        "ats_match_score": ats_score,
        "hiring_probability": hire_prob,
        "recommendation": recommendation,
        "mandatory_skills": mandatory,
        "matched_skills": matched,
        "missing_skills": missing,
        "required_experience": required_experience,
        "candidate_experience": candidate_experience,
        "experience_match_score": exp_score,
        "required_education": required_education,
        "candidate_education": candidate_education,
        "education_match_score": edu_score,
        "skills_match_score": skills_score,
        "responsibility_match_score": resp_score,
        "project_match_score": proj_score,
        "certification_match_score": cert_score,
        "strengths": strengths,
        "gaps": gaps,
        "rejection_reasons": rejection_reasons,
        "summary": summary,
        # Legacy keys kept for backward compatibility
        "domain_match_score": _clamp_int(_ref("domain_match_score")),
        "responsibilities_match_score": resp_score,
        "hiring_recommendation": summary,
        "matchPercent": overall,
        "matchedSkills": matched,
        "missingSkills": missing,
        "reason": summary,
        "overallMatch": overall,
        "overall_match": overall,
        "skillsMatch": skills_score,
        "skills_match": skills_score,
        "experienceMatch": exp_score,
        "experience_match": exp_score,
        "educationMatch": edu_score,
        "education_match": edu_score,
        "domainMatch": _clamp_int(_ref("domain_match_score")),
        "responsibilitiesMatch": resp_score,
        "certificationMatch": cert_score,
        "projectsMatch": proj_score,
        "weaknesses": gaps,
        "detailedAnalysis": summary,
    }
    if job is not None:
        req = _job_field(job, "exp", "N/A") or "N/A"
        result["skillsMatchDetail"] = {"score": skills_score, "matched": matched, "missing": missing}
        result["experienceMatchDetail"] = {"score": exp_score, "required": req, "candidate": candidate_experience}
        result["educationMatchDetail"] = {"score": edu_score, "required": req, "candidate": candidate_education}
        result["certificationMatchDetail"] = {"score": cert_score, "matched": [], "missing": []}
        result["domainMatchDetail"] = {"score": result["domain_match_score"]}
        result["keywordMatchDetail"] = {"score": 0, "matched": [], "missing": []}
    return result


async def ai_match_job(resume_text: str, job):
    """Accurate Resume vs JD scoring using the weighted criteria spec.

    Returns the detailed schema PLUS legacy keys (matchPercent,
    matchedSkills, missingSkills, reason) so existing consumers keep working.
    Falls back to regex scoring when the AI is unavailable."""
    raw = await safe_ai_call(_jd_match_system(job), resume_text, max_tokens=1600)
    data = extract_json(raw)
    if data:
        return _normalize_jd_match(data, job, resume_text)
    return _normalize_jd_match(_regex_detailed_match(resume_text, job), job, resume_text)


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


def _chat_system(context: str) -> str:
    return (
        "You are the MuraAI Refer AI Assistant, embedded in an employee referral platform. Answer the "
        "employee's question helpfully and briefly (2-5 sentences unless a list is clearer). Use the CONTEXT "
        "below (their real referral data, open jobs, and policy) to answer specifically — never invent data "
        "not present in context. If asked something unrelated to referrals/hiring/MuraAI, answer briefly then "
        f"gently steer back.\nCONTEXT:\n{context}"
    )


async def ai_chat(user_message: str, history: list, context: str):
    raw = await safe_ai_call(_chat_system(context), user_message, max_tokens=500, history=history)
    return raw or "I'm sorry, I couldn't process that right now. Please try again in a moment."


async def ai_chat_stream(user_message: str, history: list, context: str):
    """Streaming variant of ai_chat. Falls back to a single yield for
    non-Ollama providers (streaming unsupported there for now)."""
    ps = _get_provider_settings()
    if ps.get("provider") != "ollama":
        text = await ai_chat(user_message, history, context)
        yield text
        return
    async for chunk in call_ollama_stream(_chat_system(context), user_message, max_tokens=500, history=history):
        yield chunk


def _regex_detailed_match(resume_text: str, job):
    """Regex-based detailed match — no AI needed."""
    if not resume_text or len(resume_text.strip()) < 20:
        job_skills = _job_field(job, "skills", []) or []
        job_exp = _job_field(job, "exp", "N/A") or "N/A"
        return {
            "overallMatch": 0,
            "overall_score": 0,
            "ats_match_score": 0,
            "hiring_probability": 0,
            "mandatory_skills": list(job_skills),
            "skillsMatch": {"score": 0, "matched": [], "missing": list(job_skills)},
            "skills_match_score": 0,
            "experienceMatch": {"score": 0, "required": job_exp, "candidate": "N/A"},
            "experience_match_score": 0,
            "required_experience": job_exp,
            "candidate_experience": "N/A",
            "educationMatch": {"score": 0, "required": "N/A", "candidate": "N/A"},
            "education_match_score": 0,
            "required_education": "N/A",
            "candidate_education": "N/A",
            "certificationMatch": {"score": 0, "matched": [], "missing": []},
            "certification_match_score": 0,
            "domainMatch": {"score": 0},
            "domain_match_score": 0,
            "responsibilities_match_score": 0,
            "responsibility_match_score": 0,
            "project_match_score": 0,
            "keywordMatch": {"score": 0, "matched": [], "missing": []},
            "strengths": [],
            "gaps": ["No resume text provided"],
            "weaknesses": ["No resume text provided"],
            "rejection_reasons": ["No resume text provided"],
            "matched_skills": [],
            "missing_skills": list(job_skills),
            "recommendation": "Reject",
            "summary": "Unable to analyze — no resume text available.",
            "detailedAnalysis": "Unable to analyze — no resume text available.",
            "hiring_recommendation": "Insufficient data to evaluate the candidate.",
        }

    r = regex_parse_resume(resume_text)
    t = resume_text.strip().lower()
    job_skills = [s.lower() for s in (_job_field(job, "skills", []) or [])]
    job_exp = _job_field(job, "exp", "N/A") or "N/A"

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

    # --- Experience match (new ATS rules) ---
    candidate_exp = r.get("totalExperienceYears", 0)
    exp_match = re.search(r'(\d+)', job_exp or "")
    required_exp = int(exp_match.group(1)) if exp_match else 0
    if not candidate_exp:
        exp_score = 0  # not mentioned in resume
    elif required_exp > 0 and candidate_exp >= required_exp:
        exp_score = 100  # meets or exceeds
    elif required_exp > 0:
        exp_score = 0  # below requirement
    else:
        exp_score = 100  # no explicit requirement, experience present

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

    # --- Overall weighted (new ATS weights) ---
    overall = round(
        skills_score * 0.50
        + exp_score * 0.20
        + edu_score * 0.10
        + keyword_score * 0.10
        + keyword_score * 0.05
        + cert_score * 0.05
    )
    if job_skills:
        mandatory_ratio = len(matched_skills) / max(len(job_skills), 1)
        if mandatory_ratio < 0.30:
            overall = min(overall, 35)
        elif mandatory_ratio < 0.50:
            overall = min(overall, 50)

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

    recommendation = "Reject"
    if overall >= 80:
        recommendation = "Strong Hire"
    elif overall >= 60:
        recommendation = "Hire"
    elif overall >= 40:
        recommendation = "Consider"

    rejection_reasons = []
    if len(missing_skills) >= 3:
        rejection_reasons.append(f"Missing {len(missing_skills)} mandatory skills from the job description")
    if required_exp and candidate_exp and candidate_exp < required_exp:
        rejection_reasons.append(f"Experience below requirement ({candidate_exp} < {required_exp} years)")
    if not candidate_exp:
        rejection_reasons.append("Experience level not mentioned in resume")

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
        "overall_score": overall,
        "ats_match_score": overall,
        "hiring_probability": overall,
        "mandatory_skills": [s.title() for s in job_skills],
        "skillsMatch": {"score": skills_score, "matched": matched_skills, "missing": missing_skills},
        "skills_match_score": skills_score,
        "experienceMatch": {"score": exp_score, "required": job_exp, "candidate": f"{candidate_exp} years" if candidate_exp else "N/A"},
        "experience_match_score": exp_score,
        "required_experience": job_exp,
        "candidate_experience": f"{candidate_exp} years" if candidate_exp else "N/A",
        "educationMatch": {"score": edu_score, "required": job_exp, "candidate": edu or "N/A"},
        "education_match_score": edu_score,
        "required_education": job_exp,
        "candidate_education": edu or "N/A",
        "certificationMatch": {"score": cert_score, "matched": cert_matched, "missing": cert_missing},
        "certification_match_score": cert_score,
        "domainMatch": {"score": domain_score},
        "domain_match_score": domain_score,
        "responsibilities_match_score": keyword_score,
        "responsibility_match_score": keyword_score,
        "project_match_score": keyword_score,
        "keywordMatch": {"score": keyword_score, "matched": keyword_matched, "missing": keyword_missing},
        "strengths": strengths,
        "weaknesses": weaknesses,
        "gaps": weaknesses,
        "rejection_reasons": rejection_reasons,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "recommendation": recommendation,
        "summary": " ".join(analysis_parts),
        "hiring_recommendation": recommendation,
        "detailedAnalysis": " ".join(analysis_parts),
    }


async def ai_detailed_match(resume_text: str, job):
    """Detailed Resume vs JD match using the weighted criteria spec. Returns the
    detailed schema plus legacy aliases. Falls back to regex scoring."""
    raw = await safe_ai_call(_jd_match_system(job), resume_text, max_tokens=1600)
    data = extract_json(raw)
    if data:
        return _normalize_jd_match(data, job, resume_text)
    return _normalize_jd_match(_regex_detailed_match(resume_text, job), job, resume_text)
