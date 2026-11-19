ALTER TABLE consignments
    ADD COLUMN IF NOT EXISTS invoice_id BIGINT NULL
    REFERENCES invoices(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_consignments_invoice_id
    ON consignments(invoice_id)
    WHERE invoice_id IS NOT NULL;
