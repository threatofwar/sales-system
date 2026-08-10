CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,

    invoice_id BIGINT NOT NULL,

    amount NUMERIC(12, 2) NOT NULL,

    payment_method VARCHAR(30) NOT NULL,

    payment_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    reference_no VARCHAR(100),

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payments_invoice
        FOREIGN KEY (invoice_id)
        REFERENCES invoices(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_payments_amount
        CHECK (amount > 0),

    CONSTRAINT chk_payments_method
        CHECK (
            payment_method IN (
                'CASH',
                'BANK_TRANSFER',
                'CARD',
                'E_WALLET',
                'OTHER'
            )
        )
);

CREATE INDEX idx_payments_invoice_id
ON payments(invoice_id);

CREATE INDEX idx_payments_payment_date
ON payments(payment_date DESC);