CREATE TABLE IF NOT EXISTS customers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name TEXT NOT NULL,

    phone TEXT,
    email TEXT,

    address TEXT,

    customer_type TEXT NOT NULL DEFAULT 'INDIVIDUAL',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT customers_type_check
        CHECK (
            customer_type IN (
                'INDIVIDUAL',
                'BUSINESS',
                'RESELLER',
                'CONSIGNMENT'
            )
        )
);