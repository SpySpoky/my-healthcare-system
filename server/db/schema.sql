-- =====================================================
-- Centralized Healthcare Management System
-- MySQL 8.0 schema, built from the ER diagram in the
-- ITEC403 report (section 5.7, Peter Chen notation).
--
-- Create/reset with:  npm run db:setup
-- (the script creates the database named by DB_NAME, then runs this file)
-- =====================================================

-- =====================================================
-- USER (superclass)
-- Disjoint specialization "D" into PATIENT, STAFF, ADMIN.
-- user_type is the discriminator; each subtype table points
-- at (user_id, user_type) so one user can only be one subtype.
-- Email comparison is case-insensitive (collation _ai_ci).
-- =====================================================

CREATE TABLE users (
    user_id        INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    full_name      VARCHAR(100)  NOT NULL,
    email          VARCHAR(255)  NOT NULL,
    password       VARCHAR(255)  NOT NULL,             -- bcrypt hash, never plain text
    phone          VARCHAR(30),
    date_of_birth  DATE,
    created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login     DATETIME,
    status         VARCHAR(10)   NOT NULL DEFAULT 'Active',
    user_type      VARCHAR(10)   NOT NULL,

    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_id_type (user_id, user_type),
    CONSTRAINT chk_users_status CHECK (status IN ('Active', 'Inactive', 'Suspended')),
    CONSTRAINT chk_users_type   CHECK (user_type IN ('patient', 'staff', 'admin'))
) ENGINE=InnoDB;

-- PATIENT -------------------------------------------------

CREATE TABLE patient (
    user_id                  INT UNSIGNED NOT NULL,
    user_type                VARCHAR(10)  NOT NULL DEFAULT 'patient',
    gender                   VARCHAR(10),
    blood_group              VARCHAR(10),
    address                  VARCHAR(255),
    allergies                VARCHAR(255),
    emergency_contact_name   VARCHAR(100),
    emergency_contact_phone  VARCHAR(30),

    PRIMARY KEY (user_id),
    CONSTRAINT fk_patient_user FOREIGN KEY (user_id, user_type)
        REFERENCES users (user_id, user_type) ON DELETE CASCADE,
    CONSTRAINT chk_patient_gender CHECK (gender IS NULL OR gender IN ('Male', 'Female', 'Other'))
) ENGINE=InnoDB;

-- ADMIN ---------------------------------------------------

CREATE TABLE admin (
    user_id    INT UNSIGNED NOT NULL,
    user_type  VARCHAR(10)  NOT NULL DEFAULT 'admin',

    PRIMARY KEY (user_id),
    CONSTRAINT fk_admin_user FOREIGN KEY (user_id, user_type)
        REFERENCES users (user_id, user_type) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- DEPARTMENT 1 --has-- N STAFF
-- =====================================================

CREATE TABLE department (
    dept_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
    dept_name  VARCHAR(100) NOT NULL,

    PRIMARY KEY (dept_id),
    UNIQUE KEY uq_department_name (dept_name)
) ENGINE=InnoDB;

-- =====================================================
-- STAFF (subclass of USER, superclass of DOCTOR, NURSE,
-- RECEPTIONIST through a second disjoint specialization)
-- =====================================================

CREATE TABLE staff (
    user_id     INT UNSIGNED  NOT NULL,
    user_type   VARCHAR(10)   NOT NULL DEFAULT 'staff',
    staff_type  VARCHAR(15)   NOT NULL,   -- technician: staff with no subtype table
    dept_id     INT UNSIGNED,
    hire_date   DATE          NOT NULL DEFAULT (CURRENT_DATE),
    salary      DECIMAL(10,2),

    PRIMARY KEY (user_id),
    UNIQUE KEY uq_staff_id_type (user_id, staff_type),
    KEY idx_staff_dept (dept_id),
    CONSTRAINT fk_staff_user FOREIGN KEY (user_id, user_type)
        REFERENCES users (user_id, user_type) ON DELETE CASCADE,
    CONSTRAINT fk_staff_dept FOREIGN KEY (dept_id)
        REFERENCES department (dept_id) ON DELETE SET NULL,
    CONSTRAINT chk_staff_type CHECK (staff_type IN ('doctor', 'nurse', 'receptionist', 'technician')),
    CONSTRAINT chk_staff_salary CHECK (salary IS NULL OR salary >= 0)
) ENGINE=InnoDB;

-- DOCTOR --------------------------------------------------
-- slug is the doctor's stable id used by the front end (e.g. "sarah-johnson").

CREATE TABLE doctor (
    user_id         INT UNSIGNED NOT NULL,
    staff_type      VARCHAR(15)  NOT NULL DEFAULT 'doctor',
    slug            VARCHAR(80)  NOT NULL,
    specialization  VARCHAR(100) NOT NULL,
    license_number  VARCHAR(50)  NOT NULL,

    PRIMARY KEY (user_id),
    UNIQUE KEY uq_doctor_slug (slug),
    UNIQUE KEY uq_doctor_license (license_number),
    CONSTRAINT fk_doctor_staff FOREIGN KEY (user_id, staff_type)
        REFERENCES staff (user_id, staff_type) ON DELETE CASCADE
) ENGINE=InnoDB;

-- NURSE ---------------------------------------------------

CREATE TABLE nurse (
    user_id         INT UNSIGNED NOT NULL,
    staff_type      VARCHAR(15)  NOT NULL DEFAULT 'nurse',
    license_number  VARCHAR(50)  NOT NULL,

    PRIMARY KEY (user_id),
    UNIQUE KEY uq_nurse_license (license_number),
    CONSTRAINT fk_nurse_staff FOREIGN KEY (user_id, staff_type)
        REFERENCES staff (user_id, staff_type) ON DELETE CASCADE
) ENGINE=InnoDB;

-- RECEPTIONIST --------------------------------------------

CREATE TABLE receptionist (
    user_id      INT UNSIGNED NOT NULL,
    staff_type   VARCHAR(15)  NOT NULL DEFAULT 'receptionist',
    desk_number  VARCHAR(10),

    PRIMARY KEY (user_id),
    CONSTRAINT fk_receptionist_staff FOREIGN KEY (user_id, staff_type)
        REFERENCES staff (user_id, staff_type) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- SCHEDULE (weak entity, identified by STAFF)
-- Key: (staff_id, schedule_no)
-- =====================================================

CREATE TABLE schedule (
    staff_id     INT UNSIGNED NOT NULL,
    schedule_no  INT UNSIGNED NOT NULL,
    work_day     VARCHAR(9)   NOT NULL,
    start_time   TIME         NOT NULL,
    end_time     TIME         NOT NULL,
    status       VARCHAR(12)  NOT NULL DEFAULT 'Available',

    PRIMARY KEY (staff_id, schedule_no),
    CONSTRAINT fk_schedule_staff FOREIGN KEY (staff_id)
        REFERENCES staff (user_id) ON DELETE CASCADE,
    CONSTRAINT chk_schedule_day CHECK (work_day IN
        ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    CONSTRAINT chk_schedule_status CHECK (status IN ('Available', 'Unavailable')),
    CONSTRAINT chk_schedule_times CHECK (end_time > start_time)
) ENGINE=InnoDB;

-- =====================================================
-- APPOINTMENT
-- PATIENT 1 --books-- N APPOINTMENT
-- DOCTOR  1 --handles-- N APPOINTMENT
-- =====================================================

CREATE TABLE appointment (
    appointment_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
    patient_id        INT UNSIGNED NOT NULL,
    doctor_id         INT UNSIGNED NOT NULL,
    appointment_date  DATE         NOT NULL,
    appointment_time  TIME         NOT NULL,
    status            VARCHAR(10)  NOT NULL DEFAULT 'Pending',
    note              TEXT,                 -- reason for the visit
    symptoms          TEXT,
    -- A doctor cannot be double-booked; cancelled slots can be re-booked
    -- (NULL values are ignored by the unique index).
    active_slot       VARCHAR(40) GENERATED ALWAYS AS (
        IF(status = 'Cancelled', NULL,
           CONCAT(doctor_id, '|', appointment_date, '|', appointment_time))
    ) STORED,

    PRIMARY KEY (appointment_id),
    UNIQUE KEY uq_appointment_slot (active_slot),
    KEY idx_appointment_patient (patient_id, appointment_date),
    KEY idx_appointment_doctor (doctor_id, appointment_date),
    CONSTRAINT fk_appointment_patient FOREIGN KEY (patient_id)
        REFERENCES patient (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_appointment_doctor FOREIGN KEY (doctor_id)
        REFERENCES doctor (user_id) ON DELETE RESTRICT,
    CONSTRAINT chk_appointment_status CHECK (status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled'))
) ENGINE=InnoDB;

-- =====================================================
-- MEDICAL_RECORD
-- PATIENT 1 --has-- N MEDICAL_RECORD
-- DOCTOR  1 --creates-- N MEDICAL_RECORD
-- Each row can carry a visit title/summary, a diagnosis and a
-- doctor note; the app shows each as its own list.
-- =====================================================

CREATE TABLE medical_record (
    record_id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    patient_id        INT UNSIGNED NOT NULL,
    doctor_id         INT UNSIGNED NOT NULL,
    record_date       DATE         NOT NULL DEFAULT (CURRENT_DATE),
    title             VARCHAR(150),         -- visit type, e.g. "Cardiology Check-up"
    diagnosis         TEXT,
    diagnosis_status  VARCHAR(10),
    treatment         TEXT,
    note              TEXT,                 -- visit summary
    doctor_note       TEXT,                 -- doctor's follow-up advice

    PRIMARY KEY (record_id),
    KEY idx_record_patient (patient_id, record_date),
    KEY idx_record_doctor (doctor_id),
    CONSTRAINT fk_record_patient FOREIGN KEY (patient_id)
        REFERENCES patient (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_record_doctor FOREIGN KEY (doctor_id)
        REFERENCES doctor (user_id) ON DELETE RESTRICT,
    CONSTRAINT chk_record_dx_status CHECK (diagnosis_status IS NULL OR diagnosis_status IN ('Active', 'Resolved'))
) ENGINE=InnoDB;

-- =====================================================
-- PRESCRIPTION (weak entity, identified by MEDICAL_RECORD)
-- Key: (record_id, prescription_no)
-- =====================================================

CREATE TABLE prescription (
    record_id        INT UNSIGNED NOT NULL,
    prescription_no  INT UNSIGNED NOT NULL,
    medication_name  VARCHAR(150) NOT NULL,
    dosage           VARCHAR(100) NOT NULL,
    instruction      TEXT,
    issue_date       DATE         NOT NULL DEFAULT (CURRENT_DATE),
    frequency        VARCHAR(100),
    duration         VARCHAR(50),
    status           VARCHAR(10)  NOT NULL DEFAULT 'Active',

    PRIMARY KEY (record_id, prescription_no),
    CONSTRAINT fk_prescription_record FOREIGN KEY (record_id)
        REFERENCES medical_record (record_id) ON DELETE CASCADE,
    CONSTRAINT chk_prescription_status CHECK (status IN ('Active', 'Completed'))
) ENGINE=InnoDB;

-- =====================================================
-- LAB_TEST
-- =====================================================

CREATE TABLE lab_test (
    test_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
    patient_id   INT UNSIGNED NOT NULL,
    doctor_id    INT UNSIGNED NOT NULL,
    test_name    VARCHAR(150) NOT NULL,
    description  TEXT,
    test_date    DATE         NOT NULL DEFAULT (CURRENT_DATE),
    result       TEXT,
    status       VARCHAR(12)  NOT NULL DEFAULT 'Requested',

    PRIMARY KEY (test_id),
    KEY idx_lab_patient (patient_id, test_date),
    KEY idx_lab_doctor (doctor_id),
    CONSTRAINT fk_lab_patient FOREIGN KEY (patient_id)
        REFERENCES patient (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_lab_doctor FOREIGN KEY (doctor_id)
        REFERENCES doctor (user_id) ON DELETE RESTRICT,
    CONSTRAINT chk_lab_status CHECK (status IN ('Requested', 'In Progress', 'Completed', 'Cancelled')),
    CONSTRAINT chk_lab_result CHECK (status <> 'Completed' OR result IS NOT NULL)
) ENGINE=InnoDB;

-- =====================================================
-- ADDITIONAL TABLES (from the domain class diagram, 5.6.5)
-- =====================================================

CREATE TABLE vital_signs (
    vital_id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
    patient_id      INT UNSIGNED NOT NULL,
    recorded_at     DATE         NOT NULL DEFAULT (CURRENT_DATE),
    heart_rate      SMALLINT,
    blood_pressure  VARCHAR(7),
    temperature     DECIMAL(4,1),
    oxygen          SMALLINT,
    weight          DECIMAL(5,1),

    PRIMARY KEY (vital_id),
    KEY idx_vitals_patient (patient_id, recorded_at),
    CONSTRAINT fk_vitals_patient FOREIGN KEY (patient_id)
        REFERENCES patient (user_id) ON DELETE CASCADE,
    CONSTRAINT chk_vitals_hr CHECK (heart_rate IS NULL OR heart_rate BETWEEN 20 AND 250),
    CONSTRAINT chk_vitals_temp CHECK (temperature IS NULL OR temperature BETWEEN 30 AND 45),
    CONSTRAINT chk_vitals_o2 CHECK (oxygen IS NULL OR oxygen BETWEEN 50 AND 100)
) ENGINE=InnoDB;

-- Shown to the front end as "FB-<id>".
CREATE TABLE feedback (
    feedback_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
    patient_id    INT UNSIGNED NOT NULL,
    doctor_id     INT UNSIGNED,
    dept_id       INT UNSIGNED,
    type          VARCHAR(10)  NOT NULL,
    subject       VARCHAR(150) NOT NULL,
    message       TEXT         NOT NULL,
    rating        TINYINT,
    priority      VARCHAR(6)   NOT NULL DEFAULT 'Low',
    status        VARCHAR(10)  NOT NULL DEFAULT 'Open',
    submitted_at  DATE         NOT NULL DEFAULT (CURRENT_DATE),
    response      TEXT,
    responded_at  DATE,
    responded_by  INT UNSIGNED,

    PRIMARY KEY (feedback_id),
    KEY idx_feedback_patient (patient_id),
    KEY idx_feedback_status (status),
    CONSTRAINT fk_feedback_patient FOREIGN KEY (patient_id)
        REFERENCES patient (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_feedback_doctor FOREIGN KEY (doctor_id)
        REFERENCES doctor (user_id) ON DELETE SET NULL,
    CONSTRAINT fk_feedback_dept FOREIGN KEY (dept_id)
        REFERENCES department (dept_id) ON DELETE SET NULL,
    CONSTRAINT fk_feedback_admin FOREIGN KEY (responded_by)
        REFERENCES admin (user_id) ON DELETE SET NULL,
    CONSTRAINT chk_feedback_type CHECK (type IN ('Feedback', 'Complaint', 'Suggestion')),
    CONSTRAINT chk_feedback_rating CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
    CONSTRAINT chk_feedback_priority CHECK (priority IN ('Low', 'Medium', 'High')),
    CONSTRAINT chk_feedback_status CHECK (status IN ('Open', 'In Review', 'Resolved', 'Closed'))
) ENGINE=InnoDB AUTO_INCREMENT=2001;

-- Doctor / medical staff registration requests. Shown as "APP-<id>".
CREATE TABLE staff_application (
    application_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
    full_name         VARCHAR(100) NOT NULL,
    email             VARCHAR(255) NOT NULL,
    password          VARCHAR(255),         -- bcrypt hash, becomes the account password on approval
    phone             VARCHAR(30),
    role              VARCHAR(15)  NOT NULL,
    dept_id           INT UNSIGNED,
    license_number    VARCHAR(50),
    experience_years  SMALLINT,
    qualification     VARCHAR(255),
    documents         JSON         NOT NULL,
    submitted_at      DATE         NOT NULL DEFAULT (CURRENT_DATE),
    status            VARCHAR(10)  NOT NULL DEFAULT 'Pending',
    reviewed_at       DATE,
    reviewed_by       INT UNSIGNED,
    review_note       TEXT,

    PRIMARY KEY (application_id),
    KEY idx_application_status (status),
    CONSTRAINT fk_application_dept FOREIGN KEY (dept_id)
        REFERENCES department (dept_id) ON DELETE SET NULL,
    CONSTRAINT fk_application_admin FOREIGN KEY (reviewed_by)
        REFERENCES admin (user_id) ON DELETE SET NULL,
    CONSTRAINT chk_application_role CHECK (role IN ('doctor', 'medical_staff')),
    CONSTRAINT chk_application_status CHECK (status IN ('Pending', 'Approved', 'Rejected'))
) ENGINE=InnoDB AUTO_INCREMENT=1001;

-- System activity / audit log. Shown as "ACT-<id>".
CREATE TABLE activity_log (
    log_id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id     INT UNSIGNED,
    user_name   VARCHAR(100) NOT NULL,        -- kept even if the account is deleted
    role        VARCHAR(15),
    action      TEXT         NOT NULL,
    module      VARCHAR(20)  NOT NULL,
    status      VARCHAR(8)   NOT NULL,
    ip_address  VARCHAR(45),
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (log_id),
    KEY idx_activity_time (created_at),
    CONSTRAINT fk_activity_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE SET NULL,
    CONSTRAINT chk_activity_module CHECK (module IN
        ('Authentication', 'Appointments', 'Medical Records', 'Users',
         'Applications', 'Feedback', 'Reports', 'Settings')),
    CONSTRAINT chk_activity_status CHECK (status IN ('Success', 'Warning', 'Failed'))
) ENGINE=InnoDB;

-- Metadata of documents a patient uploads on their profile.
CREATE TABLE patient_document (
    document_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
    patient_id   INT UNSIGNED NOT NULL,
    data         JSON         NOT NULL,       -- the document object the app shows
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (document_id),
    KEY idx_document_patient (patient_id),
    CONSTRAINT fk_document_patient FOREIGN KEY (patient_id)
        REFERENCES patient (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Password reset requests (token is stored hashed).
CREATE TABLE password_reset (
    reset_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id     INT UNSIGNED NOT NULL,
    token_hash  CHAR(64)     NOT NULL,
    expires_at  DATETIME     NOT NULL,
    used        TINYINT(1)   NOT NULL DEFAULT 0,

    PRIMARY KEY (reset_id),
    UNIQUE KEY uq_reset_token (token_hash),
    CONSTRAINT fk_reset_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Direct messages between patients and the care team (and between staff).
-- Each side can delete its own copy without removing the other's.
CREATE TABLE message (
    message_id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    sender_id             INT UNSIGNED NOT NULL,
    recipient_id          INT UNSIGNED NOT NULL,
    subject               VARCHAR(150) NOT NULL,
    body                  TEXT         NOT NULL,
    sent_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at               DATETIME,
    deleted_by_sender     TINYINT(1)   NOT NULL DEFAULT 0,
    deleted_by_recipient  TINYINT(1)   NOT NULL DEFAULT 0,

    PRIMARY KEY (message_id),
    KEY idx_message_recipient (recipient_id, sent_at),
    KEY idx_message_sender (sender_id, sent_at),
    CONSTRAINT fk_message_sender FOREIGN KEY (sender_id)
        REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_message_recipient FOREIGN KEY (recipient_id)
        REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;
