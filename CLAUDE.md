# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**Development**:
- `npm run dev` or `bun dev` — Start dev server with Turbopack at http://localhost:3000
- `npm run int` — Start dev server on 0.0.0.0 (for network access)
- `npm run build` — Build for production with Turbopack
- `npm start` — Run production server
- `npm run lint` — Run ESLint

**Testing**: No test framework currently configured. Tests should be added as the project evolves.

**Path aliases**: `@/*` maps to `./src/*` (configured in jsconfig.json).

## Architecture Overview

This is a **Next.js 15 single-page application** with role-based access control. The UI is entirely client-side with no backend API integration—it uses mock data for development.

### State Management
- **`useStore` hook** (`src/app/hooks/useStore.js`) — Centralized state for authentication (user/login/logout) and toast notifications
- Uses React hooks (useState) directly; no external state library
- User data comes from `MOCKED_USERS` in `src/app/data/mockData.js`

### Application Flow
1. **Entry point**: `src/app/page.js` — Renders LoginScreen if no user, otherwise MainLayout
2. **MainLayout** (`src/app/components/layout/MainLayout.jsx`) — Handles routing between screens based on user type and activeView state
3. **User types**: Admin, Aluno (Student), Instrutor (Instructor) — each has different navigation items and screens
4. **Screens**: Located in `src/app/components/screens/` — role-specific views (AdminDashboard, StudentScheduleScreen, etc.)
5. **UI Components**: Reusable components in `src/app/components/ui/` — Button, Modal, Input, Card, Toast, Spinner

### Directory Structure
```
src/app/
├── components/
│   ├── layout/        — MainLayout (sidebar, navigation routing)
│   ├── screens/       — Role-specific full-page components
│   │   ├── admin/     — Admin screens (Dashboard, UserManagement, Reports)
│   │   ├── student/   — Student screens (Schedule, MyClasses)
│   │   └── instructor/ — Instructor screens (Agenda)
│   └── ui/           — Reusable UI components (Button, Input, Modal, etc.)
├── hooks/
│   └── useStore.js   — Authentication & toast state management
├── data/
│   └── mockData.js   — Mock users, instructors, students, schedules, classes
├── lib/
│   └── utils.js      — Utility functions
└── page.js           — Root component with auth flow
```

## Key Technologies

- **Framework**: Next.js 15.5.4 with App Router and Turbopack
- **UI**: React 19.1.0 with Tailwind CSS v4
- **Icons**: lucide-react 
- **Language**: Portuguese (UI text and variable names)
- **PWA**: Service worker registered in `service-worker-registrar.js`; app manifest in `src/app/manifest.js`

## Design & Styling

- **Tailwind CSS** with PostCSS — responsive utility-first styling
- **Color scheme**: Blues, grays, slate backgrounds
- **Responsive**: Mobile-first with `hidden lg:block` patterns for desktop sidebars, mobile menu drawer
- **Icons**: lucide-react imported directly into components

## Development Notes

- **Backend**: All screens call the Express API at `http://localhost:3001/api`. Auth token stored in `localStorage`. `mockData.js` and class/enrollment concepts have been removed.
- **Client-only app**: All components marked with `'use client'` directive
- **Navigation state**: Managed via `activeView` state in MainLayout; not using Next.js routing or URL params
- **Toast notifications**: Managed globally via `useStore` showToast; auto-dismisses after 3 seconds
- **ESLint**: Uses Next.js core-web-vitals config; no custom rules
