# EcoFlow Titans Backend

Backend API for EcoFlow Titans - Engineering Change Order (ECO) Management System

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- PostgreSQL database
- npm or yarn

### Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment variables**:

Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://postgres:admin@localhost:5432/hackoddo2?schema=public"
JWT_SECRET="titansgotnochill"
PORT=5000
```

3. **Run database migrations**:
```bash
npx prisma migrate dev
```

4. **Seed the database**:
```bash
npm run seed
```

5. **Start the development server**:
```bash
npm run dev
```

The server will start at `http://localhost:5000`

## 📚 API Documentation

### Swagger UI

Interactive API documentation is available at:
```
http://localhost:5000/api-docs
```

### Available Endpoints

#### Authentication
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/logout` - Logout (client-side token removal)
- `GET /api/auth/me` - Get current user (protected)

## 🔐 Test Users

After seeding, you can use these credentials:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ecoflow.com | admin123 |
| Engineer | engineer@ecoflow.com | engineer123 |
| Approver | approver@ecoflow.com | approver123 |
| Operations | operations@ecoflow.com | operations123 |

## 🏗️ Architecture

```
backend/
├── index.ts                 # Main application entry
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Database seed script
├── src/
│   ├── config/
│   │   └── swagger.ts      # Swagger/OpenAPI configuration
│   ├── controllers/
│   │   └── authController.ts
│   ├── libs/
│   │   ├── auth.ts         # Auth utilities (hash, compare, sign)
│   │   └── prisma.ts       # Prisma client
│   ├── middlewares/
│   │   └── authMiddleware.ts
│   ├── routes/
│   │   └── authRoutes.ts
│   └── service/
│       └── authService.ts  # Business logic layer
└── TESTING_GUIDE.md        # Comprehensive testing guide

```

### Design Pattern

The application follows a **layered architecture**:

1. **Routes** - Define API endpoints
2. **Controllers** - Handle HTTP requests/responses
3. **Services** - Business logic (separated from controllers)
4. **Prisma** - Database access layer

## 📖 Documentation

- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Complete guide for testing the API with Swagger, cURL, and Postman
- **[API_TESTING.md](./API_TESTING.md)** - Quick reference for API endpoints

## 🗄️ Database Schema

The system manages:
- **Users** with role-based access (Admin, Engineer, Approver, Operations)
- **Products** and **Product Versions**
- **BOMs** (Bill of Materials) and **BOM Versions**
- **BOM Components** and **Operations**
- **ECOs** (Engineering Change Orders) with workflow stages
- **Audit Logs** for traceability

## 🛠️ Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run seed` - Seed database with sample data
- `npx prisma studio` - Open Prisma Studio (database GUI)
- `npx prisma migrate dev` - Run database migrations

## 🔧 Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **API Documentation**: Swagger/OpenAPI
- **Dev Tools**: nodemon, tsx

## 📝 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET` | Secret key for JWT signing | `your-secret-key` |
| `PORT` | Server port | `5000` |

## 🧪 Testing

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for comprehensive testing instructions including:
- Swagger UI usage
- cURL examples
- Postman collection setup
- Testing different user roles
- Error handling

## 🚀 Next Steps

- [ ] Add CRUD endpoints for Products
- [ ] Add CRUD endpoints for BOMs
- [ ] Add CRUD endpoints for ECOs
- [ ] Implement role-based access control (RBAC)
- [ ] Add input validation (Zod/Joi)
- [ ] Add unit and integration tests
- [ ] Add rate limiting
- [ ] Add logging (Winston/Pino)
- [ ] Deploy to production

## 📄 License

MIT

## 👥 Team

EcoFlow Titans - Hackathon 2024
