CREATE TABLE invoices (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    customer_id BIGINT NOT NULL,

    invoice_number VARCHAR(50) NOT NULL UNIQUE,

    invoice_date DATE NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
        CHECK (
            status IN (
                'DRAFT',
                'UNPAID',
                'PARTIAL',
                'PAID',
                'VOID'
            )
        ),

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_invoice_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
);