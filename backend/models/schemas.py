from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
import re

# ── Auth ─────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    full_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: str  # 'hr' or 'candidate'

    @field_validator('role')
    @classmethod
    def role_must_be_valid(cls, v):
        if v not in ('hr', 'candidate'):
            raise ValueError('Role must be hr or candidate')
        return v

    @field_validator('phone')
    @classmethod
    def phone_format(cls, v):
        if v and not re.match(r'^\+?[1-9]\d{7,14}$', v):
            raise ValueError('Invalid phone number')
        return v

class SendOTPRequest(BaseModel):
    identifier: str   # email or phone
    purpose: str      # 'register' or 'login'
    method: str       # 'email' or 'sms'

class VerifyOTPRequest(BaseModel):
    identifier: str
    code:       str
    purpose:    str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    full_name: str
    is_new_user: bool = False

# ── User ─────────────────────────────────────────────────────
class UserOut(BaseModel):
    id: str
    email: Optional[str]
    phone: Optional[str]
    full_name: str
    role: str
    avatar_url: Optional[str]
    is_verified: bool
    created_at: datetime

class HRProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    designation: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    website: Optional[str] = None
    linkedin: Optional[str] = None
    bio: Optional[str] = None

class CandidateProfileUpdate(BaseModel):
    headline: Optional[str] = None
    summary: Optional[str] = None
    skills: Optional[List[str]] = None
    experience_years: Optional[int] = None
    current_company: Optional[str] = None
    current_role: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None

# ── Jobs ─────────────────────────────────────────────────────
class JobCreate(BaseModel):
    title: str
    department: Optional[str] = None
    location: Optional[str] = None
    job_type: str = "Full-time"
    experience_min: int = 0
    experience_max: int = 10
    education_required: Optional[str] = None
    skills_required: List[str] = []
    description: Optional[str] = None
    responsibilities: Optional[str] = None
    benefits: Optional[str] = None
    salary_min: Optional[str] = None
    salary_max: Optional[str] = None
    salary_currency: str = "INR"
    application_deadline: Optional[datetime] = None

class JobOut(JobCreate):
    id: str
    hr_user_id: str
    status: str
    created_at: datetime

# ── Screening ─────────────────────────────────────────────────
class ScreeningResultOut(BaseModel):
    id: str
    session_id: str
    candidate_name: Optional[str]
    candidate_email: Optional[str]
    filename: str
    rank: Optional[int]
    overall_score: int
    grade: Optional[str]
    recommendation: Optional[str]
    executive_summary: Optional[str]
    scores: dict
    matched_skills: List[str]
    missing_skills: List[str]
    bonus_skills: List[str]
    strengths: List[str]
    weaknesses: List[str]
    red_flags: List[str]
    interview_questions: List[str]
    invited: bool
    created_at: datetime

class ScreeningSessionOut(BaseModel):
    id: str
    job_title: str
    status: str
    total_resumes: int
    created_at: datetime
    results: List[ScreeningResultOut] = []

# ── Invitations ───────────────────────────────────────────────
class InvitationCreate(BaseModel):
    screening_result_id: Optional[str] = None
    candidate_email: str
    candidate_name: str
    job_title: str
    job_id: Optional[str] = None
    message: Optional[str] = None
    interview_date: Optional[datetime] = None
    interview_type: str = "video"

class InvitationRespond(BaseModel):
    status: str   # 'accepted' or 'declined'

class InvitationOut(BaseModel):
    id: str
    job_title: str
    company_name: Optional[str]
    candidate_name: Optional[str]
    candidate_email: str
    status: str
    message: Optional[str]
    interview_date: Optional[datetime]
    interview_type: str
    meet_link: Optional[str]
    created_at: datetime
    expires_at: Optional[datetime]
