CREATE TABLE consignments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    consignment_number VARCHAR(50) NOT NULL UNIQUE,
    consignment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    notes TEXT,
    settled_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_consignment_status CHECK (status IN ('OPEN', 'SETTLED', 'CANCELLED')),
    CONSTRAINT chk_consignment_commission_rate CHECK (commission_rate >= 0 AND commission_rate <= 100)
);

CREATE TABLE consignment_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    consignment_id BIGINT NOT NULL REFERENCES consignments(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_sent INTEGER NOT NULL,
    quantity_sold INTEGER NOT NULL DEFAULT 0,
    quantity_returned INTEGER NOT NULL DEFAULT 0,
    quantity_damaged INTEGER NOT NULL DEFAULT 0,
    unit_price NUMERIC(12,2) NOT NULL,
    commission_rate NUMERIC(5,2) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_consignment_quantity_sent CHECK (quantity_sent > 0),
    CONSTRAINT chk_consignment_quantity_results CHECK (quantity_sold >= 0 AND quantity_returned >= 0 AND quantity_damaged >= 0),
    CONSTRAINT chk_consignment_item_commission_rate CHECK (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 100))
);

CREATE INDEX idx_consignments_customer_id ON consignments(customer_id);
CREATE INDEX idx_consignment_items_consignment_id ON consignment_items(consignment_id);
