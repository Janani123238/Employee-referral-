import os
import uuid
import logging

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import Response

from ..auth import get_current_user
from .. import resume_parser
from ..database import SessionLocal
from .. import models

logger = logging.getLogger("resumes")

router = APIRouter(prefix="/api/resumes", tags=["resumes"])

MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg", ".webp", ".txt"}


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...), user=Depends(get_current_user)):
    original_name = file.filename or "resume"
    ext = os.path.splitext(original_name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=422, detail="Uploaded file is empty")
    if len(file_bytes) > MAX_FILE_BYTES:
        raise HTTPException(status_code=422, detail="File too large — max 10 MB")

    try:
        extracted_text = resume_parser.extract_text(original_name, file_bytes)
    except resume_parser.ResumeParseError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected resume extraction failure for %s", original_name)
        raise HTTPException(status_code=500, detail="Failed to process the resume file. Please try again.")

    file_id = f"res_{uuid.uuid4().hex[:10]}"
    db = SessionLocal()
    try:
        db.add(models.ResumeFile(
            id=file_id,
            file_name=original_name,
            file_type=ext,
            file_data=file_bytes,
        ))
        db.commit()
    finally:
        db.close()

    return {
        "fileId": file_id,
        "fileName": original_name,
        "fileUrl": f"/api/resumes/file/{file_id}",
        "extractedText": extracted_text,
        "charCount": len(extracted_text),
    }


@router.get("/file/{file_id}")
def get_resume_file(file_id: str, user=Depends(get_current_user)):
    db = SessionLocal()
    try:
        rf = db.query(models.ResumeFile).filter(models.ResumeFile.id == file_id).first()
        if not rf:
            raise HTTPException(status_code=404, detail="Resume file not found")
        media_type = _mime_type(rf.file_type)
        return Response(content=rf.file_data, media_type=media_type)
    finally:
        db.close()


def _mime_type(ext: str) -> str:
    return {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".doc": "application/msword",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".txt": "text/plain",
    }.get(ext, "application/octet-stream")
