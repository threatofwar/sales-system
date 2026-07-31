-- CREATE TABLE party_emails (
--     id BIGSERIAL PRIMARY KEY,

--     party_id BIGINT NOT NULL,

--     email VARCHAR(255) NOT NULL,

--     is_primary BOOLEAN NOT NULL DEFAULT FALSE,

--     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

--     CONSTRAINT fk_party_email
--         FOREIGN KEY (party_id)
--         REFERENCES parties(id)
--         ON DELETE CASCADE
-- );