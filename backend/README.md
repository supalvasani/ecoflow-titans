# SynchroShift Backend

Express API for SynchroShift — Catalog Change Requests against Catalog Items and Variant Sets.

## Quick Start

### Prerequisites
- Node.js (v18+)
- PostgreSQL
- npm

### Installation

```bash
npm install
```

Create a `.env` file:

```env
DATABASE_URL="postgresql://postgres:admin@localhost:5432/synchroshift"
JWT_SECRET="your-secret-key"
PORT=5000
FRONTEND_URL="http://localhost:5173"
```

```bash
npm run db:push
npm run seed
npm run dev
```

Server: `http://localhost:5000`  
Swagger: `http://localhost:5000/api-docs`

## Seeded Users

All passwords: `admin123`

| Role | Email |
|------|-------|
| ADMIN | admin@synchroshift.com |
| MERCHANDISER | merch1@synchroshift.com |
| CATEGORY_APPROVER | approver@synchroshift.com |
| STOREFRONT_VIEWER | storefront@synchroshift.com |

## Architecture

Layered: routes → controllers → services → Drizzle/PostgreSQL.

Main mounts: `/api/auth`, `/api/catalog-items`, `/api/variant-sets`, `/api/ccrs`, `/api/publish-tasks`, `/api/reports`, `/api/settings`, `/api/audit`, `/api/users`.

## Scripts

- `npm run dev` — development server (nodemon + tsx)
- `npm run seed` — seed demo catalog + users
- `npm run db:push` — push Drizzle schema
- `npm test` — acceptance tests
- `npm run lint` — `tsc --noEmit`

## Tech Stack

- Node.js + TypeScript
- Express.js
- PostgreSQL + Drizzle ORM
- JWT + bcrypt
- Swagger/OpenAPI
