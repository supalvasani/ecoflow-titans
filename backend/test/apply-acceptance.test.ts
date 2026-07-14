import dotenv from 'dotenv';
dotenv.config();

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import productRoutes from '../src/routes/productRoutes.js';
import bomRoutes from '../src/routes/bomRoutes.js';
import ecoRoutes from '../src/routes/ecoRoutes.js';
import authRoutes from '../src/routes/authRoutes.js';
import reportRoutes from '../src/routes/reportRoutes.js';
import auditRoutes from '../src/routes/auditRoutes.js';
import settingsRoutes from '../src/routes/settingsRoutes.js';
import operationsRoutes from '../src/routes/operationsRoutes.js';
import { db, schema } from '../src/db/index.js';
import { hashPass, signToken } from '../src/libs/auth.js';
import crypto from 'node:crypto';
import http from 'node:http';

let server: http.Server;
let baseUrl: string;

let adminToken: string;
let engToken: string;
let appToken: string;
let opsToken: string;

let adminId: string;
let engId: string;
let appId: string;
let opsId: string;

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

describe('ECOFlow End-to-End Acceptance & Critical Bug Fix Suite', () => {
    before(async () => {
        const app = express();
        app.use(cors());
        app.use(express.json());
        app.use(cookieParser());

        app.use('/api/auth', authRoutes);
        app.use('/api/products', productRoutes);
        app.use('/api/boms', bomRoutes);
        app.use('/api/ecos', ecoRoutes);
        app.use('/api/reports', reportRoutes);
        app.use('/api/audit', auditRoutes);
        app.use('/api/settings', settingsRoutes);
        app.use('/api/operations', operationsRoutes);

        await new Promise<void>((resolve) => {
            server = app.listen(0, () => {
                const address = server.address() as any;
                baseUrl = `http://127.0.0.1:${address.port}`;
                resolve();
            });
        });

        // Setup Test DB Data
        await db.delete(schema.auditLogs);
        await db.delete(schema.operationsTasks);
        await db.delete(schema.ecos);
        await db.delete(schema.ecoStages);
        await db.delete(schema.bomOperations);
        await db.delete(schema.bomComponents);
        await db.delete(schema.bomVersions);
        await db.delete(schema.boms);
        await db.delete(schema.productAttachments);
        await db.delete(schema.productVersions);
        await db.delete(schema.products);
        await db.delete(schema.users);

        const pass = await hashPass('password123');
        adminId = crypto.randomUUID();
        engId = crypto.randomUUID();
        appId = crypto.randomUUID();
        opsId = crypto.randomUUID();

        await db.insert(schema.users).values([
            { id: adminId, email: 'admin@test.com', password: pass, name: 'Admin', role: 'ADMIN' },
            { id: engId, email: 'eng@test.com', password: pass, name: 'Engineer', role: 'ENGINEERING_USER' },
            { id: appId, email: 'app@test.com', password: pass, name: 'Approver', role: 'APPROVER' },
            { id: opsId, email: 'ops@test.com', password: pass, name: 'Ops', role: 'OPERATIONS_USER' },
        ]);

        adminToken = signToken({ userId: adminId, role: 'ADMIN' });
        engToken = signToken({ userId: engId, role: 'ENGINEERING_USER' });
        appToken = signToken({ userId: appId, role: 'APPROVER' });
        opsToken = signToken({ userId: opsId, role: 'OPERATIONS_USER' });

        await db.insert(schema.ecoStages).values([
            { id: 'stage-1', name: 'Draft', sequence: 1, requiresApproval: false, isFinal: false },
            { id: 'stage-2', name: 'Under Review', sequence: 2, requiresApproval: true, isFinal: false },
            { id: 'stage-3', name: 'Implemented', sequence: 3, requiresApproval: false, isFinal: true },
        ]);
    });

    after(async () => {
        if (server) {
            server.close();
        }
        setTimeout(() => process.exit(0), 100);
    });

    it('Scenario 1: Full ECO apply lifecycle on Wooden Table BOM quantity adjustment', async () => {
        // 1. Engineer creates initial product (Wooden Table)
        const pRes = await request('POST', '/api/products', engToken, {
            name: 'Wooden Table',
            salePrice: 150.00,
            costPrice: 80.00,
        });
        assert.equal(pRes.status, 201);
        const productId = pRes.data.product.id;
        const initialProductVersionId = pRes.data.product.versions[0].id;

        // Create Component Product (Table Leg)
        const legRes = await request('POST', '/api/products', engToken, {
            name: 'Table Leg',
            salePrice: 20.00,
            costPrice: 10.00,
        });
        const legProductVersionId = legRes.data.product.versions[0].id;

        // 2. Engineer creates BOM for Wooden Table
        const bRes = await request('POST', '/api/boms', engToken, {
            productId,
        });
        assert.equal(bRes.status, 201);
        const bomId = bRes.data.bom.id;

        // 3. Operations user views active BOM (V1)
        const opsInitial = await request('GET', `/api/boms/${bomId}/active`, opsToken);
        assert.equal(opsInitial.status, 200);
        assert.equal(opsInitial.data.version.version, 1);

        // 4. Engineer creates ECO to adjust BOM quantity (add Table Legs = 4)
        const ecoRes = await request('POST', '/api/ecos', engToken, {
            title: 'Wooden Table Leg Component Adjustment',
            type: 'BOM',
            bomId,
            initialChanges: {
                notes: 'Add 4 Legs to BOM',
                components: [
                    { action: 'ADD', componentVersionId: legProductVersionId, quantity: 4 }
                ],
            },
        });
        assert.equal(ecoRes.status, 201);
        const ecoId = ecoRes.data.eco.id;

        // 5. Engineer submits ECO for review
        const submitRes = await request('POST', `/api/ecos/${ecoId}/submit`, engToken);
        assert.equal(submitRes.status, 200);
        assert.equal(submitRes.data.eco.stage.name, 'Under Review');

        // 6. Approver approves ECO (since next stage is Implemented/Final, it applies automatically)
        const appRes = await request('POST', `/api/ecos/${ecoId}/approve`, appToken);
        assert.equal(appRes.status, 200);

        // 7. Operations user hits GET /api/boms/:id/active and asserts NEW ACTIVE version 2 with quantity 4
        const opsFinal = await request('GET', `/api/boms/${bomId}/active`, opsToken);
        assert.equal(opsFinal.status, 200);
        assert.equal(opsFinal.data.version.version, 2);
        assert.equal(opsFinal.data.version.status, 'ACTIVE');
        assert.equal(opsFinal.data.version.components.length, 1);
        assert.equal(opsFinal.data.version.components[0].quantity, 4);
    });

    it('Scenario 2: Product price/cost update via ECO reflects immediately to Operations user', async () => {
        // 1. Engineer creates Product (EcoLamp)
        const pRes = await request('POST', '/api/products', engToken, {
            name: 'EcoLamp',
            salePrice: 50.00,
            costPrice: 25.00,
        });
        const productId = pRes.data.product.id;

        // 2. Engineer creates Product ECO for price update
        const ecoRes = await request('POST', '/api/ecos', engToken, {
            title: 'EcoLamp Price Adjustment',
            type: 'PRODUCT',
            productId,
            initialChanges: {
                salePrice: 65.00,
                costPrice: 28.00,
            },
        });
        const ecoId = ecoRes.data.eco.id;

        // 3. Engineer submits ECO
        await request('POST', `/api/ecos/${ecoId}/submit`, engToken);

        // 4. Approver approves ECO
        await request('POST', `/api/ecos/${ecoId}/approve`, appToken);

        // 5. Operations user queries active product details
        const opsRes = await request('GET', `/api/products/${productId}`, opsToken);
        assert.equal(opsRes.status, 200);
        assert.equal(opsRes.data.product.versions.length, 1);
        assert.equal(opsRes.data.product.versions[0].version, 2);
        assert.equal(opsRes.data.product.versions[0].salePrice, '65.00');
        assert.equal(opsRes.data.product.versions[0].costPrice, '28.00');
    });

    it('Role Enforcement Matrix: Assert 403 status for unauthorized operations per role', async () => {
        // Operations user tries to view Draft ECOs -> 403
        const opsEco = await request('GET', '/api/ecos', opsToken);
        assert.equal(opsEco.status, 403);

        // Operations user tries to view Reports -> 403
        const opsReport = await request('GET', '/api/reports/eco-history', opsToken);
        assert.equal(opsReport.status, 403);

        // Engineering user tries to approve ECO -> 403
        const fakeId = crypto.randomUUID();
        const engApprove = await request('POST', `/api/ecos/${fakeId}/approve`, engToken);
        assert.equal(engApprove.status, 403);

        // Approver user tries to edit draft -> 403
        const appDraft = await request('PATCH', `/api/ecos/${fakeId}/draft/product`, appToken, { name: 'Hack' });
        assert.equal(appDraft.status, 403);
    });
});
