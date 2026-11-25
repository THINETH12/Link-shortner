CREATE TABLE links (
  id         SERIAL PRIMARY KEY,
  original   TEXT NOT NULL,
  code       VARCHAR(10) NOT NULL UNIQUE,
  clicks     INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_links_code ON links(code);