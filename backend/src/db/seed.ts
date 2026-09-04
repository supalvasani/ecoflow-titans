import { db, schema } from './index.js';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

const hashPass = (password: string) => bcrypt.hash(password, 10);

async function main() {
    console.log(' Starting SynchroShift seed (Catalog & Merchandising domain)...');

    console.log(' Cleaning up database tables...');
    const tablesToClean = [
        schema.auditLogs,
        schema.publishTasks,
        schema.ccrApprovals,
        schema.catalogChangeRequests,
        schema.ccrStages,
        schema.channelPublishRules,
        schema.variants,
        schema.variantSetVersions,
        schema.variantSets,
        schema.promotions,
        schema.catalogItemContent,
        schema.catalogItemVersions,
        schema.catalogItems,
        schema.users,
    ];
    for (const table of tablesToClean) {
        try {
            await db.delete(table);
        } catch {
            // Skip if table is locked or empty
        }
    }
    console.log(' Database cleaned\n');

    // ── Users ───────────────────────────────────────────────────────────────
    console.log(' Creating users (new role names)...');
    const pass = await hashPass('admin123');

    const adminId = crypto.randomUUID();
    const merch1Id = crypto.randomUUID();
    const merch2Id = crypto.randomUUID();
    const approverId = crypto.randomUUID();
    const approver2Id = crypto.randomUUID();
    const storefrontId = crypto.randomUUID();

    await db.insert(schema.users).values([
        { id: adminId,       email: 'admin@synchroshift.com',      password: pass, name: 'Alex Admin',        role: 'ADMIN' },
        { id: merch1Id,      email: 'merch1@synchroshift.com',     password: pass, name: 'Maya Merchandiser', role: 'MERCHANDISER' },
        { id: merch2Id,      email: 'merch2@synchroshift.com',     password: pass, name: 'Ben Buyer',         role: 'MERCHANDISER' },
        { id: approverId,    email: 'approver@synchroshift.com',   password: pass, name: 'Carol Approver',    role: 'CATEGORY_APPROVER' },
        { id: approver2Id,   email: 'approver2@synchroshift.com',  password: pass, name: 'Dan Approver',      role: 'CATEGORY_APPROVER' },
        { id: storefrontId,  email: 'storefront@synchroshift.com', password: pass, name: 'Eve Storefront',    role: 'STOREFRONT_VIEWER' },
    ]).onConflictDoNothing();
    console.log(' Users created\n');

    // ── CCR Stages (was ECOStages) ───────────────────────────────────────────
    // NOTE: stage-review seeded with minApprovals=2 to demonstrate N-of-M multi-approver.
    console.log('📋 Creating CCR stages (minApprovals=2 on Review stage to demo N-of-M)...');
    await db.insert(schema.ccrStages).values([
        { id: 'stage-draft',     name: 'Draft',       sequence: 1,  requiresApproval: false, isFinal: false, minApprovals: 1 },
        { id: 'stage-review',    name: 'Under Review', sequence: 2, requiresApproval: true,  isFinal: false, minApprovals: 2 },
        { id: 'stage-approved',  name: 'Approved',    sequence: 3,  requiresApproval: false, isFinal: false, minApprovals: 1 },
        { id: 'stage-live',      name: 'Live',        sequence: 4,  requiresApproval: false, isFinal: true,  minApprovals: 1 },
        { id: 'stage-rejected',  name: 'Rejected',    sequence: 99, requiresApproval: false, isFinal: true,  minApprovals: 1 },
    ]).onConflictDoNothing();
    console.log(' CCR Stages created\n');

    // ── SCENARIO 1: Footwear SKU — Velo Runner Pro ───────────────────────────
    // A running shoe with Color + Size variants, published on WEB + MARKETPLACE channels.
    console.log(' Seeding Scenario 1: Velo Runner Pro (footwear SKU with Color/Size variants)...');

    const veloId = crypto.randomUUID();
    const redVariantItemId = crypto.randomUUID();
    const blueVariantItemId = crypto.randomUUID();

    // Base CatalogItems (the SKU "atoms" that Variant rows reference)
    await db.insert(schema.catalogItems).values([
        { id: veloId,          name: 'Velo Runner Pro',            sku: 'VRP-001',      brand: 'Velo',  category: 'Footwear' },
        { id: redVariantItemId,  name: 'Velo Runner Pro – Red/42',  sku: 'VRP-001-R42',  brand: 'Velo',  category: 'Footwear' },
        { id: blueVariantItemId, name: 'Velo Runner Pro – Blue/44', sku: 'VRP-001-B44',  brand: 'Velo',  category: 'Footwear' },
    ]).onConflictDoNothing();

    const veloV1Id = crypto.randomUUID();
    const redV1Id  = crypto.randomUUID();
    const blueV1Id = crypto.randomUUID();

    await db.insert(schema.catalogItemVersions).values([
        { id: veloV1Id, catalogItemId: veloId,          version: 1, salePrice: '129.99', costPrice: '55.00', currency: 'USD', status: 'ACTIVE', isCurrent: true },
        { id: redV1Id,  catalogItemId: redVariantItemId,  version: 1, salePrice: '129.99', costPrice: '55.00', currency: 'USD', status: 'ACTIVE', isCurrent: true },
        { id: blueV1Id, catalogItemId: blueVariantItemId, version: 1, salePrice: '129.99', costPrice: '55.00', currency: 'USD', status: 'ACTIVE', isCurrent: true },
    ]).onConflictDoNothing();

    // CatalogItemContent (locale-aware, approved field gates regional publish)
    await db.insert(schema.catalogItemContent).values([
        { id: crypto.randomUUID(), catalogItemVersionId: veloV1Id, locale: 'en-US', contentType: 'IMAGE',       filename: 'velo-runner-hero-us.jpg',  url: 'https://cdn.synchroshift.com/velo-runner-hero-us.jpg',  approved: true  },
        { id: crypto.randomUUID(), catalogItemVersionId: veloV1Id, locale: 'en-US', contentType: 'DESCRIPTION', filename: 'velo-desc-en.md',           url: 'https://cdn.synchroshift.com/velo-desc-en.md',           approved: true  },
        { id: crypto.randomUUID(), catalogItemVersionId: veloV1Id, locale: 'fr-FR', contentType: 'IMAGE',       filename: 'velo-runner-hero-fr.jpg',  url: 'https://cdn.synchroshift.com/velo-runner-hero-fr.jpg',  approved: false }, // Not approved — blocks EU isLive
        { id: crypto.randomUUID(), catalogItemVersionId: veloV1Id, locale: 'fr-FR', contentType: 'DESCRIPTION', filename: 'velo-desc-fr.md',           url: 'https://cdn.synchroshift.com/velo-desc-fr.md',           approved: false }, // Not approved
    ]).onConflictDoNothing();

    // VariantSet + VariantSetVersion for Velo Runner Pro
    const veloVsId   = crypto.randomUUID();
    const veloVsV1Id = crypto.randomUUID();

    await db.insert(schema.variantSets).values({ id: veloVsId, catalogItemId: veloId }).onConflictDoNothing();
    await db.insert(schema.variantSetVersions).values({
        id: veloVsV1Id, variantSetId: veloVsId, catalogItemVersionId: veloV1Id,
        version: 1, status: 'ACTIVE', isCurrent: true,
    }).onConflictDoNothing();

    // Variants (was BOMComponents) — Color+Size attribute pairs
    await db.insert(schema.variants).values([
        { id: crypto.randomUUID(), variantSetVersionId: veloVsV1Id, variantVersionId: redV1Id,  attributeName: 'Color', attributeValue: 'Red',  stockQty: 200 },
        { id: crypto.randomUUID(), variantSetVersionId: veloVsV1Id, variantVersionId: redV1Id,  attributeName: 'Size',  attributeValue: '42',   stockQty: 200 },
        { id: crypto.randomUUID(), variantSetVersionId: veloVsV1Id, variantVersionId: blueV1Id, attributeName: 'Color', attributeValue: 'Blue', stockQty: 150 },
        { id: crypto.randomUUID(), variantSetVersionId: veloVsV1Id, variantVersionId: blueV1Id, attributeName: 'Size',  attributeValue: '44',   stockQty: 150 },
    ]).onConflictDoNothing();

    // Channel Publish Rules — staggered: WEB/US live immediately, MARKETPLACE/US pending, EU not live (blocked by unapproved fr-FR content)
    await db.insert(schema.channelPublishRules).values([
        { id: crypto.randomUUID(), variantSetVersionId: veloVsV1Id, channel: 'WEB',         region: 'US',   isLive: true,  goLiveAt: null,                     publishLeadMinutes: 5  },
        { id: crypto.randomUUID(), variantSetVersionId: veloVsV1Id, channel: 'MARKETPLACE', region: 'US',   isLive: false, goLiveAt: new Date('2026-09-10'),    publishLeadMinutes: 30 },
        { id: crypto.randomUUID(), variantSetVersionId: veloVsV1Id, channel: 'WEB',         region: 'EU',   isLive: false, goLiveAt: null,                     publishLeadMinutes: 10 }, // Blocked: fr-FR content not approved
        { id: crypto.randomUUID(), variantSetVersionId: veloVsV1Id, channel: 'MOBILE_APP',  region: 'APAC', isLive: true,  goLiveAt: null,                     publishLeadMinutes: 0  },
    ]).onConflictDoNothing();

    console.log('✅ Velo Runner Pro seeded\n');

    // ── SCENARIO 2: Beauty SKU — Luminos Glow Serum (with Promotion conflict demo) ──
    // An active promotion overlaps this item's price so /validate immediately flags conflict.
    console.log('💄 Seeding Scenario 2: Luminos Glow Serum (beauty SKU + overlapping Promotion)...');

    const luminosId = crypto.randomUUID();
    await db.insert(schema.catalogItems).values(
        { id: luminosId, name: 'Luminos Glow Serum 50ml', sku: 'LGS-050', brand: 'Luminos', category: 'Beauty' }
    ).onConflictDoNothing();

    const luminosV1Id = crypto.randomUUID();
    await db.insert(schema.catalogItemVersions).values(
        { id: luminosV1Id, catalogItemId: luminosId, version: 1, salePrice: '79.99', costPrice: '28.00', currency: 'USD', status: 'ACTIVE', isCurrent: true }
    ).onConflictDoNothing();

    await db.insert(schema.catalogItemContent).values([
        { id: crypto.randomUUID(), catalogItemVersionId: luminosV1Id, locale: 'en-US', contentType: 'IMAGE',       filename: 'luminos-glow-hero.jpg', url: 'https://cdn.synchroshift.com/luminos-glow-hero.jpg', approved: true },
        { id: crypto.randomUUID(), catalogItemVersionId: luminosV1Id, locale: 'en-US', contentType: 'SPEC_SHEET',  filename: 'luminos-ingredients.pdf', url: 'https://cdn.synchroshift.com/luminos-ingredients.pdf', approved: true },
    ]).onConflictDoNothing();

    // ACTIVE promotion overlapping now — any CCR that changes draftSalePrice for luminosId
    // and has an effectiveDate within this range will get promotionConflictFlag=true from /validate.
    await db.insert(schema.promotions).values({
        id: crypto.randomUUID(),
        catalogItemId: luminosId,
        name: 'Summer Glow Sale 20% Off',
        discountPercent: '20.00',
        startDate: new Date('2026-08-01'),
        endDate:   new Date('2026-09-30'), // overlaps today (2026-09-04)
        status: 'ACTIVE',
    }).onConflictDoNothing();

    const luminosVsId   = crypto.randomUUID();
    const luminosVsV1Id = crypto.randomUUID();

    await db.insert(schema.variantSets).values({ id: luminosVsId, catalogItemId: luminosId }).onConflictDoNothing();
    await db.insert(schema.variantSetVersions).values({
        id: luminosVsV1Id, variantSetId: luminosVsId, catalogItemVersionId: luminosV1Id,
        version: 1, status: 'ACTIVE', isCurrent: true,
    }).onConflictDoNothing();

    await db.insert(schema.channelPublishRules).values([
        { id: crypto.randomUUID(), variantSetVersionId: luminosVsV1Id, channel: 'WEB',        region: 'US', isLive: true,  goLiveAt: null, publishLeadMinutes: 5  },
        { id: crypto.randomUUID(), variantSetVersionId: luminosVsV1Id, channel: 'MOBILE_APP', region: 'US', isLive: true,  goLiveAt: null, publishLeadMinutes: 0  },
    ]).onConflictDoNothing();

    console.log('✅ Luminos Glow Serum seeded\n');

    // ── SCENARIO 3: Rollback demo — Apex Trail Boot ──────────────────────────
    // v1 is ARCHIVED (simulates a price that was reverted), v2 is ACTIVE.
    // A Rollback CCR can reference v1 to restore it as v3.
    console.log('🥾 Seeding Scenario 3: Apex Trail Boot (rollback demo — archived v1 available)...');

    const apexId = crypto.randomUUID();
    await db.insert(schema.catalogItems).values(
        { id: apexId, name: 'Apex Trail Boot', sku: 'ATB-200', brand: 'Apex', category: 'Footwear' }
    ).onConflictDoNothing();

    const apexV1Id = crypto.randomUUID(); // ARCHIVED — rollback target
    const apexV2Id = crypto.randomUUID(); // ACTIVE — current

    await db.insert(schema.catalogItemVersions).values([
        { id: apexV1Id, catalogItemId: apexId, version: 1, salePrice: '149.99', costPrice: '65.00', currency: 'USD', status: 'ARCHIVED', isCurrent: false },
        { id: apexV2Id, catalogItemId: apexId, version: 2, salePrice: '169.99', costPrice: '72.00', currency: 'USD', status: 'ACTIVE',   isCurrent: true  },
    ]).onConflictDoNothing();

    const apexVsId   = crypto.randomUUID();
    const apexVsV1Id = crypto.randomUUID();

    await db.insert(schema.variantSets).values({ id: apexVsId, catalogItemId: apexId }).onConflictDoNothing();
    await db.insert(schema.variantSetVersions).values({
        id: apexVsV1Id, variantSetId: apexVsId, catalogItemVersionId: apexV2Id,
        version: 1, status: 'ACTIVE', isCurrent: true,
    }).onConflictDoNothing();

    await db.insert(schema.channelPublishRules).values([
        { id: crypto.randomUUID(), variantSetVersionId: apexVsV1Id, channel: 'WEB',         region: 'US', isLive: true, goLiveAt: null, publishLeadMinutes: 5 },
        { id: crypto.randomUUID(), variantSetVersionId: apexVsV1Id, channel: 'MARKETPLACE',  region: 'US', isLive: true, goLiveAt: null, publishLeadMinutes: 15 },
    ]).onConflictDoNothing();

    console.log(' Apex Trail Boot seeded (v1 ARCHIVED for rollback demo)\n');

    // ── Sample CCRs (in-flight for demo) ────────────────────────────────────
    console.log(' Seeding sample CCRs...');

    // CCR 1: Velo Runner Pro price bump — in Review, triggers N-of-M (needs 2 approvals)
    const ccr1Id = crypto.randomUUID();
    await db.insert(schema.catalogChangeRequests).values({
        id: ccr1Id,
        title: 'Velo Runner Pro — Seasonal Price Increase',
        type: 'CATALOG_ITEM',
        createdById: merch1Id,
        assigneeId: approverId,
        stageId: 'stage-review',
        effectiveDate: new Date('2026-10-01'),
        versionUpdate: true,
        catalogItemVersionId: veloV1Id,
        draftCatalogItemId: veloId,
        draftSalePrice: '139.99',
        draftCostPrice: '55.00',
        draftCurrency: 'USD',
        promotionConflictFlag: false,
    }).onConflictDoNothing();

    // CCR 2: Luminos Glow Serum price change — draft stage, has promotion conflict
    const ccr2Id = crypto.randomUUID();
    await db.insert(schema.catalogChangeRequests).values({
        id: ccr2Id,
        title: 'Luminos Glow Serum — Post-Sale Price Correction',
        type: 'CATALOG_ITEM',
        createdById: merch2Id,
        assigneeId: approverId,
        stageId: 'stage-draft',
        effectiveDate: new Date('2026-09-15'),
        versionUpdate: true,
        catalogItemVersionId: luminosV1Id,
        draftCatalogItemId: luminosId,
        draftSalePrice: '89.99',
        draftCostPrice: '28.00',
        draftCurrency: 'USD',
        promotionConflictFlag: true, // Pre-flagged: 'Summer Glow Sale' overlaps effectiveDate
    }).onConflictDoNothing();

    // CCR 3: Apex Trail Boot rollback to v1 — ready to demo
    const ccr3Id = crypto.randomUUID();
    await db.insert(schema.catalogChangeRequests).values({
        id: ccr3Id,
        title: 'Apex Trail Boot — Rollback to v1 Pricing ($149.99)',
        type: 'ROLLBACK',
        createdById: adminId,
        assigneeId: approverId,
        stageId: 'stage-approved',
        versionUpdate: true,
        rollbackTargetVersionId: apexV1Id,
        promotionConflictFlag: false,
    }).onConflictDoNothing();

    // CCR 4: Velo VariantSet change (add new Blue/46 size) — draft
    const ccr4Id = crypto.randomUUID();
    await db.insert(schema.catalogChangeRequests).values({
        id: ccr4Id,
        title: 'Velo Runner Pro — Add Blue/46 Variant',
        type: 'VARIANT_SET',
        createdById: merch1Id,
        stageId: 'stage-draft',
        versionUpdate: true,
        variantSetVersionId: veloVsV1Id,
        draftVariantSetId: veloVsId,
        draftNotes: 'Adding Blue/46 size based on customer demand data.',
        draftVariants: [{ action: 'ADD', variantVersionId: blueV1Id, attributeName: 'Size', attributeValue: '46', stockQty: 80 }],
        draftChannelRules: [],
        promotionConflictFlag: false,
    }).onConflictDoNothing();

    // Audit log for CCR 1 creation
    await db.insert(schema.auditLogs).values({
        id: crypto.randomUUID(),
        ccrId: ccr1Id,
        entity: 'CatalogChangeRequest',
        entityId: ccr1Id,
        userId: merch1Id,
        action: 'CCR_CREATED',
        oldValue: null,
        newValue: JSON.stringify({ title: 'Velo Runner Pro — Seasonal Price Increase', type: 'CATALOG_ITEM', stage: 'Draft' }),
    }).onConflictDoNothing();

    console.log(' Sample CCRs seeded\n');
    console.log(' Seed completed successfully!');
    console.log('\nDemo credentials (all passwords: admin123):');
    console.log('  admin@synchroshift.com          — ADMIN');
    console.log('  merch1@synchroshift.com         — MERCHANDISER');
    console.log('  merch2@synchroshift.com         — MERCHANDISER');
    console.log('  approver@synchroshift.com       — CATEGORY_APPROVER');
    console.log('  approver2@synchroshift.com      — CATEGORY_APPROVER (2nd approver for N-of-M)');
    console.log('  storefront@synchroshift.com     — STOREFRONT_VIEWER');
}

main()
    .catch((err) => {
        console.error(' Seed error:', err);
        process.exit(1);
    })
    .finally(() => {
        process.exit(0);
    });
