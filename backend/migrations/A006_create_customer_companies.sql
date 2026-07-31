-- CREATE TABLE IF NOT EXISTS customer_companies (
--     customer_id BIGINT NOT NULL,
--     company_id  BIGINT NOT NULL,

--     job_title TEXT,
--     is_primary_contact BOOLEAN DEFAULT FALSE,

--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

--     CONSTRAINT customer_companies_pkey
--         PRIMARY KEY (customer_id, company_id),

--     CONSTRAINT customer_companies_customer_fk
--         FOREIGN KEY (customer_id)
--         REFERENCES customers(id)
--         ON DELETE CASCADE,

--     CONSTRAINT customer_companies_company_fk
--         FOREIGN KEY (company_id)
--         REFERENCES companies(id)
--         ON DELETE CASCADE
-- );