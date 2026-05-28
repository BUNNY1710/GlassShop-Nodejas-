# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GlassShop is a full-stack business management application for a glass shop. It handles stock inventory, customer management, quotations, invoices, billing, and staff management.

**Stack:**
- **Backend**: Node.js / Express.js (`glassshop-backend/`)
- **Frontend**: React 19 + Tailwind CSS (`glass-ai-agent-frontend/`)
- **Database**: PostgreSQL via Sequelize ORM
- **Auth**: JWT with role-based access (`ROLE_ADMIN`, `ROLE_STAFF`)

There is also a legacy Spring Boot backend under `GlassShop/` (kept for reference only — the active backend is the Node.js one).

---

## Commands

### Root (from `GlassShop-Nodejas-/`)
```bash
npm run install:all       # Install all dependencies (root + backend + frontend)
npm run start:backend     # Start backend in dev mode (nodemon)
npm run start:frontend    # Start frontend dev server
npm run build:frontend    # Build frontend for production
npm run test:backend      # Run backend Jest tests
npm run test:frontend     # Run frontend React tests
```

### Backend (`glassshop-backend/`)
```bash
npm run dev               # nodemon server.js (auto-reload)
npm start                 # node server.js (production)
npm test                  # jest
```

### Frontend (`glass-ai-agent-frontend/`)
```bash
npm start                 # React dev server on :3000
npm run build             # Production build
npm test                  # React Testing Library (watch mode)
npm run test:coverage     # Coverage report (no watch)
npm run cypress:open      # Cypress interactive
npm run test:e2e          # Cypress headless
```

### Database migrations (run if schema errors occur)
```bash
node glassshop-backend/scripts/add-discount-columns.js
# or directly:
psql -U postgres -d glass_shop -f glassshop-backend/migrations/add_discount_fields.sql
```

---

## Backend Architecture

**Entry point**: `glassshop-backend/server.js`

All routes are prefixed `/api/` and protected by `authMiddleware` (JWT Bearer token) except `/api/auth`.

| Route prefix | File | Access |
|---|---|---|
| `/api/auth` | `routes/auth.js` | Public |
| `/api/stock` | `routes/stock.js` | STAFF + ADMIN |
| `/api/customers` | `routes/customer.js` | ADMIN only |
| `/api/quotations` | `routes/quotation.js` | ADMIN only |
| `/api/invoices` | `routes/invoice.js` | ADMIN only |
| `/api/audit` | `routes/audit.js` | ADMIN only |
| `/api/ai` | `routes/ai.js` | ADMIN only |
| `/api/glass-price-master` | `routes/glassPriceMaster.js` | ADMIN only |

**Auth flow**: JWT tokens are validated in `middleware/auth.js` using `utils/jwt.js`. The token encodes `username` and `role`. Role enforcement is done via `requireAdmin` / `requireStaff` middleware helpers.

**Database**: `config/database.js` creates a Sequelize instance. `models/index.js` imports all models, wires associations, and re-exports them. All models use factory functions: `require('./ModelName')(sequelize)`.

**Key model relationships**:
- `Shop` is the top-level tenant — every `User`, `Stock`, `Customer`, `Quotation`, and `Invoice` belongs to a `Shop`.
- `Quotation` → `QuotationItem[]`, and can become an `Invoice` → `InvoiceItem[]` + `Payment[]`.
- `Stock` tracks inventory per glass type (`Glass`) and stand; `StockHistory` is linked by `glassId`/`shopId`/`standNo` (no direct FK to `Stock`).

**PDF generation**: `services/pdfService.js` uses `pdfkit` to generate quotation PDFs, invoices (TAX INVOICE), basic invoices, and delivery challans.

**Environment variables** (create `glassshop-backend/.env`):
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=glass_shop
DB_USERNAME=postgres
DB_PASSWORD=<password>
JWT_SECRET=<secret>
JWT_EXPIRATION=24h
PORT=8080
EC2_IP=<ec2-ip>   # used by CORS config
```

In non-production environments the server calls `sequelize.sync({ alter: false })` on startup. **Do not use `force: true`** — it drops tables.

---

## Frontend Architecture

**Entry**: `src/index.js` → `src/App.js`

**Routing** (React Router v7): All authenticated pages live inside `<Layout />` which provides the sidebar. Two roles exist:
- `ROLE_ADMIN`: full access including customers, quotations, invoices, audit, AI, staff management, glass price master.
- `ROLE_STAFF`: stock management, stock transfer, staff-specific quotation view.

**Auth state**: Stored in `sessionStorage` keys: `token`, `role`, `username`. The `ProtectedRoute` component reads `role` for access control.

**API client**: `src/api/api.js` — axios instance with base URL logic:
- Uses `REACT_APP_API_URL` env var if set.
- Falls back to `http://localhost:8080` locally, or the EC2 IP when hosted on S3/CloudFront.
- Auto-redirects to `/login` on 401 responses (except auth endpoints).

**Design system**: Reusable UI primitives are in `src/components/ui/` (Button, Card, Modal, Input, Select, Badge, etc.). Design tokens and animation presets live in `src/design/`. Theme (light/dark) is managed by `src/context/ThemeProvider.js`.

**Frontend env** (create `glass-ai-agent-frontend/.env`):
```
REACT_APP_API_URL=http://localhost:8080
```

---

## Deployment

The app is designed to deploy the backend on AWS EC2 (Node.js + PM2 + nginx reverse proxy on port 8080) and the frontend as a static build on S3. Deployment scripts and nginx configs are in the `deploy/` directory.

The CORS config in `server.js` is permissive (allows all origins with credentials) — this was intentional for the EC2 deployment. Review before hardening for production.
