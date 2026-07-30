from sqlalchemy.orm import Session
from . import models
from .auth import hash_password
from .config import settings


def _ensure_user(db: Session, name: str, email: str, password: str, role: str):
    existing = db.query(models.User).filter(models.User.email == email).first()
    if not existing:
        emp = models.Employee(name=name, dept="General", email=email)
        db.add(emp)
        db.flush()
        db.add(models.User(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role=role,
            employee_id=emp.id,
        ))
        db.commit()
    else:
        if existing.password_hash != hash_password(password):
            existing.password_hash = hash_password(password)
        if existing.role != role:
            existing.role = role
        db.commit()


def _ensure_jobs(db: Session):
    if db.query(models.Job).count() > 0:
        return
    sample_jobs = [
        {"title": "Senior Software Engineer", "dept": "Engineering", "category": "Engineering",
         "exp": "5-8 years", "location": "Bangalore", "salary": "25-35 LPA", "bonus": 15000,
         "skills": ["Python", "FastAPI", "React", "PostgreSQL"],
         "description": "Build scalable backend services and APIs for our recruitment platform."},
        {"title": "Product Manager", "dept": "Product", "category": "Product",
         "exp": "4-7 years", "location": "Remote", "salary": "20-30 LPA", "bonus": 12000,
         "skills": ["Product Strategy", "Agile", "Data Analysis", "Stakeholder Management"],
         "description": "Drive product roadmap and execution for our HR-tech platform."},
        {"title": "UI/UX Designer", "dept": "Design", "category": "Design",
         "exp": "3-5 years", "location": "Hyderabad", "salary": "15-22 LPA", "bonus": 10000,
         "skills": ["Figma", "User Research", "Prototyping", "CSS"],
         "description": "Design intuitive user experiences for enterprise recruitment tools."},
    ]
    for j in sample_jobs:
        db.add(models.Job(**j, status="Open"))
    db.commit()


def bootstrap(db: Session):
    """Runs on every startup. Creates only what a real deployment actually
    needs to function — never any fake candidates, jobs, or employees.
    """
    if db.query(models.AppSettings).count() == 0:
        db.add(models.AppSettings(id=1))

    if db.query(models.ReferralPolicy).count() == 0:
        db.add(models.ReferralPolicy(id=1))

    db.commit()

    if settings.BOOTSTRAP_ADMIN_EMAIL and settings.BOOTSTRAP_ADMIN_PASSWORD:
        existing = db.query(models.User).filter(
            models.User.email == settings.BOOTSTRAP_ADMIN_EMAIL
        ).first()
        if not existing:
            emp = models.Employee(
                name=settings.BOOTSTRAP_ADMIN_NAME or "Admin",
                dept="Management",
                email=settings.BOOTSTRAP_ADMIN_EMAIL,
            )
            db.add(emp)
            db.flush()
            db.add(models.User(
                name=settings.BOOTSTRAP_ADMIN_NAME or "Admin",
                email=settings.BOOTSTRAP_ADMIN_EMAIL,
                password_hash=hash_password(settings.BOOTSTRAP_ADMIN_PASSWORD),
                role="admin",
                employee_id=emp.id,
            ))
            db.commit()
        else:
            existing.name = settings.BOOTSTRAP_ADMIN_NAME or existing.name or "Admin"
            existing.role = "admin"
            existing.password_hash = hash_password(settings.BOOTSTRAP_ADMIN_PASSWORD)
            if not existing.employee_id:
                emp = models.Employee(
                    name=existing.name,
                    dept="Management",
                    email=existing.email,
                )
                db.add(emp)
                db.flush()
                existing.employee_id = emp.id
            db.commit()

    _ensure_user(db, "HR Manager", "hr@muraai.com", "Test1234!", "hr")
    _ensure_user(db, "HR Manager", "hrmanager@muraai.com", "Test1234!", "hr_manager")
    _ensure_user(db, "VP Engineering", "vp@muraai.com", "Test1234!", "vp")
    _ensure_user(db, "CTO", "cto@muraai.com", "Test1234!", "cto")
    _ensure_user(db, "CEO", "ceo@muraai.com", "Test1234!", "ceo")
    _ensure_user(db, "System Admin", "sysadmin@muraai.com", "Test1234!", "system_admin")
    _ensure_user(db, "Test Employee", "test@muraai.com", "Test1234!", "employee")
    _ensure_user(db, "Test Manager", "manager@muraai.com", "Test1234!", "manager")

    _ensure_jobs(db)
