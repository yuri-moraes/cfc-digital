# CFC Digital Backend Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready Node.js/Express backend with PostgreSQL, JWT authentication, and full CRUD APIs for users, classes, schedules, and enrollments.

**Architecture:** Separate Node.js/Express backend deployed on Vercel. Stateless JWT authentication, role-based access control (RBAC), PostgreSQL as source of truth. All logic organized into Models (database queries), Routes (HTTP handlers), and Middleware (cross-cutting concerns). Full test coverage using Jest + Supertest with real database.

**Tech Stack:** Node.js, Express, TypeScript, PostgreSQL, JWT (jsonwebtoken), bcrypt, Jest, Supertest, Vercel (serverless)

**Timeline:** 1-2 months (4 phases of 1-2 weeks each)

---

## File Structure

### Backend Repository: `cfc-digital-backend`

```
cfc-digital-backend/
├── src/
│   ├── index.js                          — Express app, middleware setup
│   ├── config.js                         — Environment variables, secrets
│   ├── constants.js                      — Enums, role constants
│   ├── routes/
│   │   ├── index.js                      — Mount all route groups
│   │   ├── auth.js                       — /api/auth/* endpoints
│   │   ├── users.js                      — /api/users/* endpoints
│   │   ├── classes.js                    — /api/classes/* endpoints
│   │   ├── schedules.js                  — /api/schedules/* endpoints
│   │   └── enrollments.js                — /api/enrollments/* endpoints
│   ├── middleware/
│   │   ├── auth.js                       — JWT validation
│   │   ├── errorHandler.js               — Global error handler
│   │   ├── roleCheck.js                  — RBAC helper
│   │   └── requestLogger.js              — Request logging
│   ├── models/
│   │   ├── User.js                       — User queries, password hashing
│   │   ├── Class.js                      — Class queries
│   │   ├── Schedule.js                   — Schedule queries
│   │   └── Enrollment.js                 — Enrollment queries
│   ├── db/
│   │   ├── pool.js                       — PostgreSQL connection pool
│   │   ├── init.js                       — Run migrations on startup
│   │   └── migrations/
│   │       ├── 001_create_users_table.sql
│   │       ├── 002_create_classes_table.sql
│   │       ├── 003_create_schedules_table.sql
│   │       └── 004_create_enrollments_table.sql
│   ├── utils/
│   │   ├── passwordHash.js               — bcrypt wrapper
│   │   ├── jwt.js                        — Token generation/validation
│   │   ├── validators.js                 — Input validators
│   │   └── errors.js                     — Custom error classes
│   └── types/
│       └── index.js                      — TypeScript-like JSDoc type definitions
├── api/
│   └── index.js                          — Vercel serverless entry point
├── tests/
│   ├── setup.js                          — Test database setup/teardown
│   ├── helpers.js                        — Test helper functions
│   ├── auth.test.js                      — Auth endpoint tests
│   ├── users.test.js                     — User CRUD tests
│   ├── classes.test.js                   — Class CRUD tests
│   ├── schedules.test.js                 — Schedule CRUD tests
│   └── enrollments.test.js               — Enrollment CRUD tests
├── .env.example                          — Environment variable template
├── .env.local                            — Local secrets (git-ignored)
├── .gitignore
├── package.json
├── jest.config.js
├── CLAUDE.md
└── README.md
```

### Frontend Changes (existing repo)

```
cfc-digital/
├── src/app/
│   ├── api/
│   │   └── client.js                     — CREATE: API client with auth
│   ├── data/
│   │   └── mockData.js                   — DELETE (no longer needed)
│   ├── hooks/
│   │   └── useStore.js                   — MODIFY: Fetch real data
│   ├── components/
│   │   └── screens/
│   │       ├── admin/
│   │       │   ├── AdminDashboard.jsx   — MODIFY: Use API data
│   │       │   ├── AdminUsers.jsx       — MODIFY: Use API data
│   │       │   └── AdminReports.jsx     — MODIFY: Use API data
│   │       ├── student/
│   │       │   └── StudentScheduleScreen.jsx — MODIFY: Use API data
│   │       └── instructor/
│   │           └── InstructorAgendaScreen.jsx — MODIFY: Use API data
│   └── page.js                           — MODIFY: Use API for login
└── next.config.mjs                       — MODIFY: Add API proxy (dev)
```

---

## Phase 1: Backend Setup & Database (Weeks 1-2)

### Task 1: Initialize Backend Repository

**Files:**
- Create: `cfc-digital-backend/package.json`
- Create: `cfc-digital-backend/.gitignore`
- Create: `cfc-digital-backend/README.md`
- Create: `cfc-digital-backend/.env.example`

- [ ] **Step 1: Create new directory and initialize npm**

```bash
mkdir -p cfc-digital-backend
cd cfc-digital-backend
npm init -y
git init
```

- [ ] **Step 2: Install dependencies**

```bash
npm install express pg dotenv jsonwebtoken bcrypt
npm install --save-dev jest supertest nodemon @types/node
```

- [ ] **Step 3: Create package.json scripts**

Modify `package.json` to add:

```json
{
  "name": "cfc-digital-backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "node --watch src/index.js",
    "test": "jest --testEnvironment=node",
    "test:watch": "jest --testEnvironment=node --watch",
    "test:coverage": "jest --testEnvironment=node --coverage",
    "lint": "echo 'Add eslint later'"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.10.0",
    "dotenv": "^16.3.1",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "nodemon": "^3.0.1"
  }
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
.env.local
.env
dist/
.DS_Store
*.log
coverage/
.vercel/
```

- [ ] **Step 5: Create .env.example**

```
DATABASE_URL=postgresql://user:password@localhost:5432/cfc_digital_dev
JWT_SECRET=your-secret-key-here-change-in-production
NODE_ENV=development
PORT=3001
```

- [ ] **Step 6: Create README.md**

```markdown
# CFC Digital Backend

Learning management system API built with Node.js, Express, and PostgreSQL.

## Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start dev server (requires PostgreSQL running)
npm run dev

# Run tests
npm test

# Watch mode
npm run test:watch
```

## API

Base URL: `http://localhost:3001/api`

### Authentication

POST `/auth/login` - Login with email/password, receive JWT token

### Users

GET `/users` - List all users (admin only)
POST `/users` - Create user (admin only)
GET `/users/:id` - Get user details
PUT `/users/:id` - Update user
DELETE `/users/:id` - Delete user (admin only)

### Classes

GET `/classes` - List classes
POST `/classes` - Create class (admin/instructor)
GET `/classes/:id` - Get class details
PUT `/classes/:id` - Update class
DELETE `/classes/:id` - Delete class

### Schedules

GET `/schedules` - List schedules
POST `/schedules` - Create schedule
PUT `/schedules/:id` - Update schedule
DELETE `/schedules/:id` - Delete schedule

### Enrollments

GET `/enrollments` - List enrollments
POST `/enrollments` - Enroll in class
DELETE `/enrollments/:id` - Drop enrollment
```

- [ ] **Step 7: Commit**

```bash
git add package.json .gitignore .env.example README.md
git commit -m "init: scaffold backend project structure"
```

---

### Task 2: Set Up PostgreSQL Connection Pool

**Files:**
- Create: `src/config.js`
- Create: `src/db/pool.js`
- Create: `src/constants.js`

- [ ] **Step 1: Create config.js**

```javascript
// src/config.js
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export const config = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost/cfc_digital_dev',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key',
    expiresIn: '24h',
  },
  node_env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3001,
};

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production');
}
```

- [ ] **Step 2: Create constants.js**

```javascript
// src/constants.js
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  STUDENT: 'STUDENT',
  INSTRUCTOR: 'INSTRUCTOR',
};

export const ENROLLMENT_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  DROPPED: 'DROPPED',
};

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
```

- [ ] **Step 3: Create db/pool.js**

```javascript
// src/db/pool.js
import pkg from 'pg';
const { Pool } = pkg;
import { config } from '../config.js';

let pool;

export const initPool = () => {
  pool = new Pool({
    connectionString: config.database.url,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  return pool;
};

export const getPool = () => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initPool() first.');
  }
  return pool;
};

export const query = (text, params) => {
  return getPool().query(text, params);
};

export const closePool = async () => {
  if (pool) {
    await pool.end();
  }
};
```

- [ ] **Step 4: Commit**

```bash
git add src/config.js src/db/pool.js src/constants.js
git commit -m "feat: add database pool and configuration"
```

---

### Task 3: Create Database Migrations

**Files:**
- Create: `src/db/migrations/001_create_users_table.sql`
- Create: `src/db/migrations/002_create_classes_table.sql`
- Create: `src/db/migrations/003_create_schedules_table.sql`
- Create: `src/db/migrations/004_create_enrollments_table.sql`
- Create: `src/db/init.js`

- [ ] **Step 1: Create users migration**

```sql
-- src/db/migrations/001_create_users_table.sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'STUDENT', 'INSTRUCTOR')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(LOWER(email));
```

- [ ] **Step 2: Create classes migration**

```sql
-- src/db/migrations/002_create_classes_table.sql
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_classes_instructor_id ON classes(instructor_id);
```

- [ ] **Step 3: Create schedules migration**

```sql
-- src/db/migrations/003_create_schedules_table.sql
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week VARCHAR(20) NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schedules_class_id ON schedules(class_id);

-- Ensure end_time > start_time
ALTER TABLE schedules ADD CONSTRAINT check_times CHECK (end_time > start_time);
```

- [ ] **Step 4: Create enrollments migration**

```sql
-- src/db/migrations/004_create_enrollments_table.sql
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'DROPPED')),
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, class_id)
);

CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_enrollments_class_id ON enrollments(class_id);
```

- [ ] **Step 5: Create migration runner (db/init.js)**

```javascript
// src/db/init.js
import fs from 'fs';
import path from 'path';
import { getPool } from './pool.js';

const migrationsDir = new URL('./migrations', import.meta.url).pathname;

export const runMigrations = async () => {
  const pool = getPool();
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    try {
      console.log(`Running migration: ${file}`);
      await pool.query(sql);
      console.log(`✓ ${file} completed`);
    } catch (error) {
      console.error(`✗ ${file} failed:`, error.message);
      throw error;
    }
  }

  console.log('All migrations completed successfully');
};
```

- [ ] **Step 6: Commit**

```bash
git add src/db/migrations/ src/db/init.js
git commit -m "feat: add database migrations for all tables"
```

---

### Task 4: Create Error Classes and Utilities

**Files:**
- Create: `src/utils/errors.js`
- Create: `src/utils/passwordHash.js`
- Create: `src/utils/jwt.js`
- Create: `src/utils/validators.js`

- [ ] **Step 1: Create custom error classes (utils/errors.js)**

```javascript
// src/utils/errors.js
export class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class BadRequestError extends ApiError {
  constructor(message, details = null) {
    super(message, 400);
    this.name = 'BadRequestError';
    this.details = details;
  }
}

export class ConflictError extends ApiError {
  constructor(message) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}
```

- [ ] **Step 2: Create password hashing utility (utils/passwordHash.js)**

```javascript
// src/utils/passwordHash.js
import bcrypt from 'bcrypt';

export const hashPassword = async (password) => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};
```

- [ ] **Step 3: Create JWT utility (utils/jwt.js)**

```javascript
// src/utils/jwt.js
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { UnauthorizedError } from './errors.js';

export const generateToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
};

export const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header');
  }
  return authHeader.substring(7);
};
```

- [ ] **Step 4: Create validators (utils/validators.js)**

```javascript
// src/utils/validators.js
import { BadRequestError } from './errors.js';

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new BadRequestError('Invalid email format', { field: 'email' });
  }
};

export const validatePassword = (password) => {
  if (!password || password.length < 6) {
    throw new BadRequestError('Password must be at least 6 characters', { field: 'password' });
  }
};

export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    throw new BadRequestError(`${fieldName} is required`, { field: fieldName });
  }
};

export const validateTime = (startTime, endTime) => {
  if (startTime >= endTime) {
    throw new BadRequestError('End time must be after start time', { field: 'time' });
  }
};

export const validateDayOfWeek = (day) => {
  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  if (!validDays.includes(day)) {
    throw new BadRequestError(`Day must be one of: ${validDays.join(', ')}`, { field: 'day_of_week' });
  }
};

export const validateRole = (role) => {
  const validRoles = ['ADMIN', 'STUDENT', 'INSTRUCTOR'];
  if (!validRoles.includes(role)) {
    throw new BadRequestError(`Role must be one of: ${validRoles.join(', ')}`, { field: 'role' });
  }
};
```

- [ ] **Step 5: Commit**

```bash
git add src/utils/
git commit -m "feat: add error classes and utility functions"
```

---

## Phase 2: Authentication System (Weeks 2-3)

### Task 5: Create User Model

**Files:**
- Create: `src/models/User.js`

- [ ] **Step 1: Create User model**

```javascript
// src/models/User.js
import { query } from '../db/pool.js';
import { hashPassword, verifyPassword } from '../utils/passwordHash.js';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors.js';
import { USER_ROLES } from '../constants.js';

export class User {
  static async create(email, password, name, role) {
    // Verify role is valid
    if (!Object.values(USER_ROLES).includes(role)) {
      throw new BadRequestError('Invalid role');
    }

    // Check if email already exists
    const existing = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    if (existing.rows.length > 0) {
      throw new ConflictError('Email already in use');
    }

    const passwordHash = await hashPassword(password);
    const result = await query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
      [email.toLowerCase(), passwordHash, name, role]
    );

    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      'SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      throw new NotFoundError('User not found');
    }
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await query(
      'SELECT id, email, password_hash, name, role, created_at, updated_at FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  }

  static async authenticate(email, password) {
    const user = await User.findByEmail(email);
    if (!user) {
      throw new BadRequestError('Invalid email or password');
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      throw new BadRequestError('Invalid email or password');
    }

    // Return user without password_hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async update(id, updates) {
    const allowedFields = ['name', 'email'];
    const fields = Object.keys(updates).filter(k => allowedFields.includes(k));

    if (fields.length === 0) {
      throw new BadRequestError('No valid fields to update');
    }

    let query_str = 'UPDATE users SET ';
    const values = [];
    let paramCount = 1;

    fields.forEach((field, index) => {
      if (index > 0) query_str += ', ';
      query_str += `${field} = $${paramCount}`;
      values.push(updates[field]);
      paramCount++;
    });

    query_str += `, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING id, email, name, role, created_at, updated_at`;
    values.push(id);

    const result = await query(query_str, values);
    if (result.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    return result.rows[0];
  }

  static async delete(id) {
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('User not found');
    }
  }

  static async list() {
    const result = await query(
      'SELECT id, email, name, role, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/models/User.js
git commit -m "feat: add User model with CRUD operations"
```

---

### Task 6: Create Auth Routes and Middleware

**Files:**
- Create: `src/middleware/auth.js`
- Create: `src/routes/auth.js`
- Create: `src/middleware/roleCheck.js`

- [ ] **Step 1: Create auth middleware (middleware/auth.js)**

```javascript
// src/middleware/auth.js
import { extractTokenFromHeader, verifyToken } from '../utils/jwt.js';

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    const payload = verifyToken(token);
    
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    res.status(error.statusCode || 401).json({ error: error.message });
  }
};

export const optionalAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = extractTokenFromHeader(authHeader);
      const payload = verifyToken(token);
      req.user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
      };
    }
  } catch (error) {
    // Silently skip if auth fails (optional)
  }
  next();
};
```

- [ ] **Step 2: Create role check middleware (middleware/roleCheck.js)**

```javascript
// src/middleware/roleCheck.js
import { ForbiddenError } from '../utils/errors.js';

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};
```

- [ ] **Step 3: Create auth routes (routes/auth.js)**

```javascript
// src/routes/auth.js
import express from 'express';
import { User } from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { validateEmail, validatePassword } from '../utils/validators.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    validateEmail(email);
    validatePassword(password);

    const user = await User.authenticate(email, password);

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message });
  }
});

router.post('/logout', authMiddleware, (req, res) => {
  // Token invalidation is client-side (remove from localStorage)
  // Server-side: no sessions to invalidate (stateless JWT)
  res.json({ message: 'Logged out' });
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 4: Commit**

```bash
git add src/middleware/auth.js src/middleware/roleCheck.js src/routes/auth.js
git commit -m "feat: add authentication routes and middleware with JWT"
```

---

### Task 7: Create Auth Endpoint Tests

**Files:**
- Create: `tests/setup.js`
- Create: `tests/helpers.js`
- Create: `tests/auth.test.js`

- [ ] **Step 1: Create test setup (tests/setup.js)**

```javascript
// tests/setup.js
import { initPool, query, closePool } from '../src/db/pool.js';
import { runMigrations } from '../src/db/init.js';

// Global setup before all tests
beforeAll(async () => {
  initPool();
  await runMigrations();
});

// Global teardown after all tests
afterAll(async () => {
  await closePool();
});

// Clean up database between tests (optional, can be per-test)
afterEach(async () => {
  try {
    // Delete test data
    await query('DELETE FROM enrollments');
    await query('DELETE FROM schedules');
    await query('DELETE FROM classes');
    await query('DELETE FROM users');
  } catch (error) {
    console.error('Cleanup error:', error);
  }
});
```

- [ ] **Step 2: Create test helpers (tests/helpers.js)**

```javascript
// tests/helpers.js
import request from 'supertest';
import express from 'express';
import { User } from '../src/models/User.js';
import { generateToken } from '../src/utils/jwt.js';
import authRouter from '../src/routes/auth.js';

export const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
};

export const createTestUser = async (email, password, name, role) => {
  return User.create(email, password, name, role);
};

export const getAuthToken = (userId, email, role) => {
  return generateToken({ userId, email, role });
};

export const requestWithAuth = (app, method, path, token) => {
  const req = request(app)[method.toLowerCase()](path);
  if (token) {
    req.set('Authorization', `Bearer ${token}`);
  }
  return req;
};
```

- [ ] **Step 3: Create auth tests (tests/auth.test.js)**

```javascript
// tests/auth.test.js
import request from 'supertest';
import express from 'express';
import { createTestApp, createTestUser, getAuthToken, requestWithAuth } from './helpers.js';
import { User } from '../src/models/User.js';

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      await createTestUser('user@example.com', 'password123', 'Test User', 'STUDENT');

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({
        email: 'user@example.com',
        name: 'Test User',
        role: 'STUDENT',
      });
    });

    it('should reject invalid password', async () => {
      await createTestUser('user@example.com', 'password123', 'Test User', 'STUDENT');

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid email or password');
    });

    it('should reject non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid email or password');
    });

    it('should reject missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Email and password required');
    });

    it('should reject missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Email and password required');
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid email format');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const user = await createTestUser('user@example.com', 'password123', 'Test User', 'STUDENT');
      const token = getAuthToken(user.id, user.email, user.role);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        email: 'user@example.com',
        name: 'Test User',
        role: 'STUDENT',
      });
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid or expired token');
    });

    it('should reject request with malformed auth header', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'NotBearer token');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout with valid token', async () => {
      const user = await createTestUser('user@example.com', 'password123', 'Test User', 'STUDENT');
      const token = getAuthToken(user.id, user.email, user.role);

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Logged out');
    });

    it('should reject logout without token', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(401);
    });
  });
});
```

- [ ] **Step 4: Create jest.config.js**

```javascript
// jest.config.js
export default {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coveragePathIgnorePatterns: ['/node_modules/'],
};
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- tests/auth.test.js
```

Expected output: All auth tests pass

- [ ] **Step 6: Commit**

```bash
git add tests/setup.js tests/helpers.js tests/auth.test.js jest.config.js
git commit -m "test: add auth endpoint tests with full coverage"
```

---

## Phase 3: CRUD Models and Routes (Weeks 3-4)

### Task 8: Create Class Model and Routes

**Files:**
- Create: `src/models/Class.js`
- Create: `src/routes/classes.js`
- Create: `tests/classes.test.js`

- [ ] **Step 1: Create Class model (src/models/Class.js)**

```javascript
// src/models/Class.js
import { query } from '../db/pool.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors.js';

export class Class {
  static async create(name, description, instructorId) {
    if (!name || !instructorId) {
      throw new BadRequestError('Name and instructorId are required');
    }

    const result = await query(
      'INSERT INTO classes (name, description, instructor_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description || null, instructorId]
    );

    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      `SELECT c.*, u.name as instructor_name
       FROM classes c
       LEFT JOIN users u ON c.instructor_id = u.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Class not found');
    }

    return result.rows[0];
  }

  static async list() {
    const result = await query(
      `SELECT c.*, u.name as instructor_name
       FROM classes c
       LEFT JOIN users u ON c.instructor_id = u.id
       ORDER BY c.created_at DESC`
    );

    return result.rows;
  }

  static async listByInstructor(instructorId) {
    const result = await query(
      `SELECT c.*, u.name as instructor_name
       FROM classes c
       LEFT JOIN users u ON c.instructor_id = u.id
       WHERE c.instructor_id = $1
       ORDER BY c.created_at DESC`,
      [instructorId]
    );

    return result.rows;
  }

  static async update(id, updates, requestingUserId, requestingUserRole) {
    const cls = await Class.findById(id);

    // Only instructor owner or admin can update
    if (requestingUserRole !== 'ADMIN' && cls.instructor_id !== requestingUserId) {
      throw new ForbiddenError('Cannot update class');
    }

    const allowedFields = ['name', 'description'];
    const fields = Object.keys(updates).filter(k => allowedFields.includes(k));

    if (fields.length === 0) {
      throw new BadRequestError('No valid fields to update');
    }

    let updateQuery = 'UPDATE classes SET ';
    const values = [];
    let paramCount = 1;

    fields.forEach((field, index) => {
      if (index > 0) updateQuery += ', ';
      updateQuery += `${field} = $${paramCount}`;
      values.push(updates[field]);
      paramCount++;
    });

    updateQuery += `, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;
    values.push(id);

    const result = await query(updateQuery, values);
    if (result.rows.length === 0) {
      throw new NotFoundError('Class not found');
    }

    return result.rows[0];
  }

  static async delete(id, requestingUserId, requestingUserRole) {
    const cls = await Class.findById(id);

    // Only instructor owner or admin can delete
    if (requestingUserRole !== 'ADMIN' && cls.instructor_id !== requestingUserId) {
      throw new ForbiddenError('Cannot delete class');
    }

    await query('DELETE FROM classes WHERE id = $1', [id]);
  }
}
```

- [ ] **Step 2: Create classes routes (src/routes/classes.js)**

```javascript
// src/routes/classes.js
import express from 'express';
import { Class } from '../models/Class.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const classes = await Class.list();
    res.json(classes);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    res.json(cls);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.post('/', authMiddleware, requireRole('ADMIN', 'INSTRUCTOR'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const cls = await Class.create(name, description, req.user.id);
    res.status(201).json(cls);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, requireRole('ADMIN', 'INSTRUCTOR'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const cls = await Class.update(
      req.params.id,
      { name, description },
      req.user.id,
      req.user.role
    );
    res.json(cls);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, requireRole('ADMIN', 'INSTRUCTOR'), async (req, res) => {
  try {
    await Class.delete(req.params.id, req.user.id, req.user.role);
    res.json({ message: 'Class deleted' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 3: Create class tests (tests/classes.test.js)**

```javascript
// tests/classes.test.js
import request from 'supertest';
import express from 'express';
import { createTestUser, getAuthToken } from './helpers.js';
import { Class } from '../src/models/Class.js';
import classRouter from '../src/routes/classes.js';
import { authMiddleware } from '../src/middleware/auth.js';

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/classes', authMiddleware, classRouter);
  return app;
};

describe('Class Routes', () => {
  let app;
  let instructor;
  let student;
  let admin;

  beforeEach(async () => {
    app = createTestApp();
    instructor = await createTestUser('instructor@example.com', 'pass123', 'Instructor', 'INSTRUCTOR');
    student = await createTestUser('student@example.com', 'pass123', 'Student', 'STUDENT');
    admin = await createTestUser('admin@example.com', 'pass123', 'Admin', 'ADMIN');
  });

  describe('GET /api/classes', () => {
    it('should list all classes', async () => {
      const cls1 = await Class.create('Math 101', 'Basic math', instructor.id);
      const cls2 = await Class.create('English 101', 'Basic english', instructor.id);

      const token = getAuthToken(student.id, student.email, student.role);
      const res = await request(app)
        .get('/api/classes')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('English 101'); // Most recent first
      expect(res.body[1].name).toBe('Math 101');
    });

    it('should return empty list when no classes', async () => {
      const token = getAuthToken(student.id, student.email, student.role);
      const res = await request(app)
        .get('/api/classes')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('POST /api/classes', () => {
    it('should create class as instructor', async () => {
      const token = getAuthToken(instructor.id, instructor.email, instructor.role);
      const res = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Math 101', description: 'Basic math' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Math 101');
      expect(res.body.instructor_id).toBe(instructor.id);
    });

    it('should create class as admin', async () => {
      const token = getAuthToken(admin.id, admin.email, admin.role);
      const res = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Math 101', description: 'Basic math', instructor_id: instructor.id });

      expect(res.status).toBe(201);
    });

    it('should reject class creation by student', async () => {
      const token = getAuthToken(student.id, student.email, student.role);
      const res = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Math 101', description: 'Basic math' });

      expect(res.status).toBe(403);
    });

    it('should reject missing name', async () => {
      const token = getAuthToken(instructor.id, instructor.email, instructor.role);
      const res = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'Basic math' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/classes/:id', () => {
    it('should update own class as instructor', async () => {
      const cls = await Class.create('Math 101', 'Basic math', instructor.id);
      const token = getAuthToken(instructor.id, instructor.email, instructor.role);

      const res = await request(app)
        .put(`/api/classes/${cls.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Advanced Math', description: 'Advanced topics' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Advanced Math');
    });

    it('should reject update of others class by instructor', async () => {
      const other = await createTestUser('other@example.com', 'pass123', 'Other', 'INSTRUCTOR');
      const cls = await Class.create('Math 101', 'Basic math', other.id);
      const token = getAuthToken(instructor.id, instructor.email, instructor.role);

      const res = await request(app)
        .put(`/api/classes/${cls.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Advanced Math' });

      expect(res.status).toBe(403);
    });

    it('should allow admin to update any class', async () => {
      const cls = await Class.create('Math 101', 'Basic math', instructor.id);
      const token = getAuthToken(admin.id, admin.email, admin.role);

      const res = await request(app)
        .put(`/api/classes/${cls.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/classes/:id', () => {
    it('should delete own class as instructor', async () => {
      const cls = await Class.create('Math 101', 'Basic math', instructor.id);
      const token = getAuthToken(instructor.id, instructor.email, instructor.role);

      const res = await request(app)
        .delete(`/api/classes/${cls.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      // Verify deleted
      try {
        await Class.findById(cls.id);
        expect(true).toBe(false); // Should throw
      } catch (e) {
        expect(e.name).toBe('NotFoundError');
      }
    });

    it('should reject delete of others class by instructor', async () => {
      const other = await createTestUser('other@example.com', 'pass123', 'Other', 'INSTRUCTOR');
      const cls = await Class.create('Math 101', 'Basic math', other.id);
      const token = getAuthToken(instructor.id, instructor.email, instructor.role);

      const res = await request(app)
        .delete(`/api/classes/${cls.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/classes.test.js
```

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/models/Class.js src/routes/classes.js tests/classes.test.js
git commit -m "feat: add Class model and CRUD routes with full tests"
```

---

### Task 9: Create Schedule Model and Routes

**Files:**
- Create: `src/models/Schedule.js`
- Create: `src/routes/schedules.js`
- Create: `tests/schedules.test.js`

- [ ] **Step 1: Create Schedule model (src/models/Schedule.js)**

```javascript
// src/models/Schedule.js
import { query } from '../db/pool.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors.js';
import { validateTime, validateDayOfWeek } from '../utils/validators.js';

export class Schedule {
  static async create(classId, dayOfWeek, startTime, endTime) {
    if (!classId || !dayOfWeek || !startTime || !endTime) {
      throw new BadRequestError('All fields required');
    }

    validateDayOfWeek(dayOfWeek);
    validateTime(startTime, endTime);

    const result = await query(
      'INSERT INTO schedules (class_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4) RETURNING *',
      [classId, dayOfWeek, startTime, endTime]
    );

    return result.rows[0];
  }

  static async findById(id) {
    const result = await query('SELECT * FROM schedules WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Schedule not found');
    }
    return result.rows[0];
  }

  static async listByClass(classId) {
    const result = await query(
      'SELECT * FROM schedules WHERE class_id = $1 ORDER BY day_of_week, start_time',
      [classId]
    );
    return result.rows;
  }

  static async listByInstructor(instructorId) {
    const result = await query(
      `SELECT s.* FROM schedules s
       JOIN classes c ON s.class_id = c.id
       WHERE c.instructor_id = $1
       ORDER BY s.day_of_week, s.start_time`,
      [instructorId]
    );
    return result.rows;
  }

  static async update(id, updates, requestingUserId, requestingUserRole) {
    const schedule = await Schedule.findById(id);

    // Get class to check ownership
    const result = await query('SELECT instructor_id FROM classes WHERE id = $1', [schedule.class_id]);
    const cls = result.rows[0];

    if (requestingUserRole !== 'ADMIN' && cls.instructor_id !== requestingUserId) {
      throw new ForbiddenError('Cannot update schedule');
    }

    const allowedFields = ['day_of_week', 'start_time', 'end_time'];
    const fields = Object.keys(updates).filter(k => allowedFields.includes(k) && updates[k]);

    if (fields.length === 0) {
      throw new BadRequestError('No valid fields to update');
    }

    // Validate new times if provided
    const startTime = updates.start_time || schedule.start_time;
    const endTime = updates.end_time || schedule.end_time;
    validateTime(startTime, endTime);

    if (updates.day_of_week) {
      validateDayOfWeek(updates.day_of_week);
    }

    let updateQuery = 'UPDATE schedules SET ';
    const values = [];
    let paramCount = 1;

    fields.forEach((field, index) => {
      if (index > 0) updateQuery += ', ';
      updateQuery += `${field} = $${paramCount}`;
      values.push(updates[field]);
      paramCount++;
    });

    updateQuery += `, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;
    values.push(id);

    const updateResult = await query(updateQuery, values);
    return updateResult.rows[0];
  }

  static async delete(id, requestingUserId, requestingUserRole) {
    const schedule = await Schedule.findById(id);

    // Get class to check ownership
    const result = await query('SELECT instructor_id FROM classes WHERE id = $1', [schedule.class_id]);
    const cls = result.rows[0];

    if (requestingUserRole !== 'ADMIN' && cls.instructor_id !== requestingUserId) {
      throw new ForbiddenError('Cannot delete schedule');
    }

    await query('DELETE FROM schedules WHERE id = $1', [id]);
  }
}
```

- [ ] **Step 2: Create schedules routes (src/routes/schedules.js)**

```javascript
// src/routes/schedules.js
import express from 'express';
import { Schedule } from '../models/Schedule.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { classId, instructorId } = req.query;

    let schedules;
    if (classId) {
      schedules = await Schedule.listByClass(classId);
    } else if (instructorId) {
      schedules = await Schedule.listByInstructor(instructorId);
    } else {
      // For now, return empty. Can be enhanced to list all for admins
      schedules = [];
    }

    res.json(schedules);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    res.json(schedule);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.post('/', authMiddleware, requireRole('ADMIN', 'INSTRUCTOR'), async (req, res) => {
  try {
    const { classId, dayOfWeek, startTime, endTime } = req.body;
    const schedule = await Schedule.create(classId, dayOfWeek, startTime, endTime);
    res.status(201).json(schedule);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, requireRole('ADMIN', 'INSTRUCTOR'), async (req, res) => {
  try {
    const schedule = await Schedule.update(
      req.params.id,
      req.body,
      req.user.id,
      req.user.role
    );
    res.json(schedule);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, requireRole('ADMIN', 'INSTRUCTOR'), async (req, res) => {
  try {
    await Schedule.delete(req.params.id, req.user.id, req.user.role);
    res.json({ message: 'Schedule deleted' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 3: Create schedule tests (tests/schedules.test.js)**

```javascript
// tests/schedules.test.js
import request from 'supertest';
import express from 'express';
import { createTestUser, getAuthToken } from './helpers.js';
import { Class } from '../src/models/Class.js';
import { Schedule } from '../src/models/Schedule.js';
import scheduleRouter from '../src/routes/schedules.js';
import { authMiddleware } from '../src/middleware/auth.js';

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/schedules', authMiddleware, scheduleRouter);
  return app;
};

describe('Schedule Routes', () => {
  let app;
  let instructor;
  let student;
  let cls;

  beforeEach(async () => {
    app = createTestApp();
    instructor = await createTestUser('instructor@example.com', 'pass123', 'Instructor', 'INSTRUCTOR');
    student = await createTestUser('student@example.com', 'pass123', 'Student', 'STUDENT');
    cls = await Class.create('Math 101', 'Basic math', instructor.id);
  });

  describe('POST /api/schedules', () => {
    it('should create schedule as instructor', async () => {
      const token = getAuthToken(instructor.id, instructor.email, instructor.role);
      const res = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${token}`)
        .send({
          classId: cls.id,
          dayOfWeek: 'Monday',
          startTime: '09:00',
          endTime: '10:00',
        });

      expect(res.status).toBe(201);
      expect(res.body.class_id).toBe(cls.id);
      expect(res.body.day_of_week).toBe('Monday');
    });

    it('should reject invalid day of week', async () => {
      const token = getAuthToken(instructor.id, instructor.email, instructor.role);
      const res = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${token}`)
        .send({
          classId: cls.id,
          dayOfWeek: 'InvalidDay',
          startTime: '09:00',
          endTime: '10:00',
        });

      expect(res.status).toBe(400);
    });

    it('should reject end time before start time', async () => {
      const token = getAuthToken(instructor.id, instructor.email, instructor.role);
      const res = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${token}`)
        .send({
          classId: cls.id,
          dayOfWeek: 'Monday',
          startTime: '10:00',
          endTime: '09:00',
        });

      expect(res.status).toBe(400);
    });

    it('should reject student creating schedule', async () => {
      const token = getAuthToken(student.id, student.email, student.role);
      const res = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${token}`)
        .send({
          classId: cls.id,
          dayOfWeek: 'Monday',
          startTime: '09:00',
          endTime: '10:00',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/schedules?classId=:id', () => {
    it('should list schedules for a class', async () => {
      await Schedule.create(cls.id, 'Monday', '09:00', '10:00');
      await Schedule.create(cls.id, 'Wednesday', '14:00', '15:00');

      const token = getAuthToken(student.id, student.email, student.role);
      const res = await request(app)
        .get(`/api/schedules?classId=${cls.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('DELETE /api/schedules/:id', () => {
    it('should delete schedule as owner instructor', async () => {
      const schedule = await Schedule.create(cls.id, 'Monday', '09:00', '10:00');
      const token = getAuthToken(instructor.id, instructor.email, instructor.role);

      const res = await request(app)
        .delete(`/api/schedules/${schedule.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should reject delete by non-owner instructor', async () => {
      const other = await createTestUser('other@example.com', 'pass123', 'Other', 'INSTRUCTOR');
      const schedule = await Schedule.create(cls.id, 'Monday', '09:00', '10:00');
      const token = getAuthToken(other.id, other.email, other.role);

      const res = await request(app)
        .delete(`/api/schedules/${schedule.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/schedules.test.js
```

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/models/Schedule.js src/routes/schedules.js tests/schedules.test.js
git commit -m "feat: add Schedule model and CRUD routes with full tests"
```

---

### Task 10: Create Enrollment Model and Routes

**Files:**
- Create: `src/models/Enrollment.js`
- Create: `src/routes/enrollments.js`
- Create: `tests/enrollments.test.js`

- [ ] **Step 1: Create Enrollment model (src/models/Enrollment.js)**

```javascript
// src/models/Enrollment.js
import { query } from '../db/pool.js';
import { NotFoundError, BadRequestError, ForbiddenError, ConflictError } from '../utils/errors.js';

export class Enrollment {
  static async create(studentId, classId) {
    if (!studentId || !classId) {
      throw new BadRequestError('StudentId and classId are required');
    }

    // Check if already enrolled
    const existing = await query(
      'SELECT id FROM enrollments WHERE student_id = $1 AND class_id = $2',
      [studentId, classId]
    );
    if (existing.rows.length > 0) {
      throw new ConflictError('Already enrolled in this class');
    }

    const result = await query(
      'INSERT INTO enrollments (student_id, class_id) VALUES ($1, $2) RETURNING *',
      [studentId, classId]
    );

    return result.rows[0];
  }

  static async findById(id) {
    const result = await query('SELECT * FROM enrollments WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Enrollment not found');
    }
    return result.rows[0];
  }

  static async listByStudent(studentId) {
    const result = await query(
      `SELECT e.*, c.name as class_name, u.name as instructor_name
       FROM enrollments e
       JOIN classes c ON e.class_id = c.id
       LEFT JOIN users u ON c.instructor_id = u.id
       WHERE e.student_id = $1
       ORDER BY e.enrolled_at DESC`,
      [studentId]
    );
    return result.rows;
  }

  static async listByClass(classId) {
    const result = await query(
      `SELECT e.*, u.name as student_name, u.email as student_email
       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       WHERE e.class_id = $1
       ORDER BY e.enrolled_at DESC`,
      [classId]
    );
    return result.rows;
  }

  static async listAll() {
    const result = await query(
      `SELECT e.*, c.name as class_name, u.name as student_name
       FROM enrollments e
       JOIN classes c ON e.class_id = c.id
       JOIN users u ON e.student_id = u.id
       ORDER BY e.enrolled_at DESC`
    );
    return result.rows;
  }

  static async delete(id, requestingUserId, requestingUserRole) {
    const enrollment = await Enrollment.findById(id);

    // Student can only drop own enrollment
    // Instructor can drop students from own classes
    // Admin can drop any enrollment
    if (requestingUserRole === 'STUDENT' && enrollment.student_id !== requestingUserId) {
      throw new ForbiddenError('Cannot drop enrollment');
    }

    if (requestingUserRole === 'INSTRUCTOR') {
      const classResult = await query('SELECT instructor_id FROM classes WHERE id = $1', [enrollment.class_id]);
      if (classResult.rows[0].instructor_id !== requestingUserId) {
        throw new ForbiddenError('Cannot drop enrollment');
      }
    }

    await query('DELETE FROM enrollments WHERE id = $1', [id]);
  }
}
```

- [ ] **Step 2: Create enrollments routes (src/routes/enrollments.js)**

```javascript
// src/routes/enrollments.js
import express from 'express';
import { Enrollment } from '../models/Enrollment.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { studentId, classId } = req.query;

    let enrollments;
    if (studentId) {
      // Can only view own enrollments unless admin
      if (req.user.role !== 'ADMIN' && req.user.id !== studentId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      enrollments = await Enrollment.listByStudent(studentId);
    } else if (classId) {
      // Can only view students in own classes unless admin
      if (req.user.role === 'INSTRUCTOR') {
        const classResult = await query('SELECT instructor_id FROM classes WHERE id = $1', [classId]);
        if (classResult.rows[0].instructor_id !== req.user.id) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }
      enrollments = await Enrollment.listByClass(classId);
    } else if (req.user.role === 'ADMIN') {
      enrollments = await Enrollment.listAll();
    } else {
      return res.status(400).json({ error: 'Query parameters required' });
    }

    res.json(enrollments);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.post('/', authMiddleware, requireRole('ADMIN', 'STUDENT'), async (req, res) => {
  try {
    const { studentId, classId } = req.body;

    // Student can only enroll self
    if (req.user.role === 'STUDENT' && req.user.id !== studentId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const enrollment = await Enrollment.create(studentId, classId);
    res.status(201).json(enrollment);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, requireRole('ADMIN', 'STUDENT', 'INSTRUCTOR'), async (req, res) => {
  try {
    await Enrollment.delete(req.params.id, req.user.id, req.user.role);
    res.json({ message: 'Enrollment dropped' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 3: Create enrollment tests (tests/enrollments.test.js)**

```javascript
// tests/enrollments.test.js
import request from 'supertest';
import express from 'express';
import { createTestUser, getAuthToken } from './helpers.js';
import { Class } from '../src/models/Class.js';
import { Enrollment } from '../src/models/Enrollment.js';
import enrollmentRouter from '../src/routes/enrollments.js';
import { authMiddleware } from '../src/middleware/auth.js';

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/enrollments', authMiddleware, enrollmentRouter);
  return app;
};

describe('Enrollment Routes', () => {
  let app;
  let instructor;
  let student;
  let admin;
  let cls;

  beforeEach(async () => {
    app = createTestApp();
    instructor = await createTestUser('instructor@example.com', 'pass123', 'Instructor', 'INSTRUCTOR');
    student = await createTestUser('student@example.com', 'pass123', 'Student', 'STUDENT');
    admin = await createTestUser('admin@example.com', 'pass123', 'Admin', 'ADMIN');
    cls = await Class.create('Math 101', 'Basic math', instructor.id);
  });

  describe('POST /api/enrollments', () => {
    it('should enroll student as self', async () => {
      const token = getAuthToken(student.id, student.email, student.role);
      const res = await request(app)
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${token}`)
        .send({ studentId: student.id, classId: cls.id });

      expect(res.status).toBe(201);
      expect(res.body.student_id).toBe(student.id);
      expect(res.body.class_id).toBe(cls.id);
    });

    it('should reject duplicate enrollment', async () => {
      await Enrollment.create(student.id, cls.id);

      const token = getAuthToken(student.id, student.email, student.role);
      const res = await request(app)
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${token}`)
        .send({ studentId: student.id, classId: cls.id });

      expect(res.status).toBe(409);
    });

    it('should reject student enrolling others', async () => {
      const other = await createTestUser('other@example.com', 'pass123', 'Other', 'STUDENT');
      const token = getAuthToken(student.id, student.email, student.role);

      const res = await request(app)
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${token}`)
        .send({ studentId: other.id, classId: cls.id });

      expect(res.status).toBe(403);
    });

    it('should allow admin to enroll any student', async () => {
      const token = getAuthToken(admin.id, admin.email, admin.role);
      const res = await request(app)
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${token}`)
        .send({ studentId: student.id, classId: cls.id });

      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/enrollments?studentId=:id', () => {
    it('should list own enrollments as student', async () => {
      await Enrollment.create(student.id, cls.id);

      const token = getAuthToken(student.id, student.email, student.role);
      const res = await request(app)
        .get(`/api/enrollments?studentId=${student.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should reject viewing other students enrollments', async () => {
      const other = await createTestUser('other@example.com', 'pass123', 'Other', 'STUDENT');
      const token = getAuthToken(student.id, student.email, student.role);

      const res = await request(app)
        .get(`/api/enrollments?studentId=${other.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should allow admin to view any student enrollments', async () => {
      await Enrollment.create(student.id, cls.id);

      const token = getAuthToken(admin.id, admin.email, admin.role);
      const res = await request(app)
        .get(`/api/enrollments?studentId=${student.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/enrollments/:id', () => {
    it('should drop own enrollment as student', async () => {
      const enrollment = await Enrollment.create(student.id, cls.id);
      const token = getAuthToken(student.id, student.email, student.role);

      const res = await request(app)
        .delete(`/api/enrollments/${enrollment.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should reject drop of others enrollment by student', async () => {
      const other = await createTestUser('other@example.com', 'pass123', 'Other', 'STUDENT');
      const enrollment = await Enrollment.create(other.id, cls.id);
      const token = getAuthToken(student.id, student.email, student.role);

      const res = await request(app)
        .delete(`/api/enrollments/${enrollment.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should allow instructor to drop student from own class', async () => {
      const enrollment = await Enrollment.create(student.id, cls.id);
      const token = getAuthToken(instructor.id, instructor.email, instructor.role);

      const res = await request(app)
        .delete(`/api/enrollments/${enrollment.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/enrollments.test.js
```

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/models/Enrollment.js src/routes/enrollments.js tests/enrollments.test.js
git commit -m "feat: add Enrollment model and CRUD routes with full tests"
```

---

### Task 11: Create User CRUD Routes

**Files:**
- Create: `src/routes/users.js`
- Modify: `tests/users.test.js`

- [ ] **Step 1: Create users routes (src/routes/users.js)**

```javascript
// src/routes/users.js
import express from 'express';
import { User } from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { validateEmail, validatePassword, validateRole, validateRequired } from '../utils/validators.js';

const router = express.Router();

router.get('/', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const users = await User.list();
    res.json(users);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    // Users can only get their own profile unless admin
    if (req.user.role !== 'ADMIN' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const user = await User.findById(req.params.id);
    res.json(user);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.post('/', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    validateRequired(email, 'email');
    validateRequired(password, 'password');
    validateRequired(name, 'name');
    validateRequired(role, 'role');

    validateEmail(email);
    validatePassword(password);
    validateRole(role);

    const user = await User.create(email, password, name, role);
    res.status(201).json(user);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    // Users can only update own profile unless admin
    if (req.user.role !== 'ADMIN' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { name, email } = req.body;

    if (email) {
      validateEmail(email);
    }

    const user = await User.update(req.params.id, { name, email });
    res.json(user);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    await User.delete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 2: Create user tests (tests/users.test.js)**

```javascript
// tests/users.test.js
import request from 'supertest';
import express from 'express';
import { createTestUser, getAuthToken } from './helpers.js';
import { User } from '../src/models/User.js';
import userRouter from '../src/routes/users.js';
import { authMiddleware } from '../src/middleware/auth.js';

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/users', authMiddleware, userRouter);
  return app;
};

describe('User Routes', () => {
  let app;
  let admin;
  let student;

  beforeEach(async () => {
    app = createTestApp();
    admin = await createTestUser('admin@example.com', 'pass123', 'Admin', 'ADMIN');
    student = await createTestUser('student@example.com', 'pass123', 'Student', 'STUDENT');
  });

  describe('GET /api/users', () => {
    it('should list all users as admin', async () => {
      const token = getAuthToken(admin.id, admin.email, admin.role);
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should reject list by non-admin', async () => {
      const token = getAuthToken(student.id, student.email, student.role);
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get own profile as user', async () => {
      const token = getAuthToken(student.id, student.email, student.role);
      const res = await request(app)
        .get(`/api/users/${student.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('student@example.com');
    });

    it('should reject getting other user profile as student', async () => {
      const token = getAuthToken(student.id, student.email, student.role);
      const res = await request(app)
        .get(`/api/users/${admin.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should allow admin to get any profile', async () => {
      const token = getAuthToken(admin.id, admin.email, admin.role);
      const res = await request(app)
        .get(`/api/users/${student.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/users', () => {
    it('should create user as admin', async () => {
      const token = getAuthToken(admin.id, admin.email, admin.role);
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'newuser@example.com',
          password: 'pass123',
          name: 'New User',
          role: 'STUDENT',
        });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe('newuser@example.com');
    });

    it('should reject create by non-admin', async () => {
      const token = getAuthToken(student.id, student.email, student.role);
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'newuser@example.com',
          password: 'pass123',
          name: 'New User',
          role: 'STUDENT',
        });

      expect(res.status).toBe(403);
    });

    it('should reject duplicate email', async () => {
      const token = getAuthToken(admin.id, admin.email, admin.role);
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'student@example.com',
          password: 'pass123',
          name: 'Duplicate',
          role: 'STUDENT',
        });

      expect(res.status).toBe(409);
    });

    it('should reject invalid email', async () => {
      const token = getAuthToken(admin.id, admin.email, admin.role);
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'not-an-email',
          password: 'pass123',
          name: 'User',
          role: 'STUDENT',
        });

      expect(res.status).toBe(400);
    });

    it('should reject invalid role', async () => {
      const token = getAuthToken(admin.id, admin.email, admin.role);
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'user@example.com',
          password: 'pass123',
          name: 'User',
          role: 'INVALID',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update own profile as user', async () => {
      const token = getAuthToken(student.id, student.email, student.role);
      const res = await request(app)
        .put(`/api/users/${student.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
    });

    it('should reject update of other user by student', async () => {
      const token = getAuthToken(student.id, student.email, student.role);
      const res = await request(app)
        .put(`/api/users/${admin.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Hacked' });

      expect(res.status).toBe(403);
    });

    it('should allow admin to update any user', async () => {
      const token = getAuthToken(admin.id, admin.email, admin.role);
      const res = await request(app)
        .put(`/api/users/${student.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated by Admin' });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user as admin', async () => {
      const user = await createTestUser('todelete@example.com', 'pass123', 'To Delete', 'STUDENT');
      const token = getAuthToken(admin.id, admin.email, admin.role);

      const res = await request(app)
        .delete(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      // Verify deleted
      try {
        await User.findById(user.id);
        expect(true).toBe(false); // Should throw
      } catch (e) {
        expect(e.name).toBe('NotFoundError');
      }
    });

    it('should reject delete by non-admin', async () => {
      const token = getAuthToken(student.id, student.email, student.role);
      const res = await request(app)
        .delete(`/api/users/${admin.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
```

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: All ~75 tests pass, ~95% coverage

- [ ] **Step 4: Commit**

```bash
git add src/routes/users.js tests/users.test.js
git commit -m "feat: add User CRUD routes with admin-only access control"
```

---

### Task 12: Create Main Express App and Middleware

**Files:**
- Create: `src/index.js`
- Create: `src/middleware/errorHandler.js`
- Create: `src/routes/index.js`
- Create: `api/index.js` (Vercel entry point)

- [ ] **Step 1: Create error handler middleware (src/middleware/errorHandler.js)**

```javascript
// src/middleware/errorHandler.js
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Handle known errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  // Handle unknown errors
  res.status(500).json({ error: 'Internal server error' });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({ error: 'Not found' });
};
```

- [ ] **Step 2: Create routes index (src/routes/index.js)**

```javascript
// src/routes/index.js
import authRouter from './auth.js';
import userRouter from './users.js';
import classRouter from './classes.js';
import scheduleRouter from './schedules.js';
import enrollmentRouter from './enrollments.js';

export const mountRoutes = (app) => {
  app.use('/api/auth', authRouter);
  app.use('/api/users', userRouter);
  app.use('/api/classes', classRouter);
  app.use('/api/schedules', scheduleRouter);
  app.use('/api/enrollments', enrollmentRouter);
};
```

- [ ] **Step 3: Create main Express app (src/index.js)**

```javascript
// src/index.js
import express from 'express';
import { initPool } from './db/pool.js';
import { runMigrations } from './db/init.js';
import { config } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { mountRoutes } from './routes/index.js';

export async function createApp() {
  const app = express();

  // Middleware
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Mount routes
  mountRoutes(app);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

async function startServer() {
  try {
    // Initialize database
    initPool();
    await runMigrations();
    console.log('✓ Database initialized');

    // Create and start app
    const app = await createApp();
    const port = config.port;

    app.listen(port, () => {
      console.log(`✓ Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}
```

- [ ] **Step 4: Create Vercel serverless entry point (api/index.js)**

```javascript
// api/index.js
import { createApp } from '../src/index.js';
import { initPool } from '../src/db/pool.js';
import { runMigrations } from '../src/db/init.js';

let app;
let dbInitialized = false;

async function initializeApp() {
  if (!dbInitialized) {
    try {
      initPool();
      await runMigrations();
      dbInitialized = true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      dbInitialized = false;
      throw error;
    }
  }

  if (!app) {
    app = await createApp();
  }

  return app;
}

export default async (req, res) => {
  try {
    const application = await initializeApp();
    application(req, res);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

- [ ] **Step 5: Run all tests one more time**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/middleware/errorHandler.js src/routes/index.js src/index.js api/index.js
git commit -m "feat: add Express app setup with error handling and route mounting"
```

---

## Phase 4: Frontend Integration & Deployment (Weeks 4+)

### Task 13: Create Frontend API Client

**Files:**
- Create: `src/app/api/client.js` (in frontend repo)
- Modify: `src/app/hooks/useStore.js`
- Modify: `next.config.mjs`

- [ ] **Step 1: Create API client (frontend repo - src/app/api/client.js)**

```javascript
// src/app/api/client.js
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(endpoint, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data.error || 'API request failed', response.status);
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me'),

  // Users
  getUsers: () => request('/users'),
  getUser: (id) => request(`/users/${id}`),
  createUser: (data) => request('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateUser: (id, data) => request(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // Classes
  getClasses: () => request('/classes'),
  getClass: (id) => request(`/classes/${id}`),
  createClass: (data) => request('/classes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateClass: (id, data) => request(`/classes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteClass: (id) => request(`/classes/${id}`, { method: 'DELETE' }),

  // Schedules
  getSchedules: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/schedules${query ? `?${query}` : ''}`);
  },
  getSchedule: (id) => request(`/schedules/${id}`),
  createSchedule: (data) => request('/schedules', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateSchedule: (id, data) => request(`/schedules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteSchedule: (id) => request(`/schedules/${id}`, { method: 'DELETE' }),

  // Enrollments
  getEnrollments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/enrollments${query ? `?${query}` : ''}`);
  },
  createEnrollment: (data) => request('/enrollments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteEnrollment: (id) => request(`/enrollments/${id}`, { method: 'DELETE' }),
};
```

- [ ] **Step 2: Modify useStore hook (frontend - src/app/hooks/useStore.js)**

Update the existing `useStore` hook to fetch real data instead of mock:

```javascript
// src/app/hooks/useStore.js
import { useState, useCallback, useEffect } from 'react';
import { api, ApiError } from '../api/client.js';

export const useStore = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [classes, setClasses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [schedules, setSchedules] = useState([]);

  // Load user from token on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token && !user) {
      api.getMe()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('authToken');
        });
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const response = await api.login(email, password);
      localStorage.setItem('authToken', response.token);
      setUser(response.user);
      showToast('Login successful', 'success');
      return response.user;
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      setUser(null);
      setClasses([]);
      setEnrollments([]);
    }
  }, []);

  const loadClasses = useCallback(async () => {
    try {
      const data = await api.getClasses();
      setClasses(data);
    } catch (error) {
      showToast('Failed to load classes', 'error');
    }
  }, []);

  const loadEnrollments = useCallback(async (studentId) => {
    try {
      const data = await api.getEnrollments({ studentId });
      setEnrollments(data);
    } catch (error) {
      showToast('Failed to load enrollments', 'error');
    }
  }, []);

  const loadSchedules = useCallback(async (params) => {
    try {
      const data = await api.getSchedules(params);
      setSchedules(data);
    } catch (error) {
      showToast('Failed to load schedules', 'error');
    }
  }, []);

  const enrollClass = useCallback(async (classId) => {
    try {
      await api.createEnrollment({ studentId: user.id, classId });
      showToast('Enrolled successfully', 'success');
      await loadEnrollments(user.id);
    } catch (error) {
      showToast(error.message, 'error');
    }
  }, [user]);

  const dropEnrollment = useCallback(async (enrollmentId) => {
    try {
      await api.deleteEnrollment(enrollmentId);
      showToast('Enrollment dropped', 'success');
      await loadEnrollments(user.id);
    } catch (error) {
      showToast(error.message, 'error');
    }
  }, [user]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return {
    user,
    loading,
    toasts,
    classes,
    enrollments,
    schedules,
    login,
    logout,
    loadClasses,
    loadEnrollments,
    loadSchedules,
    enrollClass,
    dropEnrollment,
    showToast,
  };
};
```

- [ ] **Step 3: Update Next.js config for API proxy (next.config.mjs)**

```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  },
  rewrites: async () => {
    if (process.env.NODE_ENV === 'development') {
      return {
        beforeFiles: [
          {
            source: '/api/:path*',
            destination: 'http://localhost:3001/api/:path*',
          },
        ],
      };
    }
    return [];
  },
};

export default nextConfig;
```

- [ ] **Step 4: Update frontend components to use API (example: StudentScheduleScreen.jsx)**

```javascript
// src/app/components/screens/student/StudentScheduleScreen.jsx
'use client';

import { useEffect } from 'react';
import { useStore } from '../../hooks/useStore';
import Card from '../../ui/Card';

export default function StudentScheduleScreen() {
  const { user, enrollments, schedules, loadEnrollments, loadSchedules } = useStore();

  useEffect(() => {
    if (user?.id) {
      loadEnrollments(user.id);
    }
  }, [user, loadEnrollments]);

  useEffect(() => {
    if (enrollments.length > 0) {
      // Load schedules for each enrolled class
      const classIds = enrollments.map(e => e.class_id);
      Promise.all(classIds.map(classId => loadSchedules({ classId })));
    }
  }, [enrollments, loadSchedules]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Meu Cronograma</h2>
      {enrollments.map(enrollment => (
        <Card key={enrollment.id}>
          <h3 className="font-bold">{enrollment.class_name}</h3>
          <p className="text-sm text-gray-600">Instrutor: {enrollment.instructor_name}</p>
          <p className="text-xs text-gray-500 mt-2">
            Status: {enrollment.status}
          </p>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Commit frontend changes**

```bash
cd /home/yurin/cfc/cfc-digital
git add src/app/api/client.js src/app/hooks/useStore.js next.config.mjs
git commit -m "feat: add API client and integrate with backend"
```

---

### Task 14: Setup Deployment to Vercel

**Files:**
- Create: `cfc-digital-backend/.vercelignore`
- Create: `cfc-digital-backend/vercel.json`

- [ ] **Step 1: Create .vercelignore**

```
node_modules/
.env.local
.git
README.md
tests/
.test.js
coverage/
```

- [ ] **Step 2: Create vercel.json**

```json
{
  "buildCommand": "npm install",
  "env": {
    "DATABASE_URL": "@database_url",
    "JWT_SECRET": "@jwt_secret"
  }
}
```

- [ ] **Step 3: Deploy backend to Vercel**

```bash
cd cfc-digital-backend
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts, set environment variables in Vercel dashboard
```

- [ ] **Step 4: Update frontend env (next.config.mjs)**

After backend is deployed, update the API URL:

```javascript
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://cfc-digital-backend.vercel.app/api',
  },
  // ... rest of config
};
```

- [ ] **Step 5: Deploy frontend to Vercel**

```bash
cd /home/yurin/cfc/cfc-digital
vercel --env NEXT_PUBLIC_API_URL="https://cfc-digital-backend.vercel.app/api"
```

- [ ] **Step 6: Test production deployment**

Visit frontend URL, login with test user, verify data loads from backend.

- [ ] **Step 7: Commit backend deploy config**

```bash
cd cfc-digital-backend
git add .vercelignore vercel.json
git commit -m "chore: add Vercel deployment configuration"
```

---

### Task 15: Final Testing and Documentation

**Files:**
- Create: `cfc-digital-backend/API.md`
- Modify: `cfc-digital-backend/CLAUDE.md`

- [ ] **Step 1: Create API documentation (API.md)**

```markdown
# CFC Digital API Documentation

Base URL: `https://api.example.com/api` (or local: `http://localhost:3001/api`)

## Authentication

All endpoints except `/auth/login` require JWT token in header:
```
Authorization: Bearer <token>
```

### POST /auth/login
Login with email and password, receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "STUDENT"
  }
}
```

### GET /auth/me
Get current user info.

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "STUDENT"
}
```

[... continue with all endpoint documentation ...]
```

- [ ] **Step 2: Create CLAUDE.md for backend**

```markdown
# CFC Digital Backend

Node.js/Express API for learning management system.

## Quick Start

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your database URL

# Start dev server
npm run dev

# Run tests
npm test

# Watch tests
npm run test:watch
```

## Project Structure

- `src/` - Source code
  - `models/` - Database queries and business logic
  - `routes/` - HTTP route handlers
  - `middleware/` - Express middleware
  - `db/` - Database setup and migrations
  - `utils/` - Utility functions
- `tests/` - Test files (Jest + Supertest)
- `api/` - Vercel serverless entry point

## Key Technologies

- Express.js - HTTP server
- PostgreSQL - Database
- jsonwebtoken - JWT auth
- bcrypt - Password hashing
- Jest - Testing framework

## Development Workflow

1. Write failing test (`npm test`)
2. Implement code to make test pass
3. Run all tests to ensure no regressions
4. Commit with meaningful message

Tests run against a real PostgreSQL test database for integration testing.

## Deployment

Backend deployed to Vercel as serverless functions. Environment variables (DATABASE_URL, JWT_SECRET) configured in Vercel dashboard.
```

- [ ] **Step 3: Run complete test suite one final time**

```bash
npm test -- --coverage
```

Expected: ~95% coverage, all tests passing

- [ ] **Step 4: Final commit**

```bash
git add API.md CLAUDE.md
git commit -m "docs: add API documentation and development guide"
```

---

## Checklist: Success Criteria

- [ ] Backend repo created and deployed to Vercel
- [ ] PostgreSQL database set up with all 4 tables
- [ ] Auth system working (login, JWT, role-based access)
- [ ] All 20+ API endpoints implemented and tested
- [ ] ~95% test coverage with Jest + Supertest
- [ ] Frontend integrated with real API (no more mock data)
- [ ] All 5 user roles working correctly (admin, instructor, student)
- [ ] Error handling consistent across all endpoints
- [ ] Deployment to Vercel working for both frontend and backend
- [ ] API documentation complete
- [ ] Code follows structure (models, routes, middleware separation)

---

## Next Steps (Phase 2)

After Phase 1 is complete:

- Add grades and assessment tracking
- Implement attendance system
- Build notification/messaging system
- Create advanced reporting
- Add file upload support
- Implement refresh tokens for auth
- Set up structured logging (Sentry, etc.)
- Add request rate limiting
- Create admin dashboard for system stats

Each Phase 2 feature gets its own spec → plan → implementation cycle.
