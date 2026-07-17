CREATE TABLE IF NOT EXISTS emails (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    user_id BIGINT NOT NULL,

    email TEXT NOT NULL UNIQUE,
    verified BOOLEAN DEFAULT FALSE,
    verification_token TEXT,

    CONSTRAINT emails_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);