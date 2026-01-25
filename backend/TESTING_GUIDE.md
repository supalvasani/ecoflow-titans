# EcoFlow Titans API - Complete Testing Guide

## 🚀 Quick Start

### 1. Setup Database and Seed Data

First, make sure your PostgreSQL database is running and configured in `.env`:

```bash
DATABASE_URL="postgresql://postgres:admin@localhost:5432/hackoddo2?schema=public"
JWT_SECRET="titansgotnochill"
PORT=5000
```

### 2. Run Prisma Migrations

```bash
npx prisma migrate dev
```

### 3. Seed the Database

```bash
npx tsx prisma/seed.ts
```

This will create:
- **4 Users** with different roles (Admin, Engineer, Approver, Operations)
- **4 Products** (EcoPhone X1, Battery, Screen, Camera)
- **5 Product Versions** with pricing and status
- **2 Product Attachments**
- **1 BOM** with 2 versions
- **3 BOM Components**
- **6 BOM Operations**
- **4 ECO Stages** (Draft, Under Review, Approved, Implemented)
- **2 ECOs** (Engineering Change Orders)
- **4 Audit Logs**

### 4. Start the Server

```bash
npm run dev
```

The server will start at `http://localhost:5000`

---

## 📚 API Documentation with Swagger

### Access Swagger UI

Once the server is running, open your browser and navigate to:

```
http://localhost:5000/api-docs
```

You'll see the interactive Swagger UI with all API endpoints documented!

### Using Swagger UI

1. **Explore Endpoints**: Click on any endpoint to see details
2. **Try It Out**: Click "Try it out" button to test endpoints
3. **Authenticate**: 
   - First, use the `/api/auth/login` endpoint to get a JWT token
   - Click the "Authorize" button (🔓) at the top right
   - Enter: `Bearer YOUR_TOKEN_HERE`
   - Now you can test protected endpoints like `/api/auth/me`

---

## 🔐 Test User Credentials

Use these credentials to test authentication:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@ecoflow.com | admin123 |
| **Engineer** | engineer@ecoflow.com | engineer123 |
| **Approver** | approver@ecoflow.com | approver123 |
| **Operations** | operations@ecoflow.com | operations123 |

---

## 🧪 Testing with cURL

### 1. Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ecoflow.com",
    "password": "admin123"
  }'
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "admin@ecoflow.com",
    "name": "Admin User",
    "role": "ADMIN"
  }
}
```

### 2. Get Current User (Protected)

**Copy the token from login response and use it here:**

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response:**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "admin@ecoflow.com",
    "name": "Admin User",
    "role": "ADMIN",
    "createdAt": "2026-01-24T06:40:05.000Z"
  }
}
```

### 3. Logout

```bash
curl -X POST http://localhost:5000/api/auth/logout
```

**Response:**
```json
{
  "message": "Logout successful"
}
```

---

## 🧪 Testing with Postman

### Import Collection

You can create a Postman collection with these endpoints:

1. **Create New Collection**: "EcoFlow Titans API"
2. **Add Environment Variables**:
   - `baseUrl`: `http://localhost:5000`
   - `token`: (will be set automatically after login)

### Request 1: Login

- **Method**: POST
- **URL**: `{{baseUrl}}/api/auth/login`
- **Headers**: 
  - `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "email": "admin@ecoflow.com",
  "password": "admin123"
}
```
- **Tests** (to auto-save token):
```javascript
const response = pm.response.json();
pm.environment.set("token", response.token);
```

### Request 2: Get Me

- **Method**: GET
- **URL**: `{{baseUrl}}/api/auth/me`
- **Headers**: 
  - `Authorization: Bearer {{token}}`

### Request 3: Logout

- **Method**: POST
- **URL**: `{{baseUrl}}/api/auth/logout`

---

## 🎯 Testing Different User Roles

Test with different user roles to see how the system handles different permissions:

### Admin User
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@ecoflow.com", "password": "admin123"}'
```

### Engineering User
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "engineer@ecoflow.com", "password": "engineer123"}'
```

### Approver User
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "approver@ecoflow.com", "password": "approver123"}'
```

### Operations User
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "operations@ecoflow.com", "password": "operations123"}'
```

---

## ❌ Error Responses

### 400 Bad Request
```json
{
  "error": "Email and password are required"
}
```

### 401 Unauthorized (Invalid Credentials)
```json
{
  "error": "Invalid credentials"
}
```

### 401 Unauthorized (No Token)
```json
{
  "error": "Access denied"
}
```

### 401 Unauthorized (Invalid Token)
```json
{
  "error": "Invalid token"
}
```

### 404 Not Found
```json
{
  "error": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## 🏗️ Architecture Overview

### Service Layer Pattern

The application follows a clean architecture with separation of concerns:

```
┌─────────────────┐
│   Routes        │  → Define endpoints
└────────┬────────┘
         │
┌────────▼────────┐
│  Controllers    │  → Handle HTTP requests/responses
└────────┬────────┘
         │
┌────────▼────────┐
│   Services      │  → Business logic
└────────┬────────┘
         │
┌────────▼────────┐
│  Prisma/DB      │  → Data access
└─────────────────┘
```

**Files:**
- `src/routes/authRoutes.ts` - Route definitions
- `src/controllers/authController.ts` - Request/response handling
- `src/service/authService.ts` - Business logic
- `src/middlewares/authMiddleware.ts` - JWT authentication
- `src/libs/auth.ts` - Utility functions (hashing, token signing)

---

## 🗄️ Database Schema Overview

The seeded database includes:

### Users
- 4 users with different roles: ADMIN, ENGINEERING_USER, APPROVER, OPERATIONS_USER

### Products & Versions
- **EcoPhone X1**: Main product with 2 versions (v1 archived, v2 active)
- **Components**: Battery, Screen, Camera modules

### BOMs (Bill of Materials)
- BOM for EcoPhone X1 with 2 versions
- Components: 1x Battery, 1x Screen, 2x Camera
- Operations: Assembly, Testing, Packaging (6 operations total)

### ECO Workflow
- 4 stages: Draft → Under Review → Approved → Implemented
- 2 sample ECOs (battery upgrade, camera upgrade)

### Audit Logs
- Tracks all changes to ECOs and versions

---

## 🔧 Troubleshooting

### Database Connection Issues

If you get connection errors:

1. **Check PostgreSQL is running**:
```bash
# Windows
Get-Service postgresql*
```

2. **Verify DATABASE_URL** in `.env`

3. **Test connection**:
```bash
curl http://localhost:5000/test-db
```

### Token Issues

If you get "Invalid token" errors:

1. **Check JWT_SECRET** matches in `.env`
2. **Ensure token format**: `Authorization: Bearer YOUR_TOKEN`
3. **Token expires in 24 hours** - login again to get a new token

### Swagger UI Not Loading

1. **Clear browser cache**
2. **Check server is running** on port 5000
3. **Navigate to**: `http://localhost:5000/api-docs`

---

## 📖 Next Steps

Now that authentication is working, you can:

1. **Add more endpoints** for Products, BOMs, ECOs
2. **Implement role-based access control** (RBAC)
3. **Add validation** with libraries like Zod or Joi
4. **Add tests** with Jest or Vitest
5. **Deploy** to production

---

## 🎉 Summary

You now have:
- ✅ **JWT Authentication** with login, logout, and protected routes
- ✅ **Service Layer Architecture** for clean code organization
- ✅ **Comprehensive Seed Data** covering all schema entities
- ✅ **Swagger/OpenAPI Documentation** for easy API testing
- ✅ **Multiple Test Users** with different roles
- ✅ **Complete Testing Guide** with cURL and Postman examples

**Happy Testing! 🚀**
