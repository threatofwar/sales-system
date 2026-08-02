CREATE TABLE invoice_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    invoice_id BIGINT NOT NULL,

    product_id BIGINT NOT NULL,

    quantity INTEGER NOT NULL
        CHECK (quantity > 0),

    unit_price NUMERIC(12,2) NOT NULL
        CHECK (unit_price >= 0),

    discount NUMERIC(12,2) NOT NULL DEFAULT 0
        CHECK (discount >= 0),

    total NUMERIC(12,2) NOT NULL
        CHECK (total >= 0),

    CONSTRAINT fk_invoice_item_invoice
        FOREIGN KEY (invoice_id)
        REFERENCES invoices(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_invoice_item_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
);