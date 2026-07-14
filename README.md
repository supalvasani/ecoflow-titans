# EcoFlow Titans

An Engineering Change Order (ECO) Management System designed to streamline product lifecycle management, bill of materials (BOM) tracking, and engineering change processes with strict role-based access control and full audit traceability.

---

## 🚀 Quick Reviewer Summary: What Changed & Why

If you only have 5 minutes to review the codebase changes:

1. **Replaced Prisma with Drizzle ORM**:
   - **Why**: Prisma lacked atomic transaction locking and had query isolation limitations during version cloning. Drizzle ORM provides native PostgreSQL transaction blocks (`db.transaction(tx => ...)`), explicit locking (`SELECT FOR UPDATE`), low memory footprint, and exact control over query filtering.
2. **Fixed Critical Visibility Bug (Stale Operations Data)**:
   - **Diagnosis**: Standard `applyECO` performed multi-step non-atomic operations, leaving old versions marked active or keeping stale BOM component pointers to archived product versions.
   - **Solution**: Refactored `applyECO` into a single SQL transaction that locks records, increments versions, archives previous rows, inserts new ACTIVE rows, updates parent pointers, and dynamically resolves active component product references for Operations users.
3. **Consolidated & Cleaned API Surface**:
   - Merged split ECO creation routes (`/api/ecos/create`, `/product`, `/bom`) into a unified `POST /api/ecos`.
   - Consolidated stage progression into `POST /api/ecos/:id/advance`.
   - Dropped redundant sub-resource routes (`.../components`, `.../operations`).
   - Detailed documentation provided in [`API_CHANGELOG.md`](./API_CHANGELOG.md).
4. **Enforced Strict Server-Side RBAC Guards**:
   - Every single endpoint enforces role access server-side (middleware return `403` for unauthorized attempts).
   - Operations users are strictly restricted to `ACTIVE` current version data inside the SQL queries across Products, BOMs, and Operations Tasks.

---

## Project Description

EcoFlow Titans is a comprehensive web application that manages the entire lifecycle of products and their associated bills of materials (BOMs) through controlled Engineering Change Orders (ECOs). The system ensures data integrity, prevents direct edits to active data, and maintains complete traceability of all changes.

### Key Features

- **Role-Based Access Control**: Admin, Engineering, Approver, and Operations roles with specific permissions
- **Product Management**: Create and manage products with versioning and status tracking
- **BOM Management**: Hierarchical bill of materials with component and operation tracking
- **ECO Workflow**: Structured engineering change order process with approval stages
- **Audit Logging**: Complete traceability of all system changes
- **Data Integrity**: Strict invariants prevent direct edits to active data
- **Interactive API Documentation**: Swagger/OpenAPI for easy testing and integration

### System Invariants

The system follows strict rules to maintain data integrity:
- No direct edits to active products or BOMs
- All changes must go through ECO approval workflows
- Archived data is immutable and preserved for audit
- Only active versions are usable in operations
- Draft data is isolated and never affects master data

## Tech Stack

### Backend
- **Runtime**: Node.js (v18+)
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM (`drizzle-orm` + `pg`)
- **Authentication**: JWT (`jsonwebtoken`)
- **Password Hashing**: bcrypt
- **API Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui

---

## Testing

### Automated Test Suite (Acceptance Tests)
Run end-to-end acceptance tests verifying the version apply lifecycle, stale data resolution, and RBAC matrix:
```bash
cd backend
npm test
```

---

## Deliverable Documents

- [API Changelog & Surface Refactoring](./API_CHANGELOG.md)
- [Implementation Plan & Audit Findings](./IMPLEMENTATION_PLAN.md)