# Frontend Lesson-Slot Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the `cfc-digital/` Next.js frontend from the defunct class/schedule/enrollment API to the new lesson-slot model, rewiring all screens and adding 3 new admin capabilities.

**Architecture:** One-shot clean rewrite — infrastructure first (api client, store, utils), then all screens in task order. Screens manage their own data fetching via local useState; useStore is auth+toast only. No shared slot state.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS v4, lucide-react, Portuguese UI text

---

## File Map

| Action | File |
|--------|------|
| Rewrite | `src/app/api/client.js` |
| Rewrite | `src/app/hooks/useStore.js` |
| Trim | `src/app/lib/utils.js` |
| Update | `src/app/components/layout/MainLayout.jsx` |
| Create | `src/app/components/screens/admin/AdminVehicleManagement.jsx` |
| Rewrite | `src/app/components/screens/admin/AdminDashboard.jsx` |
| Rewrite | `src/app/components/screens/admin/AdminUserManagement.jsx` |
| Rewrite | `src/app/components/screens/admin/AdminReports.jsx` |
| Rewrite | `src/app/components/screens/student/StudentScheduleScreen.jsx` |
| Rewrite | `src/app/components/screens/student/StudentProgressScreen.jsx` |
| Rewrite | `src/app/components/screens/instructor/InstructorAgendaScreen.jsx` |
| Rewrite | `src/app/components/screens/instructor/InstructorTestResultScreen.jsx` |
| Delete | `src/app/components/screens/student/StudentMyClassesScreen.jsx` |
| Delete | `src/app/data/mockData.js` |

### Backend response shapes (verified)

- **LessonSlot** (paginated `{ data, meta }`): `id`, `student_name`, `instructor_name`, `plate` (vehicle's plate), `scheduled_date`, `start_time`, `status`, `plate_at_checkin`
- **AvailableSlot** (plain array): `instructor_id`, `instructor_name`, `vehicle_id`, `plate`, `scheduled_date`, `start_time`
- **ExamResult** (paginated, raw — no name joins): `id`, `student_id`, `instructor_id`, `vehicle_id`, `exam_date`, `result` (`'pass'`|`'fail'`), `notes`
- **Vehicle** (paginated): `id`, `plate`, `model`, `year`, `category`, `color`
- **InstructorVehicle** (plain array): `id`, `vehicle_id`, `plate`, `model`, `year`
- **InstructorAvailability** (plain array): `id`, `vehicle_id`, `day_of_week` (integer 0–6), `start_time`, `end_time`, `plate`, `model`

---

## Task 1: Infrastructure — api/client.js, useStore.js, utils.js

**Files:**
- Rewrite: `src/app/api/client.js`
- Rewrite: `src/app/hooks/useStore.js`
- Trim: `src/app/lib/utils.js`

- [ ] **Step 1: Replace `src/app/api/client.js`**

```javascript
'use client';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function request(endpoint, options = {}) {
  const { method = 'GET', body = null, ...restOptions } = options;
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const headers = { 'Content-Type': 'application/json', ...restOptions.headers };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const fetchOptions = { method, headers, ...restOptions };
  if (body) fetchOptions.body = JSON.stringify(body);
  const response = await fetch(`${API_URL}${endpoint}`, fetchOptions);
  if (!response.ok) {
    let errorMessage = `API Error: ${response.statusText}`;
    try { const err = await response.json(); errorMessage = err.message || errorMessage; } catch {}
    throw new ApiError(errorMessage, response.status);
  }
  try { return await response.json(); } catch { return null; }
}

const list = (path, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`${path}${qs ? '?' + qs : ''}`).then(r => Array.isArray(r) ? r : (r?.data ?? []));
};

export const api = {
  login:  (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe:  () => request('/auth/me'),

  getUsers:     () => request('/users').then(r => r?.data ?? []),
  getUser:      (id) => request(`/users/${id}`),
  createUser:   (data) => request('/users', { method: 'POST', body: data }),
  updateUser:   (id, data) => request(`/users/${id}`, { method: 'PUT', body: data }),
  deleteUser:   (id) => request(`/users/${id}`, { method: 'DELETE' }),

  lessonSlots: {
    list:        (params = {}) => list('/lesson-slots', params),
    get:         (id) => request(`/lesson-slots/${id}`),
    create:      (data) => request('/lesson-slots', { method: 'POST', body: data }),
    createBatch: (data) => request('/lesson-slots/batch', { method: 'POST', body: data }),
    checkin:     (id, plateAtCheckin) => request(`/lesson-slots/${id}/checkin`, { method: 'PUT', body: { plate_at_checkin: plateAtCheckin } }),
    noShow:      (id) => request(`/lesson-slots/${id}/no-show`, { method: 'PUT' }),
    cancel:      (id) => request(`/lesson-slots/${id}/cancel`, { method: 'PUT' }),
    reschedule:  (id, data) => request(`/lesson-slots/${id}/reschedule`, { method: 'PUT', body: data }),
    absence:     (id) => request(`/lesson-slots/${id}/absence`, { method: 'POST' }),
  },

  slots: {
    available: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/slots/available${qs ? '?' + qs : ''}`).then(r => Array.isArray(r) ? r : []);
    },
  },

  examResults: {
    list:   (params = {}) => list('/exam-results', params),
    create: (data) => request('/exam-results', { method: 'POST', body: data }),
    update: (id, data) => request(`/exam-results/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/exam-results/${id}`, { method: 'DELETE' }),
  },

  vehicles: {
    list:   () => list('/vehicles'),
    create: (data) => request('/vehicles', { method: 'POST', body: data }),
    update: (id, data) => request(`/vehicles/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/vehicles/${id}`, { method: 'DELETE' }),
  },

  instructors: {
    vehicles: {
      list:   (instructorId) => request(`/instructors/${instructorId}/vehicles`).then(r => Array.isArray(r) ? r : []),
      add:    (instructorId, vehicleId) => request(`/instructors/${instructorId}/vehicles`, { method: 'POST', body: { vehicle_id: vehicleId } }),
      remove: (instructorId, vehicleId) => request(`/instructors/${instructorId}/vehicles/${vehicleId}`, { method: 'DELETE' }),
    },
    availability: {
      list:   (instructorId) => request(`/instructors/${instructorId}/availability`).then(r => Array.isArray(r) ? r : []),
      add:    (instructorId, data) => request(`/instructors/${instructorId}/availability`, { method: 'POST', body: data }),
      delete: (instructorId, windowId) => request(`/instructors/${instructorId}/availability/${windowId}`, { method: 'DELETE' }),
    },
  },

  notifications: {
    getPreferences:    () => request('/notifications/preferences'),
    updatePreferences: (data) => request('/notifications/preferences', { method: 'PUT', body: data }),
    list:              (params = {}) => list('/notifications', params),
    unreadCount:       () => request('/notifications/unread-count'),
    markRead:          (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead:       () => request('/notifications/read-all', { method: 'PUT' }),
  },
};
```

- [ ] **Step 2: Replace `src/app/hooks/useStore.js`**

```javascript
'use client';

import { useState } from 'react';
import { api, ApiError } from '@/app/api/client';

export const useStore = () => {
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = async () => {
    try {
      const { count } = await api.notifications.unreadCount();
      setUnreadCount(count);
    } catch {}
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const ROLE_TO_TYPE = { ADMIN: 'Admin', INSTRUCTOR: 'Instrutor', STUDENT: 'Aluno' };

  const login = async (email, password) => {
    try {
      const response = await api.login(email, password);
      if (response?.token) {
        localStorage.setItem('authToken', response.token);
        const u = response.user;
        setUser({ ...u, type: ROLE_TO_TYPE[u.role] ?? u.role });
        refreshUnreadCount();
        showToast('Login realizado com sucesso!', 'success');
        return true;
      }
      showToast('Usuário ou senha inválidos.', 'error');
      return false;
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Erro ao fazer login.', 'error');
      return false;
    }
  };

  const logout = async () => {
    try { await api.logout(); } catch {}
    finally {
      localStorage.removeItem('authToken');
      setUser(null);
      setUnreadCount(0);
    }
  };

  return { user, toast, unreadCount, login, logout, showToast, refreshUnreadCount };
};
```

- [ ] **Step 3: Replace `src/app/lib/utils.js`**

```javascript
export function toDateStr(date) {
  return date.toISOString().split('T')[0];
}
```

- [ ] **Step 4: Verify with linter**

Run from `cfc-digital/`:
```bash
npm run lint
```
Expected: no errors (warnings about `react-hooks/exhaustive-deps` are acceptable).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/client.js src/app/hooks/useStore.js src/app/lib/utils.js
git commit -m "Replace API client, useStore, and utils for lesson-slot model"
```

---

## Task 2: AdminVehicleManagement — new screen

**Files:**
- Create: `src/app/components/screens/admin/AdminVehicleManagement.jsx`

- [ ] **Step 1: Create the file**

```jsx
'use client';

import { useState, useEffect } from 'react';
import { Car, Pencil, Trash2, Plus } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Modal } from '@/app/components/ui/Modal';
import { Spinner } from '@/app/components/ui/Spinner';
import { api } from '@/app/api/client';

const EMPTY_FORM = { plate: '', model: '', year: '', category: 'B', color: '' };

export const AdminVehicleManagement = ({ showToast }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, vehicle: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = async () => {
    try {
      setVehicles(await api.vehicles.list());
    } catch {
      showToast('Erro ao carregar veículos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setModal({ open: true, vehicle: null }); };
  const openEdit   = (v) => {
    setForm({ plate: v.plate, model: v.model, year: String(v.year ?? ''), category: v.category, color: v.color ?? '' });
    setModal({ open: true, vehicle: v });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, year: form.year ? Number(form.year) : undefined };
      if (modal.vehicle) {
        await api.vehicles.update(modal.vehicle.id, payload);
        showToast('Veículo atualizado.', 'success');
      } else {
        await api.vehicles.create(payload);
        showToast('Veículo criado.', 'success');
      }
      setModal({ open: false, vehicle: null });
      load();
    } catch (err) {
      showToast(err.message || 'Erro ao salvar veículo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.vehicles.delete(id);
      showToast('Veículo removido.', 'success');
      setDeleteConfirm(null);
      load();
    } catch (err) {
      showToast(err.message || 'Erro ao remover veículo.', 'error');
    }
  };

  if (loading) return <div className="p-8"><Spinner /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Veículos</h2>
        <Button onClick={openCreate} variant="primary" className="flex items-center gap-2 w-auto">
          <Plus size={18} /> Novo veículo
        </Button>
      </div>

      <Card>
        {vehicles.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">Nenhum veículo cadastrado.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {vehicles.map(v => (
              <div key={v.id} className="flex justify-between items-center py-3 px-1">
                <div className="flex items-center gap-3">
                  <Car size={18} className="text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{v.plate}</p>
                    <p className="text-sm text-gray-500">
                      {v.model}{v.year ? ` · ${v.year}` : ''} · Cat. {v.category}{v.color ? ` · ${v.color}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(v)} className="text-blue-500 hover:text-blue-700 p-1"><Pencil size={16} /></button>
                  <button onClick={() => setDeleteConfirm(v)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal title={modal.vehicle ? 'Editar Veículo' : 'Novo Veículo'} isOpen={modal.open} onClose={() => setModal({ open: false, vehicle: null })}>
        <div className="space-y-3">
          <Input id="v-plate" placeholder="Placa (ex: ABC-1234)" value={form.plate} onChange={e => setForm(p => ({ ...p, plate: e.target.value }))} />
          <Input id="v-model" placeholder="Modelo (ex: Gol, HB20)" value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} />
          <Input id="v-year" type="number" placeholder="Ano (ex: 2022)" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} />
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
            {['A', 'B', 'AB', 'C', 'D', 'E'].map(c => <option key={c} value={c}>Categoria {c}</option>)}
          </select>
          <Input id="v-color" placeholder="Cor (opcional)" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModal({ open: false, vehicle: null })}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </div>
      </Modal>

      <Modal title="Remover Veículo" isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <div className="space-y-4">
          <p className="text-gray-700">Remover <strong>{deleteConfirm?.plate}</strong> — {deleteConfirm?.model}?</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => handleDelete(deleteConfirm.id)}>Remover</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/screens/admin/AdminVehicleManagement.jsx
git commit -m "Add AdminVehicleManagement screen"
```

---

## Task 3: MainLayout update + delete obsolete files

**Files:**
- Modify: `src/app/components/layout/MainLayout.jsx`
- Delete: `src/app/components/screens/student/StudentMyClassesScreen.jsx`
- Delete: `src/app/data/mockData.js`

- [ ] **Step 1: Delete obsolete files**

```bash
rm src/app/components/screens/student/StudentMyClassesScreen.jsx
rm src/app/data/mockData.js
```

- [ ] **Step 2: Update the import block at the top of `MainLayout.jsx`**

Replace the current import block with:

```javascript
import { useState, useEffect } from 'react';
import { Calendar, Users, FileText, LogOut, User, Menu, X, Bell, ClipboardList, GraduationCap, Car } from 'lucide-react';
import { AdminDashboard } from '../screens/admin/AdminDashboard';
import { AdminUserManagement } from '../screens/admin/AdminUserManagement';
import { AdminReports } from '../screens/admin/AdminReports';
import { AdminVehicleManagement } from '../screens/admin/AdminVehicleManagement';
import { StudentScheduleScreen } from '../screens/student/StudentScheduleScreen';
import { StudentProgressScreen } from '../screens/student/StudentProgressScreen';
import { InstructorAgendaScreen } from '../screens/instructor/InstructorAgendaScreen';
import { InstructorTestResultScreen } from '../screens/instructor/InstructorTestResultScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { api } from '@/app/api/client';
```

(Removes: `Clock`, `StudentMyClassesScreen` import. Adds: `Car`, `AdminVehicleManagement`.)

- [ ] **Step 3: Update `navItems` inside `MainLayout`**

Replace the entire `navItems` object with:

```javascript
const navItems = {
  Admin: [
    { icon: Users,        label: 'Usuários',   view: 'users'     },
    { icon: Car,          label: 'Veículos',   view: 'vehicles'  },
    { icon: FileText,     label: 'Relatórios', view: 'reports'   },
  ],
  Aluno: [
    { icon: Calendar,     label: 'Meu Horário', view: 'schedule' },
    { icon: ClipboardList,label: 'Meu Histórico',view: 'progress'},
  ],
  Instrutor: [
    { icon: Calendar,     label: 'Agenda',       view: 'agenda' },
    { icon: GraduationCap,label: 'Exame Prático',view: 'exam'   },
  ],
};
```

- [ ] **Step 4: Update `renderCurrentScreen` for Admin and Aluno**

Replace the admin and aluno branches inside `renderCurrentScreen`:

```javascript
if (user.type === 'Admin') {
  if (activeView === 'users')    return <AdminUserManagement showToast={showToast} />;
  if (activeView === 'vehicles') return <AdminVehicleManagement showToast={showToast} />;
  if (activeView === 'reports')  return <AdminReports showToast={showToast} />;
  return <AdminDashboard />;
}
if (user.type === 'Aluno') {
  if (activeView === 'progress') return <StudentProgressScreen user={user} />;
  return <StudentScheduleScreen user={user} showToast={showToast} refreshUnreadCount={refreshUnreadCount} />;
}
```

- [ ] **Step 5: Lint**

```bash
npm run lint
```
Expected: no errors (broken-screen errors will disappear once later tasks rewrite those files).

- [ ] **Step 6: Commit**

```bash
git add src/app/components/layout/MainLayout.jsx
git rm src/app/components/screens/student/StudentMyClassesScreen.jsx
git rm src/app/data/mockData.js
git commit -m "Update nav and routing for lesson-slot model; remove obsolete screens"
```

---

## Task 4: AdminDashboard

**Files:**
- Rewrite: `src/app/components/screens/admin/AdminDashboard.jsx`

- [ ] **Step 1: Rewrite the file**

```jsx
'use client';

import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Spinner } from '@/app/components/ui/Spinner';
import { api } from '@/app/api/client';
import { toDateStr } from '@/app/lib/utils';

const STATUS_LABELS = {
  scheduled:      'Agendada',
  completed:      'Realizada',
  cancelled:      'Cancelada',
  no_show:        'Não compareceu',
  absent_valid:   'Ausência justificada',
  absent_charged: 'Ausência cobrada',
};

const STATUS_COLORS = {
  scheduled:      'bg-blue-100 text-blue-700',
  completed:      'bg-green-100 text-green-700',
  cancelled:      'bg-gray-100 text-gray-600',
  no_show:        'bg-red-100 text-red-700',
  absent_valid:   'bg-yellow-100 text-yellow-700',
  absent_charged: 'bg-orange-100 text-orange-700',
};

export const AdminDashboard = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.lessonSlots.list({ date: toDateStr(new Date()), limit: 100 })
      .then(setSlots)
      .catch(() => {})
      .finally(() => setLoading(false));
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
            <p className="text-4xl font-bold text-gray-800">{slots.length}</p>
            <p className="text-gray-500">Aulas agendadas para hoje</p>
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-lg mb-4 text-black">Agenda do Dia</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {slots.length === 0 ? (
              <p className="text-gray-500">Nenhuma aula hoje.</p>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <span>Horário</span><span>Aluno</span><span>Instrutor</span><span>Status</span>
                </div>
                {slots.map(s => (
                  <div key={s.id} className="grid grid-cols-4 gap-2 rounded bg-gray-50 p-2 text-sm text-gray-700">
                    <span className="font-semibold text-gray-800">{s.start_time?.substring(0, 5)}</span>
                    <span>{s.student_name}</span>
                    <span>{s.instructor_name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
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

- [ ] **Step 2: Start dev server and verify**

```bash
npm run dev
```

Log in as admin. Dashboard should load today's lesson slots from `GET /api/lesson-slots?date=<today>&limit=100`. If the backend is not running locally, the screen should show the spinner then an empty "Nenhuma aula hoje" state without crashing.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/screens/admin/AdminDashboard.jsx
git commit -m "Rewrite AdminDashboard to query lesson slots"
```

---

## Task 5: AdminUserManagement

**Files:**
- Rewrite: `src/app/components/screens/admin/AdminUserManagement.jsx`

**Key notes:**
- `day_of_week` in availability windows is an integer (0=Sunday, 1=Monday … 6=Saturday)
- Availability windows require `vehicle_id` — instruct admin to assign vehicles first
- ExamResult has no student/vehicle names; those are shown from user/vehicle data loaded elsewhere

- [ ] **Step 1: Rewrite the file**

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

const DAY_OPTIONS = [
  { value: 0, label: 'Domingo' }, { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },   { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
];

export const AdminUserManagement = ({ showToast }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add user modal
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'STUDENT', purchased_lessons: '0', category: 'B' });
  const [tempPassword, setTempPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // Student detail modal
  const [studentModal, setStudentModal] = useState({ open: false, user: null });

  // Instructor detail modal
  const [instrModal, setInstrModal] = useState({
    open: false, instructor: null, tab: 'dados',
    availability: [], vehicles: [], fleet: [], loadingData: false,
  });
  const [showAvailForm, setShowAvailForm] = useState(false);
  const [availForm, setAvailForm] = useState({ day_of_week: 1, vehicle_id: '', start_time: '08:00', end_time: '12:00' });
  const [savingAvail, setSavingAvail] = useState(false);
  const [selectedFleetId, setSelectedFleetId] = useState('');
  const [savingVehicle, setSavingVehicle] = useState(false);

  const loadUsers = async () => {
    try {
      setUsers(await api.getUsers());
    } catch {
      showToast('Erro ao carregar usuários.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const openAdd = () => {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    setTempPassword(`CFC@${pin}`);
    setForm({ name: '', email: '', role: 'STUDENT', purchased_lessons: '0', category: 'B' });
    setAddModal(true);
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name, email: form.email, password: tempPassword, role: form.role,
        ...(form.role === 'STUDENT' ? { purchased_lessons: Number(form.purchased_lessons), category: form.category } : {}),
      };
      await api.createUser(payload);
      showToast('Usuário criado com sucesso.', 'success');
      setAddModal(false);
      loadUsers();
    } catch (err) {
      showToast(err.message || 'Erro ao criar usuário.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openInstructor = async (instructor) => {
    setInstrModal({ open: true, instructor, tab: 'dados', availability: [], vehicles: [], fleet: [], loadingData: true });
    setShowAvailForm(false);
    setSelectedFleetId('');
    try {
      const [avail, assigned, fleet] = await Promise.all([
        api.instructors.availability.list(instructor.id),
        api.instructors.vehicles.list(instructor.id),
        api.vehicles.list(),
      ]);
      setInstrModal(p => ({ ...p, availability: avail, vehicles: assigned, fleet, loadingData: false }));
    } catch {
      showToast('Erro ao carregar dados do instrutor.', 'error');
      setInstrModal(p => ({ ...p, loadingData: false }));
    }
  };

  const handleAddAvailability = async () => {
    if (!availForm.vehicle_id) { showToast('Selecione um veículo.', 'error'); return; }
    setSavingAvail(true);
    try {
      const w = await api.instructors.availability.add(instrModal.instructor.id, {
        ...availForm, day_of_week: Number(availForm.day_of_week),
      });
      setInstrModal(p => ({ ...p, availability: [...p.availability, w] }));
      setShowAvailForm(false);
      showToast('Janela adicionada.', 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao adicionar janela.', 'error');
    } finally {
      setSavingAvail(false);
    }
  };

  const handleDeleteAvailability = async (windowId) => {
    try {
      await api.instructors.availability.delete(instrModal.instructor.id, windowId);
      setInstrModal(p => ({ ...p, availability: p.availability.filter(a => a.id !== windowId) }));
      showToast('Janela removida.', 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao remover janela.', 'error');
    }
  };

  const handleAddVehicle = async () => {
    if (!selectedFleetId) return;
    setSavingVehicle(true);
    try {
      await api.instructors.vehicles.add(instrModal.instructor.id, selectedFleetId);
      const v = instrModal.fleet.find(x => x.id === selectedFleetId);
      setInstrModal(p => ({ ...p, vehicles: [...p.vehicles, v] }));
      setSelectedFleetId('');
      showToast('Veículo vinculado.', 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao vincular veículo.', 'error');
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleRemoveVehicle = async (vehicleId) => {
    try {
      await api.instructors.vehicles.remove(instrModal.instructor.id, vehicleId);
      setInstrModal(p => ({ ...p, vehicles: p.vehicles.filter(v => v.vehicle_id !== vehicleId) }));
      showToast('Veículo desvinculado.', 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao desvincular veículo.', 'error');
    }
  };

  const assignedVehicleIds = new Set(instrModal.vehicles.map(v => v.vehicle_id));
  const unassignedFleet = instrModal.fleet.filter(v => !assignedVehicleIds.has(v.id));
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
                <div><p className="font-medium text-gray-900">{u.name}</p><p className="text-sm text-gray-500">{u.email}</p></div>
                <button onClick={() => openInstructor(u)} className="text-blue-600 text-sm font-semibold hover:text-blue-700">Ver detalhes</button>
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
                <div><p className="font-medium text-gray-900">{u.name}</p><p className="text-sm text-gray-500">{u.email}</p></div>
                <button onClick={() => setStudentModal({ open: true, user: u })} className="text-blue-600 text-sm font-semibold hover:text-blue-700">Ver detalhes</button>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal title="Novo Usuário" isOpen={addModal} onClose={() => setAddModal(false)}>
        <div className="space-y-4">
          <Input id="new-name" placeholder="Nome Completo" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <Input id="new-email" type="email" placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
            <option value="STUDENT">Aluno</option>
            <option value="INSTRUCTOR">Instrutor</option>
          </select>
          {form.role === 'STUDENT' && (
            <>
              <Input id="new-lessons" type="number" placeholder="Aulas contratadas" value={form.purchased_lessons}
                onChange={e => setForm(p => ({ ...p, purchased_lessons: e.target.value }))} />
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
                {['A', 'B', 'AB', 'C', 'D', 'E'].map(c => <option key={c} value={c}>Categoria {c}</option>)}
              </select>
            </>
          )}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Senha temporária</label>
            <input readOnly value={tempPassword} onClick={e => e.target.select()}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 font-mono text-gray-800 select-all" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setAddModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleAdd}>{saving ? 'Salvando...' : 'Criar usuário'}</Button>
          </div>
        </div>
      </Modal>

      {/* Student Detail Modal */}
      <Modal title={studentModal.user?.name || 'Detalhes'} isOpen={studentModal.open} onClose={() => setStudentModal({ open: false, user: null })}>
        {studentModal.user && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Email: <span className="text-gray-900">{studentModal.user.email}</span></p>
            {studentModal.user.phone_number && <p className="text-sm text-gray-600">Telefone: <span className="text-gray-900">{studentModal.user.phone_number}</span></p>}
            <p className="text-sm text-gray-600">Categoria: <span className="text-gray-900">{studentModal.user.category ?? '—'}</span></p>
            <p className="text-sm text-gray-600">Aulas contratadas: <span className="text-gray-900">{studentModal.user.purchased_lessons ?? 0}</span></p>
          </div>
        )}
      </Modal>

      {/* Instructor Detail Modal */}
      <Modal title={instrModal.instructor?.name || 'Instrutor'} isOpen={instrModal.open} onClose={() => setInstrModal(p => ({ ...p, open: false }))}>
        {instrModal.loadingData ? <div className="p-4"><Spinner /></div> : (
          <div>
            <div className="flex border-b border-gray-200 mb-4 gap-1">
              {[['dados', 'Dados'], ['disponibilidade', 'Disponibilidade'], ['veiculos', 'Veículos']].map(([key, label]) => (
                <button key={key} onClick={() => setInstrModal(p => ({ ...p, tab: key }))}
                  className={`px-4 py-2 text-sm font-medium ${instrModal.tab === key ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  {label}
                </button>
              ))}
            </div>

            {instrModal.tab === 'dados' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Email: <span className="text-gray-900">{instrModal.instructor?.email}</span></p>
                {instrModal.instructor?.phone_number && <p className="text-sm text-gray-600">Telefone: <span className="text-gray-900">{instrModal.instructor.phone_number}</span></p>}
              </div>
            )}

            {instrModal.tab === 'disponibilidade' && (
              <div className="space-y-3">
                {instrModal.availability.length === 0 && !showAvailForm && (
                  <p className="text-sm text-gray-400">Nenhuma janela de disponibilidade.</p>
                )}
                {instrModal.availability.map(w => (
                  <div key={w.id} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700">
                      {DAY_OPTIONS.find(d => d.value === w.day_of_week)?.label ?? w.day_of_week} · {w.start_time?.substring(0, 5)} – {w.end_time?.substring(0, 5)} · {w.plate}
                    </span>
                    <button onClick={() => handleDeleteAvailability(w.id)} className="text-red-400 hover:text-red-600 text-xs ml-2">Remover</button>
                  </div>
                ))}
                {showAvailForm ? (
                  <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <select value={availForm.day_of_week} onChange={e => setAvailForm(p => ({ ...p, day_of_week: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {DAY_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                    <select value={availForm.vehicle_id} onChange={e => setAvailForm(p => ({ ...p, vehicle_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Selecionar veículo...</option>
                      {instrModal.vehicles.map(v => <option key={v.vehicle_id} value={v.vehicle_id}>{v.plate} · {v.model}</option>)}
                    </select>
                    {instrModal.vehicles.length === 0 && (
                      <p className="text-xs text-amber-600">Vincule veículos na aba Veículos primeiro.</p>
                    )}
                    <div className="flex gap-2">
                      <input type="time" value={availForm.start_time} onChange={e => setAvailForm(p => ({ ...p, start_time: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <span className="self-center text-gray-500">–</span>
                      <input type="time" value={availForm.end_time} onChange={e => setAvailForm(p => ({ ...p, end_time: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setShowAvailForm(false)} className="text-sm py-2">Cancelar</Button>
                      <Button variant="primary" onClick={handleAddAvailability} className="text-sm py-2">{savingAvail ? 'Salvando...' : 'Adicionar'}</Button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowAvailForm(true)} className="text-blue-600 text-sm hover:underline">+ Adicionar janela</button>
                )}
              </div>
            )}

            {instrModal.tab === 'veiculos' && (
              <div className="space-y-3">
                {instrModal.vehicles.length === 0 && <p className="text-sm text-gray-400">Nenhum veículo vinculado.</p>}
                {instrModal.vehicles.map(v => (
                  <div key={v.vehicle_id} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700">{v.plate} · {v.model}</span>
                    <button onClick={() => handleRemoveVehicle(v.vehicle_id)} className="text-red-400 hover:text-red-600 text-xs">Remover</button>
                  </div>
                ))}
                {unassignedFleet.length > 0 ? (
                  <div className="flex gap-2">
                    <select value={selectedFleetId} onChange={e => setSelectedFleetId(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Selecionar veículo...</option>
                      {unassignedFleet.map(v => <option key={v.id} value={v.id}>{v.plate} · {v.model}</option>)}
                    </select>
                    <Button variant="primary" onClick={handleAddVehicle} className="w-auto px-3 text-sm py-2">
                      {savingVehicle ? '...' : 'Vincular'}
                    </Button>
                  </div>
                ) : instrModal.fleet.length === 0 ? (
                  <p className="text-xs text-gray-400">Nenhum veículo na frota. Adicione em Veículos primeiro.</p>
                ) : (
                  <p className="text-xs text-gray-400">Todos os veículos da frota já estão vinculados.</p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
```

- [ ] **Step 2: Lint and verify**

```bash
npm run lint
```

Log in as admin → Usuários → create a student (verify `purchased_lessons` + `category` fields appear). Open an instructor detail (verify 3 tabs render, Disponibilidade shows vehicle warning when no vehicles linked).

- [ ] **Step 3: Commit**

```bash
git add src/app/components/screens/admin/AdminUserManagement.jsx
git commit -m "Rewrite AdminUserManagement with instructor config tabs and student category fields"
```

---

## Task 6: AdminReports

**Files:**
- Rewrite: `src/app/components/screens/admin/AdminReports.jsx`

- [ ] **Step 1: Rewrite the file**

```jsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Spinner } from '@/app/components/ui/Spinner';
import { api } from '@/app/api/client';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export const AdminReports = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [instructors, setInstructors] = useState([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [reportData, setReportData] = useState({ total: 0, byDate: [], byTime: [] });
  const [loadingInstructors, setLoadingInstructors] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    api.getUsers()
      .then(data => {
        const list = data.filter(u => u.role === 'INSTRUCTOR');
        setInstructors(list);
        if (list.length > 0) setSelectedInstructorId(list[0].id);
      })
      .finally(() => setLoadingInstructors(false));
  }, []);

  useEffect(() => {
    if (!selectedInstructorId) return;
    const compute = async () => {
      setLoadingReport(true);
      try {
        // Backend has no date-range filter on lesson-slots; fetch with high limit and filter client-side
        const slots = await api.lessonSlots.list({ limit: 500 });
        const monthStr = `${currentYear}-${String(selectedMonth).padStart(2, '0')}`;
        const filtered = slots.filter(s =>
          s.instructor_id === selectedInstructorId &&
          s.status === 'completed' &&
          s.scheduled_date?.startsWith(monthStr)
        );

        const byDate = {};
        const byTime = {};
        filtered.forEach(s => {
          const d = s.scheduled_date;
          const t = s.start_time?.substring(0, 5);
          if (!byDate[d]) byDate[d] = [];
          byDate[d].push(t);
          byTime[t] = (byTime[t] || 0) + 1;
        });

        setReportData({
          total: filtered.length,
          byDate: Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, times]) => ({ date, times: times.sort() })),
          byTime: Object.entries(byTime).sort(([a], [b]) => a.localeCompare(b)).map(([time, count]) => ({ time, count })),
        });
      } finally {
        setLoadingReport(false);
      }
    };
    compute();
  }, [selectedInstructorId, selectedMonth]);

  const formatDate = (iso) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  if (loadingInstructors) return <div className="p-8"><Spinner /></div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Relatórios</h2>
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <select value={selectedInstructorId} onChange={e => setSelectedInstructorId(e.target.value)}
            className="w-full px-4 text-black py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
            className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            {MONTH_NAMES.map((name, i) => <option key={i + 1} value={i + 1}>{name} {currentYear}</option>)}
          </select>
        </div>

        {loadingReport ? <Spinner /> : (
          <div className="bg-blue-50 p-6 rounded-lg">
            <p className="text-gray-500 text-sm">Total de aulas realizadas no mês selecionado</p>
            <p className="text-4xl font-bold text-blue-600 mt-1">{reportData.total}</p>
            {reportData.total === 0 ? (
              <p className="mt-4 text-gray-500 text-sm">Nenhuma aula realizada para este instrutor no período.</p>
            ) : (
              <div className="mt-6 space-y-6">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Datas e horários</h4>
                  <div className="mt-2 space-y-3">
                    {reportData.byDate.map(({ date, times }) => (
                      <div key={date} className="rounded bg-white/70 p-3">
                        <p className="text-sm font-semibold text-gray-700">{formatDate(date)}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {times.map(time => (
                            <span key={`${date}-${time}`} className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700 text-sm">{time}</span>
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

- [ ] **Step 2: Commit**

```bash
git add src/app/components/screens/admin/AdminReports.jsx
git commit -m "Rewrite AdminReports to use lesson slot data"
```

---

## Task 7: StudentScheduleScreen + booking modal

**Files:**
- Rewrite: `src/app/components/screens/student/StudentScheduleScreen.jsx`

- [ ] **Step 1: Rewrite the file**

```jsx
'use client';

import { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Spinner } from '@/app/components/ui/Spinner';
import { api } from '@/app/api/client';
import { toDateStr } from '@/app/lib/utils';

const STATUS_LABELS = {
  scheduled:      'Agendada',
  completed:      'Realizada',
  cancelled:      'Cancelada',
  no_show:        'Não compareceu',
  absent_valid:   'Ausência justificada',
  absent_charged: 'Ausência cobrada',
};

const STATUS_COLORS = {
  scheduled:      'bg-blue-100 text-blue-700',
  completed:      'bg-green-100 text-green-700',
  cancelled:      'bg-gray-100 text-gray-600',
  no_show:        'bg-red-100 text-red-700',
  absent_valid:   'bg-yellow-100 text-yellow-700',
  absent_charged: 'bg-orange-100 text-orange-700',
};

export const StudentScheduleScreen = ({ user, showToast, refreshUnreadCount }) => {
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [absenceModal, setAbsenceModal] = useState({ open: false, slot: null });
  const [declaring, setDeclaring] = useState(false);
  const [bookingModal, setBookingModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [bookingSlotKey, setBookingSlotKey] = useState(null);

  const loadSlots = async () => {
    try {
      const data = await api.lessonSlots.list({ limit: 100 });
      setSlots(data.sort((a, b) => {
        const d = a.scheduled_date.localeCompare(b.scheduled_date);
        return d !== 0 ? d : a.start_time.localeCompare(b.start_time);
      }));
    } catch {
      showToast('Erro ao carregar aulas.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadSlots(); }, []);

  const openBooking = async () => {
    setBookingModal(true);
    setLoadingAvailable(true);
    try {
      const today = toDateStr(new Date());
      const nextWeek = toDateStr(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      setAvailableSlots(await api.slots.available({ date_from: today, date_to: nextWeek }));
    } catch {
      showToast('Erro ao buscar horários disponíveis.', 'error');
      setAvailableSlots([]);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleBook = async (slot) => {
    const key = `${slot.scheduled_date}-${slot.start_time}-${slot.instructor_id}`;
    setBookingSlotKey(key);
    try {
      await api.lessonSlots.create({
        instructor_id:  slot.instructor_id,
        vehicle_id:     slot.vehicle_id,
        scheduled_date: slot.scheduled_date,
        start_time:     slot.start_time,
      });
      showToast('Aula agendada com sucesso!', 'success');
      setBookingModal(false);
      loadSlots();
    } catch (err) {
      showToast(err.message || 'Erro ao agendar aula.', 'error');
    } finally {
      setBookingSlotKey(null);
    }
  };

  const handleAbsence = async () => {
    if (!absenceModal.slot) return;
    setDeclaring(true);
    try {
      const res = await api.lessonSlots.absence(absenceModal.slot.id);
      await refreshUnreadCount?.();
      showToast(
        res?.status === 'absent_charged'
          ? 'Ausência registrada — aula será cobrada (declaração tardia).'
          : 'Ausência registrada — aula não cobrada.',
        'success'
      );
      loadSlots();
    } catch (err) {
      showToast(err.message || 'Erro ao declarar ausência.', 'error');
    } finally {
      setDeclaring(false);
      setAbsenceModal({ open: false, slot: null });
    }
  };

  const availableByDate = availableSlots.reduce((acc, s) => {
    if (!acc[s.scheduled_date]) acc[s.scheduled_date] = [];
    acc[s.scheduled_date].push(s);
    return acc;
  }, {});

  const today = toDateStr(new Date());

  const formatDate = (d) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  if (isLoading) return <div className="p-8"><Spinner /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Meu Horário</h2>
        <Button onClick={openBooking} variant="primary" className="flex items-center gap-2 w-auto">
          <PlusCircle size={18} /> Agendar nova aula
        </Button>
      </div>

      {slots.length === 0 ? (
        <Card><p className="text-gray-500 text-center py-8">Nenhuma aula agendada.</p></Card>
      ) : (
        <div className="space-y-3">
          {slots.map(slot => (
            <Card key={slot.id}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-800 capitalize">
                    {formatDate(slot.scheduled_date)} às {slot.start_time?.substring(0, 5)}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Instrutor: {slot.instructor_name ?? '—'} · Veículo: {slot.plate ?? '—'}
                  </p>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[slot.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[slot.status] ?? slot.status}
                  </span>
                </div>
                {slot.status === 'scheduled' && slot.scheduled_date >= today && (
                  <Button variant="secondary" className="w-auto text-sm px-3 py-1.5 shrink-0"
                    onClick={() => setAbsenceModal({ open: true, slot })}>
                    Declarar ausência
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Absence Modal */}
      <Modal title="Declarar Ausência" isOpen={absenceModal.open} onClose={() => setAbsenceModal({ open: false, slot: null })}>
        <div className="space-y-4">
          <p className="text-gray-700">
            Confirmar ausência para <strong>{absenceModal.slot?.scheduled_date}</strong> às <strong>{absenceModal.slot?.start_time?.substring(0, 5)}</strong>?
          </p>
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Declarações com menos de 1 hora de antecedência são registradas como ausência tardia e a aula é cobrada.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setAbsenceModal({ open: false, slot: null })}>Cancelar</Button>
            <Button variant="primary" onClick={handleAbsence}>{declaring ? 'Registrando...' : 'Confirmar ausência'}</Button>
          </div>
        </div>
      </Modal>

      {/* Booking Modal */}
      <Modal title="Agendar Nova Aula" isOpen={bookingModal} onClose={() => setBookingModal(false)}>
        {loadingAvailable ? (
          <div className="p-4 flex justify-center"><Spinner /></div>
        ) : Object.keys(availableByDate).length === 0 ? (
          <p className="text-gray-500 text-center py-6">Nenhum horário disponível nos próximos 7 dias.</p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {Object.entries(availableByDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, dateSlots]) => (
                <div key={date}>
                  <p className="text-sm font-semibold text-gray-700 mb-2 capitalize">{formatDate(date)}</p>
                  <div className="space-y-2">
                    {dateSlots
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map((slot, i) => {
                        const key = `${slot.scheduled_date}-${slot.start_time}-${slot.instructor_id}`;
                        return (
                          <div key={`${date}-${slot.start_time}-${i}`}
                            className="flex justify-between items-center bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                            <div className="text-sm">
                              <span className="font-medium text-gray-800">{slot.start_time?.substring(0, 5)}</span>
                              <span className="text-gray-500 ml-2">{slot.instructor_name} · {slot.plate}</span>
                            </div>
                            <Button variant="primary" className="w-auto text-xs px-3 py-1.5"
                              onClick={() => handleBook(slot)} disabled={bookingSlotKey !== null}>
                              {bookingSlotKey === key ? '...' : 'Agendar'}
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
          </div>
        )}
      </Modal>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/screens/student/StudentScheduleScreen.jsx
git commit -m "Rewrite StudentScheduleScreen with lesson slots and 7-day booking modal"
```

---

## Task 8: StudentProgressScreen

**Files:**
- Rewrite: `src/app/components/screens/student/StudentProgressScreen.jsx`

- [ ] **Step 1: Rewrite the file**

```jsx
'use client';

import { useState, useEffect } from 'react';
import { Spinner } from '@/app/components/ui/Spinner';
import { Card } from '@/app/components/ui/Card';
import { api } from '@/app/api/client';

const CHARGED = new Set(['scheduled', 'completed', 'no_show', 'absent_charged']);

const STATUS_ICON = {
  completed:      { icon: '✓', color: 'text-green-600' },
  no_show:        { icon: '✗', color: 'text-red-500'   },
  absent_valid:   { icon: '—', color: 'text-gray-400'  },
  absent_charged: { icon: '✗', color: 'text-orange-500'},
  cancelled:      { icon: '—', color: 'text-gray-400'  },
};

export const StudentProgressScreen = ({ user }) => {
  const [profile, setProfile]       = useState(null);
  const [slots, setSlots]           = useState([]);
  const [examResults, setExamResults] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      api.getUser(user.id),
      api.lessonSlots.list({ limit: 500 }),
      api.examResults.list(),
    ]).then(([p, s, e]) => {
      setProfile(p);
      setSlots(s);
      setExamResults(e);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user.id]);

  if (loading) return <div className="p-8"><Spinner /></div>;

  const purchased = profile?.purchased_lessons ?? 0;
  const used      = slots.filter(s => CHARGED.has(s.status)).length;
  const balance   = purchased - used;

  const history = slots
    .filter(s => s.status !== 'scheduled')
    .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Meu Histórico</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'compradas',  value: purchased, color: 'bg-blue-50 text-blue-700'   },
          { label: 'utilizadas', value: used,      color: 'bg-purple-50 text-purple-700'},
          { label: 'restantes',  value: balance,   color: balance > 0 ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.color} rounded-xl p-4 text-center`}>
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="text-sm mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {examResults.length > 0 && (
        <div className="mb-6 space-y-2">
          {examResults.map(exam => (
            <div key={exam.id}
              className={`border rounded-xl px-4 py-3 flex justify-between items-center ${exam.result === 'pass' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div>
                <p className={`font-semibold ${exam.result === 'pass' ? 'text-green-800' : 'text-red-800'}`}>Exame Prático</p>
                <p className={`text-sm ${exam.result === 'pass' ? 'text-green-600' : 'text-red-600'}`}>
                  {exam.result === 'pass' ? 'Aprovado' : 'Reprovado'} · {exam.exam_date}
                </p>
                {exam.notes && <p className="text-xs text-gray-500 mt-0.5">{exam.notes}</p>}
              </div>
              <span className={`text-2xl font-bold ${exam.result === 'pass' ? 'text-green-600' : 'text-red-600'}`}>
                {exam.result === 'pass' ? '✓' : '✗'}
              </span>
            </div>
          ))}
        </div>
      )}

      <Card>
        <h3 className="font-semibold text-gray-800 mb-4">Histórico de Aulas</h3>
        {history.length === 0 ? (
          <p className="text-gray-400 text-center py-6">Nenhuma aula registrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {history.map(slot => {
              const { icon, color } = STATUS_ICON[slot.status] ?? { icon: '·', color: 'text-gray-400' };
              return (
                <div key={slot.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <span className="text-gray-400 text-sm w-20 shrink-0">
                    {new Date(`${slot.scheduled_date}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                  <span className="text-sm text-gray-500 shrink-0">{slot.start_time?.substring(0, 5)}</span>
                  <span className="flex-1 text-sm text-gray-700">{slot.instructor_name ?? '—'}</span>
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

- [ ] **Step 2: Commit**

```bash
git add src/app/components/screens/student/StudentProgressScreen.jsx
git commit -m "Rewrite StudentProgressScreen with slot-based balance and exam results"
```

---

## Task 9: InstructorAgendaScreen

**Files:**
- Rewrite: `src/app/components/screens/instructor/InstructorAgendaScreen.jsx`

- [ ] **Step 1: Rewrite the file**

```jsx
'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Spinner } from '@/app/components/ui/Spinner';
import { api } from '@/app/api/client';
import { toDateStr } from '@/app/lib/utils';

const STATUS_LABELS = {
  scheduled:      'Agendada',
  completed:      'Realizada',
  cancelled:      'Cancelada',
  no_show:        'Não compareceu',
  absent_valid:   'Ausência justificada',
  absent_charged: 'Ausência cobrada',
};

const STATUS_COLORS = {
  scheduled:      'bg-blue-100 text-blue-700',
  completed:      'bg-green-100 text-green-700',
  cancelled:      'bg-gray-100 text-gray-600',
  no_show:        'bg-red-100 text-red-700',
  absent_valid:   'bg-yellow-100 text-yellow-700',
  absent_charged: 'bg-orange-100 text-orange-700',
};

export const InstructorAgendaScreen = ({ user, showToast }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [plates, setPlates] = useState({});
  const [acting, setActing] = useState({});

  const loadSlots = async (date) => {
    setIsLoading(true);
    try {
      setSlots(await api.lessonSlots.list({ date: toDateStr(date) }));
    } catch {
      showToast('Erro ao carregar agenda.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadSlots(currentDate); }, [currentDate]);

  const changeDay = (n) => setCurrentDate(prev => {
    const d = new Date(prev);
    d.setDate(d.getDate() + n);
    return d;
  });

  const handleCheckin = async (slot) => {
    setActing(p => ({ ...p, [slot.id]: 'checkin' }));
    try {
      await api.lessonSlots.checkin(slot.id, plates[slot.id] || null);
      showToast('Check-in registrado.', 'success');
      loadSlots(currentDate);
    } catch (err) {
      showToast(err.message || 'Erro ao registrar check-in.', 'error');
    } finally {
      setActing(p => ({ ...p, [slot.id]: null }));
    }
  };

  const handleNoShow = async (slot) => {
    setActing(p => ({ ...p, [slot.id]: 'noshow' }));
    try {
      await api.lessonSlots.noShow(slot.id);
      showToast('Não comparecimento registrado.', 'success');
      loadSlots(currentDate);
    } catch (err) {
      showToast(err.message || 'Erro ao registrar não comparecimento.', 'error');
    } finally {
      setActing(p => ({ ...p, [slot.id]: null }));
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Minha Agenda</h2>
      <Card>
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => changeDay(-1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeft /></button>
          <h3 className="text-lg font-semibold capitalize">
            {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </h3>
          <button onClick={() => changeDay(1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronRight /></button>
        </div>

        {isLoading ? (
          <div className="py-8 flex justify-center"><Spinner /></div>
        ) : slots.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma aula agendada para este dia.</p>
        ) : (
          <div className="space-y-4">
            {[...slots].sort((a, b) => a.start_time.localeCompare(b.start_time)).map(slot => (
              <div key={slot.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-800 text-lg">{slot.start_time?.substring(0, 5)}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[slot.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[slot.status] ?? slot.status}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-3">{slot.student_name ?? '—'}</p>

                {slot.status === 'scheduled' && (
                  <div className="flex gap-2 items-center flex-wrap">
                    <span className="text-xs text-gray-500">Placa:</span>
                    <input
                      type="text" maxLength={10} placeholder="ABC-1234"
                      value={plates[slot.id] ?? ''}
                      onChange={e => setPlates(p => ({ ...p, [slot.id]: e.target.value }))}
                      className="border border-gray-300 rounded px-2 py-1 text-sm w-28"
                    />
                    <div className="ml-auto flex gap-2">
                      <button onClick={() => handleCheckin(slot)} disabled={!!acting[slot.id]}
                        className="bg-green-100 text-green-800 border border-green-300 rounded px-3 py-1 text-sm font-medium hover:bg-green-200 disabled:opacity-50">
                        {acting[slot.id] === 'checkin' ? '...' : '✓ Check-in'}
                      </button>
                      <button onClick={() => handleNoShow(slot)} disabled={!!acting[slot.id]}
                        className="bg-red-100 text-red-800 border border-red-300 rounded px-3 py-1 text-sm font-medium hover:bg-red-200 disabled:opacity-50">
                        {acting[slot.id] === 'noshow' ? '...' : '✗ Não veio'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/screens/instructor/InstructorAgendaScreen.jsx
git commit -m "Rewrite InstructorAgendaScreen with per-slot checkin and no-show"
```

---

## Task 10: InstructorTestResultScreen

**Files:**
- Rewrite: `src/app/components/screens/instructor/InstructorTestResultScreen.jsx`

**Note:** ExamResult records have no joined names. The student name is resolved by cross-referencing the pre-loaded `students` list. Similarly, vehicle plate comes from the pre-loaded `vehicles` list.

- [ ] **Step 1: Rewrite the file**

```jsx
'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { Spinner } from '@/app/components/ui/Spinner';
import { api } from '@/app/api/client';
import { toDateStr } from '@/app/lib/utils';

const EMPTY_FORM = { student_id: '', exam_date: '', vehicle_id: '', result: 'pass', notes: '' };

export const InstructorTestResultScreen = ({ user, showToast }) => {
  const [results, setResults]   = useState([]);
  const [students, setStudents] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, result: null });
  const [form, setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadResults = async () => {
    setResults(await api.examResults.list());
  };

  useEffect(() => {
    Promise.all([
      api.examResults.list(),
      api.getUsers(),
      api.vehicles.list(),
    ]).then(([r, u, v]) => {
      setResults(r);
      setStudents(u.filter(x => x.role === 'STUDENT'));
      setVehicles(v);
    }).catch(() => showToast('Erro ao carregar dados.', 'error'))
    .finally(() => setLoading(false));
  }, []);

  const studentName = (id) => students.find(s => s.id === id)?.name ?? id;
  const vehiclePlate = (id) => vehicles.find(v => v.id === id)?.plate ?? '';

  const openCreate = () => { setForm({ ...EMPTY_FORM, exam_date: toDateStr(new Date()) }); setCreateModal(true); };
  const openEdit   = (r) => {
    setForm({ student_id: r.student_id, exam_date: r.exam_date, vehicle_id: r.vehicle_id ?? '', result: r.result, notes: r.notes ?? '' });
    setEditModal({ open: true, result: r });
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.examResults.create({ ...form, instructor_id: user.id });
      showToast('Resultado registrado.', 'success');
      setCreateModal(false);
      loadResults();
    } catch (err) {
      showToast(err.message || 'Erro ao registrar resultado.', 'error');
    } finally { setSaving(false); }
  };

  const handleEdit = async () => {
    setSaving(true);
    try {
      await api.examResults.update(editModal.result.id, {
        result: form.result, notes: form.notes || null,
        exam_date: form.exam_date, vehicle_id: form.vehicle_id || null,
      });
      showToast('Resultado atualizado.', 'success');
      setEditModal({ open: false, result: null });
      loadResults();
    } catch (err) {
      showToast(err.message || 'Erro ao atualizar resultado.', 'error');
    } finally { setSaving(false); }
  };

  const formFields = (showStudentPicker) => (
    <div className="space-y-3">
      {showStudentPicker && (
        <select value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
          <option value="">Selecionar aluno...</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
      <input type="date" value={form.exam_date} onChange={e => setForm(p => ({ ...p, exam_date: e.target.value }))}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
      <select value={form.vehicle_id} onChange={e => setForm(p => ({ ...p, vehicle_id: e.target.value }))}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
        <option value="">Veículo (opcional)</option>
        {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} · {v.model}</option>)}
      </select>
      <div className="flex gap-3">
        {['pass', 'fail'].map(r => (
          <button key={r} onClick={() => setForm(p => ({ ...p, result: r }))}
            className={`flex-1 py-3 rounded-lg font-semibold text-sm border-2 transition-colors ${form.result === r
              ? r === 'pass' ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500'
              : r === 'pass' ? 'border-gray-300 text-gray-600 hover:border-green-400' : 'border-gray-300 text-gray-600 hover:border-red-400'}`}>
            {r === 'pass' ? '✓ Aprovado' : '✗ Reprovado'}
          </button>
        ))}
      </div>
      <textarea placeholder="Observações (opcional)" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
        rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
    </div>
  );

  if (loading) return <div className="p-8"><Spinner /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Exame Prático</h2>
        <Button onClick={openCreate} variant="primary" className="flex items-center gap-2 w-auto">
          <Plus size={18} /> Novo resultado
        </Button>
      </div>

      <Card>
        {results.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhum resultado registrado.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {results.map(r => (
              <div key={r.id} className="flex justify-between items-center py-3 px-1">
                <div>
                  <p className="font-medium text-gray-800">{studentName(r.student_id)}</p>
                  <p className="text-sm text-gray-500">{r.exam_date}{r.vehicle_id ? ` · ${vehiclePlate(r.vehicle_id)}` : ''}</p>
                  {r.notes && <p className="text-xs text-gray-400 mt-0.5">{r.notes}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${r.result === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {r.result === 'pass' ? '✓ Aprovado' : '✗ Reprovado'}
                  </span>
                  <button onClick={() => openEdit(r)} className="text-blue-500 hover:text-blue-700 text-sm">Editar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal title="Novo Resultado" isOpen={createModal} onClose={() => setCreateModal(false)}>
        <div className="space-y-3">
          {formFields(true)}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCreateModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleCreate}>{saving ? 'Salvando...' : 'Registrar'}</Button>
          </div>
        </div>
      </Modal>

      <Modal title="Editar Resultado" isOpen={editModal.open} onClose={() => setEditModal({ open: false, result: null })}>
        <div className="space-y-3">
          {formFields(false)}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditModal({ open: false, result: null })}>Cancelar</Button>
            <Button variant="primary" onClick={handleEdit}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/app/components/screens/instructor/InstructorTestResultScreen.jsx
git commit -m "Rewrite InstructorTestResultScreen to use exam-results API"
```

---

## Task 11: Update CLAUDE.md files

**Files:**
- Modify: `CLAUDE.md` (workspace root)
- Modify: `src/app/components/layout/MainLayout.jsx` (remove stale `'use client'` CLAUDE.md note if any)

- [ ] **Step 1: Update `cfc-digital/CLAUDE.md`**

Replace this line in the Architecture Overview:
```
- **No backend**: This is a frontend-only prototype with mocked data. Any API integration should replace mock data imports.
```
With:
```
- **Backend**: All screens call the Express API at `http://localhost:3001/api`. Auth token stored in `localStorage`. `mockData.js` and class/enrollment concepts have been removed.
```

- [ ] **Step 2: Update the workspace root `CLAUDE.md`**

In the System Architecture section, change:
```
Frontend (Next.js 15, port 3000)  ⚠️ NOT YET updated for lesson-slot model
```
To:
```
Frontend (Next.js 15, port 3000)  ✅ Updated for lesson-slot model (2026-06-11)
```

In the Implementation Status section, change:
```
### Frontend ⚠️ Not yet updated for lesson-slot model
```
To:
```
### Frontend ✅ Updated for lesson-slot model (2026-06-11)
```
And replace the paragraph below it with:
```
All screens migrated to the lesson-slot model. New screen: AdminVehicleManagement. Removed: StudentMyClassesScreen, mockData.js. See spec: `cfc-digital/docs/superpowers/specs/2026-06-11-frontend-lesson-slot-integration-design.md`.
```

In the Next Steps section, under Frontend, replace the entire block with:
```
### Frontend — Next Steps
Integration complete. See Backend — Future Phases below for what's next.
```

- [ ] **Step 3: Commit**

```bash
git -C /home/yurin/cfc/cfc-digital add src/app/../../../.. 2>/dev/null; \
cd /home/yurin/cfc && git add CLAUDE.md 2>/dev/null; \
cd /home/yurin/cfc/cfc-digital && git add CLAUDE.md
git commit -m "Update CLAUDE.md files to reflect completed frontend migration"
```

---

## Final Smoke Test

- [ ] **Run the full stack and verify each role**

```bash
# Terminal 1 — backend
cd /home/yurin/cfc/cfc-digital-backend && npm run dev

# Terminal 2 — frontend
cd /home/yurin/cfc/cfc-digital && npm run dev
```

Log in as each role and verify:

| Role | Screen | Expected |
|------|--------|----------|
| Admin | Dashboard | Today's lesson slots load (or empty state) |
| Admin | Usuários → create student | purchased_lessons + category fields present |
| Admin | Usuários → instructor detail | 3 tabs: Dados, Disponibilidade, Veículos |
| Admin | Veículos | Empty list with "Novo veículo" button |
| Admin | Relatórios | Instructor + month selector, 0 aulas if no data |
| Student | Meu Horário | Slot list loads; "Agendar nova aula" opens modal |
| Student | Meu Histórico | Balance (0/0/0 if no data), empty history |
| Instructor | Agenda | Day nav works; empty state for days with no slots |
| Instructor | Exame Prático | Empty list with "Novo resultado" button |
