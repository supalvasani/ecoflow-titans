import dotenv from 'dotenv';
dotenv.config();

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import catalogItemRoutes from '../src/routes/catalogItemRoutes.js';
import variantSetRoutes from '../src/routes/variantSetRoutes.js';
import ccrRoutes from '../src/routes/ccrRoutes.js';
import authRoutes from '../src/routes/authRoutes.js';
import reportRoutes from '../src/routes/reportRoutes.js';
import auditRoutes from '../src/routes/auditRoutes.js';
import settingsRoutes from '../src/routes/settingsRoutes.js';
import publishTaskRoutes from '../src/routes/publishTaskRoutes.js';
import { db, schema } from '../src/db/index.js';
import { hashPass, signToken } from '../src/libs/auth.js';
import crypto from 'node:crypto';
import http from 'node:http';

let server: http.Server;
let baseUrl: string;

let adminToken: string;
let merchToken: string;
let approverToken: string;
let storefrontToken: string;

let adminId: string;
let merchId: string;
let approverId: string;
let storefrontId: string;

async function request(method: string, path: string, token?: string, body?: any) {
    const init: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    };
    if (body !== undefined) {
        init.body = JSON.stringify(body);
    }
    const res = await fetch(`${baseUrl}${path}`, init);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
}

describe('SynchroShift End-to-End Acceptance Suite', () => {
    before(async () => {
        const app = express();
        app.use(cors());
        app.use(express.json());
        app.use(cookieParser());

        app.use('/api/auth', authRoutes);
        app.use('/api/catalog-items', catalogItemRoutes);
        app.use('/api/variant-sets', variantSetRoutes);
        app.use('/api/ccrs', ccrRoutes);
        app.use('/api/reports', reportRoutes);
        app.use('/api/audit', auditRoutes);
        app.use('/api/settings', settingsRoutes);
        app.use('/api/publish-tasks', publishTaskRoutes);

        await new Promise<void>((resolve) => {
            server = app.listen(0, () => {
                const address = server.address() as any;
                baseUrl = `http://127.0.0.1:${address.port}`;
                resolve();
            });
        });

        // Setup Test DB Data
        await db.delete(schema.auditLogs);
        await db.delete(schema.publishTasks);
        await db.delete(schema.ccrApprovals);
        await db.delete(schema.catalogChangeRequests);
        await db.delete(schema.ccrStages);
        await db.delete(schema.channelPublishRules);
        await db.delete(schema.variants);
        await db.delete(schema.variantSetVersions);
        await db.delete(schema.variantSets);
        await db.delete(schema.promotions);
        await db.delete(schema.catalogItemContent);
        await db.delete(schema.catalogItemVersions);
        await db.delete(schema.catalogItems);
        await db.delete(schema.users);

        const pass = await hashPass('password123');
        adminId = crypto.randomUUID();
        merchId = crypto.randomUUID();
        approverId = crypto.randomUUID();
        storefrontId = crypto.randomUUID();

        await db.insert(schema.users).values([
            { id: adminId, email: 'admin@test.com', password: pass, name: 'Admin', role: 'ADMIN' },
            { id: merchId, email: 'merch@test.com', password: pass, name: 'Merchandiser', role: 'MERCHANDISER' },
            { id: approverId, email: 'app@test.com', password: pass, name: 'Approver', role: 'CATEGORY_APPROVER' },
            { id: storefrontId, email: 'storefront@test.com', password: pass, name: 'Storefront', role: 'STOREFRONT_VIEWER' },
        ]);

        adminToken = signToken({ userId: adminId, role: 'ADMIN' });
        merchToken = signToken({ userId: merchId, role: 'MERCHANDISER' });
        approverToken = signToken({ userId: approverId, role: 'CATEGORY_APPROVER' });
        storefrontToken = signToken({ userId: storefrontId, role: 'STOREFRONT_VIEWER' });

        await db.insert(schema.ccrStages).values([
            { id: 'stage-1', name: 'Draft', sequence: 1, requiresApproval: false, isFinal: false, minApprovals: 1 },
            { id: 'stage-2', name: 'Under Review', sequence: 2, requiresApproval: true, isFinal: false, minApprovals: 1 },
            { id: 'stage-3', name: 'Live', sequence: 3, requiresApproval: false, isFinal: true, minApprovals: 1 },
        ]);
    });

    after(async () => {
        if (server) {
            server.close();
        }
        try {
            const { execSync } = await import('node:child_process');
            execSync('npx tsx src/db/seed.ts');
        } catch {
            // ignore cleanup errors
        }
        setTimeout(() => process.exit(0), 100);
    });

    it('Scenario 1: Full CCR apply lifecycle on VariantSet stockQty adjustment', async () => {
        // 1. Merchandiser creates initial CatalogItem (Velo Runner Pro)
        const pRes = await request('POST', '/api/catalog-items', merchToken, {
            name: 'Velo Runner Pro',
            sku: 'VRP-TEST-01',
            salePrice: 150.00,
            costPrice: 80.00,
        });
        assert.equal(pRes.status, 201);
        const catalogItemId = pRes.data.catalogItem.id;

        // Create Variant CatalogItem (Red/42)
        const legRes = await request('POST', '/api/catalog-items', merchToken, {
            name: 'Velo Runner Pro - Red 42',
            sku: 'VRP-R42-01',
            salePrice: 150.00,
            costPrice: 80.00,
        });
        const redVariantVersionId = legRes.data.catalogItem.versions[0].id;

        // 2. Merchandiser creates VariantSet
        const bRes = await request('POST', '/api/variant-sets', merchToken, {
            catalogItemId,
        });
        assert.equal(bRes.status, 201);
        const variantSetId = bRes.data.variantSet.id;

        // 3. Storefront viewer views active VariantSet (V1)
        const storeInitial = await request('GET', `/api/variant-sets/${variantSetId}/active`, storefrontToken);
        assert.equal(storeInitial.status, 200);
        assert.equal(storeInitial.data.version.version, 1);

        // 4. Merchandiser creates CCR to add Variant (Red 42 with stockQty = 200)
        const ccrRes = await request('POST', '/api/ccrs', merchToken, {
            title: 'Add Red 42 Variant',
            type: 'VARIANT_SET',
            variantSetId,
            initialChanges: {
                notes: 'Add Red 42 variant to set',
                variants: [
                    { action: 'ADD', variantVersionId: redVariantVersionId, attributeName: 'Color', attributeValue: 'Red', stockQty: 200 }
                ],
            },
        });
        assert.equal(ccrRes.status, 201);
        const ccrId = ccrRes.data.ccr.id;

        // 5. Merchandiser submits CCR for review
        const submitRes = await request('POST', `/api/ccrs/${ccrId}/submit`, merchToken);
        assert.equal(submitRes.status, 200);
        assert.equal(submitRes.data.ccr.stage.name, 'Under Review');

        // 6. Category Approver approves CCR (since next stage is Live/Final, it applies automatically)
        const appRes = await request('POST', `/api/ccrs/${ccrId}/approve`, approverToken);
        assert.equal(appRes.status, 200);

        // 7. Storefront viewer queries active version and asserts NEW ACTIVE version 2 with variant
        const storeFinal = await request('GET', `/api/variant-sets/${variantSetId}/active`, storefrontToken);
        assert.equal(storeFinal.status, 200);
        assert.equal(storeFinal.data.version.version, 2);
        assert.equal(storeFinal.data.version.status, 'ACTIVE');
        assert.equal(storeFinal.data.version.variants.length, 1);
        assert.equal(storeFinal.data.version.variants[0].stockQty, 200);
    });

    it('Scenario 2: CatalogItem price/cost update via CCR reflects immediately to Storefront', async () => {
        // 1. Merchandiser creates CatalogItem
        const pRes = await request('POST', '/api/catalog-items', merchToken, {
            name: 'Luminos Glow Serum',
            sku: 'LGS-TEST-01',
            salePrice: 50.00,
            costPrice: 25.00,
        });
        const catalogItemId = pRes.data.catalogItem.id;

        // 2. Merchandiser creates CCR for price update
        const ccrRes = await request('POST', '/api/ccrs', merchToken, {
            title: 'Luminos Glow Serum Price Adjustment',
            type: 'CATALOG_ITEM',
            catalogItemId,
            initialChanges: {
                salePrice: 65.00,
                costPrice: 28.00,
            },
        });
        const ccrId = ccrRes.data.ccr.id;

        // 3. Merchandiser submits CCR
        await request('POST', `/api/ccrs/${ccrId}/submit`, merchToken);

        // 4. Approver approves CCR
        await request('POST', `/api/ccrs/${ccrId}/approve`, approverToken);

        // 5. Storefront viewer queries active item details
        const storeRes = await request('GET', `/api/catalog-items/${catalogItemId}`, storefrontToken);
        assert.equal(storeRes.status, 200);
        assert.equal(storeRes.data.catalogItem.versions.length, 1);
        assert.equal(storeRes.data.catalogItem.versions[0].version, 2);
        assert.equal(parseFloat(storeRes.data.catalogItem.versions[0].salePrice), 65.00);
        assert.equal(parseFloat(storeRes.data.catalogItem.versions[0].costPrice), 28.00);
    });

    it('Role Enforcement Matrix: Assert 403 status for unauthorized operations per role', async () => {
        // Storefront user tries to view Draft CCRs -> 403
        const storeCcr = await request('GET', '/api/ccrs', storefrontToken);
        assert.equal(storeCcr.status, 403);

        // Storefront user tries to view Reports -> 403
        const storeReport = await request('GET', '/api/reports/ccr-history', storefrontToken);
        assert.equal(storeReport.status, 403);

        // Merchandiser tries to approve CCR -> 403
        const fakeId = crypto.randomUUID();
        const merchApprove = await request('POST', `/api/ccrs/${fakeId}/approve`, merchToken);
        assert.equal(merchApprove.status, 403);

        // Approver user tries to edit draft -> 403
        const appDraft = await request('PATCH', `/api/ccrs/${fakeId}/draft`, approverToken, { name: 'Hack' });
        assert.equal(appDraft.status, 403);
    });
});
