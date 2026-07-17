CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,

    password_reset_token TEXT,
    password_reset_token_used BOOLEAN DEFAULT FALSE
);