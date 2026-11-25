# shr.ink — Link Shortener + Blue-Green Deployment

A production-style URL shortener built from scratch with Node.js, PostgreSQL, Docker and Nginx — featuring zero-downtime blue-green deployment.

![Stack](https://img.shields.io/badge/Node.js-20-green?style=flat-square&logo=node.js)
![Docker](https://img.shields.io/badge/Docker-Compose-blue?style=flat-square&logo=docker)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=flat-square&logo=postgresql)
![Nginx](https://img.shields.io/badge/Nginx-Reverse%20Proxy-green?style=flat-square&logo=nginx)

---

## What it does

Paste a long URL → get a short one. Anyone who visits the short link gets redirected to the original. Every visit increments a click counter tracked in the dashboard.

```
https://example.com/very/long/url/nobody/wants/to/type
                        ↓
                 http://your-ip/1a2b
```

---

## Features

- **URL shortening** — Base62 encoding of the database row ID, no random collisions
- **Click tracking** — every redirect increments the counter atomically
- **Analytics dashboard** — live stats, bar chart, full links table
- **Blue-green deployment** — zero-downtime deploys with instant rollback
- **Health endpoint** — `/health` returns current version and status
- **One command setup** — `docker compose up --build` starts everything

---

## Architecture

```
Browser / curl
      │
      ▼ :80
   Nginx (reverse proxy)
      │
      ├──▶ Blue container :3000  (Node.js v1)
      └──▶ Green container :3000 (Node.js v2)
                │
                ▼
         PostgreSQL (shared)
```

Only one container serves traffic at a time. The deploy script switches Nginx's upstream and reloads with zero downtime.

---

## Tech stack

| Layer | Tool |
|-------|------|
| Backend | Node.js + Express |
| Database | PostgreSQL 16 |
| Frontend | HTML + CSS + Vanilla JS |
| Containerisation | Docker + Docker Compose |
| Reverse proxy | Nginx |
| Short code generation | Base62 encoding of row ID |

---

## Run locally

The only requirement is **Docker Desktop**.

```bash
# 1. Clone the repo
git clone https://github.com/THINETH12/Link-shortener.git
cd link-shortener

# 2. Start everything
docker compose up --build
```

Open `http://localhost` in your browser. That's it.

Docker starts PostgreSQL, both app containers and Nginx automatically — no Node.js or PostgreSQL installation needed.

---

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/shorten` | Shorten a URL |
| `GET` | `/:code` | Redirect to original URL |
| `GET` | `/api/links` | Get all links with click counts |
| `GET` | `/health` | Health check + version |

### Shorten a URL

```bash
curl -X POST http://localhost/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://example.com/very/long/path"}'
```

```json
{
  "code": "1",
  "short": "http://localhost/1"
}
```

### Get all links

```bash
curl http://localhost/api/links
```

```json
[
  {
    "code": "1",
    "original": "https://example.com/very/long/path",
    "clicks": 4,
    "created_at": "2026-11-26T10:00:00Z"
  }
]
```

---

## Blue-green deployment

Two identical containers run at all times. One is live, one is idle. Deploying a new version:

1. Builds the new image into the idle container
2. Health-checks it before touching traffic
3. Reloads Nginx to switch — zero dropped connections
4. Keeps the previous container warm for instant rollback

```bash
# Initialise (first time only)
echo "blue" > active_slot.txt

# Deploy
./deploy.sh

# Output:
# Active: blue → deploying to: green
# Health checking green...
# green is healthy.
# Traffic switched to green.
# Deploy complete. green is now live. blue is idle (ready for rollback).

# Rollback — just run again
./deploy.sh
```

### Verify the switch

Open two terminals:

```bash
# Terminal 1 — watch the version
watch -n 1 'curl -s http://localhost/health'

# Terminal 2 — trigger deploy
./deploy.sh
```

Watch `"version": "1.0.0"` flip to `"version": "2.0.0"` with no errors.

---

## Project structure

```
link-shortener/
├── src/
│   ├── index.js              # Express entry point
│   ├── routes/
│   │   └── links.js          # All routes + Base62 logic
│   └── db/
│       ├── pool.js            # PostgreSQL connection pool
│       └── schema.sql         # Table definitions
├── public/
│   └── index.html             # Frontend dashboard
├── nginx/
│   └── nginx.conf             # Upstream switch config
├── Dockerfile                 # node:20-alpine image
├── docker-compose.yml         # 4 services: postgres, blue, green, nginx
├── deploy.sh                  # Blue-green switch script
└── active_slot.txt            # Tracks which slot is live
```

---

## How to explain it in an interview

> "I built a URL shortener from scratch using Node.js and PostgreSQL, then containerised it with Docker and set up a blue-green deployment pipeline. The app runs as two identical containers behind Nginx — when I deploy a new version, a script builds the idle container, health-checks it, then reloads Nginx to flip the traffic with zero downtime. I also implemented automatic rollback by keeping the previous container warm."

---

## Optional enhancements

- [ ] Custom aliases — let users set their own short code
- [ ] Link expiry — `expires_at` column, return 410 Gone
- [ ] QR code generation
- [ ] Rate limiting with `express-rate-limit`
- [ ] GitHub Actions CI — run `./deploy.sh` on push to main
- [ ] Auth — protect the dashboard with an API key

---

## License

MIT
