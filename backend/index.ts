import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './src/routes/authRoutes.js';
import { swaggerSpec } from './src/config/swagger.js';
import { db } from './src/libs/prisma.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(cookieParser());

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'EcoFlow Titans API Docs',
}));

// Routes
app.use('/api/auth', authRoutes);

// Simple Connection Test Route
app.get('/test-db', async (req: express.Request, res: express.Response) => {
  try {
    await db.$connect();
    res.json({ status: "Connected to PostgreSQL via Prisma!" });
  } catch (error) {
    res.status(500).json({ status: "Connection failed", error });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});