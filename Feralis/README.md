# Feralis Manufacturing Operations Platform

A comprehensive manufacturing operations platform designed for automated CNC and metal fabrication businesses, handling end-to-end operations from materials receipt to finished goods shipping.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm or yarn

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd feralis-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start infrastructure services**
   ```bash
   npm run docker:up
   ```
   This starts PostgreSQL (with TimescaleDB), Redis, and MinIO.

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

5. **Generate Prisma client**
   ```bash
   npm run prisma:generate
   ```

6. **Run database migrations**
   ```bash
   npm run prisma:migrate:dev
   ```

7. **Seed the database**
   ```bash
   npm run prisma:seed
   ```

8. **Start the development server**
   ```bash
   npm run start:dev
   ```

9. **Access the application**
   - API: http://localhost:3000
   - Swagger Docs: http://localhost:3000/docs
   - MinIO Console: http://localhost:9001 (feralis_minio / feralis_minio_secret)
   - pgAdmin: http://localhost:5050 (admin@feralis.local / admin) - requires `--profile tools`

### Default Login Credentials
- **Email:** admin@feralis.com
- **Password:** Admin123!@#

## 📁 Project Structure

```
feralis-platform/
├── docker/                     # Docker configuration
│   ├── docker-compose.yml      # Development infrastructure
│   └── init-scripts/           # PostgreSQL init scripts
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Database migrations
│   └── seeds/                  # Seed data
├── src/
│   ├── common/                 # Shared utilities
│   │   ├── decorators/         # Custom decorators
│   │   ├── filters/            # Exception filters
│   │   ├── guards/             # Auth guards
│   │   ├── interceptors/       # Request/response interceptors
│   │   ├── pipes/              # Validation pipes
│   │   ├── prisma/             # Prisma service
│   │   ├── redis/              # Redis service
│   │   └── utils/              # Utility functions
│   ├── config/                 # Configuration
│   │   ├── configuration.ts    # Config loader
│   │   └── validation.schema.ts # Env validation
│   ├── modules/                # Feature modules
│   │   ├── auth/               # Authentication
│   │   ├── users/              # User management
│   │   ├── organizations/      # Organization management
│   │   ├── facilities/         # Facility management
│   │   ├── roles/              # Role management
│   │   ├── permissions/        # Permission management
│   │   ├── audit/              # Audit logging
│   │   ├── notifications/      # Notifications
│   │   ├── files/              # File management
│   │   ├── health/             # Health checks
│   │   ├── customers/          # Customer management (Phase 2)
│   │   ├── parts/              # Parts management (Phase 2)
│   │   ├── quotes/             # Quote management (Phase 3)
│   │   ├── orders/             # Order management (Phase 3)
│   │   └── inventory/          # Inventory management (Phase 3)
│   ├── app.module.ts           # Root module
│   └── main.ts                 # Entry point
├── test/                       # Test files
├── .env.example                # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## 🔐 Authentication

The platform uses JWT-based authentication with the following features:

- **Access Tokens**: Short-lived (15 minutes default)
- **Refresh Tokens**: Long-lived (7 days default) with rotation
- **MFA Support**: TOTP-based two-factor authentication
- **Session Management**: Redis-backed sessions with concurrent session limits
- **Account Lockout**: Configurable failed attempt threshold

### Auth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/mfa/verify` | Verify MFA code |
| POST | `/api/v1/auth/logout` | User logout |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password |
| GET | `/api/v1/auth/me` | Get current user |
| GET | `/api/v1/auth/mfa/setup` | Get MFA setup data |
| POST | `/api/v1/auth/mfa/enable` | Enable MFA |
| POST | `/api/v1/auth/mfa/disable` | Disable MFA |

## 👥 Role-Based Access Control

### System Roles

| Role | Description |
|------|-------------|
| SUPER_ADMIN | Full system access |
| ADMIN | Organization administrator |
| MANAGER | Department manager |
| OPERATOR | Production floor operator |
| VIEWER | Read-only access |

### Permission Format

Permissions follow the format: `{module}.{action}[.{scope}]`

Examples:
- `users.create` - Create users
- `orders.read` - Read orders
- `production.manage` - Manage production

## 📊 Database

### Technology Stack

- **PostgreSQL 16** - Primary database
- **TimescaleDB** - Time-series data (telemetry)
- **Redis 7** - Caching and sessions
- **MinIO** - Object storage (S3-compatible)

### Schemas

| Schema | Purpose |
|--------|---------|
| public | Core system tables |
| audit | Immutable audit logs |

## 🔧 Configuration

### Environment Variables

Key environment variables (see `.env.example` for full list):

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | - |
| `JWT_ACCESS_SECRET` | JWT signing secret | - |
| `JWT_REFRESH_SECRET` | Refresh token secret | - |
| `MINIO_ACCESS_KEY` | MinIO access key | - |
| `MINIO_SECRET_KEY` | MinIO secret key | - |

## 📜 Available Scripts

```bash
# Development
npm run start:dev      # Start with hot reload
npm run start:debug    # Start with debugger

# Production
npm run build          # Build for production
npm run start:prod     # Start production server

# Database
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate:dev # Run migrations (dev)
npm run prisma:migrate:deploy # Run migrations (prod)
npm run prisma:seed        # Seed database
npm run prisma:studio      # Open Prisma Studio
npm run db:reset           # Reset and reseed database

# Docker
npm run docker:up      # Start infrastructure
npm run docker:down    # Stop infrastructure

# Testing
npm run test           # Run unit tests
npm run test:e2e       # Run e2e tests
npm run test:cov       # Run with coverage

# Code Quality
npm run lint           # Run ESLint
npm run format         # Run Prettier
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📈 API Documentation

Interactive API documentation is available at `/docs` when the server is running.

Features:
- Swagger UI interface
- Try-it-out functionality
- JWT authentication support
- Request/response schemas

## 🔒 Security Features

- **Password Hashing**: Argon2id with secure parameters
- **Password Policy**: Configurable complexity requirements
- **Breach Detection**: Integration with Have I Been Pwned
- **Rate Limiting**: Configurable per-endpoint limits
- **CORS**: Configurable origins
- **Helmet**: Security headers
- **Audit Logging**: Comprehensive activity tracking

## 📦 Implemented Components

### Phase 1: Core Infrastructure
- ✅ Core Infrastructure (PostgreSQL, Redis, MinIO)
- ✅ Authentication & Authorization (JWT, MFA, RBAC)
- ✅ User Management
- ✅ Organization Management
- ✅ Facility Management
- ✅ Role & Permission Management
- ✅ Audit Logging
- ✅ Notifications
- ✅ File Management
- ✅ Health Checks

### Phase 2: Master Data
- ✅ **Customer Management** (15 functions)
  - Full CRUD with contacts, addresses, requirements
  - Credit hold management
  - Portal access configuration
  - Sales rep assignment
  - Status workflow
- ✅ **Parts Management** (20 functions)
  - Part master with revisions
  - Operation routing (BOM)
  - Material requirements
  - Cost calculation
  - Part copying
  - Revision approval workflow

### Phase 3: Core Transactions
- ✅ **Quote Management** (14 functions)
  - Full quote lifecycle (Draft → Approval → Sent → Accepted)
  - Quote lines with pricing
  - Quote revisions
  - Quote-to-Order conversion
  - Margin calculation
- ✅ **Order Management** (13 functions)
  - Full order lifecycle
  - Order lines with status tracking
  - Hold/Release workflow
  - Release to production
  - Order statistics
- ✅ **Inventory Management** (12 functions)
  - Location hierarchy
  - Stock receipt/issue/transfer
  - Adjustments
  - Lot tracking
  - Quarantine management
  - Transaction history

## 🗺️ Roadmap

### ✅ Phase 1: Core Infrastructure (Completed)
- Authentication, Users, Organizations, Facilities, Roles, Permissions, Audit, Files

### ✅ Phase 2: Master Data (Completed)
- Customer Management
- Part Management

### ✅ Phase 3: Core Transactions (Completed)
- Quote Management
- Order Management
- Inventory Management

### Phase 4: Production (Next)
- Machine Management
- Work Centers
- Production/Work Orders
- Shop Floor Control

### Phase 5+
- Quality Management
- Advanced Quoting (CAD Analysis)
- Shipping & Fulfillment
- Customer Portal
- Analytics & Reporting

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## 📄 License

Proprietary - All rights reserved.
