from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas
from ..auth import get_current_user, require_admin

router = APIRouter(prefix="/api/policy", tags=["policy"])


@router.get("")
def get_policy(db: Session = Depends(get_db), user=Depends(get_current_user)):
    p = db.query(models.ReferralPolicy).first()
    if not p:
        p = models.ReferralPolicy(id=1)
        db.add(p)
        db.commit()
        db.refresh(p)
    return {"content": p.content, "updatedAt": p.updated_at, "updatedBy": p.updated_by}


@router.put("")
def update_policy(payload: schemas.PolicyUpdateIn, db: Session = Depends(get_db),
                  user=Depends(require_admin)):
    p = db.query(models.ReferralPolicy).first()
    if not p:
        p = models.ReferralPolicy(id=1)
        db.add(p)
    p.content = payload.content
    p.updated_at = datetime.utcnow()
    p.updated_by = user.name
    db.commit()
    db.refresh(p)
    return {"content": p.content, "updatedAt": p.updated_at, "updatedBy": p.updated_by}
