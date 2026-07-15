# ECOFlow — Engineering Change Order System

An Engineering Change Order (ECO) Management System that enables controlled, versioned, approval-driven changes to **Products** and **Bills of Materials (BOMs)**. No one ever edits master data directly — every change is Proposed → Reviewed → Approved → Applied.

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
┌──────────────────────────▼──────────────────────────┐
│                  Express.js Backend                 │
│   TypeScript + Drizzle ORM + JWT Auth               │
│   Port: 3000                                        │
└──────────────────────────┬──────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────┐
│                     PostgreSQL                      │
│   (Products, BOMs, ECOs, Audit Logs, Users)         │
└─────────────────────────────────────────────────────┘
```

### Key Invariants
- **No direct edits to active data** — every change goes through an ECO workflow
- **Atomic version application** — ECO apply runs in a single SQL transaction with `SELECT FOR UPDATE` locking
- **Audit logging** — every state transition is logged with user, timestamp, and before/after data
- **Complete version history** — archived versions are never deleted, always queryable

### ECO Types
There are exactly **two** ECO types:

| Type | Target | What it changes |
|------|--------|-----------------|
| `PRODUCT` | A Product | Sale price, cost price, description, specs |
| `BOM` | A BOM | Components (add/remove/update quantity), Operations (add/remove/update) |

The **Version Update** toggle is an attribute of every ECO — when enabled, a new version is created on apply; when disabled, the current version is overwritten in place.

---

## Roles & Permissions

| Role | Create ECO | Edit Draft | Submit | Approve | Reject | Apply | Admin Settings | View Reports | View Operations |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `ADMIN` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `ENGINEERING_USER` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `APPROVER` | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `OPERATIONS_USER` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### Default Seeded Users

| Email | Password | Role |
|-------|----------|------|
| `admin@ecoflow.com` | `admin123` | ADMIN |
| `engineer@ecoflow.com` | `eng123` | ENGINEERING_USER |
| `approver@ecoflow.com` | `approver123` | APPROVER |
| `ops@ecoflow.com` | `ops123` | OPERATIONS_USER |

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
DATABASE_URL=postgresql://postgres:password@localhost:5432/ecoflow
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars
FRONTEND_URL=http://localhost:5173
PORT=3000
```

### 3. Set Up Database

```bash
cd backend

# Push schema to database
npm run db:push

# Seed with demo data (including scenario products)
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
- **Backend API**: http://localhost:3000
- **Swagger UI**: http://localhost:3000/api-docs

---

## API Quick Reference

### Auth
| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | Public | Login → returns JWT |
| POST | `/api/auth/logout` | Any | Logout |
| GET | `/api/auth/me` | Any | Current user |

### Products
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/products` | Eng/Approver/Admin | List all products |
| POST | `/api/products` | Eng/Admin | Create product (creates v1 automatically) |
| GET | `/api/products/:id` | Eng/Approver/Admin | Product with all versions |
| GET | `/api/products/:id/active` | **All** | Current active version only |
| GET | `/api/products/:id/versions` | Eng/Approver/Admin | All versions |

### BOMs
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/boms` | Eng/Approver/Admin | List all BOMs |
| POST | `/api/boms` | Eng/Admin | Create BOM for a product |
| GET | `/api/boms/:id` | Eng/Approver/Admin | BOM with all versions |
| GET | `/api/boms/:id/active` | **All** | Current active BOM version with components & operations |
| GET | `/api/boms/:id/versions/:versionId/components` | Eng/Approver/Admin | Components for a specific version |
| GET | `/api/boms/:id/versions/:versionId/operations` | Eng/Approver/Admin | Operations for a specific version |

### ECOs
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/ecos` | Eng/Approver/Admin | List ECOs (filterable by type/status) |
| POST | `/api/ecos` | Eng/Approver/Admin | Create ECO (PRODUCT or BOM) |
| GET | `/api/ecos/:id` | Eng/Approver/Admin | ECO detail with diff view data |
| PATCH | `/api/ecos/:id/draft` | Eng/Admin | Update ECO draft (unified for both types) |
| POST | `/api/ecos/:id/draft/attachments` | Eng/Admin | Upload attachment to draft |
| POST | `/api/ecos/:id/submit` | Eng/Approver/Admin | Submit for review |
| POST | `/api/ecos/:id/validate` | Eng/Approver/Admin | Validate ECO readiness |
| POST | `/api/ecos/:id/approve` | Approver/Admin | Approve ECO |
| POST | `/api/ecos/:id/reject` | Approver/Admin | Reject ECO back to draft |
| POST | `/api/ecos/:id/apply` | Admin | Apply approved ECO to master data |

### Reports
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/reports/eco-history` | Eng/Approver/Admin | All ECO change records |
| GET | `/api/reports/product-versions` | Eng/Approver/Admin | Product version history |
| GET | `/api/reports/bom-history` | Eng/Approver/Admin | BOM change history |
| GET | `/api/reports/archived-products` | Eng/Approver/Admin | Archived/decommissioned versions |
| GET | `/api/reports/active-matrix` | Eng/Approver/Admin | Live active catalog matrix |

---

## Demo Scenarios

Both scenarios are pre-seeded in the database after running `npm run seed`.

### Scenario 1 — Wooden Table BOM Quantity Adjustment

**Objective**: Change Screws quantity from 12 → 16, add "Quality Inspection" operation.

**Step-by-step in the UI:**

1. Log in as **engineer@ecoflow.com** (`eng123`)
2. Navigate to **BOMs** → find **Wooden Table**
3. Click **Create ECO** → Type: **BOM** → select Wooden Table BOM
4. In the draft editor:
   - Update Screws quantity from `12` to `16`
   - Add new operation: `Quality Inspection`, 10 minutes, Work Center: `QC Dept`
5. Click **Submit for Review**
6. Log out → Log in as **approver@ecoflow.com** (`approver123`)
7. Navigate to **ECOs** → open the Wooden Table ECO → click **Approve**
8. Log out → Log in as **admin@ecoflow.com** (`admin123`)
9. Navigate to **ECOs** → open the Wooden Table ECO → click **Apply**
10. Log out → Log in as **ops@ecoflow.com** (`ops123`)
11. Navigate to **Operations** → confirm the BOM now shows screws qty = 16 and Quality Inspection operation

**Automated via test:**
```bash
cd backend && npm test
# Scenario 1: Full ECO apply lifecycle on Wooden Table BOM quantity adjustment ✅
```

---

### Scenario 2 — iPhone 17 Pricing Update

**Objective**: Update sale price due to premium upgrade ($999 → $1099).

The iPhone 17 Pro product is pre-seeded with:
- **Version 1**: `$999 sale / $450 cost` (ARCHIVED — shows pricing history)
- **Version 2**: `$1099 sale / $480 cost` (ACTIVE — reflects the applied price ECO)

**Step-by-step to run a new price update via ECO:**

1. Log in as **engineer@ecoflow.com** (`eng123`)
2. Navigate to **Products** → find **iPhone 17 Pro**
3. Click **Create ECO** → Type: **Product** → select iPhone 17 Pro
4. In the draft editor: set `salePrice: 1149.00`, `costPrice: 500.00`
5. Click **Submit for Review**
6. Log in as **approver** → **Approve**
7. Log in as **admin** → **Apply**
8. Log in as **ops** → Navigate to **Operations** → The active product version now shows the updated price

**Automated via test:**
```bash
cd backend && npm test
# Scenario 2: Product price/cost update via ECO reflects immediately to Operations user ✅
```

---

## Running Tests

### Automated E2E Acceptance Suite

The test suite spins up an in-process Express app (no separate server needed) and runs against the real PostgreSQL database in a clean isolated state:

```bash
cd backend
npm test
```

Expected output:
```
TAP version 13
# Subtest: ECOFlow End-to-End Acceptance & Critical Bug Fix Suite
    ok 1 - Scenario 1: Full ECO apply lifecycle on Wooden Table BOM quantity adjustment
    ok 2 - Scenario 2: Product price/cost update via ECO reflects immediately to Operations user
    ok 3 - Role Enforcement Matrix: Assert 403 status for unauthorized operations per role
ok 1 - ECOFlow End-to-End Acceptance & Critical Bug Fix Suite
```

### TypeScript Type Checking

```bash
# Backend
cd backend && npx tsc --noEmit

# Frontend
cd frontend && npx tsc --noEmit
```

Both pass with 0 errors.