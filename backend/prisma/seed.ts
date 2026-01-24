import { Role, ItemStatus, ECOType } from '@prisma/client';
import bcrypt from 'bcrypt';
import { db } from '../src/libs/prisma.js';

// Hash password function
const hashPass = (password: string) => bcrypt.hash(password, 10);

async function main() {
    console.log('🌱 Starting comprehensive seed...\n');

    // ===========================
    // 0. Cleanup Database
    // ===========================
    console.log('🧹 Cleaning up database...');

    // Delete in order of dependencies (child tables first)
    await db.auditLog.deleteMany({});
    await db.eCODraftComponent.deleteMany({});
    await db.eCODraftOperation.deleteMany({});
    await db.eCOProductDraft.deleteMany({});
    await db.eCOBOMDraft.deleteMany({});
    await db.eCODraftAttachment.deleteMany({});
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

    console.log('✅ Database cleaned\n');

    // ===========================
    // 1. Create Users
    // ===========================
    console.log('👤 Creating users...');

    const users = await Promise.all([
        db.user.upsert({
            where: { email: 'admin@ecoflow.com' },
            update: {},
            create: {
                email: 'admin@ecoflow.com',
                password: await hashPass('admin123'),
                name: 'Admin User',
                role: Role.ADMIN,
            },
        }),
        db.user.upsert({
            where: { email: 'engineer@ecoflow.com' },
            update: {},
            create: {
                email: 'engineer@ecoflow.com',
                password: await hashPass('engineer123'),
                name: 'Engineering User',
                role: Role.ENGINEERING_USER,
            },
        }),
        db.user.upsert({
            where: { email: 'approver@ecoflow.com' },
            update: {},
            create: {
                email: 'approver@ecoflow.com',
                password: await hashPass('approver123'),
                name: 'Approver User',
                role: Role.APPROVER,
            },
        }),
        db.user.upsert({
            where: { email: 'operations@ecoflow.com' },
            update: {},
            create: {
                email: 'operations@ecoflow.com',
                password: await hashPass('operations123'),
                name: 'Operations User',
                role: Role.OPERATIONS_USER,
            },
        }),
    ]);

    console.log(`✅ Created ${users.length} users\n`);

    // ===========================
    // 2. Create ECO Stages
    // ===========================
    console.log('📋 Creating ECO stages...');

    const stages = await Promise.all([
        db.eCOStage.upsert({
            where: { id: 'stage-draft' },
            update: {},
            create: {
                id: 'stage-draft',
                name: 'Draft',
                sequence: 1,
                requiresApproval: false,
                isFinal: false,
            },
        }),
        db.eCOStage.upsert({
            where: { id: 'stage-review' },
            update: {},
            create: {
                id: 'stage-review',
                name: 'Under Review',
                sequence: 2,
                requiresApproval: true,
                isFinal: false,
            },
        }),
        db.eCOStage.upsert({
            where: { id: 'stage-approved' },
            update: {},
            create: {
                id: 'stage-approved',
                name: 'Approved',
                sequence: 3,
                requiresApproval: false,
                isFinal: false,
            },
        }),
        db.eCOStage.upsert({
            where: { id: 'stage-rejected' },
            update: {},
            create: {
                id: 'stage-rejected',
                name: 'Rejected',
                sequence: 99,
                requiresApproval: false,
                isFinal: true,
            },
        }),
        db.eCOStage.upsert({
            where: { id: 'stage-implemented' },
            update: {},
            create: {
                id: 'stage-implemented',
                name: 'Implemented',
                sequence: 4,
                requiresApproval: false,
                isFinal: true,
            },
        }),
    ]);

    console.log(`✅ Created ${stages.length} ECO stages\n`);

    // ===========================
    // 3. Create Products
    // ===========================
    console.log('📦 Creating products...');

    const smartphoneProduct = await db.product.create({ data: { name: 'EcoPhone X1' } });
    const batteryProduct = await db.product.create({ data: { name: 'Li-Ion Battery 5000mAh' } });
    const screenProduct = await db.product.create({ data: { name: 'OLED Display 6.5"' } });
    const camera48Product = await db.product.create({ data: { name: '48MP Camera Module' } });
    const camera64Product = await db.product.create({ data: { name: '64MP Camera Module' } });
    const processorProduct = await db.product.create({ data: { name: 'Processor Chip A15' } });
    const cableProduct = await db.product.create({ data: { name: 'USB-C Charging Cable' } });
    const legacyProduct = await db.product.create({ data: { name: 'Legacy Phone (Archived)' } });

    console.log(`✅ Created 8 products\n`);

    // ===========================
    // 4. Create Product Versions
    // ===========================
    console.log('📱 Creating product versions...');

    // Smartphone versions (3 versions showing progression)
    const phoneV1 = await db.productVersion.create({
        data: {
            productId: smartphoneProduct.id,
            version: 1,
            salePrice: 699.99,
            costPrice: 450.00,
            status: ItemStatus.ARCHIVED,
            isCurrent: false,
        },
    });

    const phoneV2 = await db.productVersion.create({
        data: {
            productId: smartphoneProduct.id,
            version: 2,
            salePrice: 749.99,
            costPrice: 480.00,
            status: ItemStatus.ACTIVE,
            isCurrent: true,
        },
    });

    // Component versions
    const batteryV1 = await db.productVersion.create({
        data: {
            productId: batteryProduct.id,
            version: 1,
            salePrice: 45.00,
            costPrice: 25.00,
            status: ItemStatus.ACTIVE,
            isCurrent: true,
        },
    });

    const screenV1 = await db.productVersion.create({
        data: {
            productId: screenProduct.id,
            version: 1,
            salePrice: 120.00,
            costPrice: 75.00,
            status: ItemStatus.ACTIVE,
            isCurrent: true,
        },
    });

    const camera48V1 = await db.productVersion.create({
        data: {
            productId: camera48Product.id,
            version: 1,
            salePrice: 85.00,
            costPrice: 50.00,
            status: ItemStatus.ACTIVE,
            isCurrent: true,
        },
    });

    const camera64V1 = await db.productVersion.create({
        data: {
            productId: camera64Product.id,
            version: 1,
            salePrice: 120.00,
            costPrice: 70.00,
            status: ItemStatus.ACTIVE,
            isCurrent: true,
        },
    });

    const processorV1 = await db.productVersion.create({
        data: {
            productId: processorProduct.id,
            version: 1,
            salePrice: 200.00,
            costPrice: 120.00,
            status: ItemStatus.ACTIVE,
            isCurrent: true,
        },
    });

    const cableV1 = await db.productVersion.create({
        data: {
            productId: cableProduct.id,
            version: 1,
            salePrice: 15.00,
            costPrice: 5.00,
            status: ItemStatus.ACTIVE,
            isCurrent: true,
        },
    });

    const legacyV1 = await db.productVersion.create({
        data: {
            productId: legacyProduct.id,
            version: 1,
            salePrice: 399.99,
            costPrice: 250.00,
            status: ItemStatus.ARCHIVED,
            isCurrent: false,
        },
    });

    console.log(`✅ Created 9 product versions\n`);

    // ===========================
    // 5. Create Product Attachments
    // ===========================
    console.log('📎 Creating product attachments...');

    await db.productAttachment.createMany({
        data: [
            {
                productVersionId: phoneV2.id,
                filename: 'ecophone-x1-specs.pdf',
                url: 'https://example.com/files/ecophone-x1-specs.pdf',
            },
            {
                productVersionId: phoneV2.id,
                filename: 'ecophone-x1-diagram.png',
                url: 'https://example.com/files/ecophone-x1-diagram.png',
            },
        ],
    });

    console.log(`✅ Created 2 product attachments\n`);

    // ===========================
    // 6. Create BOMs
    // ===========================
    console.log('🔧 Creating BOMs...');

    const smartphoneBOM = await db.bOM.create({
        data: { productId: smartphoneProduct.id },
    });

    const legacyBOM = await db.bOM.create({
        data: { productId: legacyProduct.id },
    });

    console.log(`✅ Created 2 BOMs\n`);

    // ===========================
    // 7. Create BOM Versions
    // ===========================
    console.log('📋 Creating BOM versions...');

    const bomV1 = await db.bOMVersion.create({
        data: {
            bomId: smartphoneBOM.id,
            productVersionId: phoneV1.id,
            version: 1,
            status: ItemStatus.ARCHIVED,
            isCurrent: false,
        },
    });

    const bomV2 = await db.bOMVersion.create({
        data: {
            bomId: smartphoneBOM.id,
            productVersionId: phoneV2.id,
            version: 2,
            status: ItemStatus.ACTIVE,
            isCurrent: true,
        },
    });

    const legacyBOMV1 = await db.bOMVersion.create({
        data: {
            bomId: legacyBOM.id,
            productVersionId: legacyV1.id,
            version: 1,
            status: ItemStatus.ARCHIVED,
            isCurrent: false,
        },
    });

    console.log(`✅ Created 3 BOM versions\n`);

    // ===========================
    // 8. Create BOM Components
    // ===========================
    console.log('⚙️  Creating BOM components...');

    await db.bOMComponent.createMany({
        data: [
            { bomVersionId: bomV2.id, componentVersionId: batteryV1.id, quantity: 1 },
            { bomVersionId: bomV2.id, componentVersionId: screenV1.id, quantity: 1 },
            { bomVersionId: bomV2.id, componentVersionId: camera48V1.id, quantity: 2 },
            { bomVersionId: bomV2.id, componentVersionId: cableV1.id, quantity: 1 },
        ],
    });

    console.log(`✅ Created 4 BOM components\n`);

    // ===========================
    // 9. Create BOM Operations
    // ===========================
    console.log('🏭 Creating BOM operations...');

    await db.bOMOperation.createMany({
        data: [
            { bomVersionId: bomV2.id, name: 'PCB Assembly', timeMinutes: 45, workCenter: 'Assembly Line A' },
            { bomVersionId: bomV2.id, name: 'Screen Installation', timeMinutes: 15, workCenter: 'Assembly Line A' },
            { bomVersionId: bomV2.id, name: 'Camera Integration', timeMinutes: 20, workCenter: 'Assembly Line B' },
            { bomVersionId: bomV2.id, name: 'Battery Installation', timeMinutes: 10, workCenter: 'Assembly Line A' },
            { bomVersionId: bomV2.id, name: 'Quality Testing', timeMinutes: 30, workCenter: 'QA Station' },
            { bomVersionId: bomV2.id, name: 'Final Packaging', timeMinutes: 5, workCenter: 'Packaging Line' },
        ],
    });

    console.log(`✅ Created 6 BOM operations\n`);

    // ===========================
    // 10. Create ECOs - All Stages
    // ===========================
    console.log('📝 Creating ECOs across all stages...');

    // DRAFT STAGE (2 ECOs)
    const ecoDraft1 = await db.eCO.create({
        data: {
            title: 'Reduce EcoPhone X1 Sale Price',
            type: ECOType.PRODUCT,
            createdById: users[1].id,
            stageId: stages[0].id,
            productVersionId: phoneV2.id,
            versionUpdate: false, // Hotfix
            productDraft: {
                create: {
                    productId: smartphoneProduct.id,
                    name: null,
                    salePrice: 699.99, // Reduced from 749.99
                    costPrice: null,
                },
            },
        },
    });

    const ecoDraft2 = await db.eCO.create({
        data: {
            title: 'Add Processor Chip to BOM',
            type: ECOType.BOM,
            createdById: users[1].id,
            stageId: stages[0].id,
            bomVersionId: bomV2.id,
            versionUpdate: true,
            bomDraft: {
                create: {
                    bomId: smartphoneBOM.id,
                    notes: 'Adding high-performance processor',
                },
            },
        },
    });

    // Add draft component for BOM ECO
    await (db as any).eCODraftComponent.create({
        data: {
            bomDraftId: (await db.eCO.findUnique({ where: { id: ecoDraft2.id }, include: { bomDraft: true } }))!.bomDraft!.id,
            componentVersionId: processorV1.id,
            quantity: 1,
            action: 'ADD',
        },
    });

    // UNDER REVIEW STAGE (2 ECOs)
    const ecoReview1 = await db.eCO.create({
        data: {
            title: 'Upgrade Battery Capacity to 5500mAh',
            type: ECOType.PRODUCT,
            createdById: users[1].id,
            stageId: stages[1].id,
            productVersionId: phoneV2.id,
            versionUpdate: true,
            productDraft: {
                create: {
                    productId: smartphoneProduct.id,
                    name: 'EcoPhone X1 Pro',
                    salePrice: 799.99,
                    costPrice: 520.00,
                },
            },
        },
    });

    const ecoReview2 = await db.eCO.create({
        data: {
            title: 'Update Camera to 64MP Module',
            type: ECOType.BOM,
            createdById: users[1].id,
            stageId: stages[1].id,
            bomVersionId: bomV2.id,
            versionUpdate: true,
            bomDraft: {
                create: {
                    bomId: smartphoneBOM.id,
                    notes: 'Upgrading camera for better photo quality',
                },
            },
        },
    });

    // Add draft components for camera upgrade
    const bomDraftId2 = (await db.eCO.findUnique({ where: { id: ecoReview2.id }, include: { bomDraft: true } }))!.bomDraft!.id;
    await (db as any).eCODraftComponent.createMany({
        data: [
            { bomDraftId: bomDraftId2, componentVersionId: camera48V1.id, quantity: 2, action: 'DELETE' },
            { bomDraftId: bomDraftId2, componentVersionId: camera64V1.id, quantity: 2, action: 'ADD' },
        ],
    });

    // APPROVED STAGE (1 ECO)
    const ecoApproved1 = await db.eCO.create({
        data: {
            title: 'Update Cost Price for Profitability',
            type: ECOType.PRODUCT,
            createdById: users[1].id,
            stageId: stages[2].id,
            productVersionId: phoneV2.id,
            versionUpdate: false, // Hotfix
            effectiveDate: new Date('2026-02-01'),
            productDraft: {
                create: {
                    productId: smartphoneProduct.id,
                    name: null,
                    salePrice: null,
                    costPrice: 460.00, // Reduced from 480
                },
            },
        },
    });

    // REJECTED STAGE (2 ECOs)
    const ecoRejected1 = await db.eCO.create({
        data: {
            title: 'Increase Sale Price by 50%',
            type: ECOType.PRODUCT,
            createdById: users[1].id,
            stageId: stages[3].id,
            productVersionId: phoneV2.id,
            versionUpdate: true,
            productDraft: {
                create: {
                    productId: smartphoneProduct.id,
                    name: null,
                    salePrice: 1124.99, // 50% increase
                    costPrice: null,
                },
            },
        },
    });

    const ecoRejected2 = await db.eCO.create({
        data: {
            title: 'Remove Display Component',
            type: ECOType.BOM,
            createdById: users[1].id,
            stageId: stages[3].id,
            bomVersionId: bomV2.id,
            versionUpdate: true,
            bomDraft: {
                create: {
                    bomId: smartphoneBOM.id,
                    notes: 'Cost reduction attempt',
                },
            },
        },
    });

    const bomDraftId3 = (await db.eCO.findUnique({ where: { id: ecoRejected2.id }, include: { bomDraft: true } }))!.bomDraft!.id;
    await (db as any).eCODraftComponent.create({
        data: {
            bomDraftId: bomDraftId3,
            componentVersionId: screenV1.id,
            quantity: 1,
            action: 'DELETE',
        },
    });

    // IMPLEMENTED STAGE (3 ECOs)
    const ecoImplemented1 = await db.eCO.create({
        data: {
            title: 'EcoPhone X1 Version 2 Launch',
            type: ECOType.PRODUCT,
            createdById: users[1].id,
            stageId: stages[4].id,
            productVersionId: phoneV1.id,
            versionUpdate: true,
            productDraft: {
                create: {
                    productId: smartphoneProduct.id,
                    name: 'EcoPhone X1',
                    salePrice: 749.99,
                    costPrice: 480.00,
                },
            },
        },
    });

    const ecoImplemented2 = await db.eCO.create({
        data: {
            title: 'BOM Version 2 Component Updates',
            type: ECOType.BOM,
            createdById: users[1].id,
            stageId: stages[4].id,
            bomVersionId: bomV1.id,
            versionUpdate: true,
            bomDraft: {
                create: {
                    bomId: smartphoneBOM.id,
                    notes: 'Updated components for v2',
                },
            },
        },
    });

    const ecoImplemented3 = await db.eCO.create({
        data: {
            title: 'Hotfix: Correct Initial Cost Price',
            type: ECOType.PRODUCT,
            createdById: users[0].id, // Admin
            stageId: stages[4].id,
            productVersionId: phoneV2.id,
            versionUpdate: false, // Hotfix - updated existing version
            productDraft: {
                create: {
                    productId: smartphoneProduct.id,
                    name: null,
                    salePrice: null,
                    costPrice: 480.00,
                },
            },
        },
    });

    console.log(`✅ Created 10 ECOs across all stages\n`);

    // ===========================
    // 11. Create Comprehensive Audit Logs
    // ===========================
    console.log('📜 Creating comprehensive audit logs...');

    const auditLogs = [];

    // Draft ECO 1 logs
    auditLogs.push(
        { ecoId: ecoDraft1.id, entity: 'ECO', entityId: ecoDraft1.id, userId: users[1].id, action: 'ECO_CREATED', oldValue: null, newValue: JSON.stringify({ title: ecoDraft1.title, stage: 'Draft' }) },
        { ecoId: ecoDraft1.id, entity: 'ECOProductDraft', entityId: ecoDraft1.id, userId: users[1].id, action: 'DRAFT_UPDATED', oldValue: null, newValue: JSON.stringify({ salePrice: 699.99 }) }
    );

    // Review ECO 1 logs
    auditLogs.push(
        { ecoId: ecoReview1.id, entity: 'ECO', entityId: ecoReview1.id, userId: users[1].id, action: 'ECO_CREATED', oldValue: null, newValue: JSON.stringify({ title: ecoReview1.title, stage: 'Draft' }) },
        { ecoId: ecoReview1.id, entity: 'ECO', entityId: ecoReview1.id, userId: users[1].id, action: 'STAGE_TRANSITION', oldValue: 'Draft', newValue: 'Under Review' }
    );

    // Approved ECO logs
    auditLogs.push(
        { ecoId: ecoApproved1.id, entity: 'ECO', entityId: ecoApproved1.id, userId: users[1].id, action: 'ECO_CREATED', oldValue: null, newValue: JSON.stringify({ title: ecoApproved1.title }) },
        { ecoId: ecoApproved1.id, entity: 'ECO', entityId: ecoApproved1.id, userId: users[1].id, action: 'STAGE_TRANSITION', oldValue: 'Draft', newValue: 'Under Review' },
        { ecoId: ecoApproved1.id, entity: 'ECO', entityId: ecoApproved1.id, userId: users[2].id, action: 'ECO_APPROVED', oldValue: 'Under Review', newValue: 'Approved' }
    );

    // Rejected ECO 1 logs
    auditLogs.push(
        { ecoId: ecoRejected1.id, entity: 'ECO', entityId: ecoRejected1.id, userId: users[1].id, action: 'ECO_CREATED', oldValue: null, newValue: JSON.stringify({ title: ecoRejected1.title }) },
        { ecoId: ecoRejected1.id, entity: 'ECO', entityId: ecoRejected1.id, userId: users[1].id, action: 'STAGE_TRANSITION', oldValue: 'Draft', newValue: 'Under Review' },
        { ecoId: ecoRejected1.id, entity: 'ECO', entityId: ecoRejected1.id, userId: users[2].id, action: 'ECO_REJECTED', oldValue: 'Under Review', newValue: 'Rejected (Reason: Price increase is unreasonable and not market competitive)' }
    );

    // Rejected ECO 2 logs
    auditLogs.push(
        { ecoId: ecoRejected2.id, entity: 'ECO', entityId: ecoRejected2.id, userId: users[1].id, action: 'ECO_CREATED', oldValue: null, newValue: JSON.stringify({ title: ecoRejected2.title }) },
        { ecoId: ecoRejected2.id, entity: 'ECO', entityId: ecoRejected2.id, userId: users[1].id, action: 'STAGE_TRANSITION', oldValue: 'Draft', newValue: 'Under Review' },
        { ecoId: ecoRejected2.id, entity: 'ECO', entityId: ecoRejected2.id, userId: users[2].id, action: 'ECO_REJECTED', oldValue: 'Under Review', newValue: 'Rejected (Reason: Display is a critical component and cannot be removed)' }
    );

    // Implemented ECO 1 logs
    auditLogs.push(
        { ecoId: ecoImplemented1.id, entity: 'ECO', entityId: ecoImplemented1.id, userId: users[1].id, action: 'ECO_CREATED', oldValue: null, newValue: JSON.stringify({ title: ecoImplemented1.title }) },
        { ecoId: ecoImplemented1.id, entity: 'ECO', entityId: ecoImplemented1.id, userId: users[1].id, action: 'STAGE_TRANSITION', oldValue: 'Draft', newValue: 'Under Review' },
        { ecoId: ecoImplemented1.id, entity: 'ECO', entityId: ecoImplemented1.id, userId: users[2].id, action: 'ECO_APPROVED', oldValue: 'Under Review', newValue: 'Approved' },
        { ecoId: ecoImplemented1.id, entity: 'ECO', entityId: ecoImplemented1.id, userId: users[0].id, action: 'ECO_APPLIED', oldValue: 'Approved', newValue: 'Implemented' },
        { ecoId: ecoImplemented1.id, entity: 'ProductVersion', entityId: phoneV2.id, userId: users[0].id, action: 'VERSION_CREATED', oldValue: JSON.stringify({ version: 1 }), newValue: JSON.stringify({ version: 2 }) },
        { ecoId: ecoImplemented1.id, entity: 'ProductVersion', entityId: phoneV1.id, userId: users[0].id, action: 'VERSION_ARCHIVED', oldValue: 'ACTIVE', newValue: 'ARCHIVED' }
    );

    // Implemented ECO 3 (Hotfix) logs
    auditLogs.push(
        { ecoId: ecoImplemented3.id, entity: 'ECO', entityId: ecoImplemented3.id, userId: users[0].id, action: 'ECO_CREATED', oldValue: null, newValue: JSON.stringify({ title: ecoImplemented3.title, versionUpdate: false }) },
        { ecoId: ecoImplemented3.id, entity: 'ECO', entityId: ecoImplemented3.id, userId: users[0].id, action: 'STAGE_TRANSITION', oldValue: 'Draft', newValue: 'Approved' },
        { ecoId: ecoImplemented3.id, entity: 'ECO', entityId: ecoImplemented3.id, userId: users[0].id, action: 'ECO_APPLIED', oldValue: 'Approved', newValue: 'Implemented' },
        { ecoId: ecoImplemented3.id, entity: 'ProductVersion', entityId: phoneV2.id, userId: users[0].id, action: 'VERSION_UPDATED', oldValue: 'Previous State', newValue: JSON.stringify({ version: 2, costPrice: 480.00 }) }
    );

    await db.auditLog.createMany({ data: auditLogs });

    console.log(`✅ Created ${auditLogs.length} audit logs\n`);

    console.log('✨ Comprehensive seed completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - ${users.length} users`);
    console.log(`   - ${stages.length} ECO stages`);
    console.log('   - 8 products');
    console.log('   - 9 product versions');
    console.log('   - 2 product attachments');
    console.log('   - 2 BOMs');
    console.log('   - 3 BOM versions');
    console.log('   - 4 BOM components');
    console.log('   - 6 BOM operations');
    console.log('   - 10 ECOs (2 Draft, 2 Review, 1 Approved, 2 Rejected, 3 Implemented)');
    console.log(`   - ${auditLogs.length} audit logs`);
    console.log('\n🔐 Test User Credentials:');
    console.log('   Admin: admin@ecoflow.com / admin123');
    console.log('   Engineer: engineer@ecoflow.com / engineer123');
    console.log('   Approver: approver@ecoflow.com / approver123');
    console.log('   Operations: operations@ecoflow.com / operations123');
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
