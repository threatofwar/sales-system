-- CREATE TABLE parties (
--     id BIGSERIAL PRIMARY KEY,

--     type VARCHAR(20) NOT NULL
--         CHECK (type IN ('PERSON', 'COMPANY')),

--     display_name VARCHAR(255) NOT NULL,

--     first_name VARCHAR(100),
--     last_name VARCHAR(100),

--     company_name VARCHAR(255),

--     identification_no VARCHAR(50),
--     registration_no VARCHAR(50),

--     phone VARCHAR(30),
--     address TEXT,

--     is_active BOOLEAN NOT NULL DEFAULT TRUE,

--     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

--     CONSTRAINT chk_person_fields
--     CHECK (
--         (
--             type = 'PERSON'
--             AND first_name IS NOT NULL
--             AND last_name IS NOT NULL
--             AND company_name IS NULL
--             AND registration_no IS NULL
--         )
--         OR
--         (
--             type = 'COMPANY'
--             AND company_name IS NOT NULL
--             AND first_name IS NULL
--             AND last_name IS NULL
--             AND identification_no IS NULL
--         )
--     )
-- );