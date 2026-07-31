CREATE TABLE customer_emails (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    customer_id BIGINT NOT NULL,

    email VARCHAR(255) NOT NULL,

    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_customer_emails_customer
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE CASCADE
);



/*
 Prevent the same email being stored twice
*/

CREATE UNIQUE INDEX uq_customer_email
ON customer_emails(email);



/*
 One customer can only have one primary email
*/

CREATE UNIQUE INDEX uq_customer_primary_email
ON customer_emails(customer_id)
WHERE is_primary = TRUE;