# API Changelog & Surface Refactoring Document

## Removed & Merged Endpoints Audit

| Old Endpoint | Action | Replaced By / New Endpoint | Justification |
|---|---|---|---|
| `POST /api/ecos/create`<br>`POST /api/ecos/product`<br>`POST /api/ecos/bom` | **MERGED** | `POST /api/ecos` | Unified ECO creation endpoint taking `{ title, type: "PRODUCT" \| "BOM", productId, bomId, initialChanges }`. Typed endpoints were redundant wrappers over the same controller logic. Legacy wrapper endpoints remain available for backwards compatibility. |
| `POST /api/ecos/:id/validate` | **CONSOLIDATED** | `POST /api/ecos/:id/advance` | Stage progression logic consolidated into `advance` endpoint which validates whether formal approval is required or simple stage advancement. |
| `GET /api/boms/:id/versions/:versionId/components`<br>`GET /api/boms/:id/versions/:versionId/operations` | **REMOVED** | `GET /api/boms/versions/:versionId` | Redundant sub-resource endpoints removed. All components and operations are returned cleanly in the nested version response. |

---

## Final Active API Endpoint List

### Authentication
- `POST /api/auth/login` - Authenticate user & get JWT token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current authenticated user profile

### Products
- `POST /api/products` - Create new product with v1 initial version (`ENGINEERING_USER`, `ADMIN`)
- `GET /api/products` - List products (Server-side filtered for `OPERATIONS_USER` to ACTIVE versions only)
- `GET /api/products/:id` - Get product by ID (Filtered for `OPERATIONS_USER`)
- `GET /api/products/:id/versions` - List version history (`ENGINEERING_USER`, `APPROVER`, `ADMIN`)
- `GET /api/products/:id/active` - Get active version pointer
- `GET /api/products/:id/versions/:versionId/attachments` - Read-only product attachments

### Bills of Materials (BOMs)
- `POST /api/boms` - Create BOM for product (`ENGINEERING_USER`, `ADMIN`)
- `GET /api/boms` - List BOMs (Server-side filtered for `OPERATIONS_USER`)
- `GET /api/boms/:id` - Get BOM by ID (Filtered for `OPERATIONS_USER`)
- `GET /api/boms/versions/:versionId` - Get specific BOM version with components & operations
- `GET /api/boms/:id/versions` - List BOM version history (`ENGINEERING_USER`, `APPROVER`, `ADMIN`)
- `GET /api/boms/:id/active` - Get current active BOM version

### Engineering Change Orders (ECOs)
- `POST /api/ecos` - Create ECO (`ENGINEERING_USER`, `APPROVER`, `ADMIN`)
- `GET /api/ecos` - List ECOs (Forbidden for `OPERATIONS_USER`)
- `GET /api/ecos/statistics` - Aggregate ECO counts by stage
- `GET /api/ecos/:id` - Get ECO detail with virtual draft view
- `PATCH /api/ecos/:id/draft/product` - Update product draft (`ENGINEERING_USER`, `ADMIN`)
- `PATCH /api/ecos/:id/draft/bom` - Update BOM draft (`ENGINEERING_USER`, `ADMIN`)
- `POST /api/ecos/:id/draft/attachments` - Add/remove draft attachments
- `POST /api/ecos/:id/submit` - Submit draft ECO for review
- `POST /api/ecos/:id/advance` - Advance stage for non-approval stages (`APPROVER`, `ADMIN`)
- `POST /api/ecos/:id/approve` - Approve ECO stage (`APPROVER`, `ADMIN`)
- `POST /api/ecos/:id/reject` - Reject ECO back to initial stage (`APPROVER`, `ADMIN`)
- `POST /api/ecos/:id/apply` - Transactionally clone version & mark ECO applied (`ADMIN`)
- `PATCH /api/ecos/:id/mandatory-approval` - Admin override for stage rules (`ADMIN`)

### Operations Tasks
- `GET /api/operations/tasks` - List pending operations tasks (`OPERATIONS_USER`, `ADMIN`)
- `PATCH /api/operations/tasks/:id` - Mark task as completed (`OPERATIONS_USER`, `ADMIN`)

### Reports (Forbidden for OPERATIONS_USER)
- `GET /api/reports/eco-history` - Query ECO lifecycle history
- `GET /api/reports/product-versions` - Query product version matrix
- `GET /api/reports/bom-history` - Query BOM version changes
- `GET /api/reports/active-matrix` - Query active matrix across products & BOMs

### Audit Trail (Forbidden for OPERATIONS_USER)
- `GET /api/audit` - Search audit logs
- `GET /api/audit/eco/:ecoId` - Get audit logs for specific ECO
- `GET /api/audit/entity/:entity/:entityId` - Get audit logs for entity

### System & Settings
- `GET /api/settings/stages` - Get workflow stage configuration
- `POST /api/settings/stages` - Configure workflow stage sequence (`ADMIN`)
- `GET /api/settings/approval-rules` - Get approval rules
- `POST /api/settings/approval-rules` - Configure approval rules (`ADMIN`)
- `GET /api/users` - List system users (`ADMIN`)
- `POST /api/users` - Create user (`ADMIN`)
