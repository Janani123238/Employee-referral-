"""
Production email service with workflow templates.
If SMTP_HOST is not configured, emails are logged to console (dev fallback).
SMTP settings can be configured from the Admin panel and are stored in the database.
"""
import logging
import smtplib
from email.mime.text import MIMEText

from .config import settings

logger = logging.getLogger("email_service")


def _get_smtp_config():
    """Read SMTP config from database (admin-configured) with env fallback."""
    try:
        from .database import SessionLocal
        from . import models
        db = SessionLocal()
        s = db.query(models.AppSettings).first()
        db.close()
        if s and s.smtp_host:
            return {
                "host": s.smtp_host,
                "port": s.smtp_port or 587,
                "user": s.smtp_user or "",
                "password": s.smtp_password or "",
                "from_addr": s.smtp_from or settings.SMTP_FROM,
                "use_tls": s.smtp_use_tls,
            }
    except Exception:
        pass
    return {
        "host": settings.SMTP_HOST,
        "port": settings.SMTP_PORT,
        "user": settings.SMTP_USER,
        "password": settings.SMTP_PASSWORD,
        "from_addr": settings.SMTP_FROM,
        "use_tls": settings.SMTP_USE_TLS,
    }


def _send_smtp(to_email: str, subject: str, body: str) -> None:
    cfg = _get_smtp_config()
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = cfg["from_addr"]
    msg["To"] = to_email
    with smtplib.SMTP(cfg["host"], cfg["port"], timeout=15) as server:
        if cfg["use_tls"]:
            server.starttls()
        if cfg["user"] and cfg["password"]:
            server.login(cfg["user"], cfg["password"])
        server.sendmail(cfg["from_addr"], [to_email], msg.as_string())


def _send(to_email: str, subject: str, body: str) -> None:
    cfg = _get_smtp_config()
    if not cfg["host"]:
        logger.warning("SMTP not configured — email NOT sent to %s. Subject: %s", to_email, subject)
        return
    try:
        _send_smtp(to_email, subject, body)
    except Exception:
        logger.exception("Failed to send email to %s", to_email)


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    _send(to_email, "Reset your MuraAI Refer password",
          f"We received a request to reset your password.\n\n"
          f"Reset here (valid {settings.PASSWORD_RESET_EXPIRE_MINUTES} min): {reset_link}\n\n"
          f"If you didn't request this, ignore this email.")


def send_welcome_email(to_email: str, name: str) -> None:
    _send(to_email, "Welcome to MuraAI Refer",
          f"Hi {name},\n\nWelcome to MuraAI Refer — the AI-powered employee referral portal.\n\n"
          f"You can start referring candidates right away from the portal.\n\nBest regards,\nMuraAI Team")


def send_referral_submitted_email(to_email: str, referrer_name: str, candidate_name: str, job_title: str) -> None:
    _send(to_email, f"Referral Submitted — {candidate_name}",
          f"Hi {referrer_name},\n\nYour referral for {candidate_name} ({job_title}) has been submitted successfully.\n\n"
          f"You can track the status from your My Referrals dashboard.\n\nBest regards,\nMuraAI Team")


def send_referral_status_email(to_email: str, candidate_name: str, status: str, job_title: str) -> None:
    _send(to_email, f"Referral Update — {candidate_name}",
          f"Hi,\n\nThe referral for {candidate_name} ({job_title}) has been updated to: {status}.\n\nBest regards,\nMuraAI Team")


def send_interview_scheduled_email(to_email: str, candidate_name: str, job_title: str, round_name: str) -> None:
    _send(to_email, f"Interview Scheduled — {candidate_name}",
          f"Hi,\n\nAn interview has been scheduled for {candidate_name} ({job_title}).\n\n"
          f"Round: {round_name}\n\nBest regards,\nMuraAI Team")


def send_interview_reminder_email(to_email: str, candidate_name: str, job_title: str, interview_date: str) -> None:
    _send(to_email, f"Interview Reminder — {candidate_name}",
          f"Hi,\n\nThis is a reminder that {candidate_name} has an upcoming interview for {job_title}.\n\n"
          f"Scheduled: {interview_date}\n\nBest regards,\nMuraAI Team")


def send_offer_email(to_email: str, candidate_name: str, job_title: str) -> None:
    _send(to_email, f"Offer Extended — {candidate_name}",
          f"Hi,\n\nAn offer has been extended to {candidate_name} for the {job_title} position.\n\nBest regards,\nMuraAI Team")


def send_rejection_email(to_email: str, candidate_name: str, job_title: str) -> None:
    _send(to_email, f"Referral Update — {candidate_name}",
          f"Hi,\n\nUnfortunately, {candidate_name}'s application for {job_title} was not successful this time.\n\n"
          f"Thank you for the referral.\n\nBest regards,\nMuraAI Team")


def send_joining_confirmation_email(to_email: str, candidate_name: str, job_title: str, joining_date: str = "") -> None:
    _send(to_email, f"Joining Confirmation — {candidate_name}",
          f"Hi,\n\n{candidate_name} has officially joined the team for the {job_title} position."
          + (f"\n\nJoining Date: {joining_date}" if joining_date else "") +
          f"\n\nBest regards,\nMuraAI Team")


def send_bonus_credited_email(to_email: str, referrer_name: str, amount: int, candidate_name: str) -> None:
    _send(to_email, f"Referral Bonus Credited — ₹{amount:,}",
          f"Hi {referrer_name},\n\nCongratulations! A referral bonus of ₹{amount:,} has been credited "
          f"for the successful referral of {candidate_name}.\n\nThank you for your contribution!\n\nBest regards,\nMuraAI Team")


def send_interview_reschedule_email(to_email: str, candidate_name: str, job_title: str,
                                      new_date: str, new_time: str, round_name: str) -> None:
    _send(to_email, f"Interview Rescheduled — {candidate_name}",
          f"Hi,\n\nThe interview for {candidate_name} ({job_title}) has been rescheduled.\n\n"
          f"Round: {round_name}\nNew Date: {new_date}\nNew Time: {new_time}\n\n"
          f"Best regards,\nMuraAI Team")


def send_selection_email(to_email: str, candidate_name: str, job_title: str) -> None:
    _send(to_email, f"Congratulations! You've been selected — {candidate_name}",
          f"Hi {candidate_name},\n\n"
          f"We're pleased to inform you that you've been selected for the {job_title} position.\n\n"
          f"Our HR team will be in touch with the formal offer letter shortly.\n\n"
          f"Best regards,\nMuraAI Team")


def send_joining_instructions_email(to_email: str, candidate_name: str, job_title: str,
                                     joining_date: str = "", details: str = "") -> None:
    _send(to_email, f"Joining Instructions — {candidate_name}",
          f"Hi {candidate_name},\n\n"
          f"Welcome to MuraAI! We're excited to have you join us as {job_title}.\n\n"
          + (f"Joining Date: {joining_date}\n" if joining_date else "")
          + (f"\n{details}" if details else "")
          + f"\n\nPlease bring the following documents on your first day:\n"
          f"- Government-issued ID\n- Educational certificates\n- Previous employment documents\n"
          f"- Passport-size photographs\n\n"
          f"Best regards,\nMuraAI Team")


def send_teams_meeting_email(to_email: str, candidate_name: str, job_title: str,
                              interview_date: str, interview_time: str, meeting_link: str,
                              interviewer: str) -> None:
    _send(to_email, f"Interview Invitation — {candidate_name}",
          f"Hi {candidate_name},\n\n"
          f"You have been invited for an interview for the {job_title} position.\n\n"
          f"Date: {interview_date}\n"
          f"Time: {interview_time}\n"
          f"Interviewer: {interviewer}\n"
          f"Meeting Link: {meeting_link}\n\n"
          f"Please join the meeting 5 minutes before the scheduled time.\n\n"
          f"Best regards,\nMuraAI Team")


def send_interviewer_invite_email(to_email: str, candidate_name: str, job_title: str,
                                    interview_date: str, interview_time: str, meeting_link: str,
                                    round_name: str) -> None:
    _send(to_email, f"Interview Assignment — {candidate_name}",
          f"Hi,\n\n"
          f"You have been assigned to conduct an interview.\n\n"
          f"Candidate: {candidate_name}\n"
          f"Position: {job_title}\n"
          f"Round: {round_name}\n"
          f"Date: {interview_date}\n"
          f"Time: {interview_time}\n"
          f"Meeting Link: {meeting_link}\n\n"
          f"Please review the candidate's resume and be prepared.\n\n"
          f"Best regards,\nMuraAI Team")


def send_interview_invitation_email(to_email: str, candidate_name: str, job_title: str,
                                     interview_date: str, interview_time: str,
                                     meeting_info: str, notes: str = "") -> None:
    body = (
        f"Dear {candidate_name},\n\n"
        f"You have been invited for an interview for the {job_title} position.\n\n"
        f"Interview Details:\n"
        f"  Date: {interview_date}\n"
        f"  Time: {interview_time}\n"
    )
    if meeting_info:
        body += f"  {meeting_info}\n"
    if notes:
        body += f"\nAdditional Notes:\n{notes}\n"
    body += (
        f"\nPlease ensure you are available at the scheduled time. "
        f"If you need to reschedule, please contact us as soon as possible.\n\n"
        f"We look forward to speaking with you.\n\n"
        f"Best regards,\nMuraAI HR Team"
    )
    _send(to_email, f"Interview Invitation — {job_title} at MuraAI", body)


def send_email_direct(to_emails: list, cc_emails: list, bcc_emails: list,
                      subject: str, body: str, from_name: str = "") -> dict:
    """Send a custom email to multiple recipients with CC/BCC support."""
    cfg = _get_smtp_config()
    if not cfg["host"]:
        logger.warning("SMTP not configured — email NOT sent. Subject: %s", subject)
        return {"sent": 0, "failed": len(to_emails), "message": "SMTP is not configured. Please ask your admin to set up SMTP in Admin > Settings before sending emails."}

    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText as MimeText

    all_recipients = list(to_emails) + list(cc_emails) + list(bcc_emails)
    if not all_recipients:
        return {"sent": 0, "failed": 0, "message": "No recipients provided. Please enter at least one email address in the To field."}

    msg = MIMEMultipart()
    msg["Subject"] = subject
    msg["From"] = from_name or cfg["from_addr"]
    msg["To"] = ", ".join(to_emails)
    if cc_emails:
        msg["Cc"] = ", ".join(cc_emails)
    msg.attach(MimeText(body, "html"))

    sent = 0
    failed = 0
    try:
        with smtplib.SMTP(cfg["host"], cfg["port"], timeout=15) as server:
            if cfg["use_tls"]:
                server.starttls()
            if cfg["user"] and cfg["password"]:
                server.login(cfg["user"], cfg["password"])
            server.sendmail(cfg["from_addr"], all_recipients, msg.as_string())
            sent = len(all_recipients)
    except Exception as e:
        logger.exception("Failed to send email: %s", e)
        failed = len(all_recipients)

    if failed and sent == 0:
        return {"sent": 0, "failed": failed, "message": f"Failed to send email — SMTP connection error. Check SMTP settings in Admin > Settings."}
    return {"sent": sent, "failed": failed, "message": f"Sent to {sent} recipient(s)" + (f", {failed} failed" if failed else "")}
