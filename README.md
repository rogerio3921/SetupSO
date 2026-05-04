# SetupSO

**SetupSO** is a surgical-center setup coordination tool that tracks rooms, cases, and events in real time — helping CC teams measure setup times and identify delays.

---

## Current Status: MVP 2 (localStorage)

The current version (`index8.html` + `app.js`) runs entirely in the browser with no backend.  
All data is persisted in `localStorage` on the device.

### Quick Start (MVP 2 — Local Only)

1. Open `index8.html` with a local web server (e.g. VS Code Live Server).
2. Navigate to `http://127.0.0.1:5500/index8.html`.
3. Start registering room events.

> **Note:** each browser/device has its own isolated `localStorage`. Data is NOT shared between devices.

---

## Road-map: Online MVP (Multi-Hospital)

The next milestone evolves SetupSO to a **server-backed, multi-hospital (multi-tenant)** system with:

- Username + password authentication (bcrypt hashing, JWT tokens)
- Role-based access control (admin vs. collaborator)
- Audit trail — every event records which user performed the action
- Shared data across all tablets and PCs in the same network
- Support for multiple hospitals (tenants) in the same cloud deployment

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the full architecture plan,  
and **[docs/openapi.yaml](docs/openapi.yaml)** for the REST API specification.

---

## Repository Structure

```
SetupSO/
├── index8.html          # Frontend (current MVP 2)
├── app.js               # Frontend logic (current MVP 2)
├── docker-compose.yml   # Local dev / on-prem deployment
├── .env.example         # Environment variables template
├── package.json         # Project metadata + dev scripts
└── docs/
    ├── ARCHITECTURE.md  # Full architecture documentation
    └── openapi.yaml     # OpenAPI 3.1 API specification
```

---

## Development (Future Backend)

```bash
# Copy and configure environment variables
cp .env.example .env

# Start all services (API + PostgreSQL + Nginx)
docker compose up -d

# Access the application
open http://localhost
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full setup instructions.

---

## License

Private — Hospital Internal Use.
