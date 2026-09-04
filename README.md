# SynchroShift — Catalog Change Request & Merchandising System

A Catalog Change Request (CCR) system that enables controlled, versioned, approval-driven changes to **Catalog Items** and **Variant Sets**. No one ever edits live catalog data directly — every change is Proposed → Reviewed → Approved → Applied.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Roles & Permissions](#roles--permissions)
3. [Running the App](#running-the-app)
4. [API Quick Reference](#api-quick-reference)
5. [Demo Scenarios](#demo-scenarios)
6. [Running Tests](#running-tests)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    React Frontend                   │
│   Vite + TypeScript + Tailwind CSS + shadcn/ui      │
│   Port: 5173                                        │
└──────────────────────────┬──────────────────────────┘
                           │ HTTP (JSON REST API)
┌─────────────────────────────────────────────────────▼
│                  Express.js Backend                 │
│   TypeScript + Drizzle ORM + JWT Auth               │
│   Port: 5000                                        │
└──────────────────────────┬──────────────────────────┘
                           │
┌─────────────────────────────────────────────────────▼
│                     PostgreSQL                      │
│   (CatalogItems, VariantSets, CCRs, Audit Logs)     │
└─────────────────────────────────────────────────────┘
```

### Key Invariants
- **No direct edits to active data** — every change goes through a CCR workflow
- **Atomic version application** — CCR apply runs in a single SQL transaction with `SELECT FOR UPDATE` locking
- **Audit logging** — every state transition is logged with user, timestamp, and before/after data
- **Complete version history** — archived versions are never deleted, always queryable

### CCR Types

| Type | Target | What it changes |
|------|--------|-----------------|
| `CATALOG_ITEM` | A Catalog Item | Sale price, cost price, name, content |
| `VARIANT_SET` | A Variant Set | Variants (add/remove/update stock/attributes), channel publish rules |
| `VARIANT_SET_CHANGE` | A Variant Set | Structural delta against an existing set |
| `ROLLBACK` | A Catalog Item version | Restore an archived version as the new current |

The **Version Update** toggle is an attribute of every CCR — when enabled, a new version is created on apply; when disabled, the current version is overwritten in place.

---

## Roles & Permissions

| Role | Create CCR | Edit Draft | Submit | Approve | Reject | Apply | Admin Settings | View Reports | Storefront view |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `ADMIN` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `MERCHANDISER` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| `CATEGORY_APPROVER` | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `STOREFRONT_VIEWER` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

Apply is gated to `MERCHANDISER` and `ADMIN` (`requireMerchandiserOrAdmin`). Approve/reject is gated to `CATEGORY_APPROVER` and `ADMIN`. Storefront viewers only see `ACTIVE` + `isCurrent` catalog data (and live channel rules).

### Default Seeded Users

All passwords: `admin123`

| Email | Role |
|-------|------|
| `admin@synchroshift.com` | ADMIN |
| `merch1@synchroshift.com` | MERCHANDISER |
| `merch2@synchroshift.com` | MERCHANDISER |
| `approver@synchroshift.com` | CATEGORY_APPROVER |
| `approver2@synchroshift.com` | CATEGORY_APPROVER (2nd approver for N-of-M) |
| `storefront@synchroshift.com` | STOREFRONT_VIEWER |

---

## Running the App

### Prerequisites
- **Node.js** v18 or later
- **PostgreSQL** (local or Docker)

### 1. Clone & Install

```bash
git clone <repo-url>
cd hackoddo2

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Environment

```bash
# backend/.env
DATABASE_URL=postgresql://postgres:password@localhost:5432/synchroshift
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars
FRONTEND_URL=http://localhost:5173
PORT=5000
```

### 3. Set Up Database

```bash
cd backend

# Push schema to database
npm run db:push

# Seed with demo data
npm run seed
```

### 4. Start Servers

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Swagger UI**: http://localhost:5000/api-docs

Frontend catalog UI lives at `/catalog-items` (list, `/new`, `/create`, `/:id`).

---

## API Quick Reference

### Auth
| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | Public | Login → returns JWT |
| POST | `/api/auth/logout` | Any | Logout |
| GET | `/api/auth/me` | Any | Current user |

### Catalog Items
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/catalog-items` | Authenticated | List catalog items (storefront: active/current only) |
| POST | `/api/catalog-items` | Merch/Admin | Create catalog item (creates v1 automatically) |
| GET | `/api/catalog-items/:id` | Authenticated | Catalog item with versions |
| GET | `/api/catalog-items/:id/active` | Authenticated | Current active version only |
| GET | `/api/catalog-items/:id/versions` | Merch/Admin | All versions |
| GET | `/api/catalog-items/:id/versions/:versionId/content` | Authenticated | Locale content for a version |

### Variant Sets
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/variant-sets` | Authenticated | List variant sets |
| POST | `/api/variant-sets` | Merch/Admin | Create variant set for a catalog item |
| GET | `/api/variant-sets/:id` | Authenticated | Variant set with versions |
| GET | `/api/variant-sets/:id/active` | Authenticated | Current active version with variants & channel rules |
| GET | `/api/variant-sets/item/:catalogItemId` | Authenticated | Variant set for a catalog item |
| PATCH | `/api/variant-sets/channel-rules/:ruleId/toggle` | Merch/Admin | Toggle a channel publish rule |

### CCRs
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/ccrs` | Merch/Approver/Admin | List CCRs |
| POST | `/api/ccrs` | Merch/Admin | Create CCR |
| GET | `/api/ccrs/:id` | Merch/Approver/Admin | CCR detail with diff data |
| PATCH | `/api/ccrs/:id/draft` | Merch/Admin | Update CCR draft |
| POST | `/api/ccrs/:id/draft/content` | Merch/Admin | Add draft content |
| POST | `/api/ccrs/:id/submit` | Merch/Admin | Submit for review |
| POST | `/api/ccrs/:id/validate` | Merch/Admin | Validate CCR readiness |
| POST | `/api/ccrs/:id/approve` | Approver/Admin | Approve CCR |
| POST | `/api/ccrs/:id/reject` | Approver/Admin | Reject CCR back to draft |
| POST | `/api/ccrs/:id/apply` | Merch/Admin | Apply approved CCR to live data |

### Reports
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/reports/ccr-history` | Merch/Approver/Admin | All CCR change records |
| GET | `/api/reports/catalog-item-versions` | Merch/Approver/Admin | Catalog item version history |
| GET | `/api/reports/variant-set-history` | Merch/Approver/Admin | Variant set change history |
| GET | `/api/reports/archived-catalog-items` | Merch/Approver/Admin | Archived versions |
| GET | `/api/reports/active-matrix` | Merch/Approver/Admin | Live active catalog matrix |

---

## Demo Scenarios

Both scenarios are pre-seeded after `npm run seed`.

### Scenario 1 — Velo Runner Pro variant / channel rollout

**Objective**: Footwear SKU with Color+Size variants; WEB/US live, MARKETPLACE/US scheduled, EU blocked on unapproved `fr-FR` content.

**Step-by-step in the UI:**

1. Log in as **merch1@synchroshift.com** (`admin123`)
2. Navigate to **Catalog Items** → find **Velo Runner Pro**
3. Open **Variant Sets** and inspect Color/Size variants and channel rules
4. Create a CCR if you want to change stock or prices, then **Submit for Review**
5. Log in as **approver@synchroshift.com** (`admin123`) and **Approve** (Review stage is seeded with `minApprovals=2`, so **approver2@synchroshift.com** is needed for N-of-M)
6. Log in as **storefront@synchroshift.com** (`admin123`) and confirm only live/active catalog is visible

**Automated via test:**
```bash
cd backend && npm test
# Scenario 1: Full CCR apply lifecycle on VariantSet stockQty adjustment
```

---

### Scenario 2 — Catalog item price update

**Objective**: Update sale/cost on a catalog item via CCR so the storefront sees the new current version.

1. Log in as **merch1@synchroshift.com**
2. Navigate to **Catalog Items** → open an item → **Create CCR** (`CATALOG_ITEM`)
3. Set draft sale/cost → **Submit for Review**
4. Log in as **approver** → **Approve**
5. Log in as **storefront** → the active version shows the updated price

**Automated via test:**
```bash
cd backend && npm test
# Scenario 2: CatalogItem price/cost update via CCR reflects immediately to Storefront
```

---

## Running Tests

### Automated E2E Acceptance Suite

The test suite spins up an in-process Express app (no separate server needed) and runs against the real PostgreSQL database in a clean isolated state:

```bash
cd backend
npm test
```

### TypeScript Type Checking

```bash
# Backend
cd backend && npx tsc --noEmit

# Frontend
cd frontend && npx tsc --noEmit
```
