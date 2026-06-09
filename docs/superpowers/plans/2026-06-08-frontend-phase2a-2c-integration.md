# Frontend Phase 2A + 2C Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all mocked screens to real API and integrate Phase 2A (attendance, exam results) and Phase 2C (notifications, absences, cancellations) backend features into the CFC Digital frontend.

**Architecture:** Hybrid state — `useStore` adds only `unreadCount` + `refreshUnreadCount()`; all domain state (attendance, schedules, etc.) lives as local `useState` per screen. Backend recurring schedules (`day_of_week + start_time`) are expanded to concrete dates via `expandScheduleToDates()`. Backend prerequisite: Migration 013 adds `plate VARCHAR(10)` to `attendance_records` and removes the photo-upload requirement from `POST /api/attendance`.

**Tech Stack:** Next.js 15 SPA (client-only), React 19, Tailwind CSS v4, lucide-react, Express 5, PostgreSQL; Jest + Supertest for backend tests only (no frontend test framework).

---

## File Map

**Backend (`cfc-digital-backend/` — paths relative to this folder):**
- Create: `src/db/migrations/013_attendance_plate.sql`
- Modify: `src/models/AttendanceRecord.js`
- Modify: `src/routes/attendance.js`
- Modify: `tests/attendance.test.js`

**Frontend (`cfc-digital/src/app/` — paths relative to this folder):**
- Modify: `lib/utils.js`
- Modify: `api/client.js`
- Modify: `hooks/useStore.js`
- Modify: `page.js`
- Modify: `components/layout/MainLayout.jsx`
- Modify: `components/screens/ProfileScreen.jsx`
- Modify: `components/screens/instructor/InstructorAgendaScreen.jsx`
- Create: `components/screens/instructor/InstructorTestResultScreen.jsx`
- Modify: `components/screens/student/StudentScheduleScreen.jsx`
- Create: `components/screens/student/StudentProgressScreen.jsx`
- Modify: `components/screens/admin/AdminUserManagement.jsx`
- Modify: `components/screens/admin/AdminDashboard.jsx`
- Modify: `components/screens/admin/AdminReports.jsx`

---

## Task 1: Backend — Migration 013 + Attendance Route Refactor

The current `POST /api/attendance` requires a photo (multipart form, uploads to Vercel Blob). The new design marks attendance by plate number only. The `PUT /api/attendance/:id/validate` currently requires ADMIN; the new design lets instructors validate at end of day.

**Files:**
- Create: `src/db/migrations/013_attendance_plate.sql`
- Modify: `src/models/AttendanceRecord.js`
- Modify: `src/routes/attendance.js`
- Modify: `tests/attendance.test.js`

- [ ] **Step 1: Write new tests for the changed behavior**

Replace the failing POST and validate tests in `tests/attendance.test.js`. Find the `describe('POST /api/attendance'` block and replace the entire block:

```js
describe('POST /api/attendance', () => {
  it('should mark attendance with plate as instructor', async () => {
    const res = await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ scheduleId: testSchedule.id, studentId: studentUser.id, attendanceDate: '2026-06-04', plate: 'ABC-1234' })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('pending');
    expect(res.body.plate).toBe('ABC-1234');
  });

  it('should mark attendance without plate', async () => {
    const res = await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ scheduleId: testSchedule.id, studentId: studentUser.id, attendanceDate: '2026-06-04' })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.plate).toBeNull();
  });

  it('should reject attendance marking by student', async () => {
    await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ scheduleId: testSchedule.id, studentId: studentUser.id, attendanceDate: '2026-06-04' })
      .expect(403);
  });

  it('should reject duplicate attendance for same student and date', async () => {
    await AttendanceRecord.create(testSchedule.id, studentUser.id, '2026-06-04');

    const res = await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ scheduleId: testSchedule.id, studentId: studentUser.id, attendanceDate: '2026-06-04' })
      .expect(409);

    expect(res.body.error).toContain('already marked');
  });

  it('should require authentication', async () => {
    await request(app)
      .post('/api/attendance')
      .send({ scheduleId: testSchedule.id, studentId: studentUser.id, attendanceDate: '2026-06-04' })
      .expect(401);
  });
});
```

Also add an instructor validate test inside the `describe('PUT /api/attendance/:id/validate'` block:

```js
it('should allow instructor to validate attendance', async () => {
  const record = await AttendanceRecord.create(testSchedule.id, studentUser.id, '2026-06-04');
  const res = await request(app)
    .put(`/api/attendance/${record.id}/validate`)
    .set('Authorization', `Bearer ${instructorToken}`)
    .expect(200);
  expect(res.body.status).toBe('validated');
});
```

Also update **all** calls to `AttendanceRecord.create(...)` throughout the test file — they currently pass a 4th argument `'https://blob.vercel.com/photo.jpg'`. Remove that 4th argument from every call:

Search and replace all occurrences of:
```
AttendanceRecord.create(testSchedule.id, studentUser.id, '2026-06-04', 'https://blob.vercel.com/photo.jpg')
```
with:
```
AttendanceRecord.create(testSchedule.id, studentUser.id, '2026-06-04')
```

Similarly for `student2User.id` variants.

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd cfc-digital-backend
npm test -- tests/attendance.test.js
```

Expected: multiple test failures (POST tests fail because route still requires multipart form, model still requires photoUrl).

- [ ] **Step 3: Create migration 013**

Create `src/db/migrations/013_attendance_plate.sql`:

```sql
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS plate VARCHAR(10);
```

(`photo_url` is already nullable per migration 007 — no change needed.)

- [ ] **Step 4: Update AttendanceRecord model**

In `src/models/AttendanceRecord.js`, replace the `create` static method:

```js
static async create(scheduleId, studentId, attendanceDate, plate = null) {
  if (!scheduleId) throw new BadRequestError('Schedule ID is required');
  if (!studentId) throw new BadRequestError('Student ID is required');
  if (!attendanceDate) throw new BadRequestError('Attendance date is required');

  try {
    const result = await query(
      `INSERT INTO attendance_records (schedule_id, student_id, attendance_date, plate, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id, schedule_id, student_id, attendance_date, plate, status, validated_by, validated_at, created_at`,
      [scheduleId, studentId, attendanceDate, plate]
    );
    return result.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw new ConflictError('Attendance already marked for this student on this date');
    }
    throw err;
  }
}
```

In `findBySchedule`, update the SELECT to include `plate`:

```js
`SELECT ar.id, ar.schedule_id, ar.student_id, ar.attendance_date, ar.plate, ar.status,
        ar.validated_by, ar.validated_at, ar.created_at,
        u.name as student_name
 FROM attendance_records ar
 JOIN users u ON ar.student_id = u.id
 WHERE ar.schedule_id = $1 AND ar.attendance_date = $2${studentFilter}
 ORDER BY u.name
 LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
```

In `findByStudent`, update the SELECT similarly (add `ar.plate`):

```js
`SELECT ar.id, ar.schedule_id, ar.student_id, ar.attendance_date, ar.plate, ar.status,
        ar.validated_by, ar.validated_at, ar.created_at,
        c.name as class_name
 FROM attendance_records ar
 JOIN schedules s ON ar.schedule_id = s.id
 JOIN classes c ON s.class_id = c.id
 WHERE ar.student_id = $1 AND s.class_id = $2
 ORDER BY ar.attendance_date DESC
 LIMIT $3 OFFSET $4`
```

In `findById`, add `ar.plate` to the SELECT.

In `findPending`, add `ar.plate` to the SELECT.

In `validate` RETURNING clause, add `plate`:
```js
`UPDATE attendance_records
 SET status = 'validated', validated_by = $1, validated_at = NOW()
 WHERE id = $2
 RETURNING id, schedule_id, student_id, attendance_date, plate, status, validated_by, validated_at, created_at`
```

In `reject` RETURNING clause, add `plate`.

Also remove the `del` import from `@vercel/blob` — it's no longer needed (the `reject` and `deleteExpired` methods use it for photo cleanup; since new records won't have `photo_url`, the guards `if (record.photo_url)` already handle this — leave `del` in place but it will become a no-op for new records). Actually, leave the import and those methods as-is since they may still handle legacy records.

- [ ] **Step 5: Update attendance route**

In `src/routes/attendance.js`:

1. Remove the `multer` import and the `upload` constant (lines 2, 12).
2. Remove the `put` import from `@vercel/blob`.
3. Replace the POST route handler:

```js
router.post('/', authMiddleware, requireRole(USER_ROLES.INSTRUCTOR), async (req, res) => {
  try {
    const { scheduleId, studentId, attendanceDate, plate } = req.body;
    const record = await AttendanceRecord.create(scheduleId, studentId, attendanceDate, plate ?? null);
    res.status(201).json(record);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message, statusCode: error.statusCode || 500 });
  }
});
```

4. Change the validate route to allow instructor:

```js
router.put('/:id/validate', authMiddleware, requireRole(USER_ROLES.ADMIN, USER_ROLES.INSTRUCTOR), async (req, res) => {
```

- [ ] **Step 6: Run tests and verify they pass**

```bash
cd cfc-digital-backend
npm test -- tests/attendance.test.js
```

Expected: all attendance tests pass.

- [ ] **Step 7: Run the full suite to catch regressions**

```bash
cd cfc-digital-backend
npm test
```

Expected: 297+ tests pass (number increases by the new instructor-validate test).

- [ ] **Step 8: Commit**

```bash
cd cfc-digital-backend
git add src/db/migrations/013_attendance_plate.sql src/models/AttendanceRecord.js src/routes/attendance.js tests/attendance.test.js
git commit -m "feat: add plate to attendance, allow instructor to validate, remove photo requirement"
```

---

## Task 2: Frontend Foundation — utils.js + client.js

**Files:**
- Modify: `cfc-digital/src/app/lib/utils.js`
- Modify: `cfc-digital/src/app/api/client.js`

- [ ] **Step 1: Write utils.js**

Replace the entire contents of `src/app/lib/utils.js`:

```js
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function expandScheduleToDates(schedules, date) {
  const dayName = DAY_NAMES[date.getDay()];
  return schedules.filter(s => s.day_of_week === dayName);
}

export function getWeekDates(date) {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function toDateStr(date) {
  return date.toISOString().split('T')[0];
}
```

- [ ] **Step 2: Add new API groups to client.js**

In `src/app/api/client.js`, add the following groups inside the `api` object after the `deleteEnrollment` entry:

```js
  assignments: {
    list: (params) => request(`/assignments?${new URLSearchParams(params)}`).then(r => r.data),
    create: (data) => request('/assignments', { method: 'POST', body: data }),
    update: (id, data) => request(`/assignments/${id}`, { method: 'PUT', body: data }),
  },

  grades: {
    list: (params) => request(`/grades?${new URLSearchParams(params)}`).then(r => r.data),
    create: (data) => request('/grades', { method: 'POST', body: data }),
    update: (id, data) => request(`/grades/${id}`, { method: 'PUT', body: data }),
  },

  attendance: {
    list: (params) => request(`/attendance?${new URLSearchParams(params)}`).then(r => r.data),
    mark: (data) => request('/attendance', { method: 'POST', body: data }),
    validate: (id) => request(`/attendance/${id}/validate`, { method: 'PUT' }),
  },

  notifications: {
    getPreferences: () => request('/notifications/preferences'),
    updatePreferences: (data) => request('/notifications/preferences', { method: 'PUT', body: data }),
    list: (params) => request(`/notifications?${new URLSearchParams(params)}`).then(r => r.data),
    unreadCount: () => request('/notifications/unread-count'),
    markRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: () => request('/notifications/read-all', { method: 'PUT' }),
  },

  cancellations: {
    create: (scheduleId, data) => request(`/schedules/${scheduleId}/cancel`, { method: 'POST', body: data }),
    delete: (scheduleId, date) => request(`/schedules/${scheduleId}/cancel/${date}`, { method: 'DELETE' }),
    list: (scheduleId) => request(`/schedules/${scheduleId}/cancellations`).then(r => r.data),
  },

  absences: {
    declare: (scheduleId, data) => request(`/schedules/${scheduleId}/absence`, { method: 'POST', body: data }),
    list: (scheduleId) => request(`/schedules/${scheduleId}/absences`).then(r => r.data),
  },
```

- [ ] **Step 3: Commit**

```bash
cd cfc-digital
git add src/app/lib/utils.js src/app/api/client.js
git commit -m "feat: add schedule utils and Phase 2A/2C API methods"
```

---

## Task 3: useStore + page.js

**Files:**
- Modify: `src/app/hooks/useStore.js`
- Modify: `src/app/page.js`

- [ ] **Step 1: Add unreadCount state to useStore**

In `src/app/hooks/useStore.js`, add after the `enrollments` state line:

```js
const [unreadCount, setUnreadCount] = useState(0);
```

Add the `refreshUnreadCount` function after `showToast`:

```js
const refreshUnreadCount = async () => {
  try {
    const data = await api.notifications.unreadCount();
    setUnreadCount(data?.count ?? 0);
  } catch {
    // silent — badge stays at previous value
  }
};
```

Inside the `login` function, after `setUser(...)` and before `showToast(...)`, add:

```js
refreshUnreadCount();
```

Also reset `unreadCount` to 0 in `logout`:

```js
const logout = async () => {
  try {
    await api.logout();
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
  } finally {
    localStorage.removeItem('authToken');
    setUser(null);
    setClasses([]);
    setSchedules([]);
    setEnrollments([]);
    setUnreadCount(0);
  }
};
```

Add `unreadCount` and `refreshUnreadCount` to the return object.

- [ ] **Step 2: Update page.js to pass new props**

Replace `page.js` with:

```js
'use client';

import { useStore } from '@/app/hooks/useStore';
import { LoginScreen } from '@/app/components/screens/LoginScreen';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { Toast } from '@/app/components/ui/Toast';

export default function App() {
  const { user, login, logout, toast, showToast, unreadCount, refreshUnreadCount } = useStore();

  if (!user) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <>
      <MainLayout
        user={user}
        onLogout={logout}
        showToast={showToast}
        unreadCount={unreadCount}
        refreshUnreadCount={refreshUnreadCount}
      />
      <Toast message={toast.message} type={toast.type} show={toast.show} />
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd cfc-digital
git add src/app/hooks/useStore.js src/app/page.js
git commit -m "feat: add unreadCount and refreshUnreadCount to useStore"
```

---

## Task 4: MainLayout — Notification Bell + New Nav Items

**Files:**
- Modify: `src/app/components/layout/MainLayout.jsx`

- [ ] **Step 1: Replace MainLayout.jsx**

Write the full new `MainLayout.jsx`:

```jsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Users, FileText, LogOut, User, Menu, X, Bell, ClipboardList, GraduationCap } from 'lucide-react';
import { AdminDashboard } from '../screens/admin/AdminDashboard';
import { AdminUserManagement } from '../screens/admin/AdminUserManagement';
import { AdminReports } from '../screens/admin/AdminReports';
import { StudentScheduleScreen } from '../screens/student/StudentScheduleScreen';
import { StudentMyClassesScreen } from '../screens/student/StudentMyClassesScreen';
import { StudentProgressScreen } from '../screens/student/StudentProgressScreen';
import { InstructorAgendaScreen } from '../screens/instructor/InstructorAgendaScreen';
import { InstructorTestResultScreen } from '../screens/instructor/InstructorTestResultScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { api } from '@/app/api/client';

export const MainLayout = ({ user, onLogout, showToast, unreadCount, refreshUnreadCount }) => {
  const [activeView, setActiveView] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const bellRef = useRef(null);

  const navItems = {
    Admin: [
      { icon: Users, label: 'Usuários', view: 'users' },
      { icon: FileText, label: 'Relatórios', view: 'reports' },
    ],
    Aluno: [
      { icon: Calendar, label: 'Meu Horário', view: 'schedule' },
      { icon: Clock, label: 'Minhas Aulas', view: 'my-classes' },
      { icon: ClipboardList, label: 'Meu Histórico', view: 'progress' },
    ],
    Instrutor: [
      { icon: Calendar, label: 'Agenda', view: 'agenda' },
      { icon: GraduationCap, label: 'Exame Prático', view: 'exam' },
    ],
  };

  useEffect(() => {
    if (user?.type === 'Admin') setActiveView('dashboard');
    if (user?.type === 'Aluno') setActiveView('schedule');
    if (user?.type === 'Instrutor') setActiveView('agenda');
  }, [user]);

  const openNotifications = async () => {
    setIsNotificationsOpen(true);
    setNotifLoading(true);
    try {
      const data = await api.notifications.list({});
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    await api.notifications.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    refreshUnreadCount();
  };

  const handleMarkRead = async (id) => {
    await api.notifications.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    refreshUnreadCount();
  };

  const notifTypeColors = {
    class_reminder: { bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700' },
    class_cancelled: { bg: 'bg-red-50', badge: 'bg-red-100 text-red-700' },
    absence_confirmed: { bg: 'bg-green-50', badge: 'bg-green-100 text-green-700' },
  };

  const CurrentScreen = () => {
    if (activeView === 'profile') return <ProfileScreen user={user} showToast={showToast} />;

    if (user.type === 'Admin') {
      if (activeView === 'users') return <AdminUserManagement showToast={showToast} />;
      if (activeView === 'reports') return <AdminReports showToast={showToast} />;
      return <AdminDashboard showToast={showToast} />;
    }
    if (user.type === 'Aluno') {
      if (activeView === 'my-classes') return <StudentMyClassesScreen showToast={showToast} />;
      if (activeView === 'progress') return <StudentProgressScreen user={user} />;
      return <StudentScheduleScreen user={user} showToast={showToast} refreshUnreadCount={refreshUnreadCount} />;
    }
    if (user.type === 'Instrutor') {
      if (activeView === 'exam') return <InstructorTestResultScreen user={user} showToast={showToast} />;
      return <InstructorAgendaScreen user={user} showToast={showToast} refreshUnreadCount={refreshUnreadCount} />;
    }
    return null;
  };

  const userNav = navItems[user.type] || [];

  const NavLink = ({ item }) => (
    <button
      onClick={() => { setActiveView(item.view); setIsMenuOpen(false); }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left transition-colors ${
        activeView === item.view
          ? 'bg-blue-100 text-blue-700 font-semibold'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <item.icon size={20} />
      <span>{item.label}</span>
    </button>
  );

  const BellButton = ({ size = 20 }) => (
    <button
      ref={bellRef}
      onClick={openNotifications}
      className="relative flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left text-gray-600 hover:bg-gray-100"
    >
      <Bell size={size} />
      <span>Notificações</span>
      {unreadCount > 0 && (
        <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 p-4 flex-col fixed h-full">
        <div className="text-2xl font-bold text-gray-800 mb-8 px-2">CFC Digital</div>
        <nav className="space-y-2">
          {user.type === 'Admin' && <NavLink item={{ icon: Calendar, label: 'Dashboard', view: 'dashboard' }} />}
          {userNav.map(item => <NavLink key={item.view} item={item} />)}
        </nav>
        <div className="mt-auto absolute bottom-4 w-56">
          <div className="border-t pt-4 space-y-2">
            <BellButton />
            <NavLink item={{ icon: User, label: 'Meu Perfil', view: 'profile' }} />
            <button
              onClick={onLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left text-gray-600 hover:bg-gray-100"
            >
              <LogOut size={20} /> Sair
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-gray-200 p-4 flex lg:hidden justify-between items-center z-30">
          <div className="text-xl font-bold text-gray-800">CFC Digital</div>
          <div className="flex items-center gap-2">
            <button onClick={openNotifications} className="relative p-2">
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button onClick={() => setIsMenuOpen(true)} className="p-2">
              <Menu size={24} />
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 md:p-8">
          <CurrentScreen />
        </main>
      </div>

      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setIsMenuOpen(false)} />
      )}
      <div className={`fixed top-0 left-0 h-full w-64 bg-white z-50 transform transition-transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:hidden`}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-8">
            <span className="text-2xl font-bold text-gray-800">Menu</span>
            <button onClick={() => setIsMenuOpen(false)} className="p-2"><X size={24} /></button>
          </div>
          <nav className="space-y-2">
            {user.type === 'Admin' && <NavLink item={{ icon: Calendar, label: 'Dashboard', view: 'dashboard' }} />}
            {userNav.map(item => <NavLink key={item.view} item={item} />)}
          </nav>
          <div className="mt-8 border-t pt-4 space-y-2">
            <BellButton />
            <NavLink item={{ icon: User, label: 'Meu Perfil', view: 'profile' }} />
            <button
              onClick={onLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left text-gray-600 hover:bg-gray-100"
            >
              <LogOut size={20} /> Sair
            </button>
          </div>
        </div>
      </div>

      {isNotificationsOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setIsNotificationsOpen(false)}>
          <div
            className="absolute right-4 top-16 lg:right-auto lg:left-68 lg:top-auto w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-gray-800">Notificações</span>
              <div className="flex items-center gap-2">
                <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:underline">
                  Marcar todas como lidas
                </button>
                <button onClick={() => setIsNotificationsOpen(false)}>
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
              {notifLoading ? (
                <div className="p-6 text-center text-gray-400 text-sm">Carregando...</div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">Sem notificações</div>
              ) : notifications.map(n => {
                const colors = notifTypeColors[n.type] || { bg: 'bg-gray-50', badge: 'bg-gray-100 text-gray-700' };
                return (
                  <div
                    key={n.id}
                    onClick={() => handleMarkRead(n.id)}
                    className={`px-4 py-3 cursor-pointer hover:opacity-80 ${colors.bg} ${n.is_read ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${colors.badge}`}>{n.type?.replace('_', ' ')}</span>
                        </div>
                        <p className="text-sm text-gray-800">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Verify the app starts**

```bash
cd cfc-digital
npm run dev
```

Open http://localhost:3000, log in as any role, verify the bell icon appears in sidebar and header.

- [ ] **Step 3: Commit**

```bash
cd cfc-digital
git add src/app/components/layout/MainLayout.jsx
git commit -m "feat: add notification bell and new nav items to MainLayout"
```

---

## Task 5: ProfileScreen

**Files:**
- Modify: `src/app/components/screens/ProfileScreen.jsx`

- [ ] **Step 1: Rewrite ProfileScreen.jsx**

```jsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { User, Mail, Phone, Bell } from 'lucide-react';
import { api } from '@/app/api/client';

const ProfileItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-4 py-3">
    <div className="text-gray-500 mt-1">{icon}</div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium text-gray-800">{value || '—'}</p>
    </div>
  </div>
);

export const ProfileScreen = ({ user, showToast }) => {
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [savingPhone, setSavingPhone] = useState(false);
  const [prefs, setPrefs] = useState({ minutes_before: 30, whatsapp_enabled: false, in_app_enabled: true });
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    api.notifications.getPreferences()
      .then(data => {
        if (data) setPrefs({
          minutes_before: data.minutes_before ?? 30,
          whatsapp_enabled: data.whatsapp_enabled ?? false,
          in_app_enabled: data.in_app_enabled ?? true,
        });
      })
      .catch(() => {});
  }, []);

  const savePhone = async () => {
    setSavingPhone(true);
    try {
      await api.updateUser(user.id, { phone_number: phone });
      showToast('Telefone salvo.', 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao salvar telefone.', 'error');
    } finally {
      setSavingPhone(false);
    }
  };

  const savePrefs = async () => {
    setSavingPrefs(true);
    try {
      await api.notifications.updatePreferences(prefs);
      showToast('Preferências salvas.', 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao salvar preferências.', 'error');
    } finally {
      setSavingPrefs(false);
    }
  };

  const roleLabel = { Admin: 'Administrador do Sistema', Instrutor: 'Instrutor de Direção', Aluno: 'Aluno' };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Meu Perfil</h2>
      <div className="space-y-6">
        <Card>
          <div className="divide-y">
            <ProfileItem icon={<User size={20} />} label="Nome Completo" value={user?.name} />
            <ProfileItem icon={<Mail size={20} />} label="Email" value={user?.email} />
            <ProfileItem icon={<User size={20} />} label="Função" value={roleLabel[user?.type] || user?.type} />
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Phone size={18} /> Telefone
          </h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                id="phone"
                placeholder="+55 11 99999-9999"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
            <Button onClick={savePhone} variant="primary" className="w-auto px-6">
              {savingPhone ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Bell size={18} /> Preferências de Notificação
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Aviso com antecedência</label>
              <select
                value={prefs.minutes_before}
                onChange={e => setPrefs(prev => ({ ...prev, minutes_before: parseInt(e.target.value, 10) }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={60}>1 hora</option>
                <option value={120}>2 horas</option>
              </select>
            </div>
            {phone && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.whatsapp_enabled}
                  onChange={e => setPrefs(prev => ({ ...prev, whatsapp_enabled: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-700">Receber avisos via WhatsApp</span>
              </label>
            )}
            <Button onClick={savePrefs} variant="primary" className="w-full">
              {savingPrefs ? 'Salvando...' : 'Salvar preferências'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify in browser**

Log in, navigate to Meu Perfil. Verify name/email appear from real user object, phone field is editable, preferences card loads.

- [ ] **Step 3: Commit**

```bash
cd cfc-digital
git add src/app/components/screens/ProfileScreen.jsx
git commit -m "feat: migrate ProfileScreen to real API with phone and notification preferences"
```

---

## Task 6: InstructorAgendaScreen (Full Rewrite)

This screen shows the instructor's schedule by day. Sessions load from the API. The instructor marks attendance per student (with vehicle plate), can cancel a class, and validates sessions at end of day.

**Files:**
- Modify: `src/app/components/screens/instructor/InstructorAgendaScreen.jsx`

API field reference:
- `GET /api/schedules?instructorId={id}` → `{ id, class_id, day_of_week, start_time, end_time }`
- `GET /api/enrollments?classId={id}` → `{ id, student_id, class_id, student_name, student_email }`
- `GET /api/attendance?scheduleId={id}&date={YYYY-MM-DD}` → `{ id, schedule_id, student_id, attendance_date, plate, status }`
- `GET /api/schedules/:id/cancellations` → `{ id, schedule_id, date, reason }`

- [ ] **Step 1: Rewrite InstructorAgendaScreen.jsx**

```jsx
'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Spinner } from '@/app/components/ui/Spinner';
import { api } from '@/app/api/client';
import { expandScheduleToDates, toDateStr } from '@/app/lib/utils';

export const InstructorAgendaScreen = ({ user, showToast, refreshUnreadCount }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [enrollmentsByClassId, setEnrollmentsByClassId] = useState({});
  const [attendanceByKey, setAttendanceByKey] = useState({});
  const [cancellationsByScheduleId, setCancellationsByScheduleId] = useState({});
  const [platesMap, setPlatesMap] = useState({});
  const [cancelModal, setCancelModal] = useState({ open: false, scheduleId: null, reason: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    api.getSchedules({ instructorId: user.id })
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setSchedules(list);
        list.forEach(s => {
          api.cancellations.list(s.id)
            .then(c => setCancellationsByScheduleId(prev => ({ ...prev, [s.id]: Array.isArray(c) ? c : [] })))
            .catch(() => {});
        });
      })
      .catch(() => showToast('Erro ao carregar agenda.', 'error'))
      .finally(() => setIsLoading(false));
  }, [user.id]);

  const dateStr = toDateStr(currentDate);
  const todaySchedules = expandScheduleToDates(schedules, currentDate)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  useEffect(() => {
    todaySchedules.forEach(s => {
      if (!enrollmentsByClassId[s.class_id]) {
        api.getEnrollments({ classId: s.class_id })
          .then(enrs => setEnrollmentsByClassId(prev => ({ ...prev, [s.class_id]: Array.isArray(enrs) ? enrs : [] })))
          .catch(() => setEnrollmentsByClassId(prev => ({ ...prev, [s.class_id]: [] })));
      }
      api.attendance.list({ scheduleId: s.id, date: dateStr })
        .then(att => setAttendanceByKey(prev => ({ ...prev, [`${s.id}-${dateStr}`]: Array.isArray(att) ? att : [] })))
        .catch(() => setAttendanceByKey(prev => ({ ...prev, [`${s.id}-${dateStr}`]: [] })));
    });
  }, [currentDate, schedules]);

  const getAttendanceForStudent = (scheduleId, studentId) =>
    (attendanceByKey[`${scheduleId}-${dateStr}`] || []).find(a => a.student_id === studentId);

  const isCancelled = (scheduleId) =>
    (cancellationsByScheduleId[scheduleId] || []).some(c => c.date === dateStr);

  const handleMarkPresent = async (schedule, student) => {
    const plateKey = `${schedule.id}-${student.student_id}`;
    try {
      await api.attendance.mark({
        scheduleId: schedule.id,
        studentId: student.student_id,
        attendanceDate: dateStr,
        plate: platesMap[plateKey] || null,
      });
      const att = await api.attendance.list({ scheduleId: schedule.id, date: dateStr });
      setAttendanceByKey(prev => ({ ...prev, [`${schedule.id}-${dateStr}`]: Array.isArray(att) ? att : [] }));
      showToast('Presença registrada.', 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao registrar presença.', 'error');
    }
  };

  const handleCancelClass = async () => {
    if (!cancelModal.scheduleId) return;
    try {
      await api.cancellations.create(cancelModal.scheduleId, { date: dateStr, reason: cancelModal.reason });
      setCancellationsByScheduleId(prev => ({
        ...prev,
        [cancelModal.scheduleId]: [...(prev[cancelModal.scheduleId] || []), { date: dateStr, reason: cancelModal.reason }],
      }));
      await refreshUnreadCount();
      showToast('Aula cancelada com sucesso.', 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao cancelar aula.', 'error');
    } finally {
      setCancelModal({ open: false, scheduleId: null, reason: '' });
    }
  };

  const handleValidate = async () => {
    setIsValidating(true);
    let count = 0;
    for (const s of todaySchedules) {
      for (const rec of (attendanceByKey[`${s.id}-${dateStr}`] || []).filter(r => r.status === 'pending')) {
        try {
          await api.attendance.validate(rec.id);
          count++;
        } catch {
          // continue
        }
      }
    }
    setIsValidating(false);
    showToast(count > 0 ? `${count} sessão(ões) validada(s).` : 'Nenhuma sessão pendente para validar.', 'success');
    todaySchedules.forEach(s => {
      api.attendance.list({ scheduleId: s.id, date: dateStr })
        .then(att => setAttendanceByKey(prev => ({ ...prev, [`${s.id}-${dateStr}`]: Array.isArray(att) ? att : [] })))
        .catch(() => {});
    });
  };

  const changeDay = (amount) => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + amount);
      return d;
    });
  };

  const hasPendingRecords = todaySchedules.some(s =>
    (attendanceByKey[`${s.id}-${dateStr}`] || []).some(r => r.status === 'pending')
  );

  if (isLoading) return <div className="p-8"><Spinner /></div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Minha Agenda</h2>
      <Card>
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => changeDay(-1)} className="p-2 rounded-full hover:bg-gray-100">
            <ChevronLeft />
          </button>
          <h3 className="text-lg font-semibold capitalize">
            {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </h3>
          <button onClick={() => changeDay(1)} className="p-2 rounded-full hover:bg-gray-100">
            <ChevronRight />
          </button>
        </div>

        {todaySchedules.length === 0 && (
          <p className="text-gray-500 text-center py-8">Nenhuma aula agendada para este dia.</p>
        )}

        <div className="space-y-4">
          {todaySchedules.map(schedule => {
            const cancelled = isCancelled(schedule.id);
            const students = enrollmentsByClassId[schedule.class_id] || [];

            return (
              <div key={schedule.id} className={`border rounded-lg p-4 ${cancelled ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold text-gray-800 text-lg">
                    {schedule.start_time?.substring(0, 5)}
                    {cancelled && <span className="ml-3 text-sm font-medium text-red-600 line-through">Cancelada</span>}
                  </span>
                  {!cancelled && (
                    <button
                      onClick={() => setCancelModal({ open: true, scheduleId: schedule.id, reason: '' })}
                      className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
                    >
                      <XCircle size={14} /> Cancelar aula
                    </button>
                  )}
                </div>

                {!cancelled && students.map(student => {
                  const record = getAttendanceForStudent(schedule.id, student.student_id);
                  const plateKey = `${schedule.id}-${student.student_id}`;
                  const statusBadge = {
                    pending: { cls: 'bg-yellow-100 text-yellow-800', label: 'pendente' },
                    validated: { cls: 'bg-green-100 text-green-800', label: 'presente' },
                    rejected: { cls: 'bg-red-100 text-red-800', label: 'rejeitado' },
                  };
                  const badge = record ? statusBadge[record.status] : { cls: 'bg-gray-100 text-gray-600', label: 'pendente' };

                  return (
                    <div key={student.student_id} className={`border rounded-lg p-3 mt-2 ${record ? (record.status === 'validated' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200') : 'bg-white border-gray-100'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-800">{student.student_name}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
                      </div>
                      <div className="flex gap-2 items-center flex-wrap">
                        <span className="text-xs text-gray-500">Placa:</span>
                        <input
                          type="text"
                          maxLength={10}
                          placeholder="ABC-1234"
                          value={platesMap[plateKey] ?? record?.plate ?? ''}
                          onChange={e => setPlatesMap(prev => ({ ...prev, [plateKey]: e.target.value }))}
                          disabled={!!record}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-28 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                        {!record && (
                          <div className="ml-auto flex gap-2">
                            <button
                              onClick={() => handleMarkPresent(schedule, student)}
                              className="bg-green-100 text-green-800 border border-green-300 rounded px-3 py-1 text-sm font-medium hover:bg-green-200"
                            >
                              ✓ Presente
                            </button>
                            <span className="bg-gray-100 text-gray-600 border border-gray-200 rounded px-3 py-1 text-sm">
                              ✗ Ausente
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!cancelled && students.length === 0 && (
                  <p className="text-sm text-gray-400 italic">Nenhum aluno matriculado.</p>
                )}
              </div>
            );
          })}
        </div>

        {hasPendingRecords && (
          <div className="mt-6">
            <Button onClick={handleValidate} variant="primary" className="w-full">
              {isValidating ? 'Validando...' : 'Validar sessões do dia'}
            </Button>
          </div>
        )}
      </Card>

      <Modal
        title="Cancelar Aula"
        isOpen={cancelModal.open}
        onClose={() => setCancelModal({ open: false, scheduleId: null, reason: '' })}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Cancelar a aula do dia <strong>{currentDate.toLocaleDateString('pt-BR')}</strong>?
          </p>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Motivo (opcional)</label>
            <textarea
              placeholder="Ex: Indisponibilidade do instrutor"
              value={cancelModal.reason}
              onChange={e => setCancelModal(prev => ({ ...prev, reason: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setCancelModal({ open: false, scheduleId: null, reason: '' })}>
              Voltar
            </Button>
            <Button variant="danger" onClick={handleCancelClass}>
              Confirmar cancelamento
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
```

- [ ] **Step 2: Verify in browser**

Log in as instructor. Navigate to Agenda. Verify day navigation works, sessions show for days with schedules, plate input and Presente button appear.

- [ ] **Step 3: Commit**

```bash
cd cfc-digital
git add src/app/components/screens/instructor/InstructorAgendaScreen.jsx
git commit -m "feat: rewrite InstructorAgendaScreen with real API, attendance, and cancellation"
```

---

## Task 7: StudentScheduleScreen (Full Rewrite)

This screen shows the student's enrolled sessions for the current week. Cancelled dates are crossed out. The student can declare absence.

**Files:**
- Modify: `src/app/components/screens/student/StudentScheduleScreen.jsx`

API field reference:
- `GET /api/enrollments?studentId={id}` → `{ id, class_id, class_name, instructor_name, enrolled_at }`
- `GET /api/schedules?classId={id}` → `{ id, class_id, day_of_week, start_time }`
- `GET /api/schedules/:id/cancellations` → `{ id, schedule_id, date, reason }`
- `POST /api/schedules/:id/absence { date }` → `{ charged: bool }`

- [ ] **Step 1: Rewrite StudentScheduleScreen.jsx**

```jsx
'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Spinner } from '@/app/components/ui/Spinner';
import { api } from '@/app/api/client';
import { expandScheduleToDates, getWeekDates, toDateStr } from '@/app/lib/utils';

export const StudentScheduleScreen = ({ user, showToast, refreshUnreadCount }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [schedules, setSchedules] = useState([]);
  const [cancellationsByScheduleId, setCancellationsByScheduleId] = useState({});
  const [absenceModal, setAbsenceModal] = useState({ open: false, scheduleId: null, dateStr: null, time: null });
  const [declaring, setDeclaring] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const enrollments = await api.getEnrollments({ studentId: user.id });
        const allSchedules = [];
        for (const enr of (Array.isArray(enrollments) ? enrollments : [])) {
          const scheds = await api.getSchedules({ classId: enr.class_id });
          (Array.isArray(scheds) ? scheds : []).forEach(s => {
            allSchedules.push({ ...s, class_name: enr.class_name, instructor_name: enr.instructor_name });
          });
        }
        setSchedules(allSchedules);
        for (const s of allSchedules) {
          api.cancellations.list(s.id)
            .then(c => setCancellationsByScheduleId(prev => ({ ...prev, [s.id]: Array.isArray(c) ? c : [] })))
            .catch(() => {});
        }
      } catch {
        showToast('Erro ao carregar horário.', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user.id]);

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(baseDate);

  const sessions = weekDates.flatMap(date =>
    expandScheduleToDates(schedules, date).map(s => ({ ...s, date }))
  ).sort((a, b) => {
    const dA = toDateStr(a.date);
    const dB = toDateStr(b.date);
    return dA === dB ? a.start_time.localeCompare(b.start_time) : dA.localeCompare(dB);
  });

  const isCancelled = (scheduleId, dateStr) =>
    (cancellationsByScheduleId[scheduleId] || []).some(c => c.date === dateStr);

  const handleDeclareAbsence = async () => {
    if (!absenceModal.scheduleId || !absenceModal.dateStr) return;
    setDeclaring(true);
    try {
      const res = await api.absences.declare(absenceModal.scheduleId, { date: absenceModal.dateStr });
      await refreshUnreadCount();
      showToast(
        res?.charged
          ? 'Ausência registrada — aula será cobrada (declaração tardia).'
          : 'Ausência registrada — aula não cobrada.',
        'success'
      );
    } catch (err) {
      showToast(err.message || 'Erro ao declarar ausência.', 'error');
    } finally {
      setDeclaring(false);
      setAbsenceModal({ open: false, scheduleId: null, dateStr: null, time: null });
    }
  };

  if (isLoading) return <div className="p-8"><Spinner /></div>;

  const today = toDateStr(new Date());

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Meu Horário</h2>

      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-2 rounded-full hover:bg-gray-100">
          <ChevronLeft />
        </button>
        <span className="font-semibold text-gray-700">
          {weekDates[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} –{' '}
          {weekDates[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
        <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-2 rounded-full hover:bg-gray-100">
          <ChevronRight />
        </button>
      </div>

      {sessions.length === 0 ? (
        <Card><p className="text-gray-500 text-center py-8">Nenhuma aula nesta semana.</p></Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session, i) => {
            const dateStr = toDateStr(session.date);
            const cancelled = isCancelled(session.id, dateStr);
            const isPast = dateStr < today;
            const isToday = dateStr === today;

            return (
              <Card key={`${session.id}-${dateStr}-${i}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className={`font-semibold ${cancelled ? 'line-through text-red-400' : 'text-gray-800'}`}>
                      {session.date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                      {' às '}
                      {session.start_time?.substring(0, 5)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {session.instructor_name ? `Instrutor: ${session.instructor_name}` : session.class_name}
                    </p>
                    {cancelled && (
                      <span className="inline-block mt-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        Cancelada
                      </span>
                    )}
                  </div>
                  {!cancelled && !isPast && (
                    <Button
                      variant="secondary"
                      className="w-auto text-sm px-4 py-2"
                      onClick={() => setAbsenceModal({ open: true, scheduleId: session.id, dateStr, time: session.start_time?.substring(0, 5) })}
                    >
                      Declarar ausência
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        title="Declarar Ausência"
        isOpen={absenceModal.open}
        onClose={() => setAbsenceModal({ open: false, scheduleId: null, dateStr: null, time: null })}
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Confirmar ausência para <strong>{absenceModal.dateStr}</strong> às <strong>{absenceModal.time}</strong>?
          </p>
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Declarações com menos de 1 hora de antecedência são registradas como ausência tardia e a aula é cobrada.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setAbsenceModal({ open: false, scheduleId: null, dateStr: null, time: null })}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleDeclareAbsence}>
              {declaring ? 'Registrando...' : 'Confirmar ausência'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
```

- [ ] **Step 2: Verify in browser**

Log in as student. Navigate to Meu Horário. Verify week navigation, sessions from enrolled classes appear, cancelled dates show strikethrough.

- [ ] **Step 3: Commit**

```bash
cd cfc-digital
git add src/app/components/screens/student/StudentScheduleScreen.jsx
git commit -m "feat: rewrite StudentScheduleScreen with weekly view and absence declaration"
```

---

## Task 8: InstructorTestResultScreen (New)

New screen for recording practical driving exam results per student.

**Files:**
- Create: `src/app/components/screens/instructor/InstructorTestResultScreen.jsx`

API field reference:
- `GET /api/classes` → `{ id, name, instructor_id }` (scoped to instructor's own by JWT)
- `GET /api/enrollments?classId={id}` → `{ student_id, student_name }`
- `GET /api/assignments?classId={id}` → `{ id, title, max_score }`
- `POST /api/assignments { class_id, title, max_score }` → `{ id }`
- `GET /api/grades?studentId={id}&assignmentId={id}` → `{ id, score }`
- `POST /api/grades { assignment_id, student_id, score }` → `{ id }`
- `PUT /api/grades/:id { score }` → `{ id, score }`

- [ ] **Step 1: Create InstructorTestResultScreen.jsx**

```jsx
'use client';

import { useState, useEffect } from 'react';
import { Spinner } from '@/app/components/ui/Spinner';
import { Card } from '@/app/components/ui/Card';
import { api } from '@/app/api/client';

export const InstructorTestResultScreen = ({ user, showToast }) => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [enrollments, setEnrollments] = useState([]);
  const [assignmentId, setAssignmentId] = useState(null);
  const [gradesByStudentId, setGradesByStudentId] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    api.getClasses()
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setClasses(list);
        if (list.length > 0) setSelectedClassId(list[0].id);
      })
      .catch(() => showToast('Erro ao carregar turmas.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    const load = async () => {
      try {
        const [enrs, assignments] = await Promise.all([
          api.getEnrollments({ classId: selectedClassId }),
          api.assignments.list({ classId: selectedClassId }),
        ]);
        const enrList = Array.isArray(enrs) ? enrs : [];
        setEnrollments(enrList);

        let examAssignment = (Array.isArray(assignments) ? assignments : []).find(a => a.title === 'Exame Prático');
        if (!examAssignment && enrList.length > 0) {
          examAssignment = await api.assignments.create({ class_id: selectedClassId, title: 'Exame Prático', max_score: 10 });
        }
        setAssignmentId(examAssignment?.id ?? null);

        if (examAssignment) {
          const grades = await api.grades.list({ assignmentId: examAssignment.id });
          const byStudent = {};
          (Array.isArray(grades) ? grades : []).forEach(g => { byStudent[g.student_id] = g; });
          setGradesByStudentId(byStudent);
        }
      } catch (err) {
        showToast(err.message || 'Erro ao carregar dados.', 'error');
      }
    };
    load();
  }, [selectedClassId]);

  const handleSetResult = async (studentId, score) => {
    if (!assignmentId) return;
    setSaving(prev => ({ ...prev, [studentId]: true }));
    try {
      const existing = gradesByStudentId[studentId];
      let grade;
      if (existing) {
        grade = await api.grades.update(existing.id, { score });
      } else {
        grade = await api.grades.create({ assignment_id: assignmentId, student_id: studentId, score });
      }
      setGradesByStudentId(prev => ({ ...prev, [studentId]: grade }));
      showToast(score === 10 ? 'Aluno aprovado.' : 'Aluno reprovado.', 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao salvar resultado.', 'error');
    } finally {
      setSaving(prev => ({ ...prev, [studentId]: false }));
    }
  };

  if (loading) return <div className="p-8"><Spinner /></div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Exame Prático</h2>

      <Card>
        <div className="mb-6">
          <label className="block text-sm text-gray-600 mb-1">Turma / Classe</label>
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {enrollments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhum aluno matriculado nesta turma.</p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 grid grid-cols-3 gap-2 text-xs font-semibold uppercase text-gray-500">
              <span>Aluno</span>
              <span className="text-center">Situação</span>
              <span className="text-center">Resultado</span>
            </div>
            {enrollments.map(enr => {
              const grade = gradesByStudentId[enr.student_id];
              const isSaving = saving[enr.student_id];

              return (
                <div key={enr.student_id} className="px-4 py-3 border-t border-gray-100 grid grid-cols-3 gap-2 items-center">
                  <span className="font-medium text-gray-800">{enr.student_name}</span>
                  <span className={`text-center text-xs px-2 py-1 rounded-full font-medium mx-auto ${grade ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {grade ? 'realizado' : 'pendente'}
                  </span>
                  <div className="flex justify-center gap-2">
                    {grade ? (
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${grade.score === 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {grade.score === 10 ? '✓ Aprovado' : '✗ Reprovado'}
                      </span>
                    ) : (
                      <>
                        <button
                          disabled={isSaving}
                          onClick={() => handleSetResult(enr.student_id, 10)}
                          className="bg-green-100 text-green-800 border border-green-300 rounded px-3 py-1 text-sm hover:bg-green-200 disabled:opacity-50"
                        >✓</button>
                        <button
                          disabled={isSaving}
                          onClick={() => handleSetResult(enr.student_id, 0)}
                          className="bg-red-100 text-red-800 border border-red-300 rounded px-3 py-1 text-sm hover:bg-red-200 disabled:opacity-50"
                        >✗</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
```

- [ ] **Step 2: Verify in browser**

Log in as instructor, navigate to "Exame Prático". Verify class picker shows instructor's classes, enrolled students appear, pass/fail buttons work.

- [ ] **Step 3: Commit**

```bash
cd cfc-digital
git add src/app/components/screens/instructor/InstructorTestResultScreen.jsx
git commit -m "feat: add InstructorTestResultScreen for practical exam results"
```

---

## Task 9: StudentProgressScreen (New)

Shows the student's attendance history and exam result.

**Files:**
- Create: `src/app/components/screens/student/StudentProgressScreen.jsx`

API field reference:
- `GET /api/enrollments?studentId={id}` → `{ id, class_id, class_name, instructor_name, enrolled_at }`
- `GET /api/grades?studentId={id}` → `{ id, assignment_id, student_id, score }` (filter title='Exame Prático' by cross-referencing assignments)
- `GET /api/attendance?studentId={id}&classId={classId}` → `{ id, attendance_date, plate, status, schedule_id }`

- [ ] **Step 1: Create StudentProgressScreen.jsx**

```jsx
'use client';

import { useState, useEffect } from 'react';
import { Spinner } from '@/app/components/ui/Spinner';
import { Card } from '@/app/components/ui/Card';
import { api } from '@/app/api/client';

export const StudentProgressScreen = ({ user }) => {
  const [enrollments, setEnrollments] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [examGrade, setExamGrade] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const enrs = await api.getEnrollments({ studentId: user.id });
        const enrList = Array.isArray(enrs) ? enrs : [];
        setEnrollments(enrList);

        const grades = await api.grades.list({ studentId: user.id });
        const gradeList = Array.isArray(grades) ? grades : [];
        if (gradeList.length > 0) {
          const exam = gradeList.find(g => g.score !== undefined && g.score !== null);
          setExamGrade(exam ?? null);
        }

        const allRecords = [];
        for (const enr of enrList) {
          const records = await api.attendance.list({ studentId: user.id, classId: enr.class_id });
          (Array.isArray(records) ? records : []).forEach(r => allRecords.push(r));
        }
        allRecords.sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));
        setAttendanceRecords(allRecords);
      } catch {
        // silently degrade
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.id]);

  if (loading) return <div className="p-8"><Spinner /></div>;

  const presences = attendanceRecords.filter(r => r.status === 'validated' || r.status === 'pending').length;
  const total = attendanceRecords.length;
  const faltas = total - presences;

  const statusIcon = (status) => {
    if (status === 'validated') return { icon: '✓', color: 'text-green-600' };
    if (status === 'pending') return { icon: '✓', color: 'text-yellow-600' };
    return { icon: '✗', color: 'text-red-500' };
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Meu Histórico</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'aulas', value: total, color: 'bg-blue-50 text-blue-700' },
          { label: 'presenças', value: presences, color: 'bg-green-50 text-green-700' },
          { label: 'faltas', value: faltas, color: 'bg-orange-50 text-orange-700' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.color} rounded-xl p-4 text-center`}>
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="text-sm mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {examGrade !== null && (
        <div className={`mb-6 border rounded-xl px-4 py-3 flex justify-between items-center ${examGrade.score === 10 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div>
            <p className={`font-semibold ${examGrade.score === 10 ? 'text-green-800' : 'text-red-800'}`}>Exame Prático</p>
            <p className={`text-sm ${examGrade.score === 10 ? 'text-green-600' : 'text-red-600'}`}>
              {examGrade.score === 10 ? 'Aprovado' : 'Reprovado'}
            </p>
          </div>
          <span className={`text-2xl font-bold ${examGrade.score === 10 ? 'text-green-600' : 'text-red-600'}`}>
            {examGrade.score === 10 ? '✓' : '✗'}
          </span>
        </div>
      )}

      <Card>
        <h3 className="font-semibold text-gray-800 mb-4">Histórico de Aulas</h3>
        {attendanceRecords.length === 0 ? (
          <p className="text-gray-400 text-center py-6">Nenhuma aula registrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {attendanceRecords.map(record => {
              const { icon, color } = statusIcon(record.status);
              return (
                <div key={record.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <span className="text-gray-400 text-sm w-16 shrink-0">
                    {new Date(record.attendance_date + 'T12:00:00Z').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                  <span className="flex-1 text-sm text-gray-700">
                    {record.plate ? `Placa: ${record.plate}` : '—'}
                  </span>
                  <span className={`font-bold ${color}`}>{icon}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
```

- [ ] **Step 2: Verify in browser**

Log in as student, navigate to Meu Histórico. Verify stat tiles show, history list appears.

- [ ] **Step 3: Commit**

```bash
cd cfc-digital
git add src/app/components/screens/student/StudentProgressScreen.jsx
git commit -m "feat: add StudentProgressScreen with attendance history and exam result"
```

---

## Task 10: AdminUserManagement (Real API)

**Files:**
- Modify: `src/app/components/screens/admin/AdminUserManagement.jsx`

API field reference:
- `GET /api/users` → `{ id, name, email, role, phone_number }[]` (admin sees all)
- `POST /api/users { name, email, password, role }` → `{ id, name, email, role }`
- `PUT /api/users/:id { name, email }` → updated user
- `GET /api/enrollments?studentId={id}` → `{ id, class_id, class_name, instructor_name }[]`

- [ ] **Step 1: Rewrite AdminUserManagement.jsx**

```jsx
'use client';

import { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Modal } from '@/app/components/ui/Modal';
import { Spinner } from '@/app/components/ui/Spinner';
import { api } from '@/app/api/client';

export const AdminUserManagement = ({ showToast }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [detailModal, setDetailModal] = useState({ open: false, user: null, enrollments: [] });
  const [form, setForm] = useState({ name: '', email: '', role: 'STUDENT' });
  const [tempPassword, setTempPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      showToast('Erro ao carregar usuários.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const openAdd = () => {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const pwd = `CFC@${pin}`;
    setTempPassword(pwd);
    setForm({ name: '', email: '', role: 'STUDENT' });
    setAddModal(true);
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      await api.createUser({ name: form.name, email: form.email, password: tempPassword, role: form.role });
      showToast('Usuário criado com sucesso.', 'success');
      setAddModal(false);
      loadUsers();
    } catch (err) {
      showToast(err.message || 'Erro ao criar usuário.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (u) => {
    let enrollments = [];
    if (u.role === 'STUDENT') {
      enrollments = await api.getEnrollments({ studentId: u.id }).catch(() => []);
    }
    setDetailModal({ open: true, user: u, enrollments: Array.isArray(enrollments) ? enrollments : [] });
  };

  const instructors = users.filter(u => u.role === 'INSTRUCTOR');
  const students = users.filter(u => u.role === 'STUDENT');

  if (loading) return <div className="p-8"><Spinner /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Gerenciar Usuários</h2>
        <Button onClick={openAdd} variant="primary" className="flex items-center gap-2 w-auto">
          <UserPlus size={18} /> Novo Usuário
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-4 text-gray-900">Instrutores</h3>
          <Card className="space-y-2">
            {instructors.length === 0 && <p className="text-gray-400 text-sm py-2">Nenhum instrutor cadastrado.</p>}
            {instructors.map(u => (
              <div key={u.id} className="flex justify-between items-center p-3 rounded hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{u.name}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </div>
                <button onClick={() => openDetail(u)} className="text-blue-600 text-sm font-semibold hover:text-blue-700">
                  Ver detalhes
                </button>
              </div>
            ))}
          </Card>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4 text-gray-900">Alunos</h3>
          <Card className="space-y-2">
            {students.length === 0 && <p className="text-gray-400 text-sm py-2">Nenhum aluno cadastrado.</p>}
            {students.map(u => (
              <div key={u.id} className="flex justify-between items-center p-3 rounded hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{u.name}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </div>
                <button onClick={() => openDetail(u)} className="text-blue-600 text-sm font-semibold hover:text-blue-700">
                  Ver detalhes
                </button>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <Modal title="Novo Usuário" isOpen={addModal} onClose={() => setAddModal(false)}>
        <div className="space-y-4">
          <Input id="new-name" placeholder="Nome Completo" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <Input id="new-email" type="email" placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          <select
            value={form.role}
            onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="STUDENT">Aluno</option>
            <option value="INSTRUCTOR">Instrutor</option>
          </select>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Senha temporária (copie e envie ao usuário)</label>
            <input
              readOnly
              value={tempPassword}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 font-mono text-gray-800 select-all"
              onClick={e => e.target.select()}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => setAddModal(false)} variant="secondary">Cancelar</Button>
            <Button onClick={handleAdd} variant="primary">{saving ? 'Salvando...' : 'Criar usuário'}</Button>
          </div>
        </div>
      </Modal>

      <Modal
        title={detailModal.user?.name || 'Detalhes'}
        isOpen={detailModal.open}
        onClose={() => setDetailModal({ open: false, user: null, enrollments: [] })}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Email: <span className="text-gray-900">{detailModal.user?.email}</span></p>
          <p className="text-sm text-gray-600">Função: <span className="text-gray-900">{detailModal.user?.role}</span></p>
          {detailModal.user?.phone_number && (
            <p className="text-sm text-gray-600">Telefone: <span className="text-gray-900">{detailModal.user.phone_number}</span></p>
          )}
          {detailModal.enrollments.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mt-3 mb-2">Turmas matriculadas:</p>
              <ul className="space-y-1">
                {detailModal.enrollments.map(e => (
                  <li key={e.id} className="text-sm text-gray-700 bg-gray-50 rounded px-3 py-2">
                    {e.class_name} — Instrutor: {e.instructor_name || '—'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
```

- [ ] **Step 2: Verify in browser**

Log in as admin, navigate to Usuários. Verify instructors and students load from API.

- [ ] **Step 3: Commit**

```bash
cd cfc-digital
git add src/app/components/screens/admin/AdminUserManagement.jsx
git commit -m "feat: migrate AdminUserManagement to real API"
```

---

## Task 11: AdminDashboard (Real API)

**Files:**
- Modify: `src/app/components/screens/admin/AdminDashboard.jsx`

Strategy: load all instructors → for each, load their schedules → expand to today → load enrollments per class for student names.

- [ ] **Step 1: Rewrite AdminDashboard.jsx**

```jsx
'use client';

import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Spinner } from '@/app/components/ui/Spinner';
import { api } from '@/app/api/client';
import { expandScheduleToDates, toDateStr } from '@/app/lib/utils';

export const AdminDashboard = () => {
  const [todaysSessions, setTodaysSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const load = async () => {
      try {
        const users = await api.getUsers();
        const instructors = (Array.isArray(users) ? users : []).filter(u => u.role === 'INSTRUCTOR');

        const sessions = [];
        for (const instructor of instructors) {
          const scheds = await api.getSchedules({ instructorId: instructor.id });
          const todayScheds = expandScheduleToDates(Array.isArray(scheds) ? scheds : [], today);
          for (const s of todayScheds) {
            const enrs = await api.getEnrollments({ classId: s.class_id });
            (Array.isArray(enrs) ? enrs : []).forEach(enr => {
              sessions.push({
                time: s.start_time?.substring(0, 5),
                studentName: enr.student_name,
                instructorName: instructor.name,
              });
            });
          }
        }
        sessions.sort((a, b) => a.time?.localeCompare(b.time));
        setTodaysSessions(sessions);
      } catch {
        // silently degrade
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="p-8"><Spinner /></div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-full">
            <Calendar className="text-green-600" size={24} />
          </div>
          <div>
            <p className="text-4xl font-bold text-gray-800">{todaysSessions.length}</p>
            <p className="text-gray-500">Aulas agendadas para hoje</p>
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-lg mb-4 text-black">Agenda do Dia</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {todaysSessions.length === 0 ? (
              <p className="text-gray-500">Nenhuma aula hoje.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <span>Horário</span><span>Aluno</span><span>Instrutor</span>
                </div>
                {todaysSessions.map((s, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 rounded bg-gray-50 p-2 text-sm text-gray-700">
                    <span className="font-semibold text-gray-800">{s.time}</span>
                    <span>{s.studentName}</span>
                    <span>{s.instructorName}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify in browser**

Log in as admin, verify Dashboard shows today's sessions from real data.

- [ ] **Step 3: Commit**

```bash
cd cfc-digital
git add src/app/components/screens/admin/AdminDashboard.jsx
git commit -m "feat: migrate AdminDashboard to real API"
```

---

## Task 12: AdminReports (Real API)

**Files:**
- Modify: `src/app/components/screens/admin/AdminReports.jsx`

Strategy: load instructors for dropdown → on selection: load schedules → expand to all dates in selected month → count sessions with at least one attendance record.

- [ ] **Step 1: Rewrite AdminReports.jsx**

```jsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Spinner } from '@/app/components/ui/Spinner';
import { api } from '@/app/api/client';
import { expandScheduleToDates, toDateStr } from '@/app/lib/utils';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function getDatesInMonth(year, month) {
  const dates = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export const AdminReports = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [instructors, setInstructors] = useState([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [schedules, setSchedules] = useState([]);
  const [reportData, setReportData] = useState({ total: 0, byDate: [], byTime: [] });
  const [loadingInstructors, setLoadingInstructors] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    api.getUsers()
      .then(data => {
        const instructorList = (Array.isArray(data) ? data : []).filter(u => u.role === 'INSTRUCTOR');
        setInstructors(instructorList);
        if (instructorList.length > 0) setSelectedInstructorId(instructorList[0].id);
      })
      .finally(() => setLoadingInstructors(false));
  }, []);

  useEffect(() => {
    if (!selectedInstructorId) return;
    api.getSchedules({ instructorId: selectedInstructorId })
      .then(data => setSchedules(Array.isArray(data) ? data : []))
      .catch(() => setSchedules([]));
  }, [selectedInstructorId]);

  useEffect(() => {
    if (!selectedInstructorId || schedules.length === 0) return;
    const compute = async () => {
      setLoadingReport(true);
      try {
        const monthDates = getDatesInMonth(currentYear, selectedMonth);
        const sessionDates = monthDates.flatMap(date =>
          expandScheduleToDates(schedules, date).map(s => ({ schedule: s, date }))
        );

        const results = await Promise.all(
          sessionDates.map(async ({ schedule, date }) => {
            const dateStr = toDateStr(date);
            const records = await api.attendance.list({ scheduleId: schedule.id, date: dateStr }).catch(() => []);
            return { date, schedule, hasAttendance: (Array.isArray(records) ? records : []).length > 0 };
          })
        );

        const conducted = results.filter(r => r.hasAttendance);
        const groupedByDate = {};
        const groupedByTime = {};
        conducted.forEach(({ date, schedule }) => {
          const dateStr = toDateStr(date);
          const time = schedule.start_time?.substring(0, 5);
          if (!groupedByDate[dateStr]) groupedByDate[dateStr] = [];
          groupedByDate[dateStr].push(time);
          groupedByTime[time] = (groupedByTime[time] || 0) + 1;
        });

        setReportData({
          total: conducted.length,
          byDate: Object.entries(groupedByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, times]) => ({ date, times: times.sort() })),
          byTime: Object.entries(groupedByTime)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([time, count]) => ({ time, count })),
        });
      } finally {
        setLoadingReport(false);
      }
    };
    compute();
  }, [selectedInstructorId, selectedMonth, schedules]);

  const formatDate = (isoDate) =>
    new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  if (loadingInstructors) return <div className="p-8"><Spinner /></div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Relatórios</h2>
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <select
            value={selectedInstructorId}
            onChange={e => setSelectedInstructorId(e.target.value)}
            className="w-full px-4 text-black py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
            className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name} {currentYear}</option>
            ))}
          </select>
        </div>

        {loadingReport ? <Spinner /> : (
          <div className="bg-blue-50 p-6 rounded-lg">
            <p className="text-gray-500 text-sm">Total de aulas realizadas no mês selecionado</p>
            <p className="text-4xl font-bold text-blue-600 mt-1">{reportData.total}</p>
            {reportData.total === 0 ? (
              <p className="mt-4 text-gray-500 text-sm">Nenhuma aula registrada para este instrutor no período.</p>
            ) : (
              <div className="mt-6 space-y-6">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Datas e horários</h4>
                  <div className="mt-2 space-y-3">
                    {reportData.byDate.map(({ date, times }) => (
                      <div key={date} className="rounded bg-white/70 p-3">
                        <p className="text-sm font-semibold text-gray-700">{formatDate(date)}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-600">
                          {times.map(time => (
                            <span key={`${date}-${time}`} className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700">
                              {time}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Aulas por horário</h4>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {reportData.byTime.map(({ time, count }) => (
                      <div key={time} className="rounded bg-white/70 p-3 text-center">
                        <p className="font-semibold text-gray-700">{time}</p>
                        <p className="text-sm text-gray-500">{count} aula{count !== 1 ? 's' : ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
```

- [ ] **Step 2: Verify in browser**

Log in as admin, navigate to Relatórios. Verify instructor dropdown is populated, month picker shows current year months, report loads.

- [ ] **Step 3: Commit**

```bash
cd cfc-digital
git add src/app/components/screens/admin/AdminReports.jsx
git commit -m "feat: migrate AdminReports to real API"
```

---

## Self-Review Checklist

- [x] **Spec coverage**: All 11 implementation steps in spec are covered by Tasks 1–12.
- [x] **No TBD**: Every task has complete code.
- [x] **Type consistency**: `student_name` from enrollment (not `user_name`). `start_time` from schedule (not `startTime`). `attendance_date` from attendance record. `toDateStr()` used consistently instead of inline `.split('T')[0]`.
- [x] **Backend prerequisite**: Task 1 removes `multer`, changes POST to JSON, allows instructor to validate.
- [x] **Props thread**: `user`, `showToast`, `refreshUnreadCount` all traced from page.js → useStore → MainLayout → screens.
- [x] **New screens wired in MainLayout**: `InstructorTestResultScreen` and `StudentProgressScreen` added to `CurrentScreen`, nav items added in `navItems`.
- [x] **`expandScheduleToDates` used consistently** in Task 6 (InstructorAgenda), Task 7 (StudentSchedule), Task 11 (AdminDashboard), Task 12 (AdminReports).
- [x] **api.getUsers() vs api.getUsers(role)**: Backend `GET /api/users` has no role filter — AdminDashboard and AdminReports filter client-side with `.filter(u => u.role === 'INSTRUCTOR')`. This is correct.
