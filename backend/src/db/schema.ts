import { pgTable, text, timestamp, integer, numeric, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const roleEnum = pgEnum('Role', ['ENGINEERING_USER', 'APPROVER', 'OPERATIONS_USER', 'ADMIN']);
export const itemStatusEnum = pgEnum('ItemStatus', ['ACTIVE', 'ARCHIVED']);
export const ecoTypeEnum = pgEnum('ECOType', ['PRODUCT', 'BOM', 'BOM_CHANGE']);
export type ECOType = 'PRODUCT' | 'BOM' | 'BOM_CHANGE';
export const ECOType = {
  PRODUCT: 'PRODUCT' as const,
  BOM: 'BOM' as const,
  BOM_CHANGE: 'BOM_CHANGE' as const,
};

// Users
export const users = pgTable('User', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name'),
  role: roleEnum('role').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

// Products
export const products = pgTable('Product', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

// Product Versions
export const productVersions = pgTable('ProductVersion', {
  id: text('id').primaryKey(),
  productId: text('productId').notNull().references(() => products.id),
  version: integer('version').notNull(),
  salePrice: numeric('salePrice', { precision: 10, scale: 2 }).notNull(),
  costPrice: numeric('costPrice', { precision: 10, scale: 2 }).notNull(),
  status: itemStatusEnum('status').notNull(),
  isCurrent: boolean('isCurrent').default(false).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

// Product Attachments
export const productAttachments = pgTable('ProductAttachment', {
  id: text('id').primaryKey(),
  productVersionId: text('productVersionId').notNull().references(() => productVersions.id),
  filename: text('filename').notNull(),
  url: text('url').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

// BOM Identity
export const boms = pgTable('BOM', {
  id: text('id').primaryKey(),
  productId: text('productId').notNull().references(() => products.id),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

// BOM Version
export const bomVersions = pgTable('BOMVersion', {
  id: text('id').primaryKey(),
  bomId: text('bomId').notNull().references(() => boms.id),
  productVersionId: text('productVersionId').notNull().references(() => productVersions.id),
  version: integer('version').notNull(),
  status: itemStatusEnum('status').notNull(),
  isCurrent: boolean('isCurrent').default(false).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

// BOM Components
export const bomComponents = pgTable('BOMComponent', {
  id: text('id').primaryKey(),
  bomVersionId: text('bomVersionId').notNull().references(() => bomVersions.id),
  componentVersionId: text('componentVersionId').notNull().references(() => productVersions.id),
  quantity: integer('quantity').notNull(),
});

// BOM Operations
export const bomOperations = pgTable('BOMOperation', {
  id: text('id').primaryKey(),
  bomVersionId: text('bomVersionId').notNull().references(() => bomVersions.id),
  name: text('name').notNull(),
  timeMinutes: integer('timeMinutes').notNull(),
  workCenter: text('workCenter').notNull(),
});

// Workflow Stage
export const ecoStages = pgTable('ECOStage', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sequence: integer('sequence').notNull(),
  requiresApproval: boolean('requiresApproval').default(false).notNull(),
  isFinal: boolean('isFinal').default(false).notNull(),
});

// ECO Core
export const ecos = pgTable('ECO', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: ecoTypeEnum('type').notNull(),
  createdById: text('createdById').notNull().references(() => users.id),
  assigneeId: text('assigneeId').references(() => users.id),
  stageId: text('stageId').notNull().references(() => ecoStages.id),
  effectiveDate: timestamp('effectiveDate'),
  versionUpdate: boolean('versionUpdate').default(true).notNull(),
  mandatoryApproval: boolean('mandatoryApproval').default(false).notNull(),
  productVersionId: text('productVersionId').references(() => productVersions.id),
  bomVersionId: text('bomVersionId').references(() => bomVersions.id),

  // Draft Data
  draftProductId: text('draftProductId').references(() => products.id),
  draftName: text('draftName'),
  draftSalePrice: numeric('draftSalePrice', { precision: 10, scale: 2 }),
  draftCostPrice: numeric('draftCostPrice', { precision: 10, scale: 2 }),

  draftBomId: text('draftBomId').references(() => boms.id),
  draftNotes: text('draftNotes'),
  draftComponents: jsonb('draftComponents'),
  draftOperations: jsonb('draftOperations'),
  draftAttachments: jsonb('draftAttachments'),

  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

// Audit Log
export const auditLogs = pgTable('AuditLog', {
  id: text('id').primaryKey(),
  ecoId: text('ecoId').references(() => ecos.id),
  entity: text('entity').notNull(),
  entityId: text('entityId').notNull(),
  userId: text('userId').notNull().references(() => users.id),
  action: text('action').notNull(),
  oldValue: text('oldValue'),
  newValue: text('newValue'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// Operations Task
export const operationsTasks = pgTable('OperationsTask', {
  id: text('id').primaryKey(),
  ecoId: text('ecoId').notNull().references(() => ecos.id),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').default('PENDING').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  completedAt: timestamp('completedAt'),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ecos: many(ecos, { relationName: 'createdBy' }),
  assignedEcos: many(ecos, { relationName: 'assignedTo' }),
  auditLogs: many(auditLogs),
}));

export const productsRelations = relations(products, ({ many }) => ({
  versions: many(productVersions),
  boms: many(boms),
}));

export const productVersionsRelations = relations(productVersions, ({ one, many }) => ({
  product: one(products, { fields: [productVersions.productId], references: [products.id] }),
  attachments: many(productAttachments),
  bomVersions: many(bomVersions),
  componentsUsedIn: many(bomComponents),
}));

export const productAttachmentsRelations = relations(productAttachments, ({ one }) => ({
  productVersion: one(productVersions, { fields: [productAttachments.productVersionId], references: [productVersions.id] }),
}));

export const bomsRelations = relations(boms, ({ one, many }) => ({
  product: one(products, { fields: [boms.productId], references: [products.id] }),
  versions: many(bomVersions),
}));

export const bomVersionsRelations = relations(bomVersions, ({ one, many }) => ({
  bom: one(boms, { fields: [bomVersions.bomId], references: [boms.id] }),
  productVersion: one(productVersions, { fields: [bomVersions.productVersionId], references: [productVersions.id] }),
  components: many(bomComponents),
  operations: many(bomOperations),
}));

export const bomComponentsRelations = relations(bomComponents, ({ one }) => ({
  bomVersion: one(bomVersions, { fields: [bomComponents.bomVersionId], references: [bomVersions.id] }),
  componentVersion: one(productVersions, { fields: [bomComponents.componentVersionId], references: [productVersions.id] }),
}));

export const bomOperationsRelations = relations(bomOperations, ({ one }) => ({
  bomVersion: one(bomVersions, { fields: [bomOperations.bomVersionId], references: [bomVersions.id] }),
}));

export const ecosRelations = relations(ecos, ({ one, many }) => ({
  createdBy: one(users, { fields: [ecos.createdById], references: [users.id], relationName: 'createdBy' }),
  assignedTo: one(users, { fields: [ecos.assigneeId], references: [users.id], relationName: 'assignedTo' }),
  stage: one(ecoStages, { fields: [ecos.stageId], references: [ecoStages.id] }),
  productVersion: one(productVersions, { fields: [ecos.productVersionId], references: [productVersions.id] }),
  bomVersion: one(bomVersions, { fields: [ecos.bomVersionId], references: [bomVersions.id] }),
  draftProduct: one(products, { fields: [ecos.draftProductId], references: [products.id] }),
  draftBom: one(boms, { fields: [ecos.draftBomId], references: [boms.id] }),
  auditLogs: many(auditLogs),
  operationsTasks: many(operationsTasks),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  eco: one(ecos, { fields: [auditLogs.ecoId], references: [ecos.id] }),
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export const operationsTasksRelations = relations(operationsTasks, ({ one }) => ({
  eco: one(ecos, { fields: [operationsTasks.ecoId], references: [ecos.id] }),
}));
