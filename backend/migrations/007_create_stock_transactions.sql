CREATE TABLE stock_transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    product_id BIGINT NOT NULL,

    transaction_type VARCHAR(50) NOT NULL,

    quantity INTEGER NOT NULL,

    reference_type VARCHAR(50),

    reference_id BIGINT,

    notes TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,


    CONSTRAINT fk_stock_transactions_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE RESTRICT
);