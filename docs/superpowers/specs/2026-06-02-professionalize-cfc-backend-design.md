# CFC Digital Backend Professionalization - Design Spec

**Date**: June 2, 2026  
**Status**: Design approved, ready for implementation planning  
**Timeline**: Phase 1: 1-2 months  
**Team**: Single developer (or small team sharing responsibility)

---

## Overview

The CFC Digital project currently exists as a frontend-only mockup in Next.js with hardcoded mock data. This spec defines the backend infrastructure and Phase 1 scope to transform it into a production-ready learning management system.

**Core principle**: Simple, robust, legible code that can scale to phase 2+ without major refactoring.

---

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js (v4)
- **Language**: TypeScript
- **Database**: PostgreSQL (hosted externally: Neon, Railway, AWS RDS, or similar)
- **Authentication**: JWT (JSON Web Tokens, 24-hour expiry)
- **Password hashing**: bcrypt
- **Deployment**: Vercel (serverless functions)

### Testing
- **Framework**: Jest
- **HTTP testing**: Supertest
- **Test database**: Separate PostgreSQL instance for tests
- **Target coverage**: ~95% line coverage for core logic

### Development
- **Node package manager**: npm or bun (match frontend)
- **Version control**: Git (separate repo: `cfc-digital-backend`)

---

## Architecture

### Deployment Model

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (Hosting)                         │
├──────────────────────┬──────────────────────┬───────────────┤
│  Frontend            │  Backend             │  Serverless   │
│  (Next.js 15)        │  (Node/Express)      │  Functions    │
│  cfc-digital repo    │  cfc-digital-backend │  (Vercel API) │
│  Port 3000           │  Port 3001 (dev)     │               │
└──────────────────────┴──────────────────────┴───────────────┘
         │                         │
         └─────────────────────────┘
              HTTP REST API
        (JWT auth in headers)
              │
              ▼
        ┌──────────────────┐
        │  PostgreSQL      │
        │  (External host) │
        │  Single source   │
        │  of truth        │
        └──────────────────┘
```

### Data Flow

1. **User login**: Frontend sends credentials → Backend validates → returns JWT token
2. **Authenticated requests**: Frontend includes `Authorization: Bearer <token>` header → Backend validates token → returns role-based data
3. **State persistence**: All writes go to PostgreSQL → Backend returns updated entity → Frontend updates local state

---

## Phase 1 Scope

### What's Included

**Core entities**:
- Users (Admin, Student, Instructor)
- Classes (course/class definitions)
- Schedules (class timings)
- Enrollments (student-class relationships)
- Instructors (as users with role=INSTRUCTOR)

**API endpoints** (~20 endpoints):

| Endpoint | Method | Auth | Role | Purpose |
|----------|--------|------|------|---------|
| `/api/auth/login` | POST | ✗ | Any | Login, receive JWT |
| `/api/auth/logout` | POST | ✓ | Any | Invalidate token (UI-side cleanup) |
| `/api/auth/me` | GET | ✓ | Any | Get current user info |
| `/api/users` | GET | ✓ | ADMIN | List all users |
| `/api/users/:id` | GET | ✓ | ADMIN, SELF | Get user details |
| `/api/users` | POST | ✓ | ADMIN | Create user |
| `/api/users/:id` | PUT | ✓ | ADMIN, SELF | Update user |
| `/api/users/:id` | DELETE | ✓ | ADMIN | Delete user |
| `/api/classes` | GET | ✓ | Any | List classes (filtered by role) |
| `/api/classes/:id` | GET | ✓ | Any | Get class details |
| `/api/classes` | POST | ✓ | ADMIN, INSTRUCTOR | Create class |
| `/api/classes/:id` | PUT | ✓ | ADMIN, CLASS_OWNER | Update class |
| `/api/classes/:id` | DELETE | ✓ | ADMIN, CLASS_OWNER | Delete class |
| `/api/schedules` | GET | ✓ | Any | List schedules (by class or instructor) |
| `/api/schedules` | POST | ✓ | ADMIN, INSTRUCTOR | Create schedule |
| `/api/schedules/:id` | PUT | ✓ | ADMIN, CLASS_OWNER | Update schedule |
| `/api/schedules/:id` | DELETE | ✓ | ADMIN, CLASS_OWNER | Delete schedule |
| `/api/enrollments` | GET | ✓ | Any | List enrollments (filtered by role) |
| `/api/enrollments` | POST | ✓ | ADMIN, STUDENT | Enroll in class |
| `/api/enrollments/:id` | DELETE | ✓ | ADMIN, ENROLLMENT_OWNER | Drop enrollment |

**Features**:
- User authentication (email + password)
- Role-based access control (RBAC)
- Data validation (email format, required fields, etc.)
- Consistent error responses
- Full test coverage for all endpoints

### What's NOT Included (Phase 2+)

- Grades and assessment tracking
- Attendance tracking
- Notifications/messaging
- Advanced reporting (beyond current admin dashboard)
- File uploads
- Search and filtering (basic list endpoints only)
- Audit logs
- Rate limiting (can add later)

---

## Data Model

### Database Schema

#### `users` table
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
email           VARCHAR(255) UNIQUE NOT NULL
password_hash   VARCHAR(255) NOT NULL
name            VARCHAR(255) NOT NULL
role            ENUM('ADMIN', 'STUDENT', 'INSTRUCTOR') NOT NULL
created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### `classes` table
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
name            VARCHAR(255) NOT NULL
description     TEXT
instructor_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### `schedules` table
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE
day_of_week     VARCHAR(10) NOT NULL (Mon, Tue, Wed, Thu, Fri)
start_time      TIME NOT NULL
end_time        TIME NOT NULL
created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### `enrollments` table
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE
status          ENUM('ACTIVE', 'COMPLETED', 'DROPPED') DEFAULT 'ACTIVE'
enrolled_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**Constraints**:
- Email is case-insensitive (store lowercase)
- Unique constraint on (student_id, class_id) for enrollments (no duplicate enrollments)
- Foreign keys have CASCADE DELETE where appropriate

---

## Authentication & Authorization

### JWT Token Structure

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "STUDENT",
  "iat": 1717372800,
  "exp": 1717459200
}
```

**Token expiry**: 24 hours  
**Refresh strategy**: Phase 1 uses simple 24-hour tokens. Phase 2 can add refresh tokens.

### Login Flow

1. User submits `{ email, password }` to `POST /api/auth/login`
2. Backend queries `users` table for matching email
3. Compares submitted password with stored `password_hash` using bcrypt
4. If match: generate JWT, return `{ token, user: { id, email, name, role } }`
5. If no match: return 401 Unauthorized
6. Frontend stores token in `localStorage` (key: `authToken`)

### Authorization Rules

**Middleware checks**:
1. Every request to protected endpoints must include `Authorization: Bearer <token>` header
2. Backend validates token signature and expiry
3. Token payload extracted, user role determined
4. Route handler checks if user's role has access (RBAC)

**Role-based access**:
- **ADMIN**: Full access to all endpoints except student/instructor-specific views
- **STUDENT**: Can see own enrollments, own profile, available classes; cannot access user management
- **INSTRUCTOR**: Can see own classes/schedules, enrolled students; cannot access user management

**Special cases**:
- Students can only update their own profile (`/api/users/:id` where id = self)
- Instructors can only manage classes they own
- Admins can bypass all role checks

### Password Security

- Passwords hashed with bcrypt (cost factor: 10)
- Plaintext passwords never stored or logged
- Password reset: Phase 2 feature (not in Phase 1)

---

## Project Structure

### Directory Layout

```
cfc-digital-backend/
├── src/
│   ├── index.js                 — Express app initialization, middleware setup
│   ├── config.js                — Environment variables, secrets management
│   ├── routes/
│   │   ├── index.js             — Mount all route groups
│   │   ├── auth.js              — Login, logout, me endpoints
│   │   ├── users.js             — User CRUD endpoints
│   │   ├── classes.js           — Class CRUD endpoints
│   │   ├── schedules.js         — Schedule CRUD endpoints
│   │   └── enrollments.js       — Enrollment CRUD endpoints
│   ├── middleware/
│   │   ├── auth.js              — JWT validation middleware
│   │   ├── errorHandler.js      — Global error handler
│   │   ├── requestLogger.js     — Log requests (optional, phase 2)
│   │   └── roleCheck.js         — Role-based access control helper
│   ├── models/
│   │   ├── User.js              — User queries and business logic
│   │   ├── Class.js             — Class queries and business logic
│   │   ├── Schedule.js          — Schedule queries and business logic
│   │   └── Enrollment.js        — Enrollment queries and business logic
│   ├── db/
│   │   ├── pool.js              — PostgreSQL connection pool setup
│   │   ├── migrations/
│   │   │   ├── 001_create_users_table.sql
│   │   │   ├── 002_create_classes_table.sql
│   │   │   ├── 003_create_schedules_table.sql
│   │   │   └── 004_create_enrollments_table.sql
│   │   └── seed.sql             — Initial test data (optional)
│   ├── utils/
│   │   ├── passwordHash.js      — bcrypt wrapper for hashing/comparing
│   │   ├── jwt.js               — Token generation and validation
│   │   ├── validators.js        — Input validation helpers
│   │   └── errors.js            — Custom error classes
│   └── constants.js             — Enums, constants (roles, statuses, etc.)
├── api/
│   └── index.js                 — Vercel serverless entry point
├── tests/
│   ├── setup.js                 — Test database setup/teardown
│   ├── auth.test.js             — Auth endpoint tests
│   ├── users.test.js            — User CRUD tests
│   ├── classes.test.js          — Class CRUD tests
│   ├── schedules.test.js        — Schedule CRUD tests
│   ├── enrollments.test.js      — Enrollment CRUD tests
│   └── helpers.test.js          — Test utility helpers
├── .env.example                 — Template for environment variables
├── .env.local                   — Local dev secrets (git-ignored)
├── .gitignore
├── package.json
├── jest.config.js               — Jest configuration
├── README.md                    — Project documentation
└── CLAUDE.md                    — Claude Code guidance (copy from frontend)
```

### Design Principles

**Models handle data**:
- All database queries live in `models/`
- Models never know about HTTP (no `req`/`res`)
- Models return plain JavaScript objects or throw errors
- Example: `User.findById(id)` returns `{ id, email, name, role }` or throws NotFoundError

**Routes handle HTTP**:
- Routes import models and call them
- Routes handle request parsing, response formatting, status codes
- Routes never have direct SQL
- Example: route calls `User.findById(id)`, formats response, returns 200 or error

**Middleware handles cross-cutting concerns**:
- Auth validation (token check)
- Error handling (catches thrown errors, formats response)
- Role-based access control (checks user role)
- Request logging (optional)

**Example request flow**:
```
POST /api/classes
  ↓
Route handler receives request
  ↓
Middleware: validates JWT token
  ↓
Middleware: checks role (ADMIN or INSTRUCTOR)
  ↓
Route handler calls Class.create(data)
  ↓
Model: validates input, inserts into DB, returns new class
  ↓
Route handler: formats response, returns 201 Created
```

---

## Testing Strategy

### Test Coverage by Feature

**Auth tests** (~15 tests):
- Valid login with correct password → returns token
- Invalid password → 401 Unauthorized
- Non-existent email → 401 Unauthorized
- Expired token → 401 Unauthorized
- Missing auth header → 401 Unauthorized
- Valid token → GET /api/auth/me returns user info
- Token includes correct role

**User tests** (~12 tests):
- Admin can list all users
- Non-admin cannot list users → 403 Forbidden
- Admin can create user with valid email/password
- Duplicate email → 400 Bad Request
- Invalid email format → 400 Bad Request
- Password hashing verified (plaintext never stored)
- Admin can update user
- Admin can delete user
- User can update own profile
- User cannot update another user's profile → 403 Forbidden

**Class tests** (~10 tests):
- List classes (student sees all, returns subset)
- Get class details
- Admin/instructor can create class
- Student cannot create class → 403 Forbidden
- Instructor can only modify own classes
- Delete class cascades to schedules and enrollments
- Invalid class ID → 404 Not Found

**Schedule tests** (~8 tests):
- List schedules for a class
- List schedules for an instructor
- Create schedule for class
- Invalid time range (end before start) → 400 Bad Request
- Delete schedule works

**Enrollment tests** (~10 tests):
- Student can enroll in a class
- Student cannot enroll twice → 400 Bad Request
- Student can see own enrollments
- Instructor can see students in own class
- Admin can see all enrollments
- Student can drop enrollment
- Invalid class ID → 404 Not Found

### Test Approach

**Real database testing**:
- Each test spins up a clean test database before running
- Tests insert real data, perform operations, verify results
- Tests clean up (delete test data) after running
- No mocking of database layer (catch real DB issues early)

**Test isolation**:
- Each test is independent (can run in any order)
- No shared state between tests
- Setup/teardown handles isolation

**Running tests**:
```bash
npm test                 # Run all tests
npm test -- --watch     # Watch mode (re-run on file change)
npm test -- --coverage  # Show coverage report
```

**Target metrics**:
- ~95% line coverage (not 100%, some error paths hard to test)
- All happy path flows tested
- Key error cases tested
- Edge cases (boundary values, null/empty, etc.) tested

---

## Error Handling

### Error Response Format

All errors return JSON in this format:

```json
{
  "error": "User not found",
  "status": 404
}
```

**Validation errors** include field details:
```json
{
  "error": "Validation failed",
  "status": 400,
  "details": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | GET request successful |
| 201 | Created | POST request created resource |
| 400 | Bad Request | Invalid input, validation failed |
| 401 | Unauthorized | Missing/invalid JWT token |
| 403 | Forbidden | User lacks permission (wrong role) |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate email, duplicate enrollment |
| 500 | Server Error | Unhandled exception (bug) |

### Error Handling Middleware

- All route handlers wrapped in try-catch (or use async/await)
- Errors thrown as custom Error classes (`NotFoundError`, `UnauthorizedError`, etc.)
- Global error handler catches all errors, formats response, returns appropriate status
- Server errors (500) logged to console; user receives generic "Something went wrong" message (no internal details leaked)

### Logging

**Phase 1 logging**:
- Errors logged to console (Vercel captures these)
- No structured logging library yet (keep it simple)
- Errors include: timestamp, endpoint, error message, stack trace

**Phase 2 logging**:
- Can add structured logging (e.g., Winston, Pino)
- Send logs to external service (Sentry, CloudWatch, etc.)

---

## Frontend Integration

### Frontend Changes

The frontend currently imports mock data from `mockData.js`. Phase 1 replaces this with API calls.

**Files to modify**:
1. **Remove**: `src/app/data/mockData.js` (no longer needed)
2. **Create**: `src/app/api/client.js` (API client with auth handling)
3. **Update**: `src/app/hooks/useStore.js` (fetch real data instead of mock data)
4. **Update**: Component screens (use API client instead of props/mock data)

**API client example** (`src/app/api/client.js`):
```javascript
export async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('authToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
  
  const response = await fetch(`http://localhost:3001/api${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }
  
  return response.json();
}
```

**Development setup**:
- Backend runs on `http://localhost:3001` (dev machine)
- Frontend on `http://localhost:3000`
- Frontend proxy configured in `next.config.mjs` (or use environment variable)

### Token Management

- **Storage**: `localStorage.authToken` (browser-local, not sent in cookies)
- **Expiry**: 24 hours; after login, frontend stores token
- **On expiry**: API returns 401, frontend clears token and redirects to login
- **Phase 2**: Refresh tokens to extend session without re-login

---

## Deployment

### Development

```bash
# Terminal 1: Backend
cd cfc-digital-backend
npm install
npm run dev              # Starts on http://localhost:3001

# Terminal 2: Frontend
cd cfc-digital
npm run dev             # Starts on http://localhost:3000
```

### Production (Vercel)

**Setup**:
1. Create new GitHub repo for `cfc-digital-backend`
2. Connect both repos to Vercel
3. Set environment variables in Vercel:
   - `DATABASE_URL`: PostgreSQL connection string
   - `JWT_SECRET`: Random long string (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `NODE_ENV`: production
4. Deploy both repos

**Frontend environment variables** (`.env.local`):
```
NEXT_PUBLIC_API_URL=https://cfc-digital-backend.vercel.app
```

**Backend environment variables** (Vercel project settings):
```
DATABASE_URL=postgresql://user:pass@host:port/dbname
JWT_SECRET=<random-secret>
NODE_ENV=production
```

**Database setup**:
- Create PostgreSQL instance (Neon, Railway, AWS RDS, etc.)
- Run migrations on first deploy (can be automated or manual)

---

## Success Criteria for Phase 1

- ✓ All 20 endpoints implemented and tested
- ✓ User authentication works (login returns JWT, frontend stores token)
- ✓ Role-based access control enforced on all endpoints
- ✓ Database schema matches design (4 tables with proper relationships)
- ✓ Test coverage ≥95% for core logic
- ✓ All tests pass (unit + integration)
- ✓ Frontend fully functional without mock data
- ✓ Can deploy both frontend and backend to Vercel
- ✓ Error handling consistent across all endpoints
- ✓ Code follows structure (models, routes, middleware separation)

---

## Timeline (1-2 months)

**Week 1-2**: Backend setup, database, auth
- Project scaffolding, package setup
- PostgreSQL connection pool
- User model + auth endpoints
- Auth middleware + JWT validation
- Auth tests

**Week 2-3**: Core CRUD endpoints
- Class and Schedule endpoints
- Enrollment endpoints
- Role-based access control
- Tests for all endpoints

**Week 3-4**: Frontend integration
- Replace mock data with API calls
- Update components to use real data
- Test flow end-to-end
- Fix integration issues

**Week 4+**: Polish, testing, deployment
- Full regression testing
- Edge case handling
- Performance tuning if needed
- Deploy to Vercel
- Document API (Postman/OpenAPI, optional)

---

## Next Steps

1. User approves this spec
2. Implementation plan created (writing-plans skill)
3. Begin Phase 1 implementation
