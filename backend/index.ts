import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './src/routes/authRoutes.js';
import productRoutes from './src/routes/productRoutes.js';
import bomRoutes from './src/routes/bomRoutes.js';
import ecoRoutes from './src/routes/ecoRoutes.js';
import reportRoutes from './src/routes/reportRoutes.js';
import settingsRoutes from './src/routes/settingsRoutes.js';
import auditRoutes from './src/routes/auditRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import operationsRoutes from './src/routes/operationsRoutes.js';
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
  customSiteTitle: 'EcoFlow Titans API Docs',
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/boms', bomRoutes);
app.use('/api/ecos', ecoRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/users', userRoutes);
app.use('/api/operations', operationsRoutes);

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
  console.log(`Server running on http://localhost:${PORT}`);
});