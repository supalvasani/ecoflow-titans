import { Role, ItemStatus, ECOType } from '@prisma/client';
import bcrypt from 'bcrypt';
import { db } from '../src/libs/prisma.js';

// Hash password function
const hashPass = (password: string) => bcrypt.hash(password, 10);

async function main() {
    console.log('🌱 Starting ENHANCED seed with comprehensive version tracking...\\n');

    // ===========================
    // 0. Cleanup Database
    // ===========================
    console.log('🧹 Cleaning up database...');
    await db.auditLog.deleteMany({});
    await db.eCO.deleteMany({});
    await db.eCOStage.deleteMany({});
    await db.bOMOperation.deleteMany({});
    await db.bOMComponent.deleteMany({});
    await db.bOMVersion.deleteMany({});
    await db.bOM.deleteMany({});
    await db.productAttachment.deleteMany({});
    await db.productVersion.deleteMany({});
    await db.product.deleteMany({});
    await db.user.deleteMany({});
    console.log('✅ Database cleaned\\n');

    // ===========================
    // 1. Create Users
    // ==========================
    console.log('👤 Creating users...');
    const pass = await hashPass('admin123');
    const [admin, eng1, eng2, approver, ops] = await Promise.all([
        db.user.create({ data: { email: 'admin@ecoflow.com', password: pass, name: 'Admin User', role: Role.ADMIN } }),
        db.user.create({ data: { email: 'engineer1@ecoflow.com', password: pass, name: 'Alice Engineer', role: Role.ENGINEERING_USER } }),
        db.user.create({ data: { email: 'engineer2@ecoflow.com', password: pass, name: 'Bob Engineer', role: Role.ENGINEERING_USER } }),
        db.user.create({ data: { email: 'approver@ecoflow.com', password: pass, name: 'Carol Manager', role: Role.APPROVER } }),
        db.user.create({ data: { email: 'ops@ecoflow.com', password: pass, name: 'Dave Ops', role: Role.OPERATIONS_USER } }),
    ]);
    console.log(`✅ Created 5 users\\n`);

    // ===========================
    // 2. ECO Stages
    // ===========================
    console.log('📋 Creating ECO stages...');
    const [draft, review, approved, implemented, rejected] = await Promise.all([
        db.eCOStage.create({ data: { id: 'stage-draft', name: 'Draft', sequence: 1, requiresApproval: false, isFinal: false } }),
        db.eCOStage.create({ data: { id: 'stage-review', name: 'Under Review', sequence: 2, requiresApproval: true, isFinal: false } }),
        db.eCOStage.create({ data: { id: 'stage-approved', name: 'Approved', sequence: 3, requiresApproval: false, isFinal: false } }),
        db.eCOStage.create({ data: { id: 'stage-implemented', name: 'Implemented', sequence: 4, requiresApproval: false, isFinal: true } }),
        db.eCOStage.create({ data: { id: 'stage-rejected', name: 'Rejected', sequence: 99, requiresApproval: false, isFinal: true } }),
    ]);
    console.log(`✅ Created 5 stages\\n`);

    // ===========================
    // 3. Products with Multiple Versions (FULL EVOLUTION)
    // ===========================
    console.log('📦 Creating products with version history...');

    // PRODUCT 1: EcoFlow Delta Pro (Flagship) - 4 Versions
    const deltaPro = await db.product.create({ data: { name: 'EcoFlow Delta Pro' } });
    const [dProV1, dProV2, dProV3, dProV4] = await Promise.all([
        db.productVersion.create({ data: { productId: deltaPro.id, version: 1, costPrice: 1800, salePrice: 3599, status: ItemStatus.ARCHIVED, isCurrent: false } }),
        db.productVersion.create({ data: { productId: deltaPro.id, version: 2, costPrice: 1750, salePrice: 3799, status: ItemStatus.ARCHIVED, isCurrent: false } }), // Price increase
        db.productVersion.create({ data: { productId: deltaPro.id, version: 3, costPrice: 1700, salePrice: 3899, status: ItemStatus.ARCHIVED, isCurrent: false } }), // Cost reduction + price increase
        db.productVersion.create({ data: { productId: deltaPro.id, version: 4, costPrice: 1650, salePrice: 3999, status: ItemStatus.ACTIVE, isCurrent: true } }), // Latest: best margin
    ]);

    // PRODUCT 2: Battery Module - 3 Versions
    const batteryModule = await db.product.create({ data: { name: 'LFP Battery Module 48V' } });
    const [batV1, batV2, batV3] = await Promise.all([
        db.productVersion.create({ data: { productId: batteryModule.id, version: 1, costPrice: 200, salePrice: 300, status: ItemStatus.ARCHIVED, isCurrent: false } }),
        db.productVersion.create({ data: { productId: batteryModule.id, version: 2, costPrice: 210, salePrice: 320, status: ItemStatus.ARCHIVED, isCurrent: false } }), // Upgraded cells (cost up)
        db.productVersion.create({ data: { productId: batteryModule.id, version: 3, costPrice: 205, salePrice: 350, status: ItemStatus.ACTIVE, isCurrent: true } }), // Optimized production
    ]);

    // PRODUCT 3: Inverter Board - 2 Versions
    const inverter = await db.product.create({ data: { name: 'Inverter Main Board' } });
    const [invV1, invV2] = await Promise.all([
        db.productVersion.create({ data: { productId: inverter.id, version: 1, costPrice: 150, salePrice: 250, status: ItemStatus.ARCHIVED, isCurrent: false } }),
        db.productVersion.create({ data: { productId: inverter.id, version: 2, costPrice: 160, salePrice: 280, status: ItemStatus.ACTIVE, isCurrent: true } }), // More MOSFETs
    ]);

    // Raw Materials (Single version, stable)
    const screw = await db.product.create({ data: { name: 'M4 Screw Stainless' } });
    const screwV1 = await db.productVersion.create({ data: { productId: screw.id, version: 1, costPrice: 0.05, salePrice: 0.10, status: ItemStatus.ACTIVE, isCurrent: true } });

    const cell = await db.product.create({ data: { name: 'LFP Cell 3.2V 20Ah' } });
    const cellV1 = await db.productVersion.create({ data: { productId: cell.id, version: 1, costPrice: 8.50, salePrice: 12.00, status: ItemStatus.ACTIVE, isCurrent: true } });

    const mosfet = await db.product.create({ data: { name: 'Power MOSFET IRFZ44N' } });
    const mosfetV1 = await db.productVersion.create({ data: { productId: mosfet.id, version: 1, costPrice: 1.20, salePrice: 2.00, status: ItemStatus.ACTIVE, isCurrent: true } });

    const pcb = await db.product.create({ data: { name: 'PCB Board (Blank)' } });
    const pcbV1 = await db.productVersion.create({ data: { productId: pcb.id, version: 1, costPrice: 5.00, salePrice: 8.00, status: ItemStatus.ACTIVE, isCurrent: true } });

    const casing = await db.product.create({ data: { name: 'Aluminum Casing' } });
    const casingV1 = await db.productVersion.create({ data: { productId: casing.id, version: 1, costPrice: 45.00, salePrice: 60.00, status: ItemStatus.ACTIVE, isCurrent: true } });

    console.log('✅ Created 8 products with version histories\\n');

    // ===========================
    // 4. BOMs with Multiple Versions
    // ===========================
    console.log('🔧 Creating BOMs with version evolution...');

    // BOM for Battery Module (3 versions matching product versions)
    const batBOM = await db.bOM.create({ data: { productId: batteryModule.id } });
    const batBOMV1 = await db.bOMVersion.create({ data: { bomId: batBOM.id, productVersionId: batV1.id, version: 1, status: ItemStatus.ARCHIVED, isCurrent: false } });
    await db.bOMComponent.createMany({
        data: [
            { bomVersionId: batBOMV1.id, componentVersionId: cellV1.id, quantity: 12 }, // 12 cells
            { bomVersionId: batBOMV1.id, componentVersionId: screwV1.id, quantity: 24 },
        ]
    });

    const batBOMV2 = await db.bOMVersion.create({ data: { bomId: batBOM.id, productVersionId: batV2.id, version: 2, status: ItemStatus.ARCHIVED, isCurrent: false } });
    await db.bOMComponent.createMany({
        data: [
            { bomVersionId: batBOMV2.id, componentVersionId: cellV1.id, quantity: 16 }, // UPGRADED to 16 cells
            { bomVersionId: batBOMV2.id, componentVersionId: screwV1.id, quantity: 32 }, // More screws needed
        ]
    });

    const batBOMV3 = await db.bOMVersion.create({ data: { bomId: batBOM.id, productVersionId: batV3.id, version: 3, status: ItemStatus.ACTIVE, isCurrent: true } });
    await db.bOMComponent.createMany({
        data: [
            { bomVersionId: batBOMV3.id, componentVersionId: cellV1.id, quantity: 16 }, // Same cells
            { bomVersionId: batBOMV3.id, componentVersionId: screwV1.id, quantity: 28 }, // Optimized screw count
        ]
    });
    await db.bOMOperation.createMany({
        data: [
            { bomVersionId: batBOMV3.id, name: 'Cell Welding', timeMinutes: 40, workCenter: 'Station 1' },
            { bomVersionId: batBOMV3.id, name: 'Quality Inspection', timeMinutes: 5, workCenter: 'QC Lab' }
        ]
    });

    // BOM for Inverter (2 versions)
    const invBOM = await db.bOM.create({ data: { productId: inverter.id } });
    const invBOMV1 = await db.bOMVersion.create({ data: { bomId: invBOM.id, productVersionId: invV1.id, version: 1, status: ItemStatus.ARCHIVED, isCurrent: false } });
    await db.bOMComponent.createMany({
        data: [
            { bomVersionId: invBOMV1.id, componentVersionId: pcbV1.id, quantity: 1 },
            { bomVersionId: invBOMV1.id, componentVersionId: mosfetV1.id, quantity: 12 }, // 12 MOSFETs
        ]
    });
    await db.bOMOperation.create({ data: { bomVersionId: invBOMV1.id, name: 'SMT Placement', timeMinutes: 10, workCenter: 'SMT Line' } });

    const invBOMV2 = await db.bOMVersion.create({ data: { bomId: invBOM.id, productVersionId: invV2.id, version: 2, status: ItemStatus.ACTIVE, isCurrent: true } });
    await db.bOMComponent.createMany({
        data: [
            { bomVersionId: invBOMV2.id, componentVersionId: pcbV1.id, quantity: 1 },
            { bomVersionId: invBOMV2.id, componentVersionId: mosfetV1.id, quantity: 16 }, // UPGRADED to 16 MOSFETs
        ]
    });
    await db.bOMOperation.createMany({
        data: [
            { bomVersionId: invBOMV2.id, name: 'SMT Placement', timeMinutes: 12, workCenter: 'SMT Line' },
            { bomVersionId: invBOMV2.id, name: 'Soldering', timeMinutes: 8, workCenter: 'Assembly' }
        ]
    });

    // Final Assembly BOM (links to current versions only)
    const dProBOM = await db.bOM.create({ data: { productId: deltaPro.id } });
    const dProBOMV1 = await db.bOMVersion.create({ data: { bomId: dProBOM.id, productVersionId: dProV4.id, version: 1, status: ItemStatus.ACTIVE, isCurrent: true } });
    await db.bOMComponent.createMany({
        data: [
            { bomVersionId: dProBOMV1.id, componentVersionId: casingV1.id, quantity: 1 },
            { bomVersionId: dProBOMV1.id, componentVersionId: batV3.id, quantity: 1 }, // Latest battery
            { bomVersionId: dProBOMV1.id, componentVersionId: invV2.id, quantity: 1 }, // Latest inverter
            { bomVersionId: dProBOMV1.id, componentVersionId: screwV1.id, quantity: 50 },
        ]
    });
    await db.bOMOperation.createMany({
        data: [
            { bomVersionId: dProBOMV1.id, name: 'Final Assembly', timeMinutes: 60, workCenter: 'Main Line' },
            { bomVersionId: dProBOMV1.id, name: 'Testing & QC', timeMinutes: 30, workCenter: 'Test Station' },
            { bomVersionId: dProBOMV1.id, name: 'Packaging', timeMinutes: 15, workCenter: 'Packing' }
        ]
    });

    console.log('✅ Created multi-version BOMs\n');

    // ===========================
    // 5. ECO Scenarios with Applied Changes
    // ===========================
    console.log('📝 Creating ECO scenarios...');

    // ECO 1: Battery Upgrade (IMPLEMENTED) - Created BOM V1 -> V2
    const ecoB1 = await db.eCO.create({
        data: {
            title: 'Battery Upgrade: 12 cells -> 16 cells',
            type: ECOType.BOM,
            createdById: eng1.id,
            stageId: implemented.id,
            bomVersionId: batBOMV1.id,
            versionUpdate: true,
            draftBomId: batBOM.id,
            draftNotes: 'Increase capacity by 33%',
            draftComponents: [],
        }
    });

    // ECO 2: Inverter MOSFET Upgrade (IMPLEMENTED) - Created Inverter V1 -> V2
    const ecoI1 = await db.eCO.create({
        data: {
            title: 'Inverter Performance Boost',
            type: ECOType.BOM,
            createdById: eng1.id,
            stageId: implemented.id,
            bomVersionId: invBOMV1.id,
            versionUpdate: true,
            draftBomId: invBOM.id,
            draftNotes: 'Upgrade from 12 to 16 MOSFETs for better power handling',
            draftComponents: [],
        }
    });

    // ECO 3: Delta Pro Price Increase (IMPLEMENTED) - Created Product V3 -> V4
    const ecoP1 = await db.eCO.create({
        data: {
            title: 'Delta Pro Q4 2024 Pricing',
            type: ECOType.PRODUCT,
            createdById: approver.id,
            stageId: implemented.id,
            productVersionId: dProV3.id,
            versionUpdate: true,
            draftProductId: deltaPro.id,
            draftName: null,
            draftSalePrice: 3999.00,
            draftCostPrice: 1650.00,
        }
    });

    // ECO 4: DRAFT - Proposed Battery Optimization
    const ecoD1 = await db.eCO.create({
        data: {
            title: '[DRAFT] Optimize Battery Screw Count',
            type: ECOType.BOM,
            createdById: eng2.id,
            stageId: draft.id,
            bomVersionId: batBOMV2.id,
            versionUpdate: true,
            draftBomId: batBOM.id,
            draftNotes: 'Reduce screws from 32 to 28 without compromising strength',
            draftComponents: [
                { componentVersionId: screwV1.id, quantity: 28, action: 'UPDATE' }
            ],
        }
    });

    // ECO 5: UNDER REVIEW - Price adjustment
    const ecoR1 = await db.eCO.create({
        data: {
            title: '[REVIEW] Battery Module Price Adjustment',
            type: ECOType.PRODUCT,
            createdById: eng1.id,
            stageId: review.id,
            productVersionId: batV2.id,
            versionUpdate: false,
            draftProductId: batteryModule.id,
            draftName: null,
            draftSalePrice: 350.00,
            draftCostPrice: null,
        }
    });

    // ===========================
    // 6. Audit Logs for ECOs
    // ===========================
    console.log('📝 Creating audit logs...');
    await db.auditLog.createMany({
        data: [
            // ECO B1 logs
            {
                ecoId: ecoB1.id,
                entity: 'ECO',
                entityId: ecoB1.id,
                userId: eng1.id,
                action: 'ECO_CREATED',
                oldValue: null,
                newValue: 'Created: Battery Upgrade ECO'
            },
            {
                ecoId: ecoB1.id,
                entity: 'ECO',
                entityId: ecoB1.id,
                userId: approver.id,
                action: 'ECO_APPROVED',
                oldValue: 'Under Review',
                newValue: 'Approved'
            },
            {
                ecoId: ecoB1.id,
                entity: 'ECO',
                entityId: ecoB1.id,
                userId: admin.id,
                action: 'ECO_APPLIED',
                oldValue: 'Approved',
                newValue: 'Implemented - Created BOM v2'
            },
            // ECO I1 logs
            {
                ecoId: ecoI1.id,
                entity: 'ECO',
                entityId: ecoI1.id,
                userId: eng1.id,
                action: 'ECO_CREATED',
                oldValue: null,
                newValue: 'Created: Inverter Performance Boost'
            },
            {
                ecoId: ecoI1.id,
                entity: 'ECO',
                entityId: ecoI1.id,
                userId: approver.id,
                action: 'ECO_APPROVED',
                oldValue: 'Under Review',
                newValue: 'Approved'
            },
            {
                ecoId: ecoI1.id,
                entity: 'ECO',
                entityId: ecoI1.id,
                userId: admin.id,
                action: 'ECO_APPLIED',
                oldValue: 'Approved',
                newValue: 'Implemented - Upgraded to 16 MOSFETs'
            },
            // ECO P1 logs
            {
                ecoId: ecoP1.id,
                entity: 'ECO',
                entityId: ecoP1.id,
                userId: approver.id,
                action: 'ECO_CREATED',
                oldValue: null,
                newValue: 'Created: Price adjustment $3899 -> $3999'
            },
            {
                ecoId: ecoP1.id,
                entity: 'ECO',
                entityId: ecoP1.id,
                userId: admin.id,
                action: 'ECO_APPROVED',
                oldValue: 'Draft',
                newValue: 'Approved - Admin override'
            },
            {
                ecoId: ecoP1.id,
                entity: 'ECO',
                entityId: ecoP1.id,
                userId: admin.id,
                action: 'ECO_APPLIED',
                oldValue: 'Approved',
                newValue: 'Implemented - Product v4 created'
            },
            // ECO D1 logs
            {
                ecoId: ecoD1.id,
                entity: 'ECO',
                entityId: ecoD1.id,
                userId: eng2.id,
                action: 'ECO_CREATED',
                oldValue: null,
                newValue: 'Created: Optimize screw count'
            },
            // ECO R1 logs
            {
                ecoId: ecoR1.id,
                entity: 'ECO',
                entityId: ecoR1.id,
                userId: eng1.id,
                action: 'ECO_CREATED',
                oldValue: null,
                newValue: 'Created: Battery Module price adjustment'
            },
            {
                ecoId: ecoR1.id,
                entity: 'ECO',
                entityId: ecoR1.id,
                userId: eng1.id,
                action: 'ECO_SUBMITTED',
                oldValue: 'Draft',
                newValue: 'Under Review'
            }
        ]
    });
    console.log('✅ Created audit logs\\n');

    console.log('✅ Created 5 ECO scenarios\\n');

    console.log('✨ Enhanced Seed Completed!');
    console.log('');
    console.log('📊 Summary:');
    console.log('  - 8 Products (some with 4 versions showing price evolution)');
    console.log('  - 3 BOMs (with 2-3 versions showing component changes)');
    console.log('  - 5 ECOs (in different lifecycle stages)');
    console.log('  - Clear version comparison data available');
    console.log('');
    console.log('🔍 Version Evolution Examples:');
    console.log('  - Delta Pro: $3599 -> $3799 -> $3899 -> $3999 (4 versions)');
    console.log('  - Battery Module BOM: 12 cells -> 16 cells -> 16 cells w/ optimized screws');
    console.log('  - Inverter BOM: 12 MOSFETs -> 16 MOSFETs');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
        process.exit(0);
    });
