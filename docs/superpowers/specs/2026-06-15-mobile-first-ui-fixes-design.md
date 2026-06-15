# Mobile-First UI/UX Fixes — Design Spec

**Date:** 2026-06-15  
**Scope:** All screens + shared UI components (`Button`, `Modal`)  
**Goal:** Fix touch targets, overflow issues, and layout breakage on mobile (360–390px) without changing desktop behavior.

---

## Context

The app is mobile-first but several structural patterns violate mobile UX best practices:
- Shared components (`Button`, `Modal`) lack touch target enforcement and scroll containment
- A repeated screen header pattern breaks on small phones when title + button compete for space
- List item rows overflow when names are long
- `AdminDashboard` table is unreadable at 4 columns on 390px
- `InstructorAgendaScreen` has layout quirks with the date navigator and check-in row

**Approach:** Fix shared components so correct behavior is the default; fix screen-specific issues individually. Desktop layout (`sm:` breakpoint and above) is unchanged.

---

## Section 1: Shared UI Components

### `Button.jsx`

**Problem:** `baseStyles` has no touch target enforcement. Callers that override padding with `py-1.5` (e.g., `StudentScheduleScreen`, slot booking list) produce ~28px buttons — below the 44px Apple HIG minimum.

**Fix:**
- Add `min-h-[44px]` to `baseStyles` — enforces minimum touch height even when callers override `py-*`
- Replace `text-center` with `inline-flex items-center justify-center` — proper centering for both text-only and icon+text buttons
- Remove `transform` from baseStyles (Tailwind v4 no longer requires it alongside `transition`)

**Result:** Every existing `Button` usage automatically gains the 44px touch floor. No call sites change.

### `Modal.jsx`

**Problem:** The content `<div className="p-6">` has no max-height or scroll. On iPhone SE (667px viewport), the instructor availability modal (tabs + list + form with 4 selects + 2 time inputs) overflows below the screen.

**Fix:**
- Add `flex flex-col max-h-[90dvh]` to the inner white container (`bg-white rounded-xl ...`)
- Add `shrink-0` to the header div so it never compresses
- Add `overflow-y-auto` to the content div so tall forms scroll within the modal

**Result:** All existing modals gain scroll containment. No call sites change. Modal remains centered (not bottom-sheet) per design decision.

---

## Section 2: Screen Header Pattern

**Affected screens:** `AdminUserManagement`, `AdminVehicleManagement`, `StudentScheduleScreen`, `InstructorTestResultScreen`.

(`AdminReports` has no CTA button — just a page title with filter controls below. `ProfileScreen` has a page title but no CTA in the header. Both are out of scope for this section.)

**Problem:** `flex justify-between items-center` with `text-2xl font-bold` title and `w-auto` Button. On 360px, "Gerenciar Usuários" + "Novo Usuário" causes the title to wrap to two lines. On the student screen, "Meu Horário" + "Agendar nova aula" (18 chars) competes for 358px of content space.

**Fix (uniform across all affected screens):**

```jsx
// Before
<div className="flex justify-between items-center mb-6">
  <h2 className="text-2xl font-bold text-gray-900">...</h2>
  <Button className="flex items-center gap-2 w-auto">...</Button>
</div>

// After
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">...</h2>
  <Button className="sm:w-auto flex items-center justify-center gap-2">...</Button>
</div>
```

- Mobile: title on top, full-width button below (thumb-friendly, no competition for space)
- Desktop (`sm:`): title left, button right — identical to current behavior
- `text-xl` on mobile (slightly smaller, but still prominent); `text-2xl` on `sm:+`

---

## Section 3: List Item Rows

**Affected:** `AdminUserManagement` (instructor list, student list), `InstructorTestResultScreen` (results list), `AdminVehicleManagement` (vehicle list).

**Problem:** `flex justify-between items-center` rows have no `min-w-0` on the text container. Long names like "Yuri Nogueira de Moraes" push the action button (`Ver detalhes`, `Editar`) into wrapping or overlapping.

**Fix:**
- Add `min-w-0` to the text container `<div>`
- Add `truncate` to the name `<p>` (email row stays as-is, it's secondary and already smaller)
- Add `shrink-0` to the action button/element to prevent it from compressing

```jsx
// Before
<div className="flex justify-between items-center p-3 rounded hover:bg-gray-50">
  <div>
    <p className="font-medium text-gray-900">{u.name}</p>
    <p className="text-sm text-gray-500">{u.email}</p>
  </div>
  <button className="text-blue-600 text-sm font-semibold hover:text-blue-700">Ver detalhes</button>
</div>

// After
<div className="flex justify-between items-center p-3 rounded hover:bg-gray-50 gap-3">
  <div className="min-w-0">
    <p className="font-medium text-gray-900 truncate">{u.name}</p>
    <p className="text-sm text-gray-500 truncate">{u.email}</p>
  </div>
  <button className="text-blue-600 text-sm font-semibold hover:text-blue-700 shrink-0 py-2 px-2 -mr-2 rounded">Ver detalhes</button>
</div>
```

The `py-2 px-2 -mr-2` on the action button increases touch area to ~36px height without changing visible size. The negative margin compensates for the added right padding so alignment stays flush.

---

## Section 4: Inline Action Buttons (touch targets)

Specific elements that need touch target padding:

| Screen | Element | Current | Fix |
|--------|---------|---------|-----|
| `AdminUserManagement` | "Ver detalhes" (instructor + student rows) | no padding | `py-2 px-2 -mr-2 rounded` |
| `AdminUserManagement` | "Remover" in availability list | `text-xs ml-2` | `py-2 px-2 rounded` |
| `AdminUserManagement` | "+ Adicionar janela" | no padding | `py-2 px-1 rounded` |
| `AdminUserManagement` | "Remover" in vehicles tab | `text-xs` | `py-2 px-2 rounded` |
| `AdminVehicleManagement` | Pencil icon button | `p-1` | `p-2` |
| `AdminVehicleManagement` | Trash2 icon button | `p-1` | `p-2` |
| `InstructorTestResultScreen` | "Editar" text button | no padding | `py-2 px-2 -mr-2 rounded` |

`py-2` = 8px vertical padding + ~20px text/icon ≈ 36px. Combined with `min-h-[44px]` on the `Button` component for primary/secondary actions, touch targets reach or approach the 44px guideline throughout the app.

---

## Section 5: AdminDashboard — Agenda Table

**Problem:** `grid grid-cols-4` with student name, instructor name, time, and status badge. At 390px with `p-6` Card padding, each column is ~85px — insufficient for full names.

**Fix:** Hide the "Instrutor" column on mobile:

```jsx
// Header row
<div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs font-semibold ...">
  <span>Horário</span>
  <span>Aluno</span>
  <span className="hidden sm:block">Instrutor</span>
  <span>Status</span>
</div>

// Data rows
<div className="grid grid-cols-3 sm:grid-cols-4 gap-2 ...">
  <span>{time}</span>
  <span className="truncate">{student_name}</span>
  <span className="hidden sm:block truncate">{instructor_name}</span>
  <span>{status_badge}</span>
</div>
```

3 columns at 390px = ~116px each — comfortable for names with `truncate`.

---

## Section 6: InstructorAgendaScreen

### 6a — Date navigator

**Problem:** Full Brazilian date string ("segunda-feira, 15 de junho de 2024") in `text-lg font-semibold` between two chevron buttons. At 390px with `p-4`, the date text gets ~310px — barely fits and clips on 360px.

**Fix:**
- `text-sm sm:text-base` on the `<h3>` containing the date
- Add `flex-1 min-w-0 text-center` to allow the date text to use available space between the chevron buttons
- Chevron buttons: add `min-h-[44px] min-w-[44px] flex items-center justify-center` for proper touch targets

### 6b — Check-in row

**Problem:** `flex gap-2 items-center flex-wrap` with "Placa:" + input + `ml-auto` div containing two buttons. The `ml-auto` inside a `flex-wrap` container moves to a new line but centers relative to the new line, not the full container — producing unaligned wrapping.

**Fix:** Replace with explicit two-row stacked layout:

```jsx
// After
<div className="space-y-2 mt-3">
  <div className="flex items-center gap-2">
    <span className="text-xs text-gray-500 shrink-0">Placa:</span>
    <input ... className="flex-1 border border-gray-300 rounded px-2 py-2 text-sm" />
  </div>
  <div className="flex gap-2">
    <button ... className="flex-1 py-2.5 bg-green-100 text-green-800 border border-green-300 rounded text-sm font-medium hover:bg-green-200 disabled:opacity-50">
      {acting[slot.id] === 'checkin' ? '...' : '✓ Check-in'}
    </button>
    <button ... className="flex-1 py-2.5 bg-red-100 text-red-800 border border-red-300 rounded text-sm font-medium hover:bg-red-200 disabled:opacity-50">
      {acting[slot.id] === 'noshow' ? '...' : '✗ Não veio'}
    </button>
  </div>
</div>
```

`flex-1 py-2.5` on each button = ~40px touch height and equal-width split — both predictable and thumb-friendly.

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/components/ui/Button.jsx` | `min-h-[44px]`, `inline-flex items-center justify-center` |
| `src/app/components/ui/Modal.jsx` | `flex flex-col max-h-[90dvh]`, `shrink-0` on header, `overflow-y-auto` on content |
| `src/app/components/screens/admin/AdminUserManagement.jsx` | Header pattern, list row `min-w-0`/`truncate`, action button touch targets |
| `src/app/components/screens/admin/AdminVehicleManagement.jsx` | Header pattern, action button touch targets |
| `src/app/components/screens/admin/AdminDashboard.jsx` | 3-col mobile grid, `truncate` on names |
| `src/app/components/screens/student/StudentScheduleScreen.jsx` | Header pattern |
| `src/app/components/screens/instructor/InstructorAgendaScreen.jsx` | Date navigator sizing, check-in row layout, chevron touch targets |
| `src/app/components/screens/instructor/InstructorTestResultScreen.jsx` | Header pattern, list row `min-w-0`/`truncate`, action button touch targets |

No backend changes. No new components created. Desktop behavior unchanged.
