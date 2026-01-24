# EcoFlow Titans

An Engineering Change Order (ECO) Management System designed to streamline product lifecycle management, bill of materials (BOM) tracking, and engineering change processes with strict role-based access control and full audit traceability.

## 📋 Project Description

EcoFlow Titans is a comprehensive web application that manages the entire lifecycle of products and their associated bills of materials (BOMs) through controlled Engineering Change Orders (ECOs). The system ensures data integrity, prevents direct edits to active data, and maintains complete traceability of all changes.

### Key Features

- **Role-Based Access Control**: Admin, Engineering, Approver, and Operations roles with specific permissions
- **Product Management**: Create and manage products with versioning and status tracking
- **BOM Management**: Hierarchical bill of materials with component and operation tracking
- **ECO Workflow**: Structured engineering change order process with approval stages
- **Audit Logging**: Complete traceability of all system changes
- **Data Integrity**: Strict invariants prevent direct edits to active data
- **Interactive API Documentation**: Swagger/OpenAPI for easy testing and integration

### System Invariants

The system follows strict rules to maintain data integrity:
- No direct edits to active products or BOMs
- All changes must go through ECO approval workflows
- Archived data is immutable and preserved for audit
- Only active versions are usable in operations
- Draft data is isolated and never affects master data

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js (v18+)
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **API Documentation**: Swagger/OpenAPI
- **Dev Tools**: nodemon, tsx

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React Context
- **Routing**: React Router

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn package manager

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ecoflow-titans
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
# Create a .env file in the backend directory
cp .env.example .env
```

Edit the `.env` file with your database credentials:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"
JWT_SECRET="your-secure-jwt-secret-key"
PORT=5000
```

### 3. Database Setup

```bash
# Run database migrations
npx prisma migrate dev

# Seed the database with sample data
npm run seed

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

### 4. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Configure environment variables
# Create a .env file in the frontend directory
cp .env.example .env
```

Edit the `.env` file:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## 🏃‍♂️ Running the Application

### Development Mode

1. **Start Backend** (in one terminal):
```bash
cd backend
npm run dev
```

2. **Start Frontend** (in another terminal):
```bash
cd frontend
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

### Production Build

```bash
# Build frontend
cd frontend
npm run build

# Build backend (if needed)
cd ../backend
npm run build
```

## 🗄️ Database Connection

The application uses PostgreSQL as the database. Follow these steps to set up the database connection:

1. **Install PostgreSQL** on your system
2. **Create a database** for the project
3. **Update the DATABASE_URL** in `backend/.env` with your connection string:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"
   ```
4. **Run migrations** to create tables:
   ```bash
   cd backend
   npx prisma migrate dev
   ```
5. **Seed the database** with initial data:
   ```bash
   npm run seed
   ```

The database schema includes tables for users, products, BOMs, ECOs, audit logs, and more.

## 📚 API Testing with Swagger

The backend provides interactive API documentation through Swagger UI.

### Accessing Swagger UI

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:5000/api-docs
   ```

### Testing API Endpoints

1. **Authentication**: Use the `/api/auth/login` endpoint to obtain a JWT token
2. **Test Users** (after seeding):
   - **Admin**: admin@ecoflow.com / admin123
   - **Engineer**: engineer@ecoflow.com / engineer123
   - **Approver**: approver@ecoflow.com / approver123
   - **Operations**: operations@ecoflow.com / operations123

3. **Authorization**: Include the JWT token in the `Authorization` header as `Bearer <token>`

4. **Available Endpoints**:
   - Authentication: `/api/auth/*`
   - Products: `/api/products/*`
   - BOMs: `/api/boms/*`
   - ECOs: `/api/ecos/*`

### Testing Guide

For comprehensive testing instructions, including cURL examples, Postman setup, and testing different user roles, refer to:
- [Backend Testing Guide](./backend/TESTING_GUIDE.md)

## 🧪 Testing

### Backend Testing

```bash
cd backend
npm test
```

### Frontend Testing

```bash
cd frontend
npm test
```

## 📁 Project Structure

```
ecoflow-titans/
├── backend/                 # Node.js/Express API
│   ├── prisma/             # Database schema and migrations
│   ├── src/
│   │   ├── config/         # Swagger configuration
│   │   ├── controllers/    # Route handlers
│   │   ├── libs/           # Utilities (auth, validation)
│   │   ├── middlewares/    # Authentication middleware
│   │   ├── routes/         # API routes
│   │   └── services/       # Business logic
│   └── TESTING_GUIDE.md    # API testing guide
├── frontend/               # React/Vite application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service functions
│   │   └── types/          # TypeScript type definitions
│   └── public/             # Static assets
└── docs/                   # Documentation
    └── ECOFLOW_INVARIANTS.md # System rules and constraints
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

EcoFlow Titans - Hackathon 2024

## 📞 Support

For questions or support, please contact the development team or create an issue in the repository.</content>
<parameter name="filePath">e:\ecoflow-titans\README.md