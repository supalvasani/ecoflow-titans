import { db, schema } from './index.js';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

const hashPass = (password: string) => bcrypt.hash(password, 10);

async function main() {
    console.log('🌱 Starting Drizzle seed...');

    console.log('🧹 Cleaning up database tables...');
    const tablesToClean = [
        schema.auditLogs,
        schema.operationsTasks,
        schema.ecos,
        schema.ecoStages,
        schema.bomOperations,
        schema.bomComponents,
        schema.bomVersions,
        schema.boms,
        schema.productAttachments,
        schema.productVersions,
        schema.products,
        schema.users,
    ];
    for (const table of tablesToClean) {
        try {
            await db.delete(table);
        } catch {
            // Skip individual table if locked or empty
        }
    }
    console.log('✅ Database cleaned\n');

    console.log('👤 Creating users...');
    const pass = await hashPass('admin123');

    const adminId = crypto.randomUUID();
    const eng1Id = crypto.randomUUID();
    const eng2Id = crypto.randomUUID();
    const approverId = crypto.randomUUID();
    const opsId = crypto.randomUUID();

    await db.insert(schema.users).values([
        { id: adminId, email: 'admin@ecoflow.com', password: pass, name: 'Admin User', role: 'ADMIN' },
        { id: eng1Id, email: 'engineer1@ecoflow.com', password: pass, name: 'Alice Engineer', role: 'ENGINEERING_USER' },
        { id: eng2Id, email: 'engineer2@ecoflow.com', password: pass, name: 'Bob Engineer', role: 'ENGINEERING_USER' },
        { id: approverId, email: 'approver@ecoflow.com', password: pass, name: 'Carol Manager', role: 'APPROVER' },
        { id: opsId, email: 'ops@ecoflow.com', password: pass, name: 'Dave Ops', role: 'OPERATIONS_USER' },
    ]).onConflictDoNothing();
    console.log('✅ Users created\n');

    console.log('📋 Creating ECO stages...');
    await db.insert(schema.ecoStages).values([
        { id: 'stage-draft', name: 'Draft', sequence: 1, requiresApproval: false, isFinal: false },
        { id: 'stage-review', name: 'Under Review', sequence: 2, requiresApproval: true, isFinal: false },
        { id: 'stage-approved', name: 'Approved', sequence: 3, requiresApproval: false, isFinal: false },
        { id: 'stage-implemented', name: 'Implemented', sequence: 4, requiresApproval: false, isFinal: true },
        { id: 'stage-rejected', name: 'Rejected', sequence: 99, requiresApproval: false, isFinal: true },
    ]).onConflictDoNothing();
    console.log('✅ Stages created\n');

    console.log('📦 Creating initial products & versions...');
    const deltaProId = crypto.randomUUID();
    const batteryModuleId = crypto.randomUUID();
    const inverterId = crypto.randomUUID();
    const screwId = crypto.randomUUID();

    await db.insert(schema.products).values([
        { id: deltaProId, name: 'EcoFlow Delta Pro' },
        { id: batteryModuleId, name: 'LFP Battery Module 48V' },
        { id: inverterId, name: 'Inverter Main Board' },
        { id: screwId, name: 'M4 Screw Stainless' },
    ]).onConflictDoNothing();

    const deltaV1Id = crypto.randomUUID();
    const deltaV2Id = crypto.randomUUID();
    const batV1Id = crypto.randomUUID();
    const invV1Id = crypto.randomUUID();
    const screwV1Id = crypto.randomUUID();

    await db.insert(schema.productVersions).values([
        { id: deltaV1Id, productId: deltaProId, version: 1, salePrice: '3599.00', costPrice: '1800.00', status: 'ARCHIVED', isCurrent: false },
        { id: deltaV2Id, productId: deltaProId, version: 2, salePrice: '3799.00', costPrice: '1750.00', status: 'ACTIVE', isCurrent: true },
        { id: batV1Id, productId: batteryModuleId, version: 1, salePrice: '300.00', costPrice: '200.00', status: 'ACTIVE', isCurrent: true },
        { id: invV1Id, productId: inverterId, version: 1, salePrice: '250.00', costPrice: '150.00', status: 'ACTIVE', isCurrent: true },
        { id: screwV1Id, productId: screwId, version: 1, salePrice: '0.10', costPrice: '0.05', status: 'ACTIVE', isCurrent: true },
    ]).onConflictDoNothing();
    console.log('✅ Products created\n');

    console.log('🔧 Creating initial BOMs & Operations for products...');
    
    // 1. BOM for LFP Battery Module 48V
    const batBomId = crypto.randomUUID();
    const batBomV1Id = crypto.randomUUID();

    await db.insert(schema.boms).values({ id: batBomId, productId: batteryModuleId }).onConflictDoNothing();
    await db.insert(schema.bomVersions).values({
        id: batBomV1Id,
        bomId: batBomId,
        productVersionId: batV1Id,
        version: 1,
        status: 'ACTIVE',
        isCurrent: true,
    }).onConflictDoNothing();

    await db.insert(schema.bomComponents).values([
        { id: crypto.randomUUID(), bomVersionId: batBomV1Id, componentVersionId: screwV1Id, quantity: 24 },
    ]).onConflictDoNothing();

    await db.insert(schema.bomOperations).values([
        { id: crypto.randomUUID(), bomVersionId: batBomV1Id, name: 'Cell Spot Welding', timeMinutes: 40, workCenter: 'Station 1' },
        { id: crypto.randomUUID(), bomVersionId: batBomV1Id, name: 'BMS Harness & Casing', timeMinutes: 20, workCenter: 'Station 2' },
    ]).onConflictDoNothing();

    // 2. BOM for Inverter Main Board
    const invBomId = crypto.randomUUID();
    const invBomV1Id = crypto.randomUUID();

    await db.insert(schema.boms).values({ id: invBomId, productId: inverterId }).onConflictDoNothing();
    await db.insert(schema.bomVersions).values({
        id: invBomV1Id,
        bomId: invBomId,
        productVersionId: invV1Id,
        version: 1,
        status: 'ACTIVE',
        isCurrent: true,
    }).onConflictDoNothing();

    await db.insert(schema.bomComponents).values([
        { id: crypto.randomUUID(), bomVersionId: invBomV1Id, componentVersionId: screwV1Id, quantity: 4 },
    ]).onConflictDoNothing();

    await db.insert(schema.bomOperations).values([
        { id: crypto.randomUUID(), bomVersionId: invBomV1Id, name: 'SMT Component Pick-and-Place', timeMinutes: 25, workCenter: 'SMT Line 1' },
        { id: crypto.randomUUID(), bomVersionId: invBomV1Id, name: 'Circuit Calibration & Test', timeMinutes: 15, workCenter: 'Test Bench A' },
    ]).onConflictDoNothing();

    // 3. Main BOM for EcoFlow Delta Pro (Final Assembly)
    const deltaBomId = crypto.randomUUID();
    const deltaBomV2Id = crypto.randomUUID();

    await db.insert(schema.boms).values({ id: deltaBomId, productId: deltaProId }).onConflictDoNothing();
    await db.insert(schema.bomVersions).values({
        id: deltaBomV2Id,
        bomId: deltaBomId,
        productVersionId: deltaV2Id,
        version: 2,
        status: 'ACTIVE',
        isCurrent: true,
    }).onConflictDoNothing();

    await db.insert(schema.bomComponents).values([
        { id: crypto.randomUUID(), bomVersionId: deltaBomV2Id, componentVersionId: batV1Id, quantity: 1 },
        { id: crypto.randomUUID(), bomVersionId: deltaBomV2Id, componentVersionId: invV1Id, quantity: 1 },
        { id: crypto.randomUUID(), bomVersionId: deltaBomV2Id, componentVersionId: screwV1Id, quantity: 16 },
    ]).onConflictDoNothing();

    await db.insert(schema.bomOperations).values([
        { id: crypto.randomUUID(), bomVersionId: deltaBomV2Id, name: 'Sub-assembly Integration', timeMinutes: 50, workCenter: 'Assembly Line B' },
        { id: crypto.randomUUID(), bomVersionId: deltaBomV2Id, name: 'Full Burn-in & Discharge Testing', timeMinutes: 60, workCenter: 'Burn-in Chamber 2' },
    ]).onConflictDoNothing();

    console.log('🪵 Seeding Scenario 1: Wooden Table...');
    const woodenTableId = crypto.randomUUID();
    const legId = crypto.randomUUID();
    const topId = crypto.randomUUID();
    const woodScrewId = crypto.randomUUID();
    const varnishId = crypto.randomUUID();

    await db.insert(schema.products).values([
        { id: woodenTableId, name: 'Wooden Table' },
        { id: legId, name: 'Wooden Legs' },
        { id: topId, name: 'Wooden Top' },
        { id: woodScrewId, name: 'Screws (M4 Wood)' },
        { id: varnishId, name: 'Varnish Bottle' },
    ]).onConflictDoNothing();

    const tableV1Id = crypto.randomUUID();
    const legV1Id = crypto.randomUUID();
    const topV1Id = crypto.randomUUID();
    const woodScrewV1Id = crypto.randomUUID();
    const varnishV1Id = crypto.randomUUID();

    await db.insert(schema.productVersions).values([
        { id: tableV1Id, productId: woodenTableId, version: 1, salePrice: '250.00', costPrice: '100.00', status: 'ACTIVE', isCurrent: true },
        { id: legV1Id, productId: legId, version: 1, salePrice: '15.00', costPrice: '5.00', status: 'ACTIVE', isCurrent: true },
        { id: topV1Id, productId: topId, version: 1, salePrice: '80.00', costPrice: '30.00', status: 'ACTIVE', isCurrent: true },
        { id: woodScrewV1Id, productId: woodScrewId, version: 1, salePrice: '0.15', costPrice: '0.05', status: 'ACTIVE', isCurrent: true },
        { id: varnishV1Id, productId: varnishId, version: 1, salePrice: '12.00', costPrice: '4.00', status: 'ACTIVE', isCurrent: true },
    ]).onConflictDoNothing();

    const tableBomId = crypto.randomUUID();
    const tableBomV1Id = crypto.randomUUID();

    await db.insert(schema.boms).values({ id: tableBomId, productId: woodenTableId }).onConflictDoNothing();
    await db.insert(schema.bomVersions).values({
        id: tableBomV1Id,
        bomId: tableBomId,
        productVersionId: tableV1Id,
        version: 1,
        status: 'ACTIVE',
        isCurrent: true,
    }).onConflictDoNothing();

    await db.insert(schema.bomComponents).values([
        { id: crypto.randomUUID(), bomVersionId: tableBomV1Id, componentVersionId: legV1Id, quantity: 4 },
        { id: crypto.randomUUID(), bomVersionId: tableBomV1Id, componentVersionId: topV1Id, quantity: 1 },
        { id: crypto.randomUUID(), bomVersionId: tableBomV1Id, componentVersionId: woodScrewV1Id, quantity: 12 },
        { id: crypto.randomUUID(), bomVersionId: tableBomV1Id, componentVersionId: varnishV1Id, quantity: 1 },
    ]).onConflictDoNothing();

    await db.insert(schema.bomOperations).values([
        { id: crypto.randomUUID(), bomVersionId: tableBomV1Id, name: 'Assembly', timeMinutes: 60, workCenter: 'Assembly Shop' },
        { id: crypto.randomUUID(), bomVersionId: tableBomV1Id, name: 'Painting', timeMinutes: 30, workCenter: 'Paint Shop' },
        { id: crypto.randomUUID(), bomVersionId: tableBomV1Id, name: 'Packing', timeMinutes: 20, workCenter: 'Shipping Dept' },
    ]).onConflictDoNothing();

    console.log('📱 Seeding Scenario 2: iPhone 17 Pricing Update...');
    const iphoneId = crypto.randomUUID();
    await db.insert(schema.products).values({ id: iphoneId, name: 'iPhone 17 Pro' }).onConflictDoNothing();

    const iphoneV1Id = crypto.randomUUID();
    const iphoneV2Id = crypto.randomUUID();

    await db.insert(schema.productVersions).values([
        { id: iphoneV1Id, productId: iphoneId, version: 1, salePrice: '999.00', costPrice: '450.00', status: 'ARCHIVED', isCurrent: false },
        { id: iphoneV2Id, productId: iphoneId, version: 2, salePrice: '1099.00', costPrice: '480.00', status: 'ACTIVE', isCurrent: true },
    ]).onConflictDoNothing();

    console.log('✅ BOMs and Operations created for all products\n');

    console.log('✅ Seed completed successfully!');
}

main()
    .catch((err) => {
        console.error('❌ Seed error:', err);
        process.exit(1);
    })
    .finally(() => {
        process.exit(0);
    });
