import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey, LargeBinary
from sqlalchemy.orm import relationship
from .database import Base


def gen_id(prefix):
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


class Employee(Base):
    __tablename__ = "employees"
    id = Column(String, primary_key=True, default=lambda: gen_id("emp"))
    name = Column(String, nullable=False)
    dept = Column(String, default="")
    designation = Column(String, default="")
    email = Column(String, unique=True, nullable=False)
    color = Column(String, default="#8B5CF6")
    joined = Column(String, default="")
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="employee", uselist=False)
    referrals = relationship("Referral", back_populates="referrer")


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: gen_id("usr"))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="employee")  # 'employee' | 'manager' | 'hr' | 'hr_manager' | 'vp' | 'cto' | 'ceo' | 'system_admin'
    employee_id = Column(String, ForeignKey("employees.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="user")


class Job(Base):
    __tablename__ = "jobs"
    id = Column(String, primary_key=True, default=lambda: gen_id("job"))
    title = Column(String, nullable=False)
    dept = Column(String, default="")
    category = Column(String, default="General")
    exp = Column(String, default="")
    location = Column(String, default="")
    salary = Column(String, default="")
    bonus = Column(Integer, default=0)
    skills = Column(JSON, default=list)
    status = Column(String, default="Open")
    description = Column(Text, default="")
    posted = Column(DateTime, default=datetime.utcnow)

    referrals = relationship("Referral", back_populates="job")


class Referral(Base):
    __tablename__ = "referrals"
    id = Column(String, primary_key=True, default=lambda: gen_id("ref"))
    candidate_name = Column(String, nullable=False)
    phone = Column(String, default="")
    email = Column(String, default="")
    resume_text = Column(Text, default="")
    resume_file_url = Column(String, default="")
    resume_file_name = Column(String, default="")
    linkedin = Column(String, default="")
    github = Column(String, default="")
    portfolio = Column(String, default="")
    location = Column(String, default="")
    expected_salary = Column(String, default="")
    notice_period = Column(String, default="")
    current_company = Column(String, default="")
    current_designation = Column(String, default="")
    total_experience = Column(String, default="")
    relevant_experience = Column(String, default="")
    skills = Column(JSON, default=list)
    education = Column(String, default="")
    certifications = Column(JSON, default=list)
    projects = Column(JSON, default=list)
    relationship_to_referrer = Column(String, default="")
    referred_by = Column(String, ForeignKey("employees.id"))
    job_id = Column(String, ForeignKey("jobs.id"))
    status = Column(String, default="Applied")
    submitted_date = Column(DateTime, default=datetime.utcnow)

    ai_summary = Column(Text, default="")
    ai_score = Column(JSON, default=dict)
    match_percent = Column(Integer, default=0)
    ats_score = Column(Integer, default=0)
    missing_skills = Column(JSON, default=list)
    tags = Column(JSON, default=list)
    fraud_flags = Column(JSON, default=list)
    interview_prediction = Column(JSON, default=dict)
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    recommendation = Column(String, default="")
    rank_label = Column(String, default="")  # Top Candidate | Medium | Low

    referrer = relationship("Employee", back_populates="referrals")
    job = relationship("Job", back_populates="referrals")
    interviews = relationship("Interview", back_populates="referral")
    activity_logs = relationship("ActivityLog", back_populates="referral")


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, default=lambda: gen_id("not"))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String, default="info")  # info | success | warning | error
    category = Column(String, default="general")  # referral | interview | offer | bonus | system
    is_read = Column(Boolean, default=False)
    link = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class ReferralPolicy(Base):
    __tablename__ = "referral_policy"
    id = Column(Integer, primary_key=True, default=1)
    content = Column(Text, default=(
        "MuraAI Employee Referral Policy\n\n"
        "1. Eligibility: All full-time employees who have completed their probation period are eligible to refer candidates.\n\n"
        "2. Referral Bonus: ₹50,000 per successful referral. Bonus is paid 30 days after the candidate joins and completes probation confirmation.\n\n"
        "3. Duplicate Referrals: Only the first referral for a candidate within 90 days is eligible for bonus.\n\n"
        "4. Process: Submit referral through the portal. HR will review and schedule interviews within 5 business days.\n\n"
        "5. Maximum Referrals: No cap on the number of referrals per employee per quarter.\n\n"
        "6. Eligible Roles: Referrals are accepted for all open positions listed on the portal.\n\n"
        "7. Payment: Bonus is credited via payroll in the month following the 30-day confirmation period."
    ))
    updated_at = Column(DateTime, default=datetime.utcnow)
    updated_by = Column(String, default="")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=lambda: gen_id("aud"))
    user_id = Column(String, nullable=True)
    user_name = Column(String, default="")
    user_role = Column(String, default="")
    action = Column(String, nullable=False)
    target = Column(String, default="")
    target_id = Column(String, default="")
    details = Column(Text, default="")
    ip_address = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id = Column(String, primary_key=True, default=lambda: gen_id("prt"))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    token_hash = Column(String, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class AppSettings(Base):
    __tablename__ = "app_settings"
    id = Column(Integer, primary_key=True, default=1)
    resume_parsing = Column(Boolean, default=True)
    duplicate_detection = Column(Boolean, default=True)
    fraud_detection = Column(Boolean, default=True)
    interview_prediction = Column(Boolean, default=True)
    chat_assistant = Column(Boolean, default=True)
    ai_provider = Column(String, default="ollama")
    ai_model = Column(String, default="llama3.2")
    ai_api_key = Column(String, default="")
    ai_temperature = Column(Float, default=0.2)
    ai_max_tokens = Column(Integer, default=1000)
    ocr_enabled = Column(Boolean, default=True)
    ocr_language = Column(String, default="eng")
    smtp_host = Column(String, default="")
    smtp_port = Column(Integer, default=587)
    smtp_user = Column(String, default="")
    smtp_password = Column(String, default="")
    smtp_from = Column(String, default="MuraAI Refer <no-reply@muraai.com>")
    smtp_use_tls = Column(Boolean, default=True)


class Interview(Base):
    __tablename__ = "interviews"
    id = Column(String, primary_key=True, default=lambda: gen_id("int"))
    referral_id = Column(String, ForeignKey("referrals.id"), nullable=False, index=True)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False)
    candidate_name = Column(String, nullable=False)
    round_name = Column(String, default="Technical Round")
    interview_type = Column(String, default="Online")  # Online | Offline | Phone
    interview_date = Column(String, default="")
    start_time = Column(String, default="")
    end_time = Column(String, default="")
    interviewer = Column(String, default="")
    meeting_link = Column(String, default="")
    location = Column(String, default="")
    notes = Column(Text, default="")
    status = Column(String, default="Scheduled")  # Scheduled | Completed | Cancelled | Rescheduled | Pending
    result = Column(String, default="")  # Pass | Hold | Reject
    feedback = Column(Text, default="")
    score = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    referral = relationship("Referral", back_populates="interviews")


class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(String, primary_key=True, default=lambda: gen_id("act"))
    referral_id = Column(String, ForeignKey("referrals.id"), nullable=False, index=True)
    action = Column(String, nullable=False)
    description = Column(Text, default="")
    performed_by = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    referral = relationship("Referral", back_populates="activity_logs")


class ResumeFile(Base):
    __tablename__ = "resume_files"
    id = Column(String, primary_key=True, default=lambda: gen_id("res"))
    file_name = Column(String, nullable=False)
    file_type = Column(String, default="")
    file_data = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class EmailTemplate(Base):
    __tablename__ = "email_templates"
    id = Column(String, primary_key=True, default=lambda: gen_id("tpl"))
    name = Column(String, nullable=False)
    template_key = Column(String, unique=True, nullable=False)
    subject = Column(String, default="")
    body = Column(Text, default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
