"""Microsoft Graph integration for Teams meetings (interview scheduling).

The app's SSO sign-in (msal_service) captures the user's delegated Graph
tokens (Calendars.ReadWrite, OnlineMeetings.ReadWrite) at consent time and
stashes them here keyed by MuraAI user id. HR users who signed in via
'Continue with Microsoft' can then create Teams online meetings on their own
behalf without re-authenticating.

Because the tokens come from the existing authorization-code+PKCE flow, no
client secret is needed for the refresh call (SPA-platform redirect URI).

Graph endpoints used:
  POST /v1.0/me/onlineMeetings   -> create a Teams online meeting
  POST /v1.0/me/calendar/events  -> create a calendar event (with the link)
"""
import logging
import threading
import time
from datetime import datetime, timedelta

import httpx

from .config import settings

logger = logging.getLogger("ms_graph")

_GRAPH_BASE = "https://graph.microsoft.com/v1.0"

# user_id -> {"access_token", "refresh_token", "expires_at", "home_oid"}
_tokens = {}
_tokens_lock = threading.Lock()
_GRACE = 120  # refresh when < 2 minutes left


def _msal_app():
    import msal
    return msal.ConfidentialClientApplication(
        client_id=settings.AZURE_CLIENT_ID,
        client_credential=settings.AZURE_CLIENT_SECRET or "",
        authority=settings.AZURE_AUTHORITY,
    )


def save_tokens(user_id: str, result: dict):
    """Persist the delegated Graph tokens captured during SSO consent."""
    if not result or not result.get("access_token"):
        return
    expires_at = time.time() + (result.get("expires_in", 3600) or 3600)
    with _tokens_lock:
        _tokens[user_id] = {
            "access_token": result["access_token"],
            "refresh_token": result.get("refresh_token", ""),
            "expires_at": expires_at,
            "home_oid": (result.get("id_token_claims") or {}).get("oid", ""),
        }


def available(user_id: str) -> bool:
    """True if we have (or can refresh) a delegated token for this user."""
    with _tokens_lock:
        entry = _tokens.get(user_id)
    if not entry:
        return False
    if entry["expires_at"] - time.time() > _GRACE:
        return True
    return bool(entry.get("refresh_token"))


def _get_token(user_id: str) -> str:
    """Return a valid access token, refreshing first if needed."""
    with _tokens_lock:
        entry = _tokens.get(user_id)
    if not entry:
        raise RuntimeError("No Graph token for this user — sign in via Microsoft SSO first.")

    if entry["expires_at"] - time.time() > _GRACE:
        return entry["access_token"]

    if not entry.get("refresh_token"):
        raise RuntimeError("Graph token expired with no refresh token — re-sign in via Microsoft SSO.")

    app = _msal_app()
    result = app.acquire_token_by_refresh_token(
        entry["refresh_token"],
        scopes=["User.Read", "Calendars.ReadWrite", "OnlineMeetings.ReadWrite"],
    )
    if "error" in result or "access_token" not in result:
        logger.warning("Graph token refresh failed: %s", result.get("error_description") or result.get("error"))
        raise RuntimeError("Could not refresh the Microsoft session — re-sign in via Microsoft SSO.")

    with _tokens_lock:
        entry["access_token"] = result["access_token"]
        entry["refresh_token"] = result.get("refresh_token", entry["refresh_token"])
        entry["expires_at"] = time.time() + (result.get("expires_in", 3600) or 3600)
    return entry["access_token"]


def _parse_time(interview_date: str, clock: str = "") -> datetime:
    """Build a naive local datetime from 'YYYY-MM-DD' and 'HH:MM' (Graph expects ISO 8601)."""
    base = interview_date or datetime.now().strftime("%Y-%m-%d")
    if clock and len(clock) >= 5:
        return datetime.strptime(f"{base}T{clock}", "%Y-%m-%dT%H:%M")
    return datetime.strptime(base, "%Y-%m-%d")


def create_online_meeting(user_id: str, subject: str, start_dt: str = "",
                          start_time: str = "", end_time: str = "", attendee_email: str = "") -> dict:
    """Create a Teams online meeting and return {id, joinUrl}."""
    token = _get_token(user_id)
    start = _parse_time(start_dt, start_time)
    end = start + timedelta(minutes=45)
    if end_time and len(end_time) >= 5:
        try:
            end = _parse_time(start_dt, end_time)
        except Exception:
            pass

    payload = {
        "subject": subject,
        "startDateTime": start.strftime("%Y-%m-%dT%H:%M:%S"),
        "endDateTime": end.strftime("%Y-%m-%dT%H:%M:%S"),
        "lobbyBypassSettings": {"scope": "everyone"},
        "allowMeetingChat": "enabled",
        "joinMeetingIdSettings": {},
    }
    if attendee_email:
        payload["participants"] = {
            "organizer": {"upn": ""},
            "attendees": [{"upn": attendee_email, "role": "presenter"}],
        }

    headers = {"Authorization": f"Bearer {token}"}
    try:
        resp = httpx.post(
            f"{_GRAPH_BASE}/me/onlineMeetings",
            headers=headers,
            json=payload,
            timeout=30,
        )
    except Exception as exc:
        logger.warning("Graph onlineMeetings request failed: %s", exc)
        raise RuntimeError("Could not reach Microsoft Teams (network error). Try again.")

    if resp.status_code >= 400:
        logger.warning("Graph onlineMeetings error %s: %s", resp.status_code, resp.text[:400])
        raise RuntimeError(f"Microsoft Teams rejected the request ({resp.status_code}).")

    data = resp.json()
    return {"id": data.get("id", ""), "joinUrl": data.get("joinWebUrl", "")}


def create_calendar_event(user_id: str, subject: str, start_dt: str, start_time: str,
                          end_time: str, join_url: str = "", attendee_email: str = "",
                          body: str = "") -> dict:
    """Add the interview to the organizer's Outlook calendar (best-effort)."""
    token = _get_token(user_id)
    start = _parse_time(start_dt, start_time)
    end = _parse_time(start_dt, end_time) if end_time else start + timedelta(minutes=45)

    payload = {
        "subject": subject,
        "start": {"dateTime": start.strftime("%Y-%m-%dT%H:%M:%S"), "timeZone": "UTC"},
        "end": {"dateTime": end.strftime("%Y-%m-%dT%H:%M:%S"), "timeZone": "UTC"},
        "body": {"contentType": "text", "content": body or "Interview scheduled via MuraAI Refer."},
    }
    if join_url:
        payload["location"] = {"displayName": "Microsoft Teams meeting"}
        payload["onlineMeeting"] = {"joinUrl": join_url}
        payload["isOnlineMeeting"] = True
    if attendee_email:
        payload["attendees"] = [{
            "emailAddress": {"address": attendee_email, "name": attendee_email.split("@")[0]},
            "type": "required",
        }]

    headers = {"Authorization": f"Bearer {token}"}
    try:
        resp = httpx.post(f"{_GRAPH_BASE}/me/calendar/events", headers=headers, json=payload, timeout=30)
    except Exception as exc:
        logger.warning("Graph calendar event request failed: %s", exc)
        return {}
    if resp.status_code >= 400:
        logger.warning("Graph calendar error %s: %s", resp.status_code, resp.text[:400])
        return {}
    data = resp.json()
    return {"id": data.get("id", ""), "webLink": data.get("webLink", "")}
