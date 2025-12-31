CREATE TABLE job_posts (
    id SERIAL PRIMARY KEY,
    job_posting TEXT NOT NULL,
    functional_area TEXT,
    published DATE,
    job_id VARCHAR(50),
    state CHAR(2),
    city VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);