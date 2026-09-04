import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './src/routes/authRoutes.js';
import catalogItemRoutes from './src/routes/catalogItemRoutes.js';
import variantSetRoutes from './src/routes/variantSetRoutes.js';
import ccrRoutes from './src/routes/ccrRoutes.js';
import publishTaskRoutes from './src/routes/publishTaskRoutes.js';
import reportRoutes from './src/routes/reportRoutes.js';
import settingsRoutes from './src/routes/settingsRoutes.js';
import auditRoutes from './src/routes/auditRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import { swaggerSpec } from './src/config/swagger.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  next();
});
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SynchroShift API Docs',
}));

// Routes - SynchroShift Domain
app.use('/api/auth', authRoutes);
app.use('/api/catalog-items', catalogItemRoutes);
app.use('/api/variant-sets', variantSetRoutes);
app.use('/api/ccrs', ccrRoutes);
app.use('/api/publish-tasks', publishTaskRoutes);

// Compatibility aliases
app.use('/api/products', catalogItemRoutes);
app.use('/api/boms', variantSetRoutes);
app.use('/api/ecos', ccrRoutes);
app.use('/api/operations', publishTaskRoutes);

// Shared Administration / Reporting
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/users', userRoutes);

import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

// Connection Test Route
app.get('/test-db', async (req: express.Request, res: express.Response) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ status: "Connected to PostgreSQL via Drizzle ORM!" });
  } catch (error: any) {
    res.status(500).json({ status: "Connection failed", error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`SynchroShift Server running on http://localhost:${PORT}`);
});