-- ==========================================
-- Invoices
-- ==========================================

CREATE TABLE invoices (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    customer_id BIGINT NOT NULL,

    invoice_number VARCHAR(50) NOT NULL UNIQUE,

    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,

    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',

    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,

    discount NUMERIC(12,2) NOT NULL DEFAULT 0,

    tax NUMERIC(12,2) NOT NULL DEFAULT 0,

    total NUMERIC(12,2) NOT NULL DEFAULT 0,

    notes TEXT,

    due_date TIMESTAMPTZ NULL;

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_invoices_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_invoices_status
        CHECK (
            status IN (
                'DRAFT',
                'ISSUED',
                'PAID',
                'CANCELLED'
            )
        ),

    CONSTRAINT chk_invoices_subtotal
        CHECK (subtotal >= 0),

    CONSTRAINT chk_invoices_discount
        CHECK (discount >= 0),

    CONSTRAINT chk_invoices_tax
        CHECK (tax >= 0),

    CONSTRAINT chk_invoices_total
        CHECK (total >= 0)
);