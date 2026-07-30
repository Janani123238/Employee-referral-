from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas
from ..auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    validate_password_strength,
    generate_password_reset_token,
    consume_password_reset_token,
)
from .. import email_service
from ..config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


def user_public(user: models.User):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "employeeId": user.employee_id,
    }


@router.post("/sso")
def sso_login(payload: schemas.SSOIn, db: Session = Depends(get_db)):
    """SSO placeholder — validates provider name and returns a stub response.
    In production, this would validate the SSO token against the IdP."""
    providers = ["saml", "oidc", "azure-ad", "okta", "google"]
    if payload.provider not in providers:
        raise HTTPException(status_code=400, detail=f"Unsupported SSO provider. Supported: {', '.join(providers)}")
    return {
        "ok": False,
        "message": f"SSO with {payload.provider} is configured but not yet active. Contact your administrator.",
        "provider": payload.provider,
    }


@router.post("/login", response_model=schemas.TokenOut)
def login(payload: schemas.LoginIn, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been deactivated")
    token = create_access_token({"sub": user.id})
    return {"access_token": token, "user": user_public(user)}


@router.get("/me")
def me(user: models.User = Depends(get_current_user)):
    return user_public(user)


@router.post("/forgot-password")
def forgot_password(payload: schemas.ForgotPasswordIn, db: Session = Depends(get_db)):
    """Always returns the same generic message whether or not the email exists —
    prevents account enumeration via response differences."""
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if user and user.is_active:
        raw_token = generate_password_reset_token(db, user)
        reset_link = f"{settings.FRONTEND_URL.rstrip('/')}/?reset_token={raw_token}"
        email_service.send_password_reset_email(user.email, reset_link)
    return {"message": "If an account exists for that email, a password reset link has been sent."}


@router.post("/reset-password")
def reset_password(payload: schemas.ResetPasswordIn, db: Session = Depends(get_db)):
    validate_password_strength(payload.newPassword)
    user = consume_password_reset_token(db, payload.token)
    user.password_hash = hash_password(payload.newPassword)
    db.commit()
    return {"message": "Password updated. You can now sign in with your new password."}
