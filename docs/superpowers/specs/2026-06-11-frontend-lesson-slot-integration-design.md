# Frontend Lesson-Slot Integration Design

**Date:** 2026-06-11  
**Status:** Approved  
**Scope:** Migrate `cfc-digital/` frontend from the obsolete class/schedule/enrollment API to the new lesson-slot model backend.

---

## Context

The backend was fully redesigned (migrations 014–020) replacing the class/turma model with individual 50-minute lesson slots. All existing frontend screens reference deleted endpoints (`/classes`, `/schedules`, `/enrollments`, `/assignments`, `/grades`, `/attendance`) and are currently broken. This spec covers the complete frontend migration.

---

## Approach

One-shot clean rewrite. Since every screen is simultaneously broken, incremental migration provides no benefit. Infrastructure (api client, store, utils) is replaced first, then all screens in a single implementation pass.

---

## Infrastructure Changes

### `src/app/api/client.js` — full replacement

Remove all obsolete namespaces. Replace with:

**`api.lessonSlots`**
- `list(params)` → `GET /api/lesson-slots?date&status&limit&page`
- `get(id)` → `GET /api/lesson-slots/:id`
- `create(data)` → `POST /api/lesson-slots` — `{ student_id, instructor_id, vehicle_id, scheduled_date, start_time }`
- `createBatch(data)` → `POST /api/lesson-slots/batch`
- `checkin(id, plateAtCheckin)` → `PUT /api/lesson-slots/:id/checkin`
- `noShow(id)` → `PUT /api/lesson-slots/:id/no-show`
- `cancel(id)` → `PUT /api/lesson-slots/:id/cancel`
- `reschedule(id, data)` → `PUT /api/lesson-slots/:id/reschedule`
- `absence(id)` → `POST /api/lesson-slots/:id/absence`

**`api.slots`**
- `available(params)` → `GET /api/slots/available?date_from&date_to&instructor_id`

**`api.examResults`**
- `list(params)` → `GET /api/exam-results?student_id&page&limit`
- `create(data)` → `POST /api/exam-results` — `{ student_id, instructor_id, vehicle_id, exam_date, result, notes }`
- `update(id, data)` → `PUT /api/exam-results/:id`
- `delete(id)` → `DELETE /api/exam-results/:id`

**`api.vehicles`**
- `list()` → `GET /api/vehicles`
- `create(data)` → `POST /api/vehicles`
- `update(id, data)` → `PUT /api/vehicles/:id`
- `delete(id)` → `DELETE /api/vehicles/:id`

**`api.instructors`**
- `vehicles.list(instructorId)` → `GET /api/instructors/:id/vehicles`
- `vehicles.add(instructorId, vehicleId)` → `POST /api/instructors/:id/vehicles`
- `vehicles.remove(instructorId, vehicleId)` → `DELETE /api/instructors/:id/vehicles/:vehicleId`
- `availability.list(instructorId)` → `GET /api/instructors/:id/availability`
- `availability.add(instructorId, data)` → `POST /api/instructors/:id/availability`
- `availability.delete(instructorId, windowId)` → `DELETE /api/instructors/:id/availability/:windowId`

**Unchanged:** `api.login`, `api.logout`, `api.getMe`, `api.getUsers`, `api.getUser`, `api.createUser`, `api.updateUser`, `api.deleteUser`, `api.notifications`

---

### `src/app/hooks/useStore.js` — stripped to auth + toast

**Remove:** `classes`, `schedules`, `enrollments` state; `loadClasses`, `loadEnrollments`, `loadSchedules`, `enrollClass`, `dropEnrollment` actions.

**Keep:** `user`, `toast`, `unreadCount`, `login`, `logout`, `showToast`, `refreshUnreadCount`.

Screens already call `api.*` directly with local state — the store was never the source of truth for screen data.

---

### `src/app/lib/utils.js` — remove obsolete helpers

**Remove:** `expandScheduleToDates` (expanded recurring weekly schedules — concept no longer exists), `getWeekDates` (week-offset browsing no longer needed).

**Keep:** `toDateStr`.

---

### `src/app/components/layout/MainLayout.jsx` — nav + routing

**Admin nav:** Dashboard · Usuários · Veículos · Relatórios  
**Student nav:** Meu Horário · Meu Histórico (remove "Minhas Aulas")  
**Instructor nav:** Agenda · Exame Prático (unchanged)

Add route for `view === 'vehicles'` → `<AdminVehicleManagement />`.

---

### Files to delete

- `src/app/components/screens/student/StudentMyClassesScreen.jsx` — mock-only, concept removed
- `src/app/data/mockData.js` — only used by StudentMyClassesScreen

---

## Screen Designs

### AdminDashboard

**Replaces:** multi-level waterfall (getUsers → getSchedules per instructor → getEnrollments per class)  
**New fetch:** `GET /api/lesson-slots?date=YYYY-MM-DD` (today) — backend returns all slots for admin automatically.

Layout unchanged: count card + table showing `time | student name | instructor name | status`. Status badge added as a new column (was not present before).

---

### AdminUserManagement

**User create form additions (STUDENT role only):**
- `purchased_lessons` — number input, default 0
- `category` — select: A / B / AB / C / D / E

**Student detail modal:** replace enrollment list with:
- `purchased_lessons` and `category` read from the user profile (`GET /api/users/:id`).
- Balance computation is not shown here — the lesson-slots endpoint does not support `student_id` filtering when called by admin, so full balance data is only available in StudentProgressScreen where the student calls the API as themselves.

**Instructor detail modal:** expand to 3-tab layout:
- *Dados* — name, email, phone (existing)
- *Disponibilidade* — list availability windows (day_of_week, start_time, end_time) with delete button per row; "Adicionar janela" button opens an inline form (day-of-week select + start/end time inputs) → `api.instructors.availability.add`
- *Veículos* — list assigned vehicles (plate, model); "Adicionar veículo" opens a select of unassigned fleet vehicles → `api.instructors.vehicles.add`; remove button per row → `api.instructors.vehicles.remove`

---

### AdminVehicleManagement (new)

New nav item: "Veículos" (icon: Car from lucide-react).

Flat list showing: plate, model, year, category, color. "Novo veículo" button opens create modal with those fields. Each row has edit (inline modal) and delete (confirmation) actions. Standard CRUD against `api.vehicles`.

---

### AdminReports

**Keep:** instructor selector + month selector UI structure.

**Replace:** attendance-record computation with lesson-slot query. Fetch `GET /api/lesson-slots?limit=500` (no date filter), filter client-side to the selected instructor (`instructor_id`) and month. Count slots with `status === 'completed'` as "aulas realizadas".

**Known limitation:** the lesson-slots endpoint only supports exact `date` filtering, not a date range. Client-side filtering with `limit=500` is a workaround. A future `date_from`/`date_to` backend param would be cleaner.

**Metrics displayed:** same structure as today — total completed slots for the month, breakdown by date, breakdown by time-of-day.

---

### StudentScheduleScreen

Unified screen for viewing slots and booking new ones.

**Slots list:**
- Fetch `GET /api/lesson-slots` (backend auto-filters to student's own slots, sorted by scheduled_date/start_time).
- Each card: date, time, instructor name, vehicle plate, status badge.
- For `scheduled` future slots: "Declarar ausência" button → `POST /api/lesson-slots/:id/absence`. Show the 1-hour rule warning in the confirmation modal (same amber notice as today).
- For other statuses: badge only, no actions.

**Booking modal** (triggered by "Agendar nova aula" button, top-right):
- On mount: fetch `GET /api/slots/available?date_from=today&date_to=today+7`.
- Results grouped by date, each slot shows: time, instructor name, vehicle plate, "Agendar" button.
- On book: `POST /api/lesson-slots` → close modal → refresh slot list → show success toast.
- Empty state: "Nenhum horário disponível nos próximos 7 dias."

**Remove:** week-offset navigation, `expandScheduleToDates`, `getWeekDates`, cancellations-by-schedule logic.

---

### StudentProgressScreen

**Balance section (top):**
- Fetch user profile `GET /api/users/:id` for `purchased_lessons` and `category`.
- Fetch `GET /api/lesson-slots?limit=500` (all student's slots).
- Compute: `balance = purchased_lessons − count(slots where status in [scheduled, completed, no_show, absent_charged])`.
- Display three stat boxes: Aulas Compradas / Aulas Usadas / Saldo Restante.

**Exam results:**
- Fetch `GET /api/exam-results` (auto-filtered as student).
- Each result: date, instructor, vehicle, pass/fail badge, notes (if present).
- Empty state if no results yet.

**Slot history:**
- Reuse slots from balance fetch, filter to non-`scheduled` statuses, sort newest first.
- Each row: date, time, instructor, status icon — completed=✓ green, no_show=✗ red, absent_valid=— gray, absent_charged=✗ orange, cancelled=— gray.

---

### InstructorAgendaScreen

**Keep:** day-by-day ← → navigation.

**Fetch:** `GET /api/lesson-slots?date=YYYY-MM-DD` (backend auto-filters to instructor's own slots).

Each slot card:
- Shows: time, student name, status badge.
- `scheduled` → two action buttons:
  - "Check-in": small plate input (`plate_at_checkin`) + confirm → `PUT /api/lesson-slots/:id/checkin` with body `{ plate_at_checkin }`
  - "No-show": confirm → `PUT /api/lesson-slots/:id/no-show`
- `completed` → green badge, no actions.
- `no_show` → red badge, no actions.
- `cancelled` / `absent_*` → gray badge, no actions.

**Remove:** cancel-class modal, attendance validation button, `enrollmentsByClassId` state, `attendanceByKey` state, `cancellationsByScheduleId` state, `platesMap` global state (plate input is now inline per slot). The concept of class-level cancellation is gone — admin cancels individual slots.

---

### InstructorTestResultScreen

**Remove:** class selector, assignments API calls, grades API calls.

**New layout:**

*Results list:* `GET /api/exam-results` (auto-filtered to instructor's own results). Each row: student name, exam date, vehicle plate, pass/fail badge, notes. "Editar" action opens edit modal.

*"Novo resultado" button* opens create modal:
- Student: dropdown from `GET /api/users` (filter `role === 'STUDENT'`)
- Exam date: date input (defaults to today)
- Vehicle: dropdown from `GET /api/vehicles`
- Result: "Aprovado" / "Reprovado" toggle buttons
- Notes: optional textarea
- Submit → `POST /api/exam-results`

*Edit modal* (instructors only): result, notes, exam date, vehicle → `PUT /api/exam-results/:id`. No delete button for instructors (admin-only per RBAC).

---

## Summary: Files Changed

| Action | File |
|--------|------|
| Rewrite | `src/app/api/client.js` |
| Rewrite | `src/app/hooks/useStore.js` |
| Trim | `src/app/lib/utils.js` |
| Update | `src/app/components/layout/MainLayout.jsx` |
| Rewrite | `src/app/components/screens/admin/AdminDashboard.jsx` |
| Rewrite | `src/app/components/screens/admin/AdminUserManagement.jsx` |
| Rewrite | `src/app/components/screens/admin/AdminReports.jsx` |
| Create | `src/app/components/screens/admin/AdminVehicleManagement.jsx` |
| Rewrite | `src/app/components/screens/student/StudentScheduleScreen.jsx` |
| Rewrite | `src/app/components/screens/student/StudentProgressScreen.jsx` |
| Rewrite | `src/app/components/screens/instructor/InstructorAgendaScreen.jsx` |
| Rewrite | `src/app/components/screens/instructor/InstructorTestResultScreen.jsx` |
| Delete | `src/app/components/screens/student/StudentMyClassesScreen.jsx` |
| Delete | `src/app/data/mockData.js` |
