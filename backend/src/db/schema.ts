import { pgTable, text, timestamp, integer, numeric, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================
// ENUMS
// ============================================================

// Roles: Merchandiser proposes changes, Category Approver reviews,
// Storefront Viewer only ever sees ACTIVE+isCurrent catalog data, Admin has full control.
export const roleEnum = pgEnum('Role', ['MERCHANDISER', 'CATEGORY_APPROVER', 'STOREFRONT_VIEWER', 'ADMIN']);

export const itemStatusEnum = pgEnum('ItemStatus', ['ACTIVE', 'ARCHIVED']);

// CCR = Catalog Change Request
export const ccrTypeEnum = pgEnum('CCRType', ['CATALOG_ITEM', 'VARIANT_SET', 'VARIANT_SET_CHANGE', 'ROLLBACK']);
export type CCRType = 'CATALOG_ITEM' | 'VARIANT_SET' | 'VARIANT_SET_CHANGE' | 'ROLLBACK';
export const CCRType = {
  CATALOG_ITEM: 'CATALOG_ITEM' as const,
  VARIANT_SET: 'VARIANT_SET' as const,
  VARIANT_SET_CHANGE: 'VARIANT_SET_CHANGE' as const,
  ROLLBACK: 'ROLLBACK' as const,
};

export const channelEnum = pgEnum('Channel', ['WEB', 'MOBILE_APP', 'MARKETPLACE']);

export const contentTypeEnum = pgEnum('ContentType', ['IMAGE', 'DESCRIPTION', 'SPEC_SHEET']);

export const approvalDecisionEnum = pgEnum('ApprovalDecision', ['APPROVED', 'REJECTED']);

// ============================================================
// USERS
// ============================================================
export const users = pgTable('User', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name'),
  role: roleEnum('role').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

// ============================================================
// CATALOG ITEM
// ============================================================
export const catalogItems = pgTable('CatalogItem', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sku: text('sku').notNull().unique(),
  brand: text('brand'),
  category: text('category'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

// Catalog Item Version — immutable revision
export const catalogItemVersions = pgTable('CatalogItemVersion', {
  id: text('id').primaryKey(),
  catalogItemId: text('catalogItemId').notNull().references(() => catalogItems.id),
  version: integer('version').notNull(),
  salePrice: numeric('salePrice', { precision: 10, scale: 2 }).notNull(),
  costPrice: numeric('costPrice', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('USD').notNull(),
  status: itemStatusEnum('status').notNull(),
  isCurrent: boolean('isCurrent').default(false).notNull(),
  // Scheduled/future-dated activation: approved version doesn't go ACTIVE until this timestamp.
  // TODO: A real cron scheduler (node-cron) would call publishNowService.activatePendingVersions()
  //       periodically to flip status/isCurrent when now() >= effectiveFrom.
  //       For demo purposes, use the manual POST /api/publish-now/activate endpoint instead.
  effectiveFrom: timestamp('effectiveFrom'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

// Catalog Item Content — locale-aware, approval-gated
export const catalogItemContent = pgTable('CatalogItemContent', {
  id: text('id').primaryKey(),
  catalogItemVersionId: text('catalogItemVersionId').notNull().references(() => catalogItemVersions.id),
  locale: text('locale').notNull().default('en-US'), // e.g. en-US, fr-FR, ja-JP
  contentType: contentTypeEnum('contentType').notNull(),
  filename: text('filename').notNull(),
  url: text('url').notNull(),
  // A locale's content can't go live on that locale's channel rule until this is true.
  // Gate check in channelPublishRules isLive toggle: validates approved=true for matching locale.
  approved: boolean('approved').default(false).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

// ============================================================
// VARIANT SET — the structure of a catalog item (its variants + publish rules)
// ============================================================
export const variantSets = pgTable('VariantSet', {
  id: text('id').primaryKey(),
  catalogItemId: text('catalogItemId').notNull().references(() => catalogItems.id),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export const variantSetVersions = pgTable('VariantSetVersion', {
  id: text('id').primaryKey(),
  variantSetId: text('variantSetId').notNull().references(() => variantSets.id),
  catalogItemVersionId: text('catalogItemVersionId').notNull().references(() => catalogItemVersions.id),
  version: integer('version').notNull(),
  status: itemStatusEnum('status').notNull(),
  isCurrent: boolean('isCurrent').default(false).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

// Variant — a specific color/size/etc SKU under this variant set.
// Reuses catalogItemVersions recursively.
export const variants = pgTable('Variant', {
  id: text('id').primaryKey(),
  variantSetVersionId: text('variantSetVersionId').notNull().references(() => variantSetVersions.id),
  variantVersionId: text('variantVersionId').notNull().references(() => catalogItemVersions.id),
  attributeName: text('attributeName').notNull(), // e.g. "Color", "Size"
  attributeValue: text('attributeValue').notNull(), // e.g. "Red", "XL"
  stockQty: integer('stockQty').notNull(),
});

// Channel Publish Rule — enables staggered multi-channel/region rollout.
// Each row is independently live/not-live per channel+region, unlike one global ACTIVE flag.
export const channelPublishRules = pgTable('ChannelPublishRule', {
  id: text('id').primaryKey(),
  variantSetVersionId: text('variantSetVersionId').notNull().references(() => variantSetVersions.id),
  channel: channelEnum('channel').notNull(),
  region: text('region').notNull(), // e.g. "US", "EU", "APAC"
  isLive: boolean('isLive').default(false).notNull(),
  // TODO: Real scheduler calls publishNowService.activatePendingChannelRules() periodically.
  //       Manual equivalent: POST /api/publish-now/channels
  goLiveAt: timestamp('goLiveAt'), // scheduled activation per channel/region
  publishLeadMinutes: integer('publishLeadMinutes').default(0).notNull(), // CDN/cache propagation buffer
});

// ============================================================
// PROMOTIONS (new) — enables promotion-conflict detection during CCR validation
// ============================================================
export const promotions = pgTable('Promotion', {
  id: text('id').primaryKey(),
  catalogItemId: text('catalogItemId').notNull().references(() => catalogItems.id),
  name: text('name').notNull(),
  discountPercent: numeric('discountPercent', { precision: 5, scale: 2 }).notNull(),
  startDate: timestamp('startDate').notNull(),
  endDate: timestamp('endDate').notNull(),
  status: itemStatusEnum('status').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

// ============================================================
// WORKFLOW STAGES
// ============================================================
export const ccrStages = pgTable('CCRStage', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sequence: integer('sequence').notNull(),
  requiresApproval: boolean('requiresApproval').default(false).notNull(),
  isFinal: boolean('isFinal').default(false).notNull(),
  // N-of-M multi-approver support. Default 1 preserves single-approver behavior.
  minApprovals: integer('minApprovals').default(1).notNull(),
});

// ============================================================
// CATALOG CHANGE REQUEST — the staging/sandbox object
// ============================================================
export const catalogChangeRequests = pgTable('CatalogChangeRequest', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: ccrTypeEnum('type').notNull(),
  createdById: text('createdById').notNull().references(() => users.id),
  assigneeId: text('assigneeId').references(() => users.id),
  stageId: text('stageId').notNull().references(() => ccrStages.id),
  effectiveDate: timestamp('effectiveDate'),
  versionUpdate: boolean('versionUpdate').default(true).notNull(),
  mandatoryApproval: boolean('mandatoryApproval').default(false).notNull(),
  catalogItemVersionId: text('catalogItemVersionId').references(() => catalogItemVersions.id),
  variantSetVersionId: text('variantSetVersionId').references(() => variantSetVersions.id),

  // Draft catalog-item fields
  draftCatalogItemId: text('draftCatalogItemId').references(() => catalogItems.id),
  draftName: text('draftName'),
  draftSalePrice: numeric('draftSalePrice', { precision: 10, scale: 2 }),
  draftCostPrice: numeric('draftCostPrice', { precision: 10, scale: 2 }),
  draftCurrency: text('draftCurrency'),

  // Draft variant-set fields
  draftVariantSetId: text('draftVariantSetId').references(() => variantSets.id),
  draftNotes: text('draftNotes'),
  draftVariants: jsonb('draftVariants'),
  draftChannelRules: jsonb('draftChannelRules'),
  draftContent: jsonb('draftContent'),

  // Rollback CCR: if type = ROLLBACK, references the ARCHIVED version to restore.
  // On apply: current ACTIVE version archived, target version cloned forward as new current.
  rollbackTargetVersionId: text('rollbackTargetVersionId').references(() => catalogItemVersions.id),

  // Set by /validate endpoint: true if CCR price change overlaps an ACTIVE Promotion's date range.
  // Non-blocking — surfaces as warning to approver, does not block submission.
  promotionConflictFlag: boolean('promotionConflictFlag').default(false).notNull(),

  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

// Individual approval decisions against a CCR — supports N-of-M multi-approver stages.
// A CCR only advances past a stage once count(decision=APPROVED) >= CCRStage.minApprovals.
export const ccrApprovals = pgTable('CCRApproval', {
  id: text('id').primaryKey(),
  ccrId: text('ccrId').notNull().references(() => catalogChangeRequests.id),
  approverId: text('approverId').notNull().references(() => users.id),
  decision: approvalDecisionEnum('decision').notNull(),
  comment: text('comment'),
  decidedAt: timestamp('decidedAt').defaultNow().notNull(),
});

// ============================================================
// AUDIT LOG
// ============================================================
export const auditLogs = pgTable('AuditLog', {
  id: text('id').primaryKey(),
  ccrId: text('ccrId').references(() => catalogChangeRequests.id),
  entity: text('entity').notNull(),
  entityId: text('entityId').notNull(),
  userId: text('userId').notNull().references(() => users.id),
  action: text('action').notNull(),
  oldValue: text('oldValue'),
  newValue: text('newValue'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// ============================================================
// PUBLISH TASK
// ============================================================
export const publishTasks = pgTable('PublishTask', {
  id: text('id').primaryKey(),
  ccrId: text('ccrId').notNull().references(() => catalogChangeRequests.id),
  title: text('title').notNull(),
  description: text('description'),
  channel: channelEnum('channel'),
  scheduledFor: timestamp('scheduledFor'),
  status: text('status').default('PENDING').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  completedAt: timestamp('completedAt'),
});

// ============================================================
// RELATIONS
// ============================================================
export const usersRelations = relations(users, ({ many }) => ({
  ccrs: many(catalogChangeRequests, { relationName: 'createdBy' }),
  assignedCcrs: many(catalogChangeRequests, { relationName: 'assignedTo' }),
  auditLogs: many(auditLogs),
  approvals: many(ccrApprovals),
}));

export const catalogItemsRelations = relations(catalogItems, ({ many }) => ({
  versions: many(catalogItemVersions),
  variantSets: many(variantSets),
  promotions: many(promotions),
}));

export const catalogItemVersionsRelations = relations(catalogItemVersions, ({ one, many }) => ({
  catalogItem: one(catalogItems, { fields: [catalogItemVersions.catalogItemId], references: [catalogItems.id] }),
  content: many(catalogItemContent),
  variantSetVersions: many(variantSetVersions),
  usedAsVariantIn: many(variants),
}));

export const catalogItemContentRelations = relations(catalogItemContent, ({ one }) => ({
  catalogItemVersion: one(catalogItemVersions, { fields: [catalogItemContent.catalogItemVersionId], references: [catalogItemVersions.id] }),
}));

export const promotionsRelations = relations(promotions, ({ one }) => ({
  catalogItem: one(catalogItems, { fields: [promotions.catalogItemId], references: [catalogItems.id] }),
}));

export const variantSetsRelations = relations(variantSets, ({ one, many }) => ({
  catalogItem: one(catalogItems, { fields: [variantSets.catalogItemId], references: [catalogItems.id] }),
  versions: many(variantSetVersions),
}));

export const variantSetVersionsRelations = relations(variantSetVersions, ({ one, many }) => ({
  variantSet: one(variantSets, { fields: [variantSetVersions.variantSetId], references: [variantSets.id] }),
  catalogItemVersion: one(catalogItemVersions, { fields: [variantSetVersions.catalogItemVersionId], references: [catalogItemVersions.id] }),
  variants: many(variants),
  channelPublishRules: many(channelPublishRules),
}));

export const variantsRelations = relations(variants, ({ one }) => ({
  variantSetVersion: one(variantSetVersions, { fields: [variants.variantSetVersionId], references: [variantSetVersions.id] }),
  variantVersion: one(catalogItemVersions, { fields: [variants.variantVersionId], references: [catalogItemVersions.id] }),
}));

export const channelPublishRulesRelations = relations(channelPublishRules, ({ one }) => ({
  variantSetVersion: one(variantSetVersions, { fields: [channelPublishRules.variantSetVersionId], references: [variantSetVersions.id] }),
}));

export const catalogChangeRequestsRelations = relations(catalogChangeRequests, ({ one, many }) => ({
  createdBy: one(users, { fields: [catalogChangeRequests.createdById], references: [users.id], relationName: 'createdBy' }),
  assignedTo: one(users, { fields: [catalogChangeRequests.assigneeId], references: [users.id], relationName: 'assignedTo' }),
  stage: one(ccrStages, { fields: [catalogChangeRequests.stageId], references: [ccrStages.id] }),
  catalogItemVersion: one(catalogItemVersions, { fields: [catalogChangeRequests.catalogItemVersionId], references: [catalogItemVersions.id] }),
  variantSetVersion: one(variantSetVersions, { fields: [catalogChangeRequests.variantSetVersionId], references: [variantSetVersions.id] }),
  draftCatalogItem: one(catalogItems, { fields: [catalogChangeRequests.draftCatalogItemId], references: [catalogItems.id] }),
  draftVariantSet: one(variantSets, { fields: [catalogChangeRequests.draftVariantSetId], references: [variantSets.id] }),
  rollbackTargetVersion: one(catalogItemVersions, { fields: [catalogChangeRequests.rollbackTargetVersionId], references: [catalogItemVersions.id] }),
  auditLogs: many(auditLogs),
  publishTasks: many(publishTasks),
  approvals: many(ccrApprovals),
}));

export const ccrApprovalsRelations = relations(ccrApprovals, ({ one }) => ({
  ccr: one(catalogChangeRequests, { fields: [ccrApprovals.ccrId], references: [catalogChangeRequests.id] }),
  approver: one(users, { fields: [ccrApprovals.approverId], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  ccr: one(catalogChangeRequests, { fields: [auditLogs.ccrId], references: [catalogChangeRequests.id] }),
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export const publishTasksRelations = relations(publishTasks, ({ one }) => ({
  ccr: one(catalogChangeRequests, { fields: [publishTasks.ccrId], references: [catalogChangeRequests.id] }),
}));
