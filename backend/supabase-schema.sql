-- ============================================================================
-- HEALTH TRACK: DEMENTIA CARE & MEDICATION MANAGEMENT DATABASE SCHEMA
-- PostgreSQL / Supabase Production Schema with Full Real-Time Calendar Support
-- ============================================================================

-- Drop views & tables in reverse dependency order for clean re-runs
DROP VIEW IF EXISTS today_patient_medications CASCADE;
DROP VIEW IF EXISTS patient_calendar_overview CASCADE;
DROP TABLE IF EXISTS daily_medication_calendar CASCADE;
DROP TABLE IF EXISTS medication_logs CASCADE;
DROP TABLE IF EXISTS medications CASCADE;
DROP TABLE IF EXISTS patient_vitals CASCADE;
DROP TABLE IF EXISTS patient_family_members CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS facilities CASCADE;
DROP TABLE IF EXISTS user_connections CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop Enums if they exist
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS med_status CASCADE;
DROP TYPE IF EXISTS alert_severity CASCADE;
DROP TYPE IF EXISTS plan_type CASCADE;

-- ============================================================================
-- 1. ENUMS & DOMAINS
-- ============================================================================
CREATE TYPE user_role AS ENUM ('patient', 'caregiver', 'doctor', 'admin');
CREATE TYPE med_status AS ENUM ('Taken', 'Skipped', 'Missed', 'Pending');
CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE plan_type AS ENUM ('one_time', 'day_by_day');

-- ============================================================================
-- 2. USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    role user_role NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    emergency_contact VARCHAR(255),
    pairing_code VARCHAR(50),
    patient_pairing_code VARCHAR(50),
    hospital VARCHAR(255),
    relationship VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. PATIENTS TABLE
-- Supports registered dementia patients and pre-enrolled clinical patients
-- ============================================================================
CREATE TABLE patients (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    pairing_code VARCHAR(50) UNIQUE,
    age INT,
    condition VARCHAR(255) DEFAULT 'Dementia (Moderate) • High Wander Risk',
    status VARCHAR(50) DEFAULT 'idle', -- 'online', 'idle', 'offline', 'wandering'
    battery_level INT DEFAULT 85,
    last_seen VARCHAR(50) DEFAULT 'Live Now',
    safe_zone_radius INT DEFAULT 500, -- meters
    latitude DECIMAL(10, 8) DEFAULT 6.9271,
    longitude DECIMAL(11, 8) DEFAULT 79.8612,
    is_pre_registered BOOLEAN DEFAULT FALSE,
    doctor_name VARCHAR(255) DEFAULT 'Dr. Sarah Jenkins',
    doctor_phone VARCHAR(50) DEFAULT '+1 555-0800',
    created_by_doctor_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 4. USER CONNECTIONS & CLINICAL PAIRING TABLE
-- Connects Doctors, Caregivers, and Patients via Pairing Codes
-- ============================================================================
CREATE TABLE user_connections (
    id VARCHAR(50) PRIMARY KEY,
    from_user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    from_email VARCHAR(255),
    from_name VARCHAR(255),
    from_role VARCHAR(50) DEFAULT 'doctor',
    to_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    to_room_code VARCHAR(50) NOT NULL,
    to_email VARCHAR(255),
    to_name VARCHAR(255),
    to_role VARCHAR(50) DEFAULT 'patient',
    status VARCHAR(50) DEFAULT 'approved',
    condition VARCHAR(255),
    age INT,
    emergency_phone VARCHAR(50),
    safe_zone_radius INT DEFAULT 500,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 5. MEDICATIONS & PRESCRIPTION PLANS TABLE
-- Supports:
--   a) 30-day recurring 1-Month medication routines with auto daily dispatch
--   b) Single-day specific date prescriptions (e.g., Oct 2, 2026)
--   c) Day-by-day status tracking via JSONB map or normalized calendar table
-- ============================================================================
CREATE TABLE medications (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    scheduled_time VARCHAR(50) NOT NULL,
    period VARCHAR(100) DEFAULT 'Morning with breakfast',
    duration_days INT DEFAULT 30,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    is_single_day BOOLEAN DEFAULT FALSE,
    specific_date DATE,
    instructions TEXT,
    prescribed_by VARCHAR(255) DEFAULT 'Dr. Sarah Jenkins',
    doctor_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    current_status med_status DEFAULT 'Pending',
    day_statuses JSONB DEFAULT '{}'::jsonb,
    skipped_dates TEXT[] DEFAULT ARRAY[]::TEXT[],
    day_overrides JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_medications_patient_id ON medications(patient_id);
CREATE INDEX idx_medications_dates ON medications(start_date, end_date);
CREATE INDEX idx_medications_specific_date ON medications(specific_date);

-- ============================================================================
-- 6. NORMALIZED DAILY MEDICATION CALENDAR TABLE
-- For day-by-day calendar queries, status updates, and compliance analytics
-- ============================================================================
CREATE TABLE daily_medication_calendar (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    medication_id VARCHAR(50) NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    schedule_date DATE NOT NULL,
    scheduled_time VARCHAR(50) NOT NULL,
    period VARCHAR(100),
    status med_status DEFAULT 'Pending',
    taken_at TIMESTAMP WITH TIME ZONE,
    response_type VARCHAR(50), -- 'patient_action', 'caregiver_action', 'timeout_autonomous'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_patient_med_date UNIQUE (patient_id, medication_id, schedule_date)
);

CREATE INDEX idx_cal_patient_date ON daily_medication_calendar(patient_id, schedule_date);
CREATE INDEX idx_cal_date ON daily_medication_calendar(schedule_date);

-- ============================================================================
-- 7. MEDICATION LOGS TABLE (AUDIT TRAIL & SAFETY MONITORING)
-- ============================================================================
CREATE TABLE medication_logs (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    medication_id VARCHAR(50) REFERENCES medications(id) ON DELETE SET NULL,
    reminder_id VARCHAR(100),
    medicine_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    scheduled_time VARCHAR(50),
    status VARCHAR(50) NOT NULL, -- 'taken', 'skipped', 'missed'
    response_type VARCHAR(50) DEFAULT 'patient_action',
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX idx_med_logs_patient ON medication_logs(patient_id, logged_at DESC);

-- ============================================================================
-- 8. PATIENT VITALS & CLINICAL AUDIT TELEMETRY
-- Live biometrics recorded by caregiver / clinical sensor
-- ============================================================================
CREATE TABLE patient_vitals (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    heart_rate INT,
    blood_pressure VARCHAR(20),
    blood_pressure_sys INT,
    blood_pressure_dia INT,
    spo2 INT,
    temperature NUMERIC(4,1),
    blood_glucose NUMERIC(5,1),
    status VARCHAR(50) DEFAULT 'Normal',
    status_color VARCHAR(20) DEFAULT '#10B981',
    recorded_by VARCHAR(255) DEFAULT 'Caregiver',
    caregiver_id VARCHAR(50),
    notes TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_vitals_patient_id ON patient_vitals(patient_id);
CREATE INDEX idx_vitals_recorded_at ON patient_vitals(recorded_at DESC);

-- ============================================================================
-- 9. PATIENT FAMILY MEMBERS (DEMENTIA MEMORY & PHOTO ALBUM)
-- ============================================================================
CREATE TABLE patient_family_members (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    emoji VARCHAR(10) DEFAULT '❤️',
    birthday DATE,
    phone VARCHAR(50) NOT NULL,
    whatsapp VARCHAR(50),
    photo TEXT,
    memory_notes TEXT,
    favorite_memory TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_family_patient_id ON patient_family_members(patient_id);

-- ============================================================================
-- 10. DAILY ACTIVITIES TABLE
-- ============================================================================
CREATE TABLE activities (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    scheduled_time VARCHAR(50) DEFAULT '09:00 AM',
    duration VARCHAR(50) DEFAULT '30 mins',
    category VARCHAR(100) DEFAULT 'Physical',
    is_completed BOOLEAN DEFAULT FALSE,
    caregiver_name VARCHAR(255) DEFAULT 'Caregiver',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activities_patient_id ON activities(patient_id);

-- ============================================================================
-- 11. EMERGENCY ALERTS & WANDERING GEOFENCE BREACHES
-- ============================================================================
CREATE TABLE alerts (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    alert_type VARCHAR(100) NOT NULL, -- 'SOS', 'GEOFENCE_BREACH', 'BATTERY', 'MISSED_MEDICATION'
    message TEXT NOT NULL,
    severity alert_severity DEFAULT 'medium',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_alerts_patient ON alerts(patient_id, created_at DESC);

-- ============================================================================
-- 12. FACILITIES TABLE (ADMIN DASHBOARD)
-- ============================================================================
CREATE TABLE facilities (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(100) NOT NULL,
    status_color VARCHAR(50) DEFAULT 'green',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 13. VIEWS & STORED FUNCTIONS
-- ============================================================================

-- View: Today's active doses automatically computed from 1-month plans & single-day doses
CREATE OR REPLACE VIEW today_patient_medications AS
SELECT 
    m.id,
    m.patient_id,
    p.name AS patient_name,
    p.pairing_code AS patient_room_code,
    m.name AS medicine_name,
    m.dosage,
    m.scheduled_time,
    m.period,
    m.instructions,
    m.prescribed_by,
    m.is_single_day,
    COALESCE(
        m.day_statuses->>CURRENT_DATE::text,
        m.current_status::text
    ) AS status_today,
    m.start_date,
    m.end_date
FROM medications m
JOIN patients p ON m.patient_id = p.id
WHERE m.is_active = TRUE
  AND (
    (m.is_single_day = TRUE AND m.specific_date = CURRENT_DATE)
    OR
    (m.is_single_day = FALSE AND CURRENT_DATE BETWEEN m.start_date AND m.end_date AND NOT (CURRENT_DATE::text = ANY(m.skipped_dates)))
  );

-- Function: Get medications for any given date
CREATE OR REPLACE FUNCTION get_patient_medications_for_date(
    p_patient_id VARCHAR,
    p_target_date DATE
)
RETURNS TABLE (
    id VARCHAR,
    patient_id VARCHAR,
    name VARCHAR,
    dosage VARCHAR,
    scheduled_time VARCHAR,
    period VARCHAR,
    instructions VARCHAR,
    prescribed_by VARCHAR,
    is_single_day BOOLEAN,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.patient_id,
        m.name,
        m.dosage,
        m.scheduled_time,
        m.period,
        m.instructions::VARCHAR,
        m.prescribed_by,
        m.is_single_day,
        COALESCE(m.day_statuses->>p_target_date::text, m.current_status::text) AS status
    FROM medications m
    WHERE m.patient_id = UPPER(p_patient_id)
      AND m.is_active = TRUE
      AND (
          (m.is_single_day = TRUE AND (m.specific_date = p_target_date OR m.start_date = p_target_date))
          OR
          (m.is_single_day = FALSE AND p_target_date BETWEEN m.start_date AND m.end_date AND NOT (p_target_date::text = ANY(m.skipped_dates)))
      );
END;
$$ LANGUAGE plpgsql;

-- View: Latest Vitals Per Patient (For Patient-by-Patient Telemetry Monitor)
CREATE OR REPLACE VIEW latest_patient_vitals AS
SELECT DISTINCT ON (v.patient_id)
    v.id,
    v.patient_id,
    p.name AS patient_name,
    p.condition AS patient_condition,
    p.age AS patient_age,
    v.heart_rate,
    v.blood_pressure,
    v.blood_pressure_sys,
    v.blood_pressure_dia,
    v.spo2,
    v.temperature,
    v.blood_glucose,
    v.status,
    v.status_color,
    v.notes,
    v.recorded_by,
    v.recorded_at
FROM patient_vitals v
JOIN patients p ON v.patient_id = p.id
ORDER BY v.patient_id, v.recorded_at DESC;

-- Function: Record Patient Vitals with Automated Clinical Range Analysis
CREATE OR REPLACE FUNCTION record_patient_vitals(
    p_patient_id VARCHAR,
    p_hr INT,
    p_bp VARCHAR,
    p_spo2 INT,
    p_temp NUMERIC,
    p_glucose NUMERIC,
    p_recorded_by VARCHAR DEFAULT 'Caregiver',
    p_notes TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
    v_id VARCHAR := 'vit-' || EXTRACT(EPOCH FROM NOW())::BIGINT;
    v_status VARCHAR := 'Normal';
    v_color VARCHAR := '#10B981';
BEGIN
    -- Clinical rule evaluation
    IF (p_hr > 100 OR p_hr < 55) OR (p_spo2 < 92) OR (p_temp >= 38.0) OR (p_glucose > 180 OR p_glucose < 70) THEN
        v_status := 'Abnormal';
        v_color := '#EF4444';
    ELSIF (p_spo2 < 95) OR (p_temp >= 37.5) OR (p_glucose > 140) THEN
        v_status := 'Elevated';
        v_color := '#F59E0B';
    END IF;

    INSERT INTO patient_vitals (
        id, patient_id, heart_rate, blood_pressure, spo2, temperature, blood_glucose,
        status, status_color, recorded_by, notes, recorded_at
    ) VALUES (
        v_id, UPPER(p_patient_id), p_hr, p_bp, p_spo2, p_temp, p_glucose,
        v_status, v_color, p_recorded_by, p_notes, NOW()
    );

    RETURN jsonb_build_object(
        'id', v_id,
        'patient_id', UPPER(p_patient_id),
        'status', v_status,
        'status_color', v_color,
        'recorded_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 14. SEED DATA (MOCK DATA FOR HEALTH APP)
-- Realistic clinical patients matching Chamudi Prabodhani & Eleanor Vance
-- ============================================================================

-- Seed Users
INSERT INTO users (id, role, name, email, password_hash, phone, emergency_contact, pairing_code, patient_pairing_code, hospital, relationship) VALUES
('pat-001', 'patient', 'Eleanor Vance', 'patient@healthtrack.com', 'patient123', '+1 555-0192', 'Sarah Vance (+1 555-0144)', 'CARE-1001', NULL, NULL, NULL),
('cg-001', 'caregiver', 'Sarah Vance', 'caregiver@healthtrack.com', 'caregiver123', '+1 555-0144', NULL, NULL, 'CARE-1001', NULL, 'Daughter / Primary Caregiver'),
('doc-001', 'doctor', 'Dr. Sarah Jenkins', 'doctor@healthtrack.com', 'doctor123', '+1 555-0800', NULL, NULL, NULL, 'Dementia Memory Clinical Center', NULL),
('admin-001', 'admin', 'Super Admin', 'admin@healthtrack.com', 'admin123', NULL, NULL, NULL, NULL, NULL, NULL),
('doc-002', 'doctor', 'Dr. Chamudi Prabod', 'chamudi@healthtrack.com', 'doctor123', '+94 77 123 4567', NULL, NULL, NULL, 'National Health Neurology Institute', NULL);

-- Seed Patients
INSERT INTO patients (id, user_id, name, pairing_code, age, condition, status, battery_level, doctor_name, doctor_phone, latitude, longitude) VALUES
('CARE-1001', 'pat-001', 'Eleanor Vance', 'CARE-1001', 72, 'Alzheimer''s (Early Stage) • High Risk of Wandering', 'online', 88, 'Dr. Sarah Jenkins', '+1 555-0800', 6.9271, 79.8612),
('CARE-2042', NULL, 'Arthur Pendelton', 'CARE-2042', 79, 'Vascular Dementia • Requires Mobility Assistance', 'idle', 64, 'Dr. Michael Chen', '+1 555-0811', 6.9150, 79.8580),
('CARE-3309', NULL, 'Clara Oswald', 'CARE-3309', 68, 'Mild Cognitive Impairment • Independent Living', 'online', 92, 'Dr. Emily Carter', '+1 555-0822', 6.9320, 79.8450),
('CARE-3134', NULL, 'Sumudu Shehani', 'CARE-3134', 72, 'Dementia (Moderate) • High Wander Risk', 'idle', 85, 'Dr. Sarah Jenkins', '+94 75 234 5869', 6.9200, 79.8650);

-- Seed Connections
INSERT INTO user_connections (id, from_user_id, from_email, from_name, from_role, to_room_code, to_name, to_role, status, condition, age) VALUES
('conn-1', 'doc-001', 'doctor@healthtrack.com', 'Dr. Sarah Jenkins', 'doctor', 'CARE-1001', 'Eleanor Vance', 'patient', 'approved', 'Alzheimer''s (Early Stage)', 72),
('conn-2', 'cg-001', 'caregiver@healthtrack.com', 'Sarah Vance', 'caregiver', 'CARE-1001', 'Eleanor Vance', 'patient', 'approved', 'Alzheimer''s (Early Stage)', 72),
('conn-3', 'doc-001', 'doctor@healthtrack.com', 'Dr. Sarah Jenkins', 'doctor', 'CARE-3134', 'Sumudu Shehani', 'patient', 'approved', 'Dementia (Moderate)', 72);

-- Seed Medications (Includes 30-Day Recurring Plans + Specific Day Overrides & Statuses for October 2026)
INSERT INTO medications (id, patient_id, name, dosage, scheduled_time, period, duration_days, start_date, end_date, is_single_day, specific_date, instructions, prescribed_by, current_status, day_statuses) VALUES
('m1', 'CARE-1001', 'Donepezil (Aricept)', '10 mg • 1 Tab', '08:00 AM', 'Morning with breakfast', 30, '2026-10-01', '2026-10-31', FALSE, NULL, 'Take 1 tablet every morning with breakfast and full glass of water.', 'Dr. Sarah Jenkins', 'Taken', '{"2026-10-01": "Taken", "2026-10-02": "Taken"}'::jsonb),
('m2', 'CARE-1001', 'Vitamin B-Complex & D3', '1 Capsule', '01:00 PM', 'Noon with lunch', 30, '2026-10-01', '2026-10-31', FALSE, NULL, 'Take with full lunch meal to improve nutrient absorption.', 'Dr. Sarah Jenkins', 'Pending', '{"2026-10-01": "Taken", "2026-10-02": "Pending"}'::jsonb),
('m3', 'CARE-1001', 'Amlodipine (Blood Pressure)', '5 mg • 1 Tab', '08:00 PM', 'Evening with dinner', 30, '2026-10-01', '2026-10-31', FALSE, NULL, 'Take with evening meal. Check blood pressure before administration.', 'Dr. Sarah Jenkins', 'Pending', '{"2026-10-01": "Taken", "2026-10-02": "Pending"}'::jsonb),
('m4', 'CARE-1001', 'Omega-3 Fish Oil', '1000 mg • 1 Softgel', '09:30 PM', 'Bedtime', 30, '2026-10-01', '2026-10-31', FALSE, NULL, 'Take with water before sleep to support brain cognitive integrity.', 'Dr. Sarah Jenkins', 'Pending', '{"2026-10-01": "Taken", "2026-10-02": "Pending"}'::jsonb),

-- CARE-3134 Medications
('m-sumudu-1', 'CARE-3134', 'Donepezil (Aricept)', '10 mg • 1 Tablet', '08:00 AM', 'Morning with breakfast', 30, '2026-10-01', '2026-10-31', FALSE, NULL, 'Take with breakfast and a glass of water for cognitive support', 'Dr. Sarah Jenkins', 'Taken', '{"2026-10-01": "Taken", "2026-10-02": "Taken"}'::jsonb),
('m-sumudu-2', 'CARE-3134', 'Memantine HCl', '10 mg • 1 Tablet', '01:00 PM', 'Afternoon with lunch', 30, '2026-10-01', '2026-10-31', FALSE, NULL, 'Take after lunch meal to reduce NMDA receptor overactivity', 'Dr. Sarah Jenkins', 'Taken', '{"2026-10-01": "Taken", "2026-10-02": "Taken"}'::jsonb),
('m-sumudu-3', 'CARE-3134', 'Amlodipine (Blood Pressure)', '5 mg • 1 Tablet', '08:00 PM', 'Evening with dinner', 30, '2026-10-01', '2026-10-31', FALSE, NULL, 'Maintain systolic blood pressure stability', 'Dr. Sarah Jenkins', 'Pending', '{"2026-10-01": "Taken", "2026-10-02": "Pending"}'::jsonb),

-- Specific Single-Day Prescription (oct 2, 2026)
('m-oct2-single', 'CARE-1001', 'Hydration Electrolyte Solution', '250 ml', '11:00 AM', 'Mid-morning hydration', 1, '2026-10-02', '2026-10-02', TRUE, '2026-10-02', 'Assigned specifically for October 2 to maintain hydration.', 'Dr. Sarah Jenkins', 'Pending', '{"2026-10-02": "Pending"}'::jsonb);

-- Populate Daily Medication Calendar Records
INSERT INTO daily_medication_calendar (id, patient_id, medication_id, schedule_date, scheduled_time, period, status) VALUES
('cal-1', 'CARE-1001', 'm1', '2026-10-01', '08:00 AM', 'Morning with breakfast', 'Taken'),
('cal-2', 'CARE-1001', 'm2', '2026-10-01', '01:00 PM', 'Noon with lunch', 'Taken'),
('cal-3', 'CARE-1001', 'm3', '2026-10-01', '08:00 PM', 'Evening with dinner', 'Taken'),
('cal-4', 'CARE-1001', 'm4', '2026-10-01', '09:30 PM', 'Bedtime', 'Taken'),
('cal-5', 'CARE-1001', 'm1', '2026-10-02', '08:00 AM', 'Morning with breakfast', 'Taken'),
('cal-6', 'CARE-1001', 'm2', '2026-10-02', '01:00 PM', 'Noon with lunch', 'Pending'),
('cal-7', 'CARE-1001', 'm3', '2026-10-02', '08:00 PM', 'Evening with dinner', 'Pending'),
('cal-8', 'CARE-1001', 'm4', '2026-10-02', '09:30 PM', 'Bedtime', 'Pending'),
('cal-9', 'CARE-1001', 'm-oct2-single', '2026-10-02', '11:00 AM', 'Mid-morning hydration', 'Pending');

-- Seed Medication Audit Logs
INSERT INTO medication_logs (id, patient_id, medication_id, medicine_name, dosage, scheduled_time, status, response_type) VALUES
('log-1', 'CARE-1001', 'm1', 'Donepezil (Aricept)', '10 mg • 1 Tab', '08:00 AM', 'taken', 'patient_action'),
('log-2', 'CARE-1001', 'm2', 'Vitamin B-Complex & D3', '1 Capsule', '01:00 PM', 'taken', 'patient_action'),
('log-3', 'CARE-3134', 'm-sumudu-1', 'Donepezil (Aricept)', '10 mg • 1 Tablet', '08:00 AM', 'taken', 'patient_action');

-- Seed Patient Vitals
INSERT INTO patient_vitals (id, patient_id, heart_rate, blood_pressure, blood_pressure_sys, blood_pressure_dia, spo2, temperature, blood_glucose, status, status_color, recorded_by, notes, recorded_at) VALUES
('vit-101', 'CARE-1001', 72, '120/80', 120, 80, 98, 36.6, 98.0, 'Normal', '#10B981', 'Sarah Vance (Caregiver)', 'Morning resting telemetry check. Patient hydrated and responsive.', NOW() - INTERVAL '2 hours'),
('vit-102', 'CARE-1001', 78, '124/82', 124, 82, 97, 36.8, 104.0, 'Normal', '#10B981', 'Sarah Vance (Caregiver)', 'Post-lunch vitals check. Vitals stable after light hallway walk.', NOW() - INTERVAL '1 day'),
('vit-103', 'CARE-1001', 82, '135/88', 135, 88, 96, 37.1, 112.0, 'Elevated BP', '#F59E0B', 'Sarah Vance (Caregiver)', 'Mild systolic elevation during afternoon cognitive activity.', NOW() - INTERVAL '2 days'),
('vit-104', 'CARE-3134', 74, '122/80', 122, 80, 99, 36.7, 100.0, 'Normal', '#10B981', 'Caregiver', 'Telemetry check stable.', NOW() - INTERVAL '3 hours');

-- Seed Patient Family Members (Memory Album)
INSERT INTO patient_family_members (id, patient_id, name, relationship, emoji, birthday, phone, whatsapp, photo, memory_notes, favorite_memory) VALUES
('fam-1', 'CARE-1001', 'Emily Vance', 'Daughter', '❤️', '1995-10-14', '+1 (555) 234-5678', '+1 (555) 234-5678', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80', 'Your beloved daughter. She visits every Sunday afternoon with tea and chocolate cookies.', 'Took you to the botanic gardens last spring.'),
('fam-2', 'CARE-1001', 'Michael Vance', 'Son', '💙', '1998-04-22', '+1 (555) 876-5432', '+1 (555) 876-5432', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80', 'Your eldest son. He is a software engineer and calls you every evening at 6:00 PM.', 'You taught him how to fish at Lake George when he was 10.'),
('fam-3', 'CARE-1001', 'Sarah Vance', 'Spouse / Partner', '💍', '1968-12-05', '+1 (555) 901-2345', '+1 (555) 901-2345', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', 'Your loving spouse who stays by your side, manages your daily care, and holds your hand every day.', 'Married for over 35 wonderful years in autumn.');

-- Seed Activities
INSERT INTO activities (id, patient_id, title, scheduled_time, duration, category, is_completed) VALUES
('a1', 'CARE-1001', 'Morning Garden Walk', '08:30 AM', '30 mins', 'Physical', true),
('a2', 'CARE-1001', 'Healthy Breakfast & Meds', '09:15 AM', '20 mins', 'Nutrition', true),
('a3', 'CARE-1001', 'Cognitive Memory Puzzle', '11:00 AM', '15 mins', 'Brain Fitness', false),
('a4', 'CARE-3134', 'Gentle Morning Stretching', '09:00 AM', '20 mins', 'Physical', true);

-- Seed Alerts
INSERT INTO alerts (id, patient_id, alert_type, message, severity, is_read) VALUES
('alt-1', 'CARE-1001', 'SOS', '🚨 Emergency SOS trigger received from Patient Device', 'critical', false),
('alt-2', 'CARE-2042', 'BATTERY', '🔋 Patient device battery low (18%)', 'high', true);

-- Seed Facilities
INSERT INTO facilities (id, name, status, status_color) VALUES
('f1', 'Wing A - Memory Care Clinic', 'Stable', 'green'),
('f2', 'Wing B - Assisted Living Hub', 'Attention', 'yellow'),
('f3', 'Wing C - Intensive Neuro Care', 'Critical - Staffing', 'red');

-- ============================================================================
-- 15. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE medications DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_medication_calendar DISABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE patient_vitals DISABLE ROW LEVEL SECURITY;
ALTER TABLE patient_family_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE facilities DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SCHEMA SETUP COMPLETED SUCCESSFULLY
-- ============================================================================
