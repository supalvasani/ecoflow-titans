import { Role, ItemStatus, ECOType } from '@prisma/client';
import bcrypt from 'bcrypt';
import { db } from '../src/libs/prisma.js';

// Hash password function
const hashPass = (password: string) => bcrypt.hash(password, 10);

async function main() {
    console.log('🌱 Starting seed...\n');

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
                requiresApproval: true,
                isFinal: false,
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

    const smartphoneProduct = await db.product.create({
        data: {
            name: 'EcoPhone X1',
        },
    });

    const batteryProduct = await db.product.create({
        data: {
            name: 'Li-Ion Battery 5000mAh',
        },
    });

    const screenProduct = await db.product.create({
        data: {
            name: 'OLED Display 6.5"',
        },
    });

    const cameraProduct = await db.product.create({
        data: {
            name: '48MP Camera Module',
        },
    });

    console.log(`✅ Created 4 products\n`);

    // ===========================
    // 4. Create Product Versions
    // ===========================
    console.log('📱 Creating product versions...');

    // Smartphone versions
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

    const cameraV1 = await db.productVersion.create({
        data: {
            productId: cameraProduct.id,
            version: 1,
            salePrice: 85.00,
            costPrice: 50.00,
            status: ItemStatus.ACTIVE,
            isCurrent: true,
        },
    });

    console.log(`✅ Created 5 product versions\n`);

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
        data: {
            productId: smartphoneProduct.id,
        },
    });

    console.log(`✅ Created 1 BOM\n`);

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

    console.log(`✅ Created 2 BOM versions\n`);

    // ===========================
    // 8. Create BOM Components
    // ===========================
    console.log('⚙️  Creating BOM components...');

    await db.bOMComponent.createMany({
        data: [
            {
                bomVersionId: bomV2.id,
                componentVersionId: batteryV1.id,
                quantity: 1,
            },
            {
                bomVersionId: bomV2.id,
                componentVersionId: screenV1.id,
                quantity: 1,
            },
            {
                bomVersionId: bomV2.id,
                componentVersionId: cameraV1.id,
                quantity: 2, // Front and back camera
            },
        ],
    });

    console.log(`✅ Created 3 BOM components\n`);

    // ===========================
    // 9. Create BOM Operations
    // ===========================
    console.log('🏭 Creating BOM operations...');

    await db.bOMOperation.createMany({
        data: [
            {
                bomVersionId: bomV2.id,
                name: 'PCB Assembly',
                timeMinutes: 45,
                workCenter: 'Assembly Line A',
            },
            {
                bomVersionId: bomV2.id,
                name: 'Screen Installation',
                timeMinutes: 15,
                workCenter: 'Assembly Line A',
            },
            {
                bomVersionId: bomV2.id,
                name: 'Camera Integration',
                timeMinutes: 20,
                workCenter: 'Assembly Line B',
            },
            {
                bomVersionId: bomV2.id,
                name: 'Battery Installation',
                timeMinutes: 10,
                workCenter: 'Assembly Line A',
            },
            {
                bomVersionId: bomV2.id,
                name: 'Quality Testing',
                timeMinutes: 30,
                workCenter: 'QA Station',
            },
            {
                bomVersionId: bomV2.id,
                name: 'Final Packaging',
                timeMinutes: 5,
                workCenter: 'Packaging Line',
            },
        ],
    });

    console.log(`✅ Created 6 BOM operations\n`);

    // ===========================
    // 10. Create ECOs
    // ===========================
    console.log('📝 Creating ECOs...');

    const eco1 = await db.eCO.create({
        data: {
            title: 'Upgrade Battery Capacity to 5500mAh',
            type: ECOType.PRODUCT,
            createdById: users[1].id, // Engineer
            stageId: stages[1].id, // Under Review
            productVersionId: phoneV2.id,
            versionUpdate: true,
        },
    });

    const eco2 = await db.eCO.create({
        data: {
            title: 'Update Camera Module to 64MP',
            type: ECOType.BOM,
            createdById: users[1].id, // Engineer
            stageId: stages[0].id, // Draft
            bomVersionId: bomV2.id,
            versionUpdate: true,
        },
    });

    console.log(`✅ Created 2 ECOs\n`);

    // ===========================
    // 11. Create Audit Logs
    // ===========================
    console.log('📜 Creating audit logs...');

    await db.auditLog.createMany({
        data: [
            {
                ecoId: eco1.id,
                entity: 'ECO',
                entityId: eco1.id,
                userId: users[1].id,
                action: 'CREATED',
                oldValue: null,
                newValue: 'Draft ECO created',
            },
            {
                ecoId: eco1.id,
                entity: 'ECO',
                entityId: eco1.id,
                userId: users[1].id,
                action: 'STAGE_CHANGE',
                oldValue: 'Draft',
                newValue: 'Under Review',
            },
            {
                entity: 'ProductVersion',
                entityId: phoneV2.id,
                userId: users[0].id,
                action: 'CREATED',
                oldValue: null,
                newValue: 'Version 2 created',
            },
            {
                entity: 'BOMVersion',
                entityId: bomV2.id,
                userId: users[0].id,
                action: 'CREATED',
                oldValue: null,
                newValue: 'BOM Version 2 created',
            },
        ],
    });

    console.log(`✅ Created 4 audit logs\n`);

    console.log('✨ Seed completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - ${users.length} users`);
    console.log(`   - ${stages.length} ECO stages`);
    console.log('   - 4 products');
    console.log('   - 5 product versions');
    console.log('   - 2 product attachments');
    console.log('   - 1 BOM');
    console.log('   - 2 BOM versions');
    console.log('   - 3 BOM components');
    console.log('   - 6 BOM operations');
    console.log('   - 2 ECOs');
    console.log('   - 4 audit logs');
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
