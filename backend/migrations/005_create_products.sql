CREATE TABLE products (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    sku VARCHAR(100) UNIQUE NOT NULL,

    name VARCHAR(255) NOT NULL,

    description TEXT,

    selling_price NUMERIC(12,2) NOT NULL
        CHECK (selling_price >= 0),

    cost_price NUMERIC(12,2)
        CHECK (cost_price >= 0),

    stock_quantity INTEGER NOT NULL DEFAULT 0
        CHECK (stock_quantity >= 0),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);