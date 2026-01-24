import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';

dotenv.config(); 

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(cookieParser());

// Simple Connection Test Route
app.get('/test-db', async (req, res) => {
  try {
    await prisma.$connect();
    res.json({ status: "Connected to PostgreSQL via Prisma!" });
  } catch (error) {
    res.status(500).json({ status: "Connection failed", error });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});