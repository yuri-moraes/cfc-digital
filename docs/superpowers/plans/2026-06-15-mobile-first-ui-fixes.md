# Mobile-First UI/UX Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix touch targets, layout breakage, and scroll overflow on mobile across all screens and shared components — without changing desktop behavior.

**Architecture:** Fix shared components first (Task 1–2); changes cascade to all screens. Then fix each screen individually. All mobile fixes target the base (mobile) breakpoint; `sm:` classes restore desktop layout. No new components created.

**Tech Stack:** Next.js 15.5.4, React 19, Tailwind CSS v4, lucide-react. No test framework — verify each task in the browser using DevTools mobile viewport (390px width).

**Design spec:** `docs/superpowers/specs/2026-06-15-mobile-first-ui-fixes-design.md`

---

## Files Changed

| File | What changes |
|------|-------------|
| `src/app/components/ui/Button.jsx` | Add `min-h-[44px]` touch target minimum |
| `src/app/components/ui/Modal.jsx` | Add `flex flex-col max-h-[90dvh]` + scroll on content |
| `src/app/components/screens/admin/AdminUserManagement.jsx` | Header, list rows, inline buttons |
| `src/app/components/screens/admin/AdminVehicleManagement.jsx` | Header, icon button touch targets |
| `src/app/components/screens/admin/AdminDashboard.jsx` | 3-col mobile table |
| `src/app/components/screens/student/StudentScheduleScreen.jsx` | Header pattern |
| `src/app/components/screens/instructor/InstructorAgendaScreen.jsx` | Date navigator, check-in row, chevron touch targets |
| `src/app/components/screens/instructor/InstructorTestResultScreen.jsx` | Header, list rows, inline buttons |

---

## How to verify each task

Run `npm run dev` once and leave it running. For each task, open `http://localhost:3000` in Chrome, open DevTools (F12), toggle Device Toolbar (Ctrl+Shift+M), set width to **390px**.

---

### Task 1: Button — enforce 44px touch target minimum

**Files:**
- Modify: `src/app/components/ui/Button.jsx`

- [ ] **Step 1: Apply change to Button.jsx**

Replace the entire file:

```jsx
export const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled }) => {
  const baseStyles = "w-full min-h-[44px] text-center font-semibold py-3 px-4 rounded-lg transition-transform transform active:scale-[0.98] shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};
```

Note: `disabled` prop was already used at call sites but not forwarded — this fixes that too.

- [ ] **Step 2: Verify in browser**

Navigate to login screen at 390px. The "Entrar" button should be ≥44px tall (inspect with DevTools → Computed → height). Open the app and open any modal with the "Salvar" button — confirm it's also ≥44px.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/ui/Button.jsx
git commit -m "fix: enforce 44px minimum touch target on Button"
```

---

### Task 2: Modal — scroll containment for tall content

**Files:**
- Modify: `src/app/components/ui/Modal.jsx`

- [ ] **Step 1: Apply change to Modal.jsx**

Replace the entire file:

```jsx
import { X } from 'lucide-react';

export const Modal = ({ children, isOpen, onClose, title }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90dvh]">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center shrink-0">
          <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
```

Changes from original:
- Inner white `<div>`: removed `m-4`, added `flex flex-col max-h-[90dvh]`
- Header `<div>`: added `shrink-0`
- Content `<div>`: added `overflow-y-auto`

- [ ] **Step 2: Verify in browser**

Open AdminUserManagement → click "Ver detalhes" on an instructor → go to "Disponibilidade" tab → click "+ Adicionar janela". The form with all its selects and time inputs should appear scrollable inside the modal without overflowing off the screen.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/ui/Modal.jsx
git commit -m "fix: add scroll containment and max-height to Modal"
```

---

### Task 3: AdminUserManagement — header, list rows, inline buttons

**Files:**
- Modify: `src/app/components/screens/admin/AdminUserManagement.jsx`

- [ ] **Step 1: Fix the screen header (lines 161–165)**

Replace:
```jsx
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Gerenciar Usuários</h2>
        <Button onClick={openAdd} variant="primary" className="flex items-center gap-2 w-auto">
          <UserPlus size={18} /> Novo Usuário
        </Button>
      </div>
```

With:
```jsx
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gerenciar Usuários</h2>
        <Button onClick={openAdd} variant="primary" className="sm:w-auto flex items-center justify-center gap-2">
          <UserPlus size={18} /> Novo Usuário
        </Button>
      </div>
```

- [ ] **Step 2: Fix instructor list rows (lines 173–178)**

Replace:
```jsx
            {instructors.map(u => (
              <div key={u.id} className="flex justify-between items-center p-3 rounded hover:bg-gray-50">
                <div><p className="font-medium text-gray-900">{u.name}</p><p className="text-sm text-gray-500">{u.email}</p></div>
                <button onClick={() => openInstructor(u)} className="text-blue-600 text-sm font-semibold hover:text-blue-700">Ver detalhes</button>
              </div>
            ))}
```

With:
```jsx
            {instructors.map(u => (
              <div key={u.id} className="flex justify-between items-center p-3 rounded hover:bg-gray-50 gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{u.name}</p>
                  <p className="text-sm text-gray-500 truncate">{u.email}</p>
                </div>
                <button onClick={() => openInstructor(u)} className="text-blue-600 text-sm font-semibold hover:text-blue-700 shrink-0 py-2 px-2 -mr-2 rounded">Ver detalhes</button>
              </div>
            ))}
```

- [ ] **Step 3: Fix student list rows (lines 184–190)**

Replace:
```jsx
            {students.map(u => (
              <div key={u.id} className="flex justify-between items-center p-3 rounded hover:bg-gray-50">
                <div><p className="font-medium text-gray-900">{u.name}</p><p className="text-sm text-gray-500">{u.email}</p></div>
                <button onClick={() => { setStudentModal({ open: true, user: u }); setStudentEdit({ purchased_lessons: String(u.purchased_lessons ?? 0), category: u.category ?? 'B' }); }} className="text-blue-600 text-sm font-semibold hover:text-blue-700">Ver detalhes</button>
              </div>
            ))}
```

With:
```jsx
            {students.map(u => (
              <div key={u.id} className="flex justify-between items-center p-3 rounded hover:bg-gray-50 gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{u.name}</p>
                  <p className="text-sm text-gray-500 truncate">{u.email}</p>
                </div>
                <button onClick={() => { setStudentModal({ open: true, user: u }); setStudentEdit({ purchased_lessons: String(u.purchased_lessons ?? 0), category: u.category ?? 'B' }); }} className="text-blue-600 text-sm font-semibold hover:text-blue-700 shrink-0 py-2 px-2 -mr-2 rounded">Ver detalhes</button>
              </div>
            ))}
```

- [ ] **Step 4: Fix availability list rows and "Remover" button (lines 292–298)**

Replace:
```jsx
                {instrModal.availability.map(w => (
                  <div key={w.id} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700">
                      {DAY_OPTIONS.find(d => d.value === w.day_of_week)?.label ?? w.day_of_week} · {w.start_time?.substring(0, 5)} – {w.end_time?.substring(0, 5)} · {w.plate}
                    </span>
                    <button onClick={() => handleDeleteAvailability(w.id)} className="text-red-400 hover:text-red-600 text-xs ml-2">Remover</button>
                  </div>
                ))}
```

With:
```jsx
                {instrModal.availability.map(w => (
                  <div key={w.id} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2 gap-2">
                    <span className="text-sm text-gray-700 min-w-0 truncate">
                      {DAY_OPTIONS.find(d => d.value === w.day_of_week)?.label ?? w.day_of_week} · {w.start_time?.substring(0, 5)} – {w.end_time?.substring(0, 5)} · {w.plate}
                    </span>
                    <button onClick={() => handleDeleteAvailability(w.id)} className="text-red-400 hover:text-red-600 text-xs shrink-0 py-2 px-2 -mr-2 rounded">Remover</button>
                  </div>
                ))}
```

- [ ] **Step 5: Fix "+ Adicionar janela" button (line 327)**

Replace:
```jsx
                  <button onClick={() => setShowAvailForm(true)} className="text-blue-600 text-sm hover:underline">+ Adicionar janela</button>
```

With:
```jsx
                  <button onClick={() => setShowAvailForm(true)} className="text-blue-600 text-sm hover:underline py-2 px-1 -ml-1 rounded">+ Adicionar janela</button>
```

- [ ] **Step 6: Fix vehicle list rows and "Remover" button (lines 334–339)**

Replace:
```jsx
                {instrModal.vehicles.map(v => (
                  <div key={v.vehicle_id} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700">{v.plate} · {v.model}</span>
                    <button onClick={() => handleRemoveVehicle(v.vehicle_id)} className="text-red-400 hover:text-red-600 text-xs">Remover</button>
                  </div>
                ))}
```

With:
```jsx
                {instrModal.vehicles.map(v => (
                  <div key={v.vehicle_id} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2 gap-2">
                    <span className="text-sm text-gray-700 min-w-0 truncate">{v.plate} · {v.model}</span>
                    <button onClick={() => handleRemoveVehicle(v.vehicle_id)} className="text-red-400 hover:text-red-600 text-xs shrink-0 py-2 px-2 -mr-2 rounded">Remover</button>
                  </div>
                ))}
```

- [ ] **Step 7: Verify in browser at 390px**

- Header: "Gerenciar Usuários" on one line, "Novo Usuário" button full-width below it
- Student with long name (e.g., "Yuri Nogueira de Moraes"): name truncates with `…`, "Ver detalhes" always visible on the right
- Open instructor modal → Disponibilidade tab: "Remover" buttons don't overlap text; "+ Adicionar janela" has comfortable tap area
- Open instructor modal → Veículos tab: same for "Remover"

- [ ] **Step 8: Commit**

```bash
git add src/app/components/screens/admin/AdminUserManagement.jsx
git commit -m "fix: mobile header, list row truncation and touch targets in AdminUserManagement"
```

---

### Task 4: AdminVehicleManagement — header and icon button touch targets

**Files:**
- Modify: `src/app/components/screens/admin/AdminVehicleManagement.jsx`

- [ ] **Step 1: Fix the screen header (lines 75–79)**

Replace:
```jsx
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Veículos</h2>
        <Button onClick={openCreate} variant="primary" className="flex items-center gap-2 w-auto">
          <Plus size={18} /> Novo veículo
        </Button>
      </div>
```

With:
```jsx
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Veículos</h2>
        <Button onClick={openCreate} variant="primary" className="sm:w-auto flex items-center justify-center gap-2">
          <Plus size={18} /> Novo veículo
        </Button>
      </div>
```

- [ ] **Step 2: Fix vehicle list rows — add truncation (lines 87–105)**

Replace:
```jsx
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
```

With:
```jsx
            {vehicles.map(v => (
              <div key={v.id} className="flex justify-between items-center py-3 px-1 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Car size={18} className="text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{v.plate}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {v.model}{v.year ? ` · ${v.year}` : ''} · Cat. {v.category}{v.color ? ` · ${v.color}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(v)} className="text-blue-500 hover:text-blue-700 p-2 rounded"><Pencil size={16} /></button>
                  <button onClick={() => setDeleteConfirm(v)} className="text-red-400 hover:text-red-600 p-2 rounded"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
```

- [ ] **Step 3: Verify in browser at 390px**

- Header: "Veículos" on one line, "Novo veículo" button full-width below
- Vehicle rows: long detail strings ("HB20 · 2022 · Cat. B · Azul") truncate cleanly; pencil and trash icons have a larger tap area (p-2)

- [ ] **Step 4: Commit**

```bash
git add src/app/components/screens/admin/AdminVehicleManagement.jsx
git commit -m "fix: mobile header, list row truncation and touch targets in AdminVehicleManagement"
```

---

### Task 5: AdminDashboard — 3-column mobile table

**Files:**
- Modify: `src/app/components/screens/admin/AdminDashboard.jsx`

- [ ] **Step 1: Fix the agenda table (lines 61–75)**

Replace:
```jsx
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
```

With:
```jsx
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <span>Horário</span><span>Aluno</span><span className="hidden sm:block">Instrutor</span><span>Status</span>
                </div>
                {slots.map(s => (
                  <div key={s.id} className="grid grid-cols-3 sm:grid-cols-4 gap-2 rounded bg-gray-50 p-2 text-sm text-gray-700">
                    <span className="font-semibold text-gray-800">{s.start_time?.substring(0, 5)}</span>
                    <span className="truncate">{s.student_name}</span>
                    <span className="hidden sm:block truncate">{s.instructor_name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                  </div>
                ))}
```

- [ ] **Step 2: Verify in browser at 390px**

Log in as Admin → Dashboard. The agenda table should show 3 columns (Horário, Aluno, Status) — student names truncate cleanly. At 640px+ width, 4 columns appear including Instrutor.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/screens/admin/AdminDashboard.jsx
git commit -m "fix: hide instructor column on mobile in AdminDashboard table"
```

---

### Task 6: StudentScheduleScreen — header pattern

**Files:**
- Modify: `src/app/components/screens/student/StudentScheduleScreen.jsx`

- [ ] **Step 1: Fix the screen header (lines 130–134)**

Replace:
```jsx
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Meu Horário</h2>
        <Button onClick={openBooking} variant="primary" className="flex items-center gap-2 w-auto">
          <PlusCircle size={18} /> Agendar nova aula
        </Button>
      </div>
```

With:
```jsx
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Meu Horário</h2>
        <Button onClick={openBooking} variant="primary" className="sm:w-auto flex items-center justify-center gap-2">
          <PlusCircle size={18} /> Agendar nova aula
        </Button>
      </div>
```

- [ ] **Step 2: Verify in browser at 390px**

Log in as Aluno. "Meu Horário" on one line, "Agendar nova aula" full-width button below. On desktop sidebar disappears and the layout stacks → rows side-by-side again.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/screens/student/StudentScheduleScreen.jsx
git commit -m "fix: mobile header layout in StudentScheduleScreen"
```

---

### Task 7: InstructorAgendaScreen — date navigator, check-in row, chevron touch targets

**Files:**
- Modify: `src/app/components/screens/instructor/InstructorAgendaScreen.jsx`

- [ ] **Step 1: Fix the date navigator (lines 84–89)**

Replace:
```jsx
        <div className="flex justify-between items-center mb-6">
          <button aria-label="Dia anterior" onClick={() => changeDay(-1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeft /></button>
          <h3 className="text-lg font-semibold capitalize">
            {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </h3>
          <button aria-label="Próximo dia" onClick={() => changeDay(1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronRight /></button>
        </div>
```

With:
```jsx
        <div className="flex justify-between items-center mb-6">
          <button aria-label="Dia anterior" onClick={() => changeDay(-1)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-gray-100 shrink-0"><ChevronLeft /></button>
          <h3 className="text-sm sm:text-base font-semibold capitalize flex-1 min-w-0 text-center px-2 truncate">
            {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </h3>
          <button aria-label="Próximo dia" onClick={() => changeDay(1)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-gray-100 shrink-0"><ChevronRight /></button>
        </div>
```

- [ ] **Step 2: Fix the check-in row (lines 108–128)**

Replace:
```jsx
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
                      <button onClick={() => handleCheckin(slot)} disabled={!!acting[slot.id] || !plates[slot.id]?.trim()}
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
```

With:
```jsx
                {slot.status === 'scheduled' && (
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 shrink-0">Placa:</span>
                      <input
                        type="text" maxLength={10} placeholder="ABC-1234"
                        value={plates[slot.id] ?? ''}
                        onChange={e => setPlates(p => ({ ...p, [slot.id]: e.target.value }))}
                        className="flex-1 border border-gray-300 rounded px-2 py-2 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleCheckin(slot)} disabled={!!acting[slot.id] || !plates[slot.id]?.trim()}
                        className="flex-1 py-2.5 bg-green-100 text-green-800 border border-green-300 rounded text-sm font-medium hover:bg-green-200 disabled:opacity-50">
                        {acting[slot.id] === 'checkin' ? '...' : '✓ Check-in'}
                      </button>
                      <button onClick={() => handleNoShow(slot)} disabled={!!acting[slot.id]}
                        className="flex-1 py-2.5 bg-red-100 text-red-800 border border-red-300 rounded text-sm font-medium hover:bg-red-200 disabled:opacity-50">
                        {acting[slot.id] === 'noshow' ? '...' : '✗ Não veio'}
                      </button>
                    </div>
                  </div>
                )}
```

- [ ] **Step 3: Verify in browser at 390px**

Log in as Instrutor → Agenda. Check:
- Date navigator: "segunda-feira, 15 de junho de 2026" fits without overflowing; left/right chevron buttons have a 44px tap area
- For a scheduled slot: "Placa:" label and input on one row (input stretches full width); "✓ Check-in" and "✗ Não veio" buttons side-by-side on the next row, each half-width and ~40px tall

- [ ] **Step 4: Commit**

```bash
git add src/app/components/screens/instructor/InstructorAgendaScreen.jsx
git commit -m "fix: date navigator overflow and check-in row layout in InstructorAgendaScreen"
```

---

### Task 8: InstructorTestResultScreen — header, list rows, inline buttons

**Files:**
- Modify: `src/app/components/screens/instructor/InstructorTestResultScreen.jsx`

- [ ] **Step 1: Fix the screen header (lines 113–117)**

Replace:
```jsx
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Exame Prático</h2>
        <Button onClick={openCreate} variant="primary" className="flex items-center gap-2 w-auto">
          <Plus size={18} /> Novo resultado
        </Button>
      </div>
```

With:
```jsx
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Exame Prático</h2>
        <Button onClick={openCreate} variant="primary" className="sm:w-auto flex items-center justify-center gap-2">
          <Plus size={18} /> Novo resultado
        </Button>
      </div>
```

- [ ] **Step 2: Fix result list rows and "Editar" button (lines 126–138)**

Replace:
```jsx
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
```

With:
```jsx
            {results.map(r => (
              <div key={r.id} className="flex justify-between items-center py-3 px-1 gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{studentName(r.student_id)}</p>
                  <p className="text-sm text-gray-500">{r.exam_date}{r.vehicle_id ? ` · ${vehiclePlate(r.vehicle_id)}` : ''}</p>
                  {r.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{r.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${r.result === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {r.result === 'pass' ? '✓ Aprovado' : '✗ Reprovado'}
                  </span>
                  <button onClick={() => openEdit(r)} className="text-blue-500 hover:text-blue-700 text-sm py-2 px-2 -mr-2 rounded">Editar</button>
                </div>
              </div>
            ))}
```

- [ ] **Step 3: Verify in browser at 390px**

Log in as Instrutor → Exame Prático. Check:
- Header: "Exame Prático" title on its own line, "Novo resultado" button full-width below
- Result rows: student names truncate; badge and "Editar" button stay on the right, never pushed off-screen

- [ ] **Step 4: Commit**

```bash
git add src/app/components/screens/instructor/InstructorTestResultScreen.jsx
git commit -m "fix: mobile header, list row truncation and touch targets in InstructorTestResultScreen"
```

---

## Done

All 8 commits should be on the branch. Verify the full app at 390px by walking through each role:
- **Admin:** Dashboard (3-col table), Gerenciar Usuários (header, long names, modals), Veículos (header, icon buttons)
- **Aluno:** Meu Horário (header, booking modal scrolls on small phones)
- **Instrutor:** Agenda (date nav, check-in row), Exame Prático (header, list rows)
