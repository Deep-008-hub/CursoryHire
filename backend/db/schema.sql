-- ================================================================
-- CursoryHire Database Schema
-- Paste this in Supabase SQL Editor and click Run
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── USERS (both HR and Candidates) ──────────────────────────
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255) UNIQUE,
    phone         VARCHAR(20)  UNIQUE,
    full_name     VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('hr', 'candidate')),
    avatar_url    TEXT,
    is_verified   BOOLEAN DEFAULT FALSE,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── OTP CODES ────────────────────────────────────────────────
CREATE TABLE otp_codes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier  VARCHAR(255) NOT NULL,  -- email or phone
    code        VARCHAR(6)   NOT NULL,
    purpose     VARCHAR(50)  NOT NULL,  -- 'register' or 'login'
    expires_at  TIMESTAMPTZ  NOT NULL,
    used        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── HR PROFILES ──────────────────────────────────────────────
CREATE TABLE hr_profiles (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    designation  VARCHAR(255),
    industry     VARCHAR(100),
    company_size VARCHAR(50),
    website      TEXT,
    linkedin     TEXT,
    bio          TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── CANDIDATE PROFILES ───────────────────────────────────────
CREATE TABLE candidate_profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    headline        VARCHAR(255),
    summary         TEXT,
    skills          TEXT[],
    experience_years INTEGER DEFAULT 0,
    current_company VARCHAR(255),
    current_position    VARCHAR(255),
    location        VARCHAR(255),
    linkedin        TEXT,
    github          TEXT,
    portfolio       TEXT,
    resume_url      TEXT,
    resume_text     TEXT,
    education       JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── JOB POSTINGS ─────────────────────────────────────────────
CREATE TABLE jobs (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hr_user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title             VARCHAR(255) NOT NULL,
    department        VARCHAR(100),
    location          VARCHAR(255),
    job_type          VARCHAR(50) DEFAULT 'Full-time',
    experience_min    INTEGER DEFAULT 0,
    experience_max    INTEGER DEFAULT 10,
    education_required VARCHAR(100),
    skills_required   TEXT[],
    description       TEXT,
    responsibilities  TEXT,
    benefits          TEXT,
    salary_min        INTEGER,
    salary_max        INTEGER,
    salary_currency   VARCHAR(10) DEFAULT 'INR',
    status            VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','closed','draft')),
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── SCREENING SESSIONS ───────────────────────────────────────
CREATE TABLE screening_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hr_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id          UUID REFERENCES jobs(id) ON DELETE SET NULL,
    job_title       VARCHAR(255) NOT NULL,
    job_description TEXT NOT NULL,
    status          VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing','completed','failed')),
    total_resumes   INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- ── SCREENING RESULTS (per candidate per session) ────────────
CREATE TABLE screening_results (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id           UUID NOT NULL REFERENCES screening_sessions(id) ON DELETE CASCADE,
    hr_user_id           UUID NOT NULL REFERENCES users(id),
    candidate_name       VARCHAR(255),
    candidate_email      VARCHAR(255),
    filename             VARCHAR(255),
    resume_text          TEXT,
    rank                 INTEGER,
    overall_score        INTEGER DEFAULT 0,
    grade                VARCHAR(5),
    recommendation       VARCHAR(50),
    executive_summary    TEXT,
    scores               JSONB DEFAULT '{}',
    matched_skills       TEXT[],
    missing_skills       TEXT[],
    bonus_skills         TEXT[],
    strengths            TEXT[],
    weaknesses           TEXT[],
    red_flags            TEXT[],
    interview_questions  TEXT[],
    raw_gemini_response  JSONB DEFAULT '{}',
    invited              BOOLEAN DEFAULT FALSE,
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── APPLICATIONS ─────────────────────────────────────────────
CREATE TABLE applications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hr_user_id      UUID NOT NULL REFERENCES users(id),
    status          VARCHAR(30) DEFAULT 'applied'
                    CHECK (status IN ('applied','screening','shortlisted','interview_scheduled','offered','rejected','withdrawn')),
    ai_score        INTEGER,
    ai_rank         INTEGER,
    cover_letter    TEXT,
    resume_url      TEXT,
    applied_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, candidate_id)
);

-- ── INVITATIONS ──────────────────────────────────────────────
CREATE TABLE invitations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screening_result_id UUID REFERENCES screening_results(id) ON DELETE SET NULL,
    job_id              UUID REFERENCES jobs(id) ON DELETE SET NULL,
    hr_user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    candidate_email     VARCHAR(255) NOT NULL,
    candidate_name      VARCHAR(255),
    candidate_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    job_title           VARCHAR(255) NOT NULL,
    company_name        VARCHAR(255),
    message             TEXT,
    status              VARCHAR(20) DEFAULT 'pending'
                        CHECK (status IN ('pending','accepted','declined','expired')),
    interview_date      TIMESTAMPTZ,
    interview_type      VARCHAR(30) DEFAULT 'video'
                        CHECK (interview_type IN ('video','in_person','phone')),
    meet_link           TEXT,
    responded_at        TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── NOTIFICATIONS ────────────────────────────────────────────
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,
    title       VARCHAR(255) NOT NULL,
    message     TEXT,
    data        JSONB DEFAULT '{}',
    read        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── INTERVIEWS ───────────────────────────────────────────────
CREATE TABLE interviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitation_id   UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
    job_id          UUID REFERENCES jobs(id),
    hr_user_id      UUID NOT NULL REFERENCES users(id),
    candidate_id    UUID REFERENCES users(id),
    scheduled_at    TIMESTAMPTZ NOT NULL,
    duration_mins   INTEGER DEFAULT 60,
    status          VARCHAR(20) DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','in_progress','completed','cancelled','no_show')),
    room_id         VARCHAR(255) UNIQUE,
    notes           TEXT,
    feedback        TEXT,
    rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX idx_users_email        ON users(email);
CREATE INDEX idx_users_phone        ON users(phone);
CREATE INDEX idx_users_role         ON users(role);
CREATE INDEX idx_jobs_hr            ON jobs(hr_user_id);
CREATE INDEX idx_jobs_status        ON jobs(status);
CREATE INDEX idx_screening_hr       ON screening_sessions(hr_user_id);
CREATE INDEX idx_results_session    ON screening_results(session_id);
CREATE INDEX idx_results_rank       ON screening_results(rank);
CREATE INDEX idx_invitations_hr     ON invitations(hr_user_id);
CREATE INDEX idx_invitations_email  ON invitations(candidate_email);
CREATE INDEX idx_invitations_cand   ON invitations(candidate_user_id);
CREATE INDEX idx_applications_job   ON applications(job_id);
CREATE INDEX idx_applications_cand  ON applications(candidate_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_otp_identifier     ON otp_codes(identifier);

-- ── UPDATED AT TRIGGER ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_jobs_updated     BEFORE UPDATE ON jobs     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_hr_updated       BEFORE UPDATE ON hr_profiles       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_cand_updated     BEFORE UPDATE ON candidate_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_apps_updated     BEFORE UPDATE ON applications       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
