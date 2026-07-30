from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models
from ..schemas import SettingsIn
from ..auth import get_current_user, require_hr, require_admin
from .. import resume_parser

router = APIRouter(prefix="/api/settings", tags=["settings"])


def serialize(s: models.AppSettings):
    return {
        "resumeParsing": s.resume_parsing,
        "duplicateDetection": s.duplicate_detection,
        "fraudDetection": s.fraud_detection,
        "interviewPrediction": s.interview_prediction,
        "chatAssistant": s.chat_assistant,
        "aiProvider": s.ai_provider,
        "aiModel": s.ai_model,
        "aiApiKey": s.ai_api_key,
        "aiTemperature": s.ai_temperature,
        "aiMaxTokens": s.ai_max_tokens,
        "ocrEnabled": s.ocr_enabled,
        "ocrLanguage": s.ocr_language,
        "smtpHost": s.smtp_host,
        "smtpPort": s.smtp_port,
        "smtpUser": s.smtp_user,
        "smtpPassword": s.smtp_password,
        "smtpFrom": s.smtp_from,
        "smtpUseTls": s.smtp_use_tls,
    }


@router.get("")
def get_settings(db: Session = Depends(get_db), user=Depends(get_current_user)):
    s = db.query(models.AppSettings).first()
    return serialize(s)


@router.put("")
def update_settings(payload: SettingsIn, db: Session = Depends(get_db), user=Depends(require_hr)):
    """HR can toggle AI feature flags. Admin-only fields (AI provider, SMTP) are
    only updated when the caller is an admin."""
    s = db.query(models.AppSettings).first()
    if payload.resumeParsing is not None:
        s.resume_parsing = payload.resumeParsing
    if payload.duplicateDetection is not None:
        s.duplicate_detection = payload.duplicateDetection
    if payload.fraudDetection is not None:
        s.fraud_detection = payload.fraudDetection
    if payload.interviewPrediction is not None:
        s.interview_prediction = payload.interviewPrediction
    if payload.chatAssistant is not None:
        s.chat_assistant = payload.chatAssistant
    # Admin-only: AI provider config and SMTP
    if user.role == "admin":
        if payload.aiProvider is not None:
            s.ai_provider = payload.aiProvider
        if payload.aiModel is not None:
            s.ai_model = payload.aiModel
        if payload.aiApiKey is not None:
            s.ai_api_key = payload.aiApiKey
        if payload.aiTemperature is not None:
            s.ai_temperature = payload.aiTemperature
        if payload.aiMaxTokens is not None:
            s.ai_max_tokens = payload.aiMaxTokens
        if payload.smtpHost is not None:
            s.smtp_host = payload.smtpHost
        if payload.smtpPort is not None:
            s.smtp_port = payload.smtpPort
        if payload.smtpUser is not None:
            s.smtp_user = payload.smtpUser
        if payload.smtpPassword is not None:
            s.smtp_password = payload.smtpPassword
        if payload.smtpFrom is not None:
            s.smtp_from = payload.smtpFrom
        if payload.smtpUseTls is not None:
            s.smtp_use_tls = payload.smtpUseTls
    if payload.ocrEnabled is not None:
        s.ocr_enabled = payload.ocrEnabled
    if payload.ocrLanguage is not None:
        s.ocr_language = payload.ocrLanguage
    db.commit()
    db.refresh(s)
    # Sync OCR language to the parser module
    resume_parser.set_ocr_language(s.ocr_language)
    return serialize(s)
