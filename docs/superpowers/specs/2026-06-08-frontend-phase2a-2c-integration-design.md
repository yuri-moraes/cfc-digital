# Frontend Phase 2A + 2C Integration Design

**Date:** 2026-06-08
**Status:** Approved

## Context

The CFC Digital backend is complete (297 tests passing) with Phase 2A (attendance records, assignments/grades) and Phase 2C (notifications, cancellations, absences) endpoints fully implemented. The frontend is still using mocked data across all screens. This spec covers the full frontend integration plus the migration of all mocked screens to real API.

**Domain clarification:** CFC Digital is a driving school for practical (one-on-one) lessons only. There are no theoretical classes, no groups/turmas. Each lesson is one student + one instructor in a specific car on a specific date and time. The unit of progress is attendance (present/absent/declared) and the practical street driving exam (pass/fail).

---

## Architecture Decisions

### State management: Hybrid

`useStore` gains exactly two new items:
- `unreadCount` (number) — notification badge count
- `refreshUnreadCount()` — calls `GET /api/notifications/unread-count`, called on login and after any mutation that may create a notification (cancel class, declare absence)

All other domain state (attendance, exam results, schedules, cancellations, absences) lives as local `useState` inside the screen that needs it. No shared domain state.

### Notification refresh strategy

Load on mount (login) + re-fetch after mutations. No polling. Covers the main cases: reminders are cron-driven (user will see them next time they open the app) and action-driven notifications (cancellations, absences) are refreshed immediately after the action.

### Recurring schedule expansion

Backend schedules store `day_of_week` + `start_time`. A utility function `expandScheduleToDates(schedules, date)` added to `src/app/lib/utils.js` returns the subset of schedules that fall on a given date. Used by InstructorAgendaScreen, StudentScheduleScreen, AdminDashboard, and AdminReports.

### Implementation order

1. Extend `client.js` — all new endpoint methods at once
2. `useStore` — add `unreadCount` + `refreshUnreadCount`
3. `MainLayout` — notification bell + dropdown
4. `ProfileScreen` — phone + notification preferences
5. `InstructorAgendaScreen` — real API + attendance + plate + cancel class
6. `StudentScheduleScreen` — real API + absence + cancelled dates
7. `InstructorTestResultScreen` (new) — practical exam results
8. `StudentProgressScreen` (new) — student history
9. `AdminUserManagement` — real API
10. `AdminDashboard` — real API
11. `AdminReports` — real API

---

## Backend Prerequisite (Migration 013)

Before the frontend can save vehicle plate data, the backend needs one addition:

**File:** `cfc-digital-backend/src/db/migrations/013_attendance_plate.sql`
```sql
ALTER TABLE attendance_records ADD COLUMN plate VARCHAR(10);
```

Update `POST /api/attendance` to accept `plate` in the request body. Update `GET /api/attendance` response to include `plate`. Update affected tests. This is a prerequisite for step 5 (InstructorAgendaScreen).

---

## Step 1 — client.js additions

New method groups added to the `api` object in `src/app/api/client.js`:

```js
// Assignments (practical exam definitions)
assignments: {
  list: (params) => request(`/assignments?${new URLSearchParams(params)}`).then(r => r.data),
  create: (data) => request('/assignments', { method: 'POST', body: data }),
  update: (id, data) => request(`/assignments/${id}`, { method: 'PUT', body: data }),
  delete: (id) => request(`/assignments/${id}`, { method: 'DELETE' }),
},

// Grades (practical exam results)
grades: {
  list: (params) => request(`/grades?${new URLSearchParams(params)}`).then(r => r.data),
  create: (data) => request('/grades', { method: 'POST', body: data }),
  update: (id, data) => request(`/grades/${id}`, { method: 'PUT', body: data }),
},

// Attendance
attendance: {
  list: (params) => request(`/attendance?${new URLSearchParams(params)}`).then(r => r.data),
  mark: (data) => request('/attendance', { method: 'POST', body: data }),
  validate: (id) => request(`/attendance/${id}/validate`, { method: 'PUT' }),
},

// Notifications
notifications: {
  getPreferences: () => request('/notifications/preferences'),
  updatePreferences: (data) => request('/notifications/preferences', { method: 'PUT', body: data }),
  list: (params) => request(`/notifications?${new URLSearchParams(params)}`).then(r => r.data),
  unreadCount: () => request('/notifications/unread-count'),
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => request('/notifications/read-all', { method: 'PUT' }),
},

// Cancellations
cancellations: {
  create: (scheduleId, data) => request(`/schedules/${scheduleId}/cancel`, { method: 'POST', body: data }),
  delete: (scheduleId, date) => request(`/schedules/${scheduleId}/cancel/${date}`, { method: 'DELETE' }),
  list: (scheduleId) => request(`/schedules/${scheduleId}/cancellations`).then(r => r.data),
},

// Absences
absences: {
  declare: (scheduleId, data) => request(`/schedules/${scheduleId}/absence`, { method: 'POST', body: data }),
  list: (scheduleId) => request(`/schedules/${scheduleId}/absences`).then(r => r.data),
},
```

Existing `getEnrollments` signature stays unchanged. Existing `getSchedules` stays unchanged.

---

## Step 2 — useStore additions

```js
const [unreadCount, setUnreadCount] = useState(0);

const refreshUnreadCount = async () => {
  try {
    const { count } = await api.notifications.unreadCount();
    setUnreadCount(count);
  } catch {
    // silent — badge just stays at previous value
  }
};
```

`refreshUnreadCount()` called:
- Inside `login()` after successful auth
- After `api.cancellations.create()` (in InstructorAgendaScreen)
- After `api.absences.declare()` (in StudentScheduleScreen)

---

## Step 3 — MainLayout: notification bell

**Desktop sidebar** — bell added as a nav item above "Meu Perfil":
```jsx
<button onClick={() => setIsNotificationsOpen(true)} className="...">
  <Bell size={20} />
  <span>Notificações</span>
  {unreadCount > 0 && <span className="...badge...">{unreadCount}</span>}
</button>
```

**Mobile header** — bell icon added to the right of the title, left of the hamburger:
```jsx
<button onClick={() => setIsNotificationsOpen(true)} className="relative p-2">
  <Bell size={22} />
  {unreadCount > 0 && <span className="...badge...">{unreadCount}</span>}
</button>
```

**Dropdown panel** — `isNotificationsOpen` boolean controls a fixed overlay panel anchored below the bell. Closes on outside click.

Notification item color coding:
- `class_reminder` → blue background (`bg-blue-50`, badge `bg-blue-100 text-blue-700`)
- `class_cancelled` → red background (`bg-red-50`, badge `bg-red-100 text-red-700`)
- `absence_confirmed` → green background (`bg-green-50`, badge `bg-green-100 text-green-700`)

Unread items have a colored dot indicator. Read items are muted (opacity-60). "Marcar todas como lidas" calls `api.notifications.markAllRead()` then `refreshUnreadCount()`. Each item click calls `api.notifications.markRead(id)` then refreshes.

---

## Step 4 — ProfileScreen

Remove `MOCKED_USERS` import. Use `user` from props (already populated at login from `/api/auth/me`).

Add two new sections below existing read-only fields:

**Telefone field** — editable `<Input>` for `phone_number`. Save button calls `api.updateUser(user.id, { phone_number })`. Shows current value or placeholder "Não informado".

**Preferências de notificação card** — loads on mount via `api.notifications.getPreferences()`:
- "Aviso com antecedência" — `<select>` with options 15, 30, 60, 120 minutes
- "WhatsApp" toggle — only rendered when `phone_number` is non-empty
- Save calls `api.notifications.updatePreferences({ minutes_before, whatsapp_enabled, in_app_enabled })`

---

## Step 5 — InstructorAgendaScreen (merged with attendance)

**Replaces** the current fully-mocked screen. Also absorbs the InstructorAttendanceScreen concept — they are one screen.

On mount: load `GET /api/schedules?instructor_id={user.id}`. On date change: `expandScheduleToDates(schedules, currentDate)` to get sessions for that day. Per session: load `GET /api/enrollments?class_id={schedule.class_id}` to get enrolled students, and `GET /api/attendance?schedule_id={schedule.id}` (filtered by date client-side) to know who already checked in.

Per session card shows:
- Student name + time
- Plate input (text, `VARCHAR(10)` — saved when instructor hits Presente)
- "Presente" button → `POST /api/attendance { schedule_id, attendance_date, plate }` + mark card green
- "Ausente" button → marks locally as absent (no record needed; backend handles on validate)
- Status badge: pending / presente / ausente / ausência declarada (from student_absences)
- "Cancelar aula" icon button → modal with date (pre-filled) + reason textarea → `POST /api/schedules/:id/cancel` → `refreshUnreadCount()`

Cancelled sessions (from `GET /api/schedules/:id/cancellations`) render with red strikethrough.

"Validar sessões do dia" button (bottom, blue) → calls `api.attendance.validate(id)` on the first attendance record for the session. Only enabled when at least one session has a record.

---

## Step 6 — StudentScheduleScreen

Rename screen title from "Agendar Aula" to "Meu Horário". Screen is no longer a booking calendar — it shows the student's scheduled sessions (from their enrollments).

On mount: load `GET /api/enrollments?student_id={user.id}`, then `GET /api/schedules?class_id={classId}` for each enrolled class. Expand to the current week. Per session: `GET /api/schedules/:id/cancellations` to know which dates are cancelled.

Cancelled dates render crossed out with a red "Cancelada" badge.

Active sessions on or after today show "Declarar ausência" button. Clicking opens a modal:
> "Confirmar ausência para [date] às [time]?"  
> "Aviso: declarações com menos de 1 hora de antecedência são registradas como ausência tardia e a aula é cobrada."

On confirm: `POST /api/schedules/:id/absence { date }`. Response `{ charged: bool }` drives the toast:
- `charged: false` → "Ausência registrada — aula não cobrada"
- `charged: true` → "Ausência registrada — aula será cobrada (declaração tardia)"

After: `refreshUnreadCount()`.

---

## Step 7 — InstructorTestResultScreen (new)

New file: `src/app/components/screens/instructor/InstructorTestResultScreen.jsx`

Added to instructor nav as "Exame Prático" with `GraduationCap` icon, `view: 'exam'`.

On mount: load instructor's classes via `GET /api/classes` (backend returns only the instructor's own classes based on JWT). Class picker dropdown at top.

On class select: load enrolled students via `GET /api/enrollments?class_id={id}`, then check for existing "Exame Prático" assignment via `GET /api/assignments?class_id={id}`. If none exists, create one on first result entry: `POST /api/assignments { class_id, title: 'Exame Prático', max_score: 10 }`.

Per student row:
- Student name
- Status badge: "pendente" (no grade) / "realizado" (has grade)
- Result: "Aprovado" (score = 10) / "Reprovado" (score = 0) / pass/fail buttons (when pending)

Pass button → `POST /api/grades { assignment_id, student_id, score: 10 }`
Fail button → `POST /api/grades { assignment_id, student_id, score: 0 }`

If grade already recorded → `PUT /api/grades/:id` to correct.

---

## Step 8 — StudentProgressScreen (new)

New file: `src/app/components/screens/student/StudentProgressScreen.jsx`

Added to student nav as "Meu Histórico" with `ClipboardList` icon, `view: 'progress'`.

On mount:
- Load `GET /api/enrollments?student_id={user.id}`
- Load `GET /api/grades?student_id={user.id}` to check exam result
- Attendance history loaded per schedule on demand (not all at once) — fetched when the student expands a class section or on initial mount for the first enrolled class only

Top summary cards (3 stat tiles): total sessions attended, total presences, total absences.

Exam result banner — only shown if a grade exists:
- Green ("Aprovado") or red ("Reprovado") with the date

Session history list — chronological, newest first:
- Date + time + plate (if present) + status icon: ✓ (presente), ~ (declarada), ✗ (falta)

---

## Step 9 — AdminUserManagement (real API)

Remove `MOCKED_INSTRUCTORS` / `MOCKED_STUDENTS`. On mount: `GET /api/users`. Split into instructors (role=INSTRUCTOR) and students (role=STUDENT) client-side.

"Novo Usuário" modal: wire up to `POST /api/users { name, email, password, role }`. Generate a temporary password client-side ("CFC@" + random 4-digit number), display it in a read-only field inside the modal so the admin can copy it and share with the user manually before closing.

"Editar" → opens modal pre-filled with user data → `PUT /api/users/:id`.

"Vincular" button renamed to "Ver detalhes" — opens a read-only modal showing the student's enrolled classes (loaded via `GET /api/enrollments?student_id={id}`).

---

## Step 10 — AdminDashboard (real API)

Remove mocks. On mount: `GET /api/schedules` (all) + `GET /api/users`. Use `expandScheduleToDates(schedules, today)` to get today's sessions. For each session: show enrolled students from `GET /api/enrollments?class_id={schedule.class_id}` (loaded once, keyed by class_id). Show instructor name from users list.

Same layout: count stat tile + today's session list (time / student / instructor).

---

## Step 11 — AdminReports (real API)

On mount: `GET /api/users?role=INSTRUCTOR` populates the instructor dropdown. Month picker shows all 12 months of `new Date().getFullYear()` (dynamic, not hardcoded to 2024).

On instructor + month select:
- `GET /api/schedules?instructor_id={id}` → expand to all dates in the selected month
- For each schedule date: `GET /api/attendance?schedule_id={id}` filtered to that month's dates → counts actual sessions conducted (presence records exist)

Same layout: total count + dates breakdown + by-time breakdown.

---

## Navigation Summary

| Role | Nav items after this sprint |
|------|-----------------------------|
| Admin | Dashboard, Usuários, Relatórios *(unchanged)* |
| Instrutor | Agenda, Exame Prático |
| Aluno | Agendar (→ Meu Horário), Minhas Aulas, Meu Histórico |

---

## Files Created / Modified

**Backend (prerequisite):**
- `cfc-digital-backend/src/db/migrations/013_attendance_plate.sql` (new)
- `cfc-digital-backend/src/models/attendance.js` (update)
- `cfc-digital-backend/src/routes/attendance.js` (update)
- `cfc-digital-backend/tests/attendance.test.js` (update)

**Frontend:**
- `src/app/api/client.js` (extend)
- `src/app/hooks/useStore.js` (extend)
- `src/app/lib/utils.js` (add `expandScheduleToDates`)
- `src/app/components/layout/MainLayout.jsx` (notification bell + new nav items)
- `src/app/components/screens/ProfileScreen.jsx` (phone + preferences)
- `src/app/components/screens/instructor/InstructorAgendaScreen.jsx` (full rewrite)
- `src/app/components/screens/instructor/InstructorTestResultScreen.jsx` (new)
- `src/app/components/screens/student/StudentScheduleScreen.jsx` (full rewrite)
- `src/app/components/screens/student/StudentProgressScreen.jsx` (new)
- `src/app/components/screens/admin/AdminUserManagement.jsx` (real API)
- `src/app/components/screens/admin/AdminDashboard.jsx` (real API)
- `src/app/components/screens/admin/AdminReports.jsx` (real API)
- `src/app/data/mockData.js` (all exports become unused; file left in place)
