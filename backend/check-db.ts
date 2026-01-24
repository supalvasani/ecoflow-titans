import { db } from './src/libs/prisma.js';

async function checkDatabase() {
    console.log('Checking database contents...\n');

    const users = await db.user.count();
    const products = await db.product.count();
    const boms = await db.bOM.count();
    const ecos = await db.eCO.count();
    const stages = await db.eCOStage.count();

    console.log(`Users: ${users}`);
    console.log(`Products: ${products}`);
    console.log(`BOMs: ${boms}`);
    console.log(`ECOs: ${ecos}`);
    console.log(`ECO Stages: ${stages}`);

    // List all BOMs with their product IDs
    const allBOMs = await db.bOM.findMany({
        include: {
            product: true,
            versions: true
        }
    });

    console.log('\nBOMs in database:');
    allBOMs.forEach(bom => {
        console.log(`  - BOM ID: ${bom.id}, Product: ${bom.product.name} (${bom.productId}), Versions: ${bom.versions.length}`);
    });

    await db.$disconnect();
}

checkDatabase().catch(console.error);
