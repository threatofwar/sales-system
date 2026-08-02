CREATE TABLE products (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    category_id BIGINT NOT NULL,

    name VARCHAR(150) NOT NULL,

    description TEXT,

    sku VARCHAR(50) UNIQUE,

    price NUMERIC(10,2) NOT NULL,

    cost_price NUMERIC(10,2),

    stock_quantity INTEGER NOT NULL DEFAULT 0,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE RESTRICT
);