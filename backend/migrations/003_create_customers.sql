CREATE TABLE customers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    type VARCHAR(20) NOT NULL
        CHECK (type IN ('PERSON', 'COMPANY')),

    display_name VARCHAR(255) NOT NULL,

    -- Person fields
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    identification_no VARCHAR(50),

    -- Company fields
    company_name VARCHAR(255),
    registration_no VARCHAR(100),

    -- Shared fields
    phone VARCHAR(30),
    address TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),


    /*
       PERSON:
       - requires first_name
       - requires last_name
       - requires identification_no
       - cannot have company fields

       COMPANY:
       - requires company_name
       - requires registration_no
       - cannot have person fields
    */

    CONSTRAINT chk_customer_type_fields
    CHECK (
        (
            type = 'PERSON'
            AND first_name IS NOT NULL
            AND last_name IS NOT NULL
            AND identification_no IS NOT NULL
            AND company_name IS NULL
            AND registration_no IS NULL
        )
        OR
        (
            type = 'COMPANY'
            AND company_name IS NOT NULL
            AND registration_no IS NOT NULL
            AND first_name IS NULL
            AND last_name IS NULL
            AND identification_no IS NULL
        )
    )
);



/*
=================================================
 Prevent duplicate PERSON identification numbers
=================================================
*/

CREATE UNIQUE INDEX uq_customers_identification_no
ON customers(identification_no)
WHERE type = 'PERSON'
AND identification_no IS NOT NULL;



/*
=================================================
 Prevent duplicate COMPANY registration numbers
=================================================
*/

CREATE UNIQUE INDEX uq_customers_registration_no
ON customers(registration_no)
WHERE type = 'COMPANY'
AND registration_no IS NOT NULL;